// An explicit marker keeps historical activities and their recorded check-ins intact.
export function withUnifiedStart(event) {
  const start=event?.checkpoints?.find(c=>c.isStart===true&&!c.deletedAt);
  if(!start||!Number.isFinite(Date.parse(event.startsAt)))return event;
  return {...event,participants:(event.participants||[]).map(person=>({...person,
    checkins:{...person.checkins,[start.id]:event.startsAt}
  }))};
}
export function checkpointOrder(a,b) {
  return Number(b.isStart===true)-Number(a.isStart===true)||a.km-b.km;
}
