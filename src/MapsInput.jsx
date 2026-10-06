import React,{useState} from 'react';
import {Link,Search} from 'lucide-react';
import {parseMapsLink} from './maps';import {api} from './data';
export default function MapsInput({onApply,initialURL=''}) {
  const [url,setURL]=useState(initialURL),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(false);
  async function resolve(){setBusy(true);setError(false);setMessage('');try{let result=parseMapsLink(url);if(result.needsExpansion)result=await api('/maps/resolve',{url});onApply(result);setMessage(result.warning||`已帶入${result.name?'「'+result.name+'」與座標':'座標，請補上打卡點名稱'}，請確認後儲存。`);}catch(e){setError(true);setMessage(e.message);}finally{setBusy(false);}}
  return <div className="maps-input"><label><Link size={14}/>Google Maps 地點連結<input type="url" placeholder="貼上 Google Maps 分享連結或完整網址" value={url} onChange={e=>setURL(e.target.value)}/></label><button type="button" className="btn" disabled={busy||!url.trim()} onClick={resolve}><Search size={15}/>{busy?'解析中…':'解析地點'}</button>{message&&<p className={error?'error maps-message':'maps-message'} role="status">{message}</p>}<p className="muted small">有地點座標時會自動帶入；只有名稱或地圖中心的連結，需要補上座標。</p></div>;
}
