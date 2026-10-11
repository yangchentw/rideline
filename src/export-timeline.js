// Rasterize the complete SVG rather than the phone's visible scroll area.
export async function exportTimelineImage(svg,{event,stations,count,format='png'}) {
  if(!svg)throw new Error('圖表尚未準備完成');
  if(!['png','jpg'].includes(format))throw new Error('不支援的圖片格式');
  await document.fonts?.ready;
  const ns='http://www.w3.org/2000/svg',width=Number(svg.getAttribute('width'));
  const root=document.createElementNS(ns,'svg');root.setAttribute('xmlns',ns);root.setAttribute('width',width);root.setAttribute('font-family','Arial, sans-serif');
  let y=34;
  function line(value,size=16,color='#233e32'){
    const text=document.createElementNS(ns,'text');text.setAttribute('x','24');text.setAttribute('y',String(y));text.setAttribute('font-size',String(size));text.setAttribute('fill',color);text.textContent=value;root.append(text);y+=size+12;
  }
  function wrap(value,limit,size=16,color='#233e32'){const chars=Array.from(value);for(let i=0;i<chars.length;i+=limit)line(chars.slice(i,i+limit).join(''),size,color);}
  wrap(event.name+'｜活動打卡時間圖表',44,22);
  line('活動結束：'+new Date(event.endedAt).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',hour12:false}));
  line(`${event.participants.length} 位參加者 · ${count} 筆打卡紀錄 · 台灣時間（UTC+8）`);
  const colors=['#19533e','#2967b1','#b35316','#8055ad','#ad315c','#237f85'];
  stations.forEach((s,i)=>wrap(`${i+1}. ${s.name}${s.deletedAt?'（已移除）':''}`,52,15,colors[i%colors.length]));
  if(!count)line('此範圍沒有打卡紀錄。');
  y+=12;
  const chart=svg.cloneNode(true);chart.setAttribute('x','0');chart.setAttribute('y',String(y));chart.setAttribute('font-family','Arial, sans-serif');
  root.append(chart);const height=y+Number(svg.getAttribute('height'))+40;root.setAttribute('height',String(height));
  const bg=document.createElementNS(ns,'rect');bg.setAttribute('width','100%');bg.setAttribute('height','100%');bg.setAttribute('fill','#fff');root.prepend(bg);
  const footer=document.createElementNS(ns,'text');footer.setAttribute('x','24');footer.setAttribute('y',String(height-14));footer.setAttribute('font-size','13');footer.setAttribute('fill','#69786f');footer.textContent='RIDELINE v1.3 · 每一程，都有跡可循。';root.append(footer);
  const source=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(root)],{type:'image/svg+xml;charset=utf-8'}));
  let downloadURL;
  try {
    const img=new Image();img.src=source;await img.decode();
    const scale=Math.min(2,16384/height,16384/width,Math.sqrt(32000000/(width*height)));
    const canvas=document.createElement('canvas');canvas.width=Math.floor(width*scale);canvas.height=Math.floor(height*scale);
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('此瀏覽器無法匯出圖片');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,format==='jpg'?'image/jpeg':'image/png',0.95));if(!blob)throw new Error('圖表太大，請篩選站點後再匯出');
    downloadURL=URL.createObjectURL(blob);const a=document.createElement('a');a.href=downloadURL;
    a.download=`${event.name.replace(/[\\/:*?"<>|\u0000-\u001f]/g,'_')}-打卡時間圖表-${stations.length===1?stations[0].name.replace(/[\\/:*?"<>|\u0000-\u001f]/g,'_'):'全部站點'}.${format}`;
    document.body.append(a);a.click();a.remove();
  }finally{URL.revokeObjectURL(source);if(downloadURL)setTimeout(()=>URL.revokeObjectURL(downloadURL),60000);}
}
