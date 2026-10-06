const encoder=new TextEncoder();
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
async function derive(key,salt){
  const material=await crypto.subtle.importKey('raw',encoder.encode(key),'PBKDF2',false,['deriveBits']);
  return hex(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:encoder.encode(salt),iterations:100000},material,256)));
}
export function validActivityKey(key){return typeof key==='string'&&key.length>=6&&key.length<=64;}
export async function hashActivityKey(key){
  const salt=hex(crypto.getRandomValues(new Uint8Array(16)));
  return {salt,hash:await derive(key,salt)};
}
export async function verifyActivityKey(key,stored){
  if(!validActivityKey(key)||!stored)return false;
  const hash=await derive(key,stored.salt);
  let different=hash.length^stored.hash.length;
  for(let i=0;i<hash.length;i++)different|=hash.charCodeAt(i)^stored.hash.charCodeAt(i);
  return different===0;
}
