import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolveMapsLink } from './src/maps.js';
export default defineConfig({ plugins:[react(),{name:'maps-link-resolver',configureServer(server){server.middlewares.use('/api/maps/resolve',async(req,res)=>{res.setHeader('Content-Type','application/json');if(req.method!=='POST'){res.statusCode=405;res.end(JSON.stringify({error:'不支援此操作'}));return;}try{let body='';for await(const chunk of req){body+=chunk;if(body.length>8192)throw new Error('連結過長');}const result=await resolveMapsLink(JSON.parse(body).url);res.end(JSON.stringify(result));}catch(e){res.statusCode=400;res.end(JSON.stringify({error:e.message}));}});}}] });
