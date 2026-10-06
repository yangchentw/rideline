const number = '-?\\d+(?:\\.\\d+)?';
const pair = new RegExp(`^(${number})\\s*,\\s*(${number})(?:\\s*\\((.*?)\\))?$`);
export function mapsURL(input) {
  let url; try { url = new URL(input.trim()); } catch { throw new Error('請貼上完整的 Google Maps 連結'); }
  const host = url.hostname.toLowerCase();
  const long = ['google.com','www.google.com','maps.google.com','google.com.tw','www.google.com.tw','maps.google.com.tw'].includes(host);
  const short = host === 'maps.app.goo.gl' || (host === 'goo.gl' && url.pathname.startsWith('/maps/'));
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !(short || (long && (url.pathname.startsWith('/maps') || host.startsWith('maps.'))))) throw new Error('只支援 HTTPS 的 Google Maps 地點連結');
  return {url,short};
}
export function parseMapsLink(input) {
  const {url,short}=mapsURL(input);
  if(short) return {url:url.href,needsExpansion:true};
  if(url.pathname.startsWith('/maps/dir'))throw new Error('請提供單一地點的分享連結，不要使用導航路線連結');
  let path;try{path=decodeURIComponent(url.pathname+url.search);}catch{throw new Error('地圖連結編碼不正確');}
  let name='';const place=url.pathname.match(/\/maps\/place\/([^/]+)/);
  if(place){try{name=decodeURIComponent(place[1].replaceAll('+',' '));}catch{}}
  if(pair.test(name))name='';
  const query=url.searchParams.get('query')||url.searchParams.get('q')||'';
  const coords=query.match(pair);
  if(!name && query && !coords && !/^place_id:/i.test(query))name=query;
  if(coords?.[3]&&!name)name=coords[3];
  const exact=path.match(new RegExp(`!3d(${number})!4d(${number})`));
  const reversed=path.match(new RegExp(`!4d(${number})!3d(${number})`));
  const found=exact?[exact[1],exact[2]]:reversed?[reversed[2],reversed[1]]:coords?[coords[1],coords[2]]:null;
  if(found){const [lat,lng]=found.map(Number);if(Math.abs(lat)>90||Math.abs(lng)>180)throw new Error('連結中的經緯度超出範圍');return {name:name.slice(0,100),lat,lng,url:url.href,source:'地點座標'};}
  return {name:name.slice(0,100),url:url.href,warning:path.includes('/@')?'連結只有地圖視角座標，無法確認地點位置。請改用地點分享連結或手動填入座標。':'連結沒有可辨識的地點座標，請手動填入經緯度，或提供包含座標的地點分享連結。'};
}
export async function resolveMapsLink(input, fetcher=fetch) {
  let current=mapsURL(input).url.href;
  const parsed=parseMapsLink(current);if(!parsed.needsExpansion)return parsed;
  for(let i=0;i<6;i++){
    mapsURL(current);
    const response=await fetcher(current,{redirect:'manual',signal:AbortSignal.timeout(8000),headers:{'Accept-Language':'zh-TW,zh;q=0.9'}});
    const location=response.headers.get('location');
    await response.body?.cancel();
    if(response.status>=300&&response.status<400&&location){current=new URL(location,current).href;mapsURL(current);const result=parseMapsLink(current);if(!result.needsExpansion)return result;continue;}
    throw new Error('短網址未提供可解析的地點。請在 Google Maps 開啟後，複製瀏覽器的完整地點網址。');
  }
  throw new Error('短網址轉址次數過多，請改貼完整地點網址');
}
