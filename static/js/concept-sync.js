(() => {
 'use strict';
 const leader=document.getElementById('concept-correction'),follower=document.getElementById('concept-failure');
 const clips=[leader,follower],play=document.getElementById('concept-play');
 const slider=document.getElementById('concept-progress'),clock=document.getElementById('concept-time');
 const readyWaiters=new Set();
 let generation=0,loading=false,wantsPlaying=false,raf=0,pending=null;
 clips.forEach(v=>{v.controls=false;v.muted=true;});
 leader.loop=true;follower.loop=false;
 document.getElementById('concept-controls').hidden=false;
 function draw(){
   const time=leader.currentTime||0;
   slider.value=Math.round(time*30);clock.value=`${time.toFixed(1)} / 8.0 s`;
   play.textContent=loading||!leader.paused?'Pause both':'Play both';
 }
 function sync(force=false){
   if(follower.readyState<1)return;
   follower.playbackRate=leader.playbackRate;
   const target=Math.min(leader.currentTime,8-1/30);
   if(force||Math.abs(follower.currentTime-target)>.045)follower.currentTime=target;
 }
 function playFollower(){
   // Hold the follower's last frame until the leader wraps, instead of looping early.
   if(wantsPlaying&&!leader.paused&&leader.readyState>=3&&leader.currentTime<8-.045&&follower.paused)follower.play().catch(()=>{});
 }
 function tick(){
   sync();playFollower();draw();
   if(!leader.paused)raf=requestAnimationFrame(tick);
 }
 function ready(v){
   if(v.readyState>=2)return Promise.resolve();
   return new Promise((resolve,reject)=>{
     const cleanup=()=>{v.removeEventListener('loadeddata',ok);v.removeEventListener('error',error);readyWaiters.delete(cancel);};
     const ok=()=>{cleanup();resolve();};
     const error=()=>{cleanup();reject(new DOMException('Concept video could not load','NotSupportedError'));};
     const cancel=()=>{cleanup();reject(new DOMException('Concept playback cancelled','AbortError'));};
     readyWaiters.add(cancel);v.addEventListener('loadeddata',ok);v.addEventListener('error',error);
     v.preload='auto';v.load();
   });
 }
 function pause(){
   generation++;wantsPlaying=false;loading=false;
   [...readyWaiters].forEach(cancel=>cancel());
   clips.forEach(v=>v.pause());cancelAnimationFrame(raf);sync(true);draw();
 }
 function seek(time){
   leader.currentTime=Math.max(0,Math.min(8,time));sync(true);draw();
 }
 function start(){
   if(loading)return pending;
   const request=++generation;
   wantsPlaying=true;loading=true;draw();
   pending=(async()=>{
     try{
       // Both files must have a decoded first frame before starting the shared clock.
       await Promise.all(clips.map(ready));
       if(request!==generation)throw new DOMException('Concept playback cancelled','AbortError');
       if(leader.ended||leader.currentTime>=8-.035)seek(0);
       sync(true);
       await Promise.all(clips.map(v=>v.play()));
     }catch(error){
       if(request===generation)pause();
       throw error;
     }finally{
       if(request===generation){loading=false;draw();}
     }
   })();
   return pending;
 }
 leader.addEventListener('play',()=>{
   if(leader.paused)return;
   wantsPlaying=true;sync(true);playFollower();cancelAnimationFrame(raf);raf=requestAnimationFrame(tick);draw();
 });
 leader.addEventListener('pause',()=>{
   if(!leader.paused)return;
   wantsPlaying=false;follower.pause();cancelAnimationFrame(raf);sync(true);draw();
 });
 leader.addEventListener('seeking',()=>{sync(true);draw();});
 leader.addEventListener('timeupdate',()=>{sync();draw();});
 leader.addEventListener('ratechange',()=>sync(true));
 leader.addEventListener('waiting',()=>follower.pause());
 leader.addEventListener('playing',()=>{sync();playFollower();});
 slider.addEventListener('input',()=>seek(Number(slider.value)/30));
 play.addEventListener('click',()=>{
   if(loading||!leader.paused){leader.dispatchEvent(new Event('conceptmanualpause'));pause();}
   else start().catch(()=>{});
 });
 document.getElementById('concept-replay').addEventListener('click',()=>{seek(0);start().catch(()=>{});});
 window.CONCEPT_PAIR={leader,follower,play:start,pause,seek,get loading(){return loading;}};
 draw();
})();
