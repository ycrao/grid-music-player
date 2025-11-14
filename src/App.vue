<template>
  <div class="app">
    <header class="topbar">
      <div class="brand">十二宫格音乐</div>
      <div class="controls">
        <button @click="prev">上一首</button>
        <button @click="toggle">播放/暂停</button>
        <button @click="next">下一首</button>
      </div>
    </header>
    <main class="grid">
      <div v-for="i in count" :key="i-1" class="tile" :class="tileClass(i-1)" :style="tileStyle(i-1)" @click="playIndex(i-1)">
        <div class="surface" :style="{backgroundImage:cover(i-1)}"></div>
        <div class="meta"><div class="title">{{ title(i-1) }}</div><div class="artist">{{ artist(i-1) }}</div></div>
        <div class="lyrics" :ref="el => setLyricRef(el, i-1)"></div>
        <canvas class="viz hidden" :ref="el => setVizRef(el, i-1)"></canvas>
        <div class="progress"><div class="bar" :ref="el => setBarRef(el, i-1)"></div></div>
      </div>
    </main>
    <audio ref="audio" preload="metadata"></audio>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
const audio=ref(null)
const playlist=ref([])
const currentIndex=ref(-1)
const currentLyrics=ref([])
const lyricPointer=ref(0)
const lastRenderedPointer=ref(-1)
const lyricRefs=[]
const vizRefs=[]
const barRefs=[]
const setLyricRef=(el,idx)=>{lyricRefs[idx]=el}
const setVizRef=(el,idx)=>{vizRefs[idx]=el}
const setBarRef=(el,idx)=>{barRefs[idx]=el}
let audioCtx=null,analyser=null,sourceNode=null,vizRAF=0,vizHue=Math.floor(Math.random()*360),vizCanvas=null,pulsePrev=0,beatEnv=0,lastBeat=0
const count=12
const colRow=i=>({col:(i%4)+1,row:Math.floor(i/4)+1})
const title=i=>playlist.value[i]?`《${playlist.value[i].title}》`:'《空位》'
const artist=i=>playlist.value[i]?.artist||''
const cover=i=>playlist.value[i]?.cover?`url(${playlist.value[i].cover})`:''
const tileClass=i=>({active:currentIndex.value===i,shrink:currentIndex.value!==-1&&currentIndex.value!==i,collapsed:isCollapsed(i)})
const basePos=reactive({})
function tileStyle(i){const p=colRow(i);return {gridColumn:basePos[i]?.c??p.col,gridRow:basePos[i]?.r??p.row}}
function isCollapsed(i){if(currentIndex.value<0)return false;const t=colRow(currentIndex.value);const r0=t.row<=2?t.row:t.row-1;const c0=t.col<=3?t.col:t.col-1;const p=colRow(i);return i!==currentIndex.value && p.row>=r0&&p.row<=r0+1&&p.col>=c0&&p.col<=c0+1}
async function loadPlaylist(){try{const res=await fetch('/res/playlist.json');const items=await res.json();playlist.value=normalizePaths(items)}catch(e){playlist.value=normalizePaths([{title:'九万字',artist:'黄诗扶',audio:'res/jiuwanzi.mp3',lyrics:'res/jiuwanzi.txt',cover:'res/cover01.svg'}])}}
function normalizePaths(items){return items.map(it=>{const fix=p=>!p?p:(p.startsWith('/')?p:`/${p}`);return {...it,audio:fix(it.audio),lyrics:fix(it.lyrics),cover:fix(it.cover)}})}
function parseLrc(text){const lines=text.split(/\r?\n/);const result=[];for(const l of lines){const m=l.match(/\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\](.*)/);if(!m)continue;const mm=parseInt(m[1],10),ss=parseInt(m[2],10);const dec=m[3]?parseInt(m[3],10):0;const base=m[3]&&m[3].length===3?1000:100;const t=mm*60+ss+dec/base;const v=m[4].trim();result.push({t,v})}result.sort((a,b)=>a.t-b.t);return result}
async function loadLyrics(url){if(!url)return[];const res=await fetch(url);const text=await res.text();return parseLrc(text)}
function resetLayout(){for(let k=0;k<count;k++){const p=colRow(k);basePos[k]={c:p.col,r:p.row}}}
function expandTile(i){resetLayout();const p=colRow(i);const r0=p.row<=2?p.row:p.row-1;const c0=p.col<=3?p.col:p.col-1;basePos[i]={c:`${c0} / span 2`,r:`${r0} / span 2`}}
function ensureLyricContainer(){if(currentIndex.value<0)return null;return lyricRefs[currentIndex.value]}
function ensureBar(){if(currentIndex.value<0)return null;return barRefs[currentIndex.value]}
function updateProgress(){const bar=ensureBar();if(!bar)return;const d=audio.value.duration||0;const c=audio.value.currentTime||0;const p=d?Math.min(100,Math.max(0,(c/d)*100)):0;bar.style.width=p+'%'}
function applyLyricEffect(el){const pal=[["139,92,246","236,72,153"],["59,130,246","16,185,129"],["244,114,182","99,102,241"],["234,179,8","59,130,246"],["168,85,247","34,197,94"]];const p=pal[Math.floor(Math.random()*pal.length)];const a1=0.12+Math.random()*0.12;const a2=0.08+Math.random()*0.12;el.style.setProperty('--c1',`rgba(${p[0]},${a1.toFixed(2)})`);el.style.setProperty('--c2',`rgba(${p[1]},${a2.toFixed(2)})`);el.style.setProperty('--deg',`${120+Math.floor(Math.random()*120)}deg`)}
function buildLine(text,isCurrent){const effects=['fx-fade','fx-left','fx-top','fx-diag','fx-type','fx-charburst'];const pick=effects[Math.floor(Math.random()*effects.length)];const line=document.createElement('div');line.className=`line animate ${pick}`;applyLyricEffect(line);if(pick==='fx-type'||pick==='fx-charburst'){const chars=[...text];const burstIndex=Math.floor(Math.random()*Math.max(1,chars.length));const delayBase=isCurrent?40:25;for(let i=0;i<chars.length;i++){const s=document.createElement('span');s.textContent=chars[i];s.style.transition='opacity .35s ease, transform .35s ease';s.style.transitionDelay=`${i*delayBase}ms`;if(pick==='fx-charburst'&&i===burstIndex)s.classList.add('big');line.appendChild(s)}}else{line.textContent=text}requestAnimationFrame(()=>{line.classList.add('show')});return line}
function placeOverlayChar(container,line){const txt=line.textContent||'';if(!txt)return;const idx=Math.floor(Math.random()*txt.length);const ch=txt[idx];const ov=document.createElement('div');ov.className='overlay-char';const hue=(vizHue+120+Math.floor(Math.random()*60))%360;const size=28+Math.floor(Math.random()*24);ov.style.color=`hsl(${hue},85%,70%)`;ov.style.fontSize=`${size}px`;container.appendChild(ov);ov.textContent=ch;const cr=container.getBoundingClientRect();const lr=line.getBoundingClientRect();const cx=(lr.left+lr.right)/2-cr.left;const cy=(lr.top+lr.bottom)/2-cr.top;const M=28;const candidates=[{x:cx,y:lr.top-cr.top-M},{x:cx,y:lr.bottom-cr.top+M},{x:lr.left-cr.left-M,y:cy},{x:lr.right-cr.left+M,y:cy},{x:lr.left-cr.left-M,y:lr.top-cr.top-M},{x:lr.right-cr.left+M,y:lr.top-cr.top-M},{x:lr.left-cr.left-M,y:lr.bottom-cr.top+M},{x:lr.right-cr.left+M,y:lr.bottom-cr.top+M}];function fits(p){const half=size/2;return p.x>=half&&p.y>=half&&p.x<=cr.width-half&&p.y<=cr.height-half}let choice=null;const order=[0,1,2,3,4,5,6,7].sort(()=>Math.random()-0.5);for(const idx of order){if(fits(candidates[idx])){choice=candidates[idx];break}}if(!choice){choice={x:Math.min(cr.width-size,Math.max(size,cx)),y:Math.min(cr.height-size,Math.max(size,cy-size-M))}}ov.style.left=`${choice.x}px`;ov.style.top=`${choice.y}px`}
function hideInactive(){for(let k=0;k<count;k++){if(k===currentIndex.value)continue;const c=lyricRefs[k];if(c)c.innerHTML='';const v=vizRefs[k];if(v){const ctx=v.getContext('2d');ctx&&ctx.clearRect(0,0,v.width,v.height);v.classList.add('hidden')}}}
function ensureAudio(){if(audioCtx)return;audioCtx=new (window.AudioContext||window.webkitAudioContext)();analyser=audioCtx.createAnalyser();analyser.fftSize=256;sourceNode=audioCtx.createMediaElementSource(audio.value);sourceNode.connect(analyser);analyser.connect(audioCtx.destination)}
function startVisualizer(){ensureAudio();vizCanvas=vizRefs[currentIndex.value];if(!vizCanvas)return;vizCanvas.classList.remove('hidden');vizHue=Math.floor(Math.random()*360);cancelAnimationFrame(vizRAF);const dpr=window.devicePixelRatio||1;const w=Math.floor(vizCanvas.clientWidth*dpr);const h=Math.floor(vizCanvas.clientHeight*dpr);vizCanvas.width=w;vizCanvas.height=h;const data=new Uint8Array(analyser.frequencyBinCount);const ctx=vizCanvas.getContext('2d');function draw(){analyser.getByteFrequencyData(data);ctx.clearRect(0,0,w,h);const bins=96;const step=Math.floor(data.length/bins);let energy=0;const baseline=h*0.6;for(let i=0;i<bins;i++){const v=data[i*step]/255;const x=(i/(bins-1))*w;const amp=v*h*0.45;const y1=baseline-amp;const y2=baseline+amp*0.06;ctx.beginPath();ctx.moveTo(x,y1);ctx.lineTo(x,y2);ctx.strokeStyle=`hsla(${(vizHue+i*4)%360},88%,62%,.95)`;ctx.lineWidth=2.4;ctx.stroke();if(i<22)energy+=v}energy/=22;vizHue=(vizHue+1+energy*7)%360;const now=audioCtx.currentTime;beatEnv=beatEnv*0.9+energy*0.1;const delta=energy-beatEnv;if(delta>0.12 && now-lastBeat>0.18){lastBeat=now;setPulse(energy,true);spawnBeatGlow()}else{setPulse(energy,false)}vizRAF=requestAnimationFrame(draw)}draw()}
function stopVisualizer(){cancelAnimationFrame(vizRAF)}
async function playIndex(i){if(i<0||i>=playlist.value.length)return;currentIndex.value=i;audio.value.src=playlist.value[i].audio;currentLyrics.value=await loadLyrics(playlist.value[i].lyrics);lyricPointer.value=0;lastRenderedPointer.value=-1;expandTile(i);hideInactive();audio.value.play();startVisualizer();updateLyric(true)}
function updateLyric(force){if(currentIndex.value<0)return;const ct=audio.value.currentTime;while(lyricPointer.value+1<currentLyrics.value.length&&currentLyrics.value[lyricPointer.value+1].t<=ct)lyricPointer.value++;if(!force&&lyricPointer.value===lastRenderedPointer.value)return;lastRenderedPointer.value=lyricPointer.value;const container=ensureLyricContainer();if(!container)return;const now=currentLyrics.value[lyricPointer.value];container.innerHTML='';if(now){const l=buildLine(now.v,true);l.style.setProperty('--rot',`${(Math.random()*6-3).toFixed(1)}deg`);container.appendChild(l);placeOverlayChar(container,l)}}
function setPulse(level,beat){const el=ensureLyricContainer();if(!el)return;const line=el.querySelector('.line');if(!line)return;pulsePrev=pulsePrev*0.8+level*0.2;const boost=beat?0.45:0.0;const val=(1+pulsePrev*0.9+boost).toFixed(3);line.style.setProperty('--pulse',val);if(beat){line.style.setProperty('--rot',`${(Math.random()*10-5).toFixed(1)}deg`)}}
function spawnBeatGlow(){const tile=lyricRefs[currentIndex.value]?.parentElement;if(!tile)return;const g=document.createElement('div');g.className='beat-glow';tile.appendChild(g);setTimeout(()=>{g.remove()},450)}
function prev(){if(!playlist.value.length)return;const j=currentIndex.value<=0?playlist.value.length-1:currentIndex.value-1;playIndex(j)}
function next(){if(!playlist.value.length)return;const j=(currentIndex.value+1)%playlist.value.length;playIndex(j)}
function toggle(){if(!audio.value.src&&playlist.value.length){playIndex(0)}else{audio.value.paused?audio.value.play():audio.value.pause()}}
onMounted(async()=>{await loadPlaylist();resetLayout();audio.value.addEventListener('timeupdate',()=>{updateProgress();updateLyric()});audio.value.addEventListener('ended',()=>{const j=(currentIndex.value+1)%playlist.value.length;playIndex(j)});audio.value.addEventListener('pause',()=>{stopVisualizer()});audio.value.addEventListener('play',()=>{startVisualizer()})})
</script>