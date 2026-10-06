export function readCheckinCode(text,{origin,pathname,eventId,checkpoints}){
  let url;
  try{url=new URL(text);}catch{throw new Error('這不是有效的打卡 QR Code，請掃描現場站點的 QR Code。');}
  if(url.origin!==origin||url.pathname!==pathname)throw new Error('這不是本站的打卡 QR Code。');
  if(url.searchParams.get('event')!==eventId)throw new Error('這是其他活動的 QR Code，請確認你目前選擇的活動。');
  const id=url.searchParams.get('checkpoint'),secret=url.searchParams.get('key');
  const checkpoint=checkpoints.find(c=>c.id===id&&!c.deletedAt);
  if(!checkpoint||!secret)throw new Error('找不到此打卡點，請掃描有效的站點 QR Code。');
  return {checkpoint,secret};
}
