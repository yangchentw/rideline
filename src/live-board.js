import {withUnifiedStart} from './activity-start.js';
const validTime=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));

export function liveBoard(event,checkpointId='',status='all',search='',now=Date.now()) {
  event=withUnifiedStart(event);
  const checkpoints=event.checkpoints||[];
  const participants=event.participants||[];
  const rows=participants.map(person=>{
    const points=checkpoints.flatMap(checkpoint=>{
      const at=person.checkins?.[checkpoint.id];
      return validTime(at)?[{checkpoint,at}]:[];
    }).sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));
    return {...person,points,latest:points.find(p=>!p.checkpoint.isStart)||points[0]||null};
  });
  const stations=checkpoints.map(checkpoint=>{
    const arrivals=rows.flatMap(row=>row.points.filter(p=>p.checkpoint.id===checkpoint.id));
    return {...checkpoint,arrived:arrivals.length,missing:participants.length-arrivals.length,
      latest:checkpoint.isStart?event.startsAt:arrivals.reduce((last,p)=>!last||Date.parse(p.at)>Date.parse(last)?p.at:last,null)};
  });
  const selected=stations.find(s=>s.id===checkpointId)||stations[0]||null;
  const start=checkpoints.find(c=>c.isStart);
  const required=checkpoints.filter(c=>!c.isStart);
  const started=start?(now>=Date.parse(event.startsAt)?rows.length:0):rows.filter(row=>row.points.some(p=>p.checkpoint.id===checkpoints[0]?.id)).length;
  const query=search.trim().toLocaleLowerCase();
  return {
    summary:{total:rows.length,started,complete:required.length?rows.filter(row=>required.every(c=>row.points.some(p=>p.checkpoint.id===c.id))).length:0,waiting:rows.length-started},
    stations,selected,
    rows:rows.map(row=>({...row,arrival:row.points.find(p=>p.checkpoint.id===selected?.id)?.at||null}))
      .filter(row=>row.name.toLocaleLowerCase().includes(query)&&(status==='all'||(status==='arrived'?!!row.arrival:!row.arrival)))
  };
}

export function liveBoardUrl(base,eventId) {
  const url=new URL(base);
  url.search='';url.hash='';
  url.searchParams.set('event',eventId);
  url.searchParams.set('page','live');
  return url.toString();
}
