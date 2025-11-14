const grid=document.getElementById("grid")
const audio=document.getElementById("player")
const btnPrev=document.getElementById("prev")
const btnPlay=document.getElementById("play")
const btnNext=document.getElementById("next")
let playlist=[]
let currentIndex=-1
let currentLyrics=[]
let lyricPointer=0
let lastRenderedPointer=-1
let tiles=[]
let audioCtx=null
let analyser=null
let sourceNode=null
let vizRAF=0
let vizCanvas=null
let vizHue=Math.floor(Math.random()*360)

async function loadPlaylist(){
  try{const res=await fetch("res/playlist.json");playlist=await res.json()}catch(e){playlist=[{title:"九万字",artist:"黄诗扶",audio:"res/jiuwanzi.mp3",lyrics:"res/jiuwanzi.txt"}]}
}

function createTile(item,i){
  const tile=document.createElement("div");tile.className="tile";tile.dataset.index=i
  const surface=document.createElement("div");surface.className="surface";if(item.cover)surface.style.backgroundImage=`url(${item.cover})`
  const meta=document.createElement("div");meta.className="meta"
  const title=document.createElement("div");title.className="title";title.textContent=`《${item.title}》`
  const artist=document.createElement("div");artist.className="artist";artist.textContent=item.artist||""
  const lyrics=document.createElement("div");lyrics.className="lyrics"
  const viz=document.createElement("canvas");viz.className="viz hidden"
  const progress=document.createElement("div");progress.className="progress"
  const bar=document.createElement("div");bar.className="bar";progress.appendChild(bar)
  meta.appendChild(title);meta.appendChild(artist)
  tile.appendChild(surface);tile.appendChild(meta);tile.appendChild(lyrics);tile.appendChild(viz);tile.appendChild(progress)
  tile.addEventListener("click",()=>playIndex(i))
  const col=(i%4)+1;const row=Math.floor(i/4)+1
  tile.dataset.col=String(col);tile.dataset.row=String(row)
  tile.style.gridColumn=String(col);tile.style.gridRow=String(row)
  return tile
}

function render(){
  grid.innerHTML="";tiles=[]
  const count=Math.max(12,playlist.length)
  for(let i=0;i<count;i++){
    const item=playlist[i]||{title:"空位",artist:"",audio:"",lyrics:""}
    const t=createTile(item,i)
    grid.appendChild(t)
    tiles.push(t)
  }
}

function parseLrc(text){
  const lines=text.split(/\r?\n/)
  const result=[]
  for(const l of lines){
    const m=l.match(/\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\](.*)/)
    if(!m)continue
    const mm=parseInt(m[1],10),ss=parseInt(m[2],10)
    const dec=m[3]?parseInt(m[3],10):0
    const base=m[3]&&m[3].length===3?1000:100
    const t=mm*60+ss+dec/base
    const v=m[4].trim()
    result.push({t,v})
  }
  result.sort((a,b)=>a.t-b.t)
  return result
}

async function loadLyrics(url){
  if(!url)return[]
  const res=await fetch(url)
  const text=await res.text()
  return parseLrc(text)
}

async function playIndex(i){
  if(i<0||i>=playlist.length)return
  currentIndex=i
  const item=playlist[i]
  audio.src=item.audio
  currentLyrics=await loadLyrics(item.lyrics)
  lyricPointer=0
  lastRenderedPointer=-1
  for(let k=0;k<tiles.length;k++)tiles[k].classList.toggle("active",k===i)
  for(let k=0;k<tiles.length;k++)tiles[k].classList.toggle("shrink",k!==i)
  expandTile(i)
  hideInactiveLyrics()
  audio.play()
  startVisualizer()
  updateLyric(true)
}

function updateProgress(){
  if(currentIndex<0)return
  const d=audio.duration||0
  const c=audio.currentTime||0
  const bar=tiles[currentIndex].querySelector(".bar")
  if(!bar)return
  const p=d?Math.min(100,Math.max(0,(c/d)*100)):0
  bar.style.width=p+"%"
}

function ensureLyricContainer(){
  if(currentIndex<0)return null
  return tiles[currentIndex].querySelector(".lyrics")
}

function updateLyric(force){
  if(currentIndex<0)return
  const ct=audio.currentTime
  while(lyricPointer+1<currentLyrics.length&&currentLyrics[lyricPointer+1].t<=ct)lyricPointer++
  if(!force && lyricPointer===lastRenderedPointer)return
  lastRenderedPointer=lyricPointer
  const container=ensureLyricContainer();if(!container)return
  const now=currentLyrics[lyricPointer];const next=currentLyrics[lyricPointer+1]
  container.innerHTML=""
  if(now){
    const l=buildLine(now.v,true);container.appendChild(l);placeOverlayChar(container,l)
  }
}

