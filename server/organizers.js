import {hashActivityKey,verifyActivityKey} from './activity-key.js';
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export const validOrganizerPassword=p=>typeof p==='string'&&p.length>=12&&p.length<=64;
const publicOrganizer=o=>({id:o.id,username:o.username,name:o.name,active:!!o.active,createdAt:o.created_at});
export async function tokenHash(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
export async function actorFor(request,env){
 const token=request.headers.get('Authorization')?.replace(/^Bearer /,'');
 if(!token)return null;
 if(env.ADMIN_KEY&&token===env.ADMIN_KEY)return {role:'manager',id:null,name:'管理者'};
 const session=await env.DB.prepare('SELECT * FROM organizer_sessions WHERE token_hash=? AND expires_at>?').bind(await tokenHash(token),new Date().toISOString()).first();
 if(!session)return null;
 if(!session.organizer_id)return {role:'manager',id:null,name:'管理者'};
 const o=await env.DB.prepare('SELECT * FROM organizers WHERE id=? AND active=1').bind(session.organizer_id).first();
 return o?{role:'organizer',...publicOrganizer(o)}:null;
}
export async function organizersAPI(request,env,actor,path,body){
 if(path==='/api/auth/login'&&request.method==='POST'){
  let organizer=null;
  if(body.role==='manager'){
   if(!env.ADMIN_KEY||body.password!==env.ADMIN_KEY)return json({error:'帳號或密碼不正確'},401);
  }else{
   organizer=await env.DB.prepare('SELECT * FROM organizers WHERE username=? AND active=1').bind(String(body.username||'').trim().toLowerCase()).first();
   if(!await verifyActivityKey(body.password,organizer))return json({error:'帳號或密碼不正確'},401);
  }
  const token=crypto.randomUUID()+crypto.randomUUID(),expiresAt=new Date(Date.now()+8*60*60*1000).toISOString();
  await env.DB.prepare('DELETE FROM organizer_sessions WHERE expires_at<=?').bind(new Date().toISOString()).run();
  await env.DB.prepare('INSERT INTO organizer_sessions VALUES (?,?,?,?)').bind(await tokenHash(token),organizer?.id||null,expiresAt,new Date().toISOString()).run();
  return json({token,expiresAt,actor:organizer?{role:'organizer',...publicOrganizer(organizer)}:{role:'manager',id:null,name:'管理者'}});
 }
 if(path==='/api/auth/logout'&&request.method==='POST'){
  const token=request.headers.get('Authorization')?.replace(/^Bearer /,'');
  if(token)await env.DB.prepare('DELETE FROM organizer_sessions WHERE token_hash=?').bind(await tokenHash(token)).run();
  return json({ok:true});
 }
 if(!path.startsWith('/api/organizers'))return null;
 if(actor?.role!=='manager')return json({error:'此功能僅限管理者'},403);
 if(path==='/api/organizers'&&request.method==='GET'){
  const {results}=await env.DB.prepare('SELECT * FROM organizers ORDER BY created_at').all();return json(results.map(publicOrganizer));
 }
 if(path==='/api/organizers'&&request.method==='POST'){
  const username=String(body.username||'').trim().toLowerCase(),name=String(body.name||'').trim();
  if(!/^[a-z0-9][a-z0-9_-]{2,39}$/.test(username)||!name||name.length>50||!validOrganizerPassword(body.password))return json({error:'帳號須為 3–40 字英數、底線或連字號；姓名最多 50 字；密碼須為 12–64 字'},400);
  const stored=await hashActivityKey(body.password),id=crypto.randomUUID();
  try{await env.DB.prepare('INSERT INTO organizers VALUES (?,?,?,?,?,?,?)').bind(id,username,name,stored.salt,stored.hash,1,new Date().toISOString()).run();}catch(e){if(String(e).includes('UNIQUE'))return json({error:'主辦者帳號已存在'},409);throw e;}
  return json({id},201);
 }
 const match=path.match(/^\/api\/organizers\/([^/]+)$/);
 if(match&&request.method==='PUT'){
  const id=match[1],o=await env.DB.prepare('SELECT * FROM organizers WHERE id=?').bind(id).first();if(!o)return json({error:'找不到主辦者'},404);
  if((body.password!==undefined&&!validOrganizerPassword(body.password))||(body.active!==undefined&&typeof body.active!=='boolean')||(body.name!==undefined&&(typeof body.name!=='string'||!body.name.trim()||body.name.length>50)))return json({error:'請確認姓名、啟用狀態及 12–64 字的新密碼'},400);
  const stored=body.password?await hashActivityKey(body.password):o;
  await env.DB.batch([
   env.DB.prepare('UPDATE organizers SET name=?,salt=?,hash=?,active=? WHERE id=?').bind(body.name?.trim()||o.name,stored.salt,stored.hash,body.active===undefined?o.active:Number(body.active),id),
   env.DB.prepare('DELETE FROM organizer_sessions WHERE organizer_id=?').bind(id)
  ]);
  return json({ok:true});
 }
 return json({error:'不支援此操作'},405);
}
