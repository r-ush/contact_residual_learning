(() => {
 'use strict';
 const leader=document.getElementById('concept-correction'),follower=document.getElementById('concept-failure');
 const clips=[leader,follower];
 const readyWaiters=new Set();
 let generation=0,loading=false,wantsPlaying=false,raf=0,pending=null;
 clips.forEach(v=>{v.controls=false;v.muted=true;});
 leader.loop=true;follower.loop=false;
 // Viewport playback owns play/pause; the paired animations have no local controls.
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
   sync();playFollower();
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
   clips.forEach(v=>v.pause());cancelAnimationFrame(raf);sync(true);
 }
 function seek(time){
   leader.currentTime=Math.max(0,Math.min(8,time));sync(true);
 }
 function start(){
   if(loading)return pending;
   const request=++generation;
   wantsPlaying=true;loading=true;
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
       if(request===generation)loading=false;
     }
   })();
   return pending;
 }
 leader.addEventListener('play',()=>{
   if(leader.paused)return;
   wantsPlaying=true;sync(true);playFollower();cancelAnimationFrame(raf);raf=requestAnimationFrame(tick);
 });
 leader.addEventListener('pause',()=>{
   if(!leader.paused)return;
   wantsPlaying=false;follower.pause();cancelAnimationFrame(raf);sync(true);
 });
 leader.addEventListener('seeking',()=>sync(true));
 leader.addEventListener('timeupdate',()=>sync());
 leader.addEventListener('ratechange',()=>sync(true));
 leader.addEventListener('waiting',()=>follower.pause());
 leader.addEventListener('playing',()=>{sync();playFollower();});
 window.CONCEPT_PAIR={leader,follower,play:start,pause,seek,get loading(){return loading;}};
})();
