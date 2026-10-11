export function attendanceTimeline(event, checkpointId='') {
  const checkpoints=[...event.checkpoints,...(event.archivedCheckpoints||[])];
  const rows=event.participants.map(p=>({id:p.id,name:p.name,points:checkpoints.filter(c=>!checkpointId||c.id===checkpointId).flatMap((c,i)=>{const value=p.checkins[c.id],timestamp=Date.parse(value);return Number.isFinite(timestamp)?[{checkpointId:c.id,name:c.name,time:value,timestamp,index:i}]:[]}).sort((a,b)=>a.timestamp-b.timestamp)}));
  const times=rows.flatMap(r=>r.points.map(p=>p.timestamp));
  const minimum=times.length?times.reduce((a,b)=>Math.min(a,b)):0,maximum=times.length?times.reduce((a,b)=>Math.max(a,b)):0;
  return {rows,minimum,maximum,span:Math.max(maximum-minimum,60000),count:times.length};
}
