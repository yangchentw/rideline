import React,{useEffect,useRef,useState} from 'react';
import jsQR from 'jsqr';
import {Camera,RefreshCw} from 'lucide-react';

export default function QrCamera({onRead}){
  const videoRef=useRef(),readRef=useRef(onRead);
  const [attempt,setAttempt]=useState(0),[status,setStatus]=useState('正在啟動相機…'),[error,setError]=useState(''),[failed,setFailed]=useState(false);
  readRef.current=onRead;
  useEffect(()=>{
    let cancelled=false,stream,frame,openingTimeout,lastFrame=0,lastCode='',lastCodeAt=0;
    const canvas=document.createElement('canvas'),context=canvas.getContext('2d',{willReadFrequently:true});
    const stop=()=>{clearTimeout(openingTimeout);cancelAnimationFrame(frame);stream?.getTracks().forEach(track=>track.stop());if(videoRef.current)videoRef.current.srcObject=null;};
    const fail=message=>{stop();if(!cancelled){setFailed(true);setError(message);setStatus('相機尚未開啟');}};
    const scan=now=>{
      if(cancelled)return;
      const video=videoRef.current;
      if(video?.readyState>=2&&video.videoWidth&&video.videoHeight&&now-lastFrame>120){
        lastFrame=now;
        const scale=Math.min(1,960/Math.max(video.videoWidth,video.videoHeight));
        canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);
        context.drawImage(video,0,0,canvas.width,canvas.height);
        const image=context.getImageData(0,0,canvas.width,canvas.height);
        const code=jsQR(image.data,image.width,image.height,{inversionAttempts:'attemptBoth'});
        if(code&&(code.data!==lastCode||now-lastCodeAt>2000)){
          lastCode=code.data;lastCodeAt=now;
          try{if(readRef.current(code.data)){stop();return;}}catch(e){setError(e.message);}
        }
      }
      frame=requestAnimationFrame(scan);
    };
    async function start(){
      setFailed(false);setError('');setStatus('正在啟動相機，請允許此網站使用相機…');
      if(!window.isSecureContext){fail('相機需要 HTTPS，請使用正式網站開啟。');return;}
      if(!navigator.mediaDevices?.getUserMedia){fail('此瀏覽器不支援相機掃描，請改用 Safari 或 Chrome，或用手機相機掃描現場 QR Code。');return;}
      openingTimeout=setTimeout(()=>{fail('尚未取得相機畫面，請確認相機權限，或改用手機的 Safari / Chrome 開啟網站後重試。');cancelled=true;},15000);
      try{
        stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}});
        if(cancelled){stop();return;}
        videoRef.current.srcObject=stream;
        await videoRef.current.play();
        if(cancelled){stop();return;}
        clearTimeout(openingTimeout);
        setStatus('請將現場 QR Code 對準畫面');
        frame=requestAnimationFrame(scan);
      }catch(e){
        const message=e.name==='NotAllowedError'?'未取得相機權限。請在瀏覽器設定允許此網站使用相機後重試。':e.name==='NotFoundError'?'找不到可用的相機，請使用有相機的手機開啟。':e.name==='NotReadableError'?'相機正被其他程式使用，請關閉其他相機程式後重試。':'無法開啟相機，請重新嘗試，或用手機相機掃描現場 QR Code。';
        fail(message);
      }
    }
    start();
    return()=>{cancelled=true;stop();};
  },[attempt]);
  return <div className="qr-camera"><div className="camera-view"><video ref={videoRef} playsInline muted autoPlay aria-label="QR Code 相機預覽"/><div className="camera-guide" aria-hidden="true"/>{failed&&<Camera className="camera-placeholder" size={48}/>}</div><p className="camera-status" role="status">{status}</p>{error&&<p className="error" role="alert">{error}</p>}{failed&&<button className="btn" onClick={()=>setAttempt(attempt+1)}><RefreshCw size={17}/>重新開啟相機</button>}<p className="muted small">掃描成功後會關閉相機，再確認姓名與站點。離開此視窗也會關閉相機。</p></div>;
}
