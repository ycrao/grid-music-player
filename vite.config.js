import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'node:fs'
import path from 'node:path'

function serveResPlugin(){
  return {
    name:'serve-res-static',
    configureServer(server){
      server.middlewares.use((req,res,next)=>{
        if(!req.url||!req.url.startsWith('/res/')) return next()
        const rel=req.url.replace(/^\/res\//,'')
        const file=path.join(process.cwd(),'res',rel)
        if(!fs.existsSync(file)) return next()
        const ext=path.extname(file).toLowerCase()
        const types={'.mp3':'audio/mpeg','.json':'application/json','.txt':'text/plain; charset=utf-8','.lrc':'text/plain; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg'}
        res.setHeader('Content-Type', types[ext]||'application/octet-stream')
        fs.createReadStream(file).pipe(res)
      })
    }
  }
}

export default defineConfig({
  plugins:[vue(), serveResPlugin()]
})