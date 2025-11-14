import fs from 'node:fs'
import path from 'node:path'

const src=path.join(process.cwd(),'res')
const dest=path.join(process.cwd(),'dist','res')

function copyDir(s,d){
  if(!fs.existsSync(s)) return
  fs.mkdirSync(d,{recursive:true})
  for(const name of fs.readdirSync(s)){
    const sp=path.join(s,name)
    const dp=path.join(d,name)
    const stat=fs.statSync(sp)
    if(stat.isDirectory()) copyDir(sp,dp)
    else fs.copyFileSync(sp,dp)
  }
}

copyDir(src,dest)
console.log(`[copyRes] copied ${src} -> ${dest}`)