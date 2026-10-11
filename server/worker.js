import {resolveMapsLink} from '../src/maps.js';
import {validActivityKey,hashActivityKey,verifyActivityKey} from './activity-key.js';
import {actorFor,organizersAPI} from './organizers.js';
const json = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
const uuid = () => crypto.randomUUID();
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);

    try {
      if (!env.DB) return json({ error: '尚未設定資料庫' }, 503);
      const actor=await actorFor(request,env),admin=!!actor,manager=actor?.role==='manager';
      if(url.pathname==='/api/health')return json({mode:'shared',admin,actor});
      const body = request.method === 'POST' || request.method === 'PUT' ? await request.json() : {};
      const accountResponse=await organizersAPI(request,env,actor,url.pathname,body);
      if(accountResponse)return accountResponse;
      if (request.method === 'GET' && url.pathname === '/api/events') {
        const { results: events } = await env.DB.prepare('SELECT * FROM events ORDER BY starts_at DESC').all();
        const { results: people } = await env.DB.prepare('SELECT id,event_id,name,joined_at FROM participants').all();
        const { results: checks } = await env.DB.prepare('SELECT * FROM checkins').all();
        const { results: owners } = await env.DB.prepare('SELECT event_owners.event_id,event_owners.organizer_id,organizers.name FROM event_owners LEFT JOIN organizers ON organizers.id=event_owners.organizer_id').all();
        const { results: endings } = await env.DB.prepare('SELECT * FROM event_endings').all();
        const { results: keys } = await env.DB.prepare('SELECT event_id FROM event_keys').all();
        return json(events.map(e => ({ id:e.id, name:e.name, startsAt:e.starts_at, description:e.description, ownerId:owners.find(o=>o.event_id===e.id)?.organizer_id||null,ownerName:owners.find(o=>o.event_id===e.id)?.name||'管理者',canManage:manager||!!actor&&owners.some(o=>o.event_id===e.id&&o.organizer_id===actor.id),route:JSON.parse(e.route), distance:e.distance,
          archivedCheckpoints:JSON.parse(e.checkpoints).filter(c=>c.deletedAt).map(c=>({...c,secret:undefined})),endedAt:endings.find(x=>x.event_id===e.id)?.ended_at||null,hasActivityKey:keys.some(k=>k.event_id===e.id),checkpoints:JSON.parse(e.checkpoints).filter(c=>!c.deletedAt).map(c => (manager||!!actor&&owners.some(o=>o.event_id===e.id&&o.organizer_id===actor.id)) ? c : ({ ...c, secret:undefined })),
          participants:people.filter(p=>p.event_id===e.id).map(p=>({id:p.id,name:p.name,joinedAt:p.joined_at,checkins:Object.fromEntries(checks.filter(c=>c.participant_id===p.id).map(c=>[c.checkpoint_id,c.arrived_at]))})) })));
      }
      if(url.pathname==='/api/maps/resolve' && request.method==='POST'){if(!admin)return json({error:'請先登入主辦者'},401);try{const {url:link}=await request.json();return json(await resolveMapsLink(link));}catch(e){return json({error:e.message},400);}}
      if (request.method === 'POST' && url.pathname === '/api/events') {
        if (!admin) return json({error:'請先登入主辦者'},401);
        if(body.activityKey!==undefined&&body.activityKey!==''&&!validActivityKey(body.activityKey))return json({error:'活動金鑰請設定為 6–64 字'},400);
        if (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 100 || !Number.isFinite(Date.parse(body.startsAt)) || !Array.isArray(body.route) || body.route.length < 2 || body.route.length>15000 || body.route.some(p=>!Array.isArray(p)||p.length!==2||!Number.isFinite(p[0])||!Number.isFinite(p[1])||Math.abs(p[0])>90||Math.abs(p[1])>180) || !Array.isArray(body.checkpoints) || body.checkpoints.length<1 || body.checkpoints.length>30 || body.checkpoints.some(c=>!c.name?.trim()||c.name.length>100||!Number.isFinite(c.lat)||!Number.isFinite(c.lng)||Math.abs(c.lat)>90||Math.abs(c.lng)>180)) return json({error:'活動資料不完整，請檢查路線與打卡點'},400);
        const id=uuid(), checkpoints=body.checkpoints.map(c=>({...c,id:uuid(),secret:uuid()}));
        const activityKey=body.activityKey?await hashActivityKey(body.activityKey):null;
        const statements=[env.DB.prepare('INSERT INTO events VALUES (?,?,?,?,?,?,?,?)').bind(id,body.name.trim(),body.startsAt,String(body.description||'').slice(0,1000),JSON.stringify(body.route),Number(body.distance)||0,JSON.stringify(checkpoints),new Date().toISOString()),env.DB.prepare('INSERT INTO event_owners VALUES (?,?)').bind(id,actor.id)];
        if(activityKey)statements.push(env.DB.prepare('INSERT INTO event_keys VALUES (?,?,?)').bind(id,activityKey.salt,activityKey.hash));
        await env.DB.batch(statements);
        return json({id},201);
      }
      const match = url.pathname.match(/^\/api\/events\/([^/]+)\/(join|checkins|checkpoints|qr-access|activity-key|end|owner)$/);
      if (!match) return json({error:'找不到此功能'},404);
      const [, eventId, action]=match;
      const event=await env.DB.prepare('SELECT * FROM events WHERE id=?').bind(eventId).first();
      if (!event) return json({error:'找不到此活動'},404);
      const owner=await env.DB.prepare('SELECT organizer_id FROM event_owners WHERE event_id=?').bind(eventId).first();
      const canManage=manager||!!actor&&owner?.organizer_id===actor.id;
      if(action==='owner'&&request.method==='PUT'){
        if(!manager)return json({error:'僅管理者可指派活動主辦者'},403);
        if(body.organizerId!==null){const target=await env.DB.prepare('SELECT id FROM organizers WHERE id=? AND active=1').bind(String(body.organizerId||'')).first();if(!target)return json({error:'請選擇已啟用的主辦者'},400);}
        await env.DB.prepare('INSERT INTO event_owners VALUES (?,?) ON CONFLICT(event_id) DO UPDATE SET organizer_id=excluded.organizer_id').bind(eventId,body.organizerId).run();
        return json({ok:true});
      }
      if(action==='end' && request.method==='POST') {
        const managerPassword=!!env.ADMIN_KEY&&body.password===env.ADMIN_KEY;
        if(!canManage&&!managerPassword)return json({error:'無權管理此活動'},actor?403:401);
        if(!managerPassword){
          if(actor?.role!=='organizer')return json({error:'主辦者密碼不正確'},401);
          const stored=await env.DB.prepare('SELECT * FROM organizers WHERE id=? AND active=1').bind(actor.id).first();
          if(!await verifyActivityKey(body.password,stored))return json({error:'主辦者密碼不正確'},401);
        }
        await env.DB.prepare('INSERT INTO event_endings VALUES (?,?) ON CONFLICT(event_id) DO NOTHING').bind(eventId,new Date().toISOString()).run();
        const ended=await env.DB.prepare('SELECT ended_at FROM event_endings WHERE event_id=?').bind(eventId).first();
        return json({endedAt:ended.ended_at});
      }
      if(['checkpoints','activity-key'].includes(action)&&request.method==='PUT'&&!canManage)return json({error:actor?'無權管理其他主辦者的活動':'請先登入主辦者'},actor?403:401);
      const ended=await env.DB.prepare('SELECT ended_at FROM event_endings WHERE event_id=?').bind(eventId).first();
      if(ended && ['join','checkins','checkpoints'].includes(action))return json({error:'活動已結束，無法參加、打卡或修改打卡點'},409);
      if(action==='activity-key'&&request.method==='PUT'){
        if(!admin)return json({error:'請先登入主辦者'},401);
        if(!validActivityKey(body.key))return json({error:'活動金鑰請設定為 6–64 字'},400);
        const stored=await hashActivityKey(body.key);
        await env.DB.prepare('INSERT INTO event_keys VALUES (?,?,?) ON CONFLICT(event_id) DO UPDATE SET salt=excluded.salt,hash=excluded.hash').bind(eventId,stored.salt,stored.hash).run();
        return json({ok:true});
      }
      if(action==='qr-access'&&request.method==='POST'){
        if(!canManage){
          const stored=await env.DB.prepare('SELECT salt,hash FROM event_keys WHERE event_id=?').bind(eventId).first();
          if(!stored)return json({error:'此活動尚未設定活動金鑰，請聯絡主辦者'},403);
          if(!await verifyActivityKey(body.key,stored))return json({error:'活動金鑰不正確'},401);
        }
        return json({checkpoints:JSON.parse(event.checkpoints).filter(c=>!c.deletedAt).map(c=>({id:c.id,secret:c.secret}))});
      }
      if (action==='join' && request.method==='POST') {
        const name=String(body.name||'').trim().normalize('NFKC');
        if (!name || name.length>30) return json({error:'請輸入 1–30 字的騎行名稱'},400);
        const existing=await env.DB.prepare('SELECT id FROM participants WHERE event_id=? AND name=?').bind(eventId,name).first();
        if(existing) return json({error:'這個名稱已被使用，請換一個名稱'},409);
        const id=uuid(),token=uuid();
        try { const result=await env.DB.prepare('INSERT INTO participants SELECT ?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM event_endings WHERE event_id=?)').bind(id,eventId,name,token,new Date().toISOString(),eventId).run(); if((result.meta?.changes??result.changes)===0)return json({error:'活動已結束，無法參加'},409); }
        catch(e) { if(String(e).includes('UNIQUE')) return json({error:'這個名稱已被使用，請換一個名稱'},409); throw e; }
        return json({id,name,token},201);
      }
      if(action==='checkins' && request.method==='POST') {
        const cp=JSON.parse(event.checkpoints).find(c=>!c.deletedAt && c.id===body.checkpointId && c.secret===body.secret);
        if(!cp) return json({error:'打卡 QR Code 無效'},400);
        const p=await env.DB.prepare('SELECT id,name FROM participants WHERE event_id=? AND token=?').bind(eventId,String(body.token||'')).first();
        if(!p) return json({error:'請先加入活動'},401);
        await env.DB.prepare('INSERT INTO checkins SELECT ?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM event_endings WHERE event_id=?) ON CONFLICT DO NOTHING').bind(eventId,p.id,cp.id,new Date().toISOString(),eventId).run();
        const saved=await env.DB.prepare('SELECT arrived_at FROM checkins WHERE event_id=? AND participant_id=? AND checkpoint_id=?').bind(eventId,p.id,cp.id).first();
        if(!saved)return json({error:'活動已結束，無法打卡'},409);
        return json({arrivedAt:saved.arrived_at,name:p.name});
      }
      if(action==='checkpoints' && request.method==='PUT') {
        if(!admin) return json({error:'請先登入主辦者'},401);
        const old=JSON.parse(event.checkpoints), active=old.filter(c=>!c.deletedAt);
        if(!Array.isArray(body.checkpoints)||body.checkpoints.length<1||body.checkpoints.length>30||new Set(body.checkpoints.map(c=>c.id)).size!==body.checkpoints.length||body.checkpoints.some(c=>typeof c.id!=='string'||!c.id||typeof c.name!=='string'||!c.name.trim()||c.name.length>100||!Number.isFinite(c.lat)||Math.abs(c.lat)>90||!Number.isFinite(c.lng)||Math.abs(c.lng)>180||old.some(o=>o.id===c.id&&o.deletedAt))) return json({error:'打卡點資料不正確，活動至少需要一個打卡點'},400);
        if(JSON.stringify(body.expectedIds)!==JSON.stringify(active.map(c=>c.id)))return json({error:'打卡點已被更新，請重新整理後再試'},409);
        const next=body.checkpoints.map(c=>{const existing=active.find(o=>o.id===c.id);return {id:existing?.id||uuid(),secret:existing?.secret||uuid(),name:c.name.trim(),lat:c.lat,lng:c.lng,km:Number.isFinite(c.km)?c.km:existing?.km||0,mapsUrl:typeof c.mapsUrl==='string'?c.mapsUrl.slice(0,4096):''};});
        const removed=old.filter(o=>!body.checkpoints.some(c=>c.id===o.id)).map(o=>({...o,deletedAt:o.deletedAt||new Date().toISOString()}));
        const result=await env.DB.prepare('UPDATE events SET checkpoints=? WHERE id=? AND checkpoints=? AND NOT EXISTS (SELECT 1 FROM event_endings WHERE event_id=?)').bind(JSON.stringify([...next,...removed]),eventId,event.checkpoints,eventId).run();
        if((result.meta?.changes??result.changes)===0)return json({error:'打卡點已被更新，請重新整理後再試'},409);
        return json({ok:true});
      }
      return json({error:'不支援此操作'},405);
    } catch(error) { console.error(error); return json({error:'無法完成操作，請稍後重試'},500); }
  }
};