function applyLyricEffect(el){
  const pal=[
    ["139,92,246","236,72,153"],
    ["59,130,246","16,185,129"],
    ["244,114,182","99,102,241"],
    ["234,179,8","59,130,246"],
    ["168,85,247","34,197,94"]
  ]
  const p=pal[Math.floor(Math.random()*pal.length)]
  const a1=0.12+Math.random()*0.12
  const a2=0.08+Math.random()*0.12
  el.style.setProperty("--c1",`rgba(${p[0]},${a1.toFixed(2)})`)
  el.style.setProperty("--c2",`rgba(${p[1]},${a2.toFixed(2)})`)
  el.style.setProperty("--deg",`${120+Math.floor(Math.random()*120)}deg`)
}

function buildLine(text,isCurrent){
  const effects=["fx-fade","fx-left","fx-top","fx-diag","fx-type","fx-charburst"]
  const pick=effects[Math.floor(Math.random()*effects.length)]
  const line=document.createElement("div")
  line.className=`line animate ${pick}`
  applyLyricEffect(line)
  if(pick==="fx-type"||pick==="fx-charburst"){
    const chars=[...text]
    const burstIndex=Math.floor(Math.random()*Math.max(1,chars.length))
    const delayBase=isCurrent?40:25
    for(let i=0;i<chars.length;i++){
      const s=document.createElement("span")
      s.textContent=chars[i]
      s.style.transition=`opacity .35s ease, transform .35s ease`
      s.style.transitionDelay=`${i*delayBase}ms`
      if(pick==="fx-charburst"&&i===burstIndex)s.classList.add("big")
      line.appendChild(s)
    }
  }else{
    line.textContent=text
  }
  requestAnimationFrame(()=>{line.classList.add("show")})
  return line
}

function hideInactiveLyrics(){
  for(let k=0;k<tiles.length;k++){
    if(k===currentIndex)continue
    const c=tiles[k].querySelector(".lyrics")
    if(c)c.innerHTML=""
    const v=tiles[k].querySelector(".viz")
    if(v){const ctx=v.getContext("2d");ctx&&ctx.clearRect(0,0,v.width,v.height);v.classList.add("hidden")}
  }
}

function resetLayout(){
  for(const t of tiles){
    const c=t.dataset.col,r=t.dataset.row
    t.style.gridColumn=String(c)
    t.style.gridRow=String(r)
    t.classList.remove("collapsed")
  }
}

function expandTile(i){
  resetLayout()
  const t=tiles[i]
  const row=parseInt(t.dataset.row,10)
  const col=parseInt(t.dataset.col,10)
  const r0=row<=2?row:row-1
  const c0=col<=3?col:col-1
  t.style.gridRow=`${r0} / span 2`
  t.style.gridColumn=`${c0} / span 2`
  for(let k=0;k<tiles.length;k++){
    if(k===i)continue
    const r=parseInt(tiles[k].dataset.row,10)
    const c=parseInt(tiles[k].dataset.col,10)
    if(r>=r0&&r<=r0+1&&c>=c0&&c<=c0+1){tiles[k].classList.add("collapsed")}
  }
}

function positionLyrics(i){
  const t=tiles[i];const container=t.querySelector(".lyrics")
  if(!container)return
  const r=parseInt(t.dataset.row,10),c=parseInt(t.dataset.col,10)
  const opts=[
    {top:"auto",bottom:"54px",left:"10px",right:"10px"},
    {top:"16px",bottom:"auto",left:"10px",right:"10px"},
    {top:"auto",bottom:"14px",left:"20px",right:"auto"},
    {top:"auto",bottom:"14px",left:"auto",right:"20px"}
  ]
  let idx=0
  if(r===1&&c===1)idx=0
  else if(r===1)idx=2
  else if(c===4)idx=3
  else idx=Math.floor(Math.random()*opts.length)
  const o=opts[idx]
  container.style.setProperty("--top",o.top)
  container.style.setProperty("--bottom",o.bottom)
  container.style.setProperty("--left",o.left)
  container.style.setProperty("--right",o.right)
}

audio.addEventListener("timeupdate",()=>{updateProgress();updateLyric()})
audio.addEventListener("ended",()=>{const j=(currentIndex+1)%playlist.length;playIndex(j)})
audio.addEventListener("pause",()=>{stopVisualizer()})
audio.addEventListener("play",()=>{startVisualizer()})

