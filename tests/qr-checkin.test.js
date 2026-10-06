import test from 'node:test';
import assert from 'node:assert/strict';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import {readCheckinCode} from '../src/qr-checkin.js';
const context={origin:'https://ride.test',pathname:'/',eventId:'ride-a',checkpoints:[{id:'cp-a',name:'起點'},{id:'retired',deletedAt:'2026-10-01'}]};
const url='https://ride.test/?event=ride-a&checkpoint=cp-a&key=qr-secret';
test('camera reader decodes a generated QR frame and validates its event and checkpoint',()=>{
  const qr=QRCode.create(url),scale=6,padding=4,width=(qr.modules.size+padding*2)*scale;
  const pixels=new Uint8ClampedArray(width*width*4).fill(255);
  for(let y=0;y<width;y++)for(let x=0;x<width;x++){
    const row=Math.floor(y/scale)-padding,col=Math.floor(x/scale)-padding;
    if(row>=0&&col>=0&&row<qr.modules.size&&col<qr.modules.size&&qr.modules.get(row,col)){
      const offset=(y*width+x)*4;pixels[offset]=pixels[offset+1]=pixels[offset+2]=0;
    }
  }
  const code=jsQR(pixels,width,width,{inversionAttempts:'attemptBoth'});
  assert.equal(code.data,url);
  assert.deepEqual(readCheckinCode(code.data,context),{checkpoint:context.checkpoints[0],secret:'qr-secret'});
});
test('camera reader rejects unrelated codes, other events, and disabled or incomplete points',()=>{
  for(const value of ['not-a-url',url.replace('ride.test','other.test'),url.replace('/?','/other?'),url.replace('ride-a','ride-b'),url.replace('cp-a','unknown'),url.replace('cp-a','retired'),url.replace('&key=qr-secret','')])assert.throws(()=>readCheckinCode(value,context));
});