btnPlay.addEventListener("click",()=>{if(!audio.src&&playlist.length)playIndex(0);else audio.paused?audio.play():audio.pause()})
btnPrev.addEventListener("click",()=>{if(!playlist.length)return;const j=(currentIndex<=0?playlist.length-1:currentIndex-1);playIndex(j)})
btnNext.addEventListener("click",()=>{if(!playlist.length)return;const j=(currentIndex+1)%playlist.length;playIndex(j)})

loadPlaylist().then(()=>{render()})

function ensureAudio(){
  if(audioCtx)return
  audioCtx=new (window.AudioContext||window.webkitAudioContext)()
  analyser=audioCtx.createAnalyser()
  analyser.fftSize=256
  sourceNode=audioCtx.createMediaElementSource(audio)
  sourceNode.connect(analyser)
  analyser.connect(audioCtx.destination)
}

function startVisualizer(){
  ensureAudio()
  vizCanvas=tiles[currentIndex]?.querySelector(".viz")||null
  if(!vizCanvas)return
  vizCanvas.classList.remove("hidden")
  vizHue=Math.floor(Math.random()*360)
  cancelAnimationFrame(vizRAF)
  const dpr=window.devicePixelRatio||1
  const w=Math.floor(vizCanvas.clientWidth*dpr)
  const h=Math.floor(vizCanvas.clientHeight*dpr)
  vizCanvas.width=w;vizCanvas.height=h
  const data=new Uint8Array(analyser.frequencyBinCount)
  const ctx=vizCanvas.getContext("2d")
  function draw(){
    if(!ctx)return
    analyser.getByteFrequencyData(data)
    ctx.clearRect(0,0,w,h)
    const cx=w/2,cy=h/2
    const base=Math.min(w,h)/2-8
    ctx.beginPath();ctx.arc(cx,cy,base,0,Math.PI*2);ctx.strokeStyle=`hsla(${vizHue},70%,55%,.25)`;ctx.lineWidth=2;ctx.stroke()
    const bins=64
    const step=Math.floor(data.length/bins)
    for(let i=0;i<bins;i++){
      const v=data[i*step]/255
      const a=(i/bins)*Math.PI*2
      const r0=base-6
      const r1=r0+v*20
      const x0=cx+Math.cos(a)*r0
      const y0=cy+Math.sin(a)*r0
      const x1=cx+Math.cos(a)*r1
      const y1=cy+Math.sin(a)*r1
      ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x1,y1);
      ctx.strokeStyle=`hsla(${(vizHue+i*3)%360},80%,60%,.9)`;ctx.lineWidth=2;ctx.stroke()
    }
    vizRAF=requestAnimationFrame(draw)
  }
  draw()
}

function stopVisualizer(){
  cancelAnimationFrame(vizRAF)
}

function placeOverlayChar(container,line){
  const txt=line.textContent||""
  if(!txt)return
  const idx=Math.floor(Math.random()*txt.length)
  const ch=txt[idx]
  const ov=document.createElement("div")
  ov.className="overlay-char"
  const hue=(vizHue+120+Math.floor(Math.random()*60))%360
  const size=28+Math.floor(Math.random()*24)
  ov.style.color=`hsl(${hue},85%,70%)`
  ov.style.fontSize=`${size}px`
  container.appendChild(ov)
  ov.textContent=ch
  const cr=container.getBoundingClientRect()
  const lr=line.getBoundingClientRect()
  const cx=(lr.left+lr.right)/2-cr.left
  const cy=(lr.top+lr.bottom)/2-cr.top
  const M=28
  const candidates=[
    {x:cx,y:lr.top-cr.top-M}, // above
    {x:cx,y:lr.bottom-cr.top+M}, // below
    {x:lr.left-cr.left-M,y:cy}, // left
    {x:lr.right-cr.left+M,y:cy}, // right
    {x:lr.left-cr.left-M,y:lr.top-cr.top-M}, // top-left
    {x:lr.right-cr.left+M,y:lr.top-cr.top-M}, // top-right
    {x:lr.left-cr.left-M,y:lr.bottom-cr.top+M}, // bottom-left
    {x:lr.right-cr.left+M,y:lr.bottom-cr.top+M} // bottom-right
  ]
  function fits(p){
    const half=size/2
    return p.x>=half && p.y>=half && p.x<=cr.width-half && p.y<=cr.height-half
  }
  let choice=null
  const order=[0,1,2,3,4,5,6,7].sort(()=>Math.random()-0.5)
  for(const i of order){if(fits(candidates[i])){choice=candidates[i];break}}
  if(!choice){choice={x:Math.min(cr.width-size,Math.max(size,cx)),y:Math.min(cr.height-size,Math.max(size,cy-size-M))}}
  ov.style.left=`${choice.x}px`
  ov.style.top=`${choice.y}px`
}