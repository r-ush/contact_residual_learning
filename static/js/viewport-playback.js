(() => {
 'use strict';
 const videos=[...document.querySelectorAll('video')];
 const base=document.getElementById('base-insertion'),wrist=document.getElementById('rollout-wrist');
 const concepts=window.CONCEPT_PAIR;
 const toggle=document.getElementById('scroll-autoplay'),notice=document.getElementById('playback-notice');
 // The author explicitly requested viewport video autoplay. Keep that choice independent
 // of OS animation settings; CSS still honors reduced motion for smooth scrolling.
 let autoplayEnabled=true;
 // Main's existing play-group coordinator keeps the visible evaluation pair together.
 ['eval-original','eval-back'].forEach(id=>{document.getElementById(id).dataset.playGroup='evaluation';});
 const group=v=>v.dataset.playGroup||v.id;
 const manualPaused=new Set(),failed=new Set(),expectedPlay=new Set(),expectedPause=new Set();
 let active=null,manualFocus=null,eligible=new Set(),frame=0;
 videos.forEach(v=>{v.autoplay=false;v.defaultMuted=true;v.muted=true;v.playsInline=true;v.pause();});
 toggle.parentElement.hidden=false;

 function refreshMode(){
   const blocked=autoplayEnabled&&[...eligible].some(v=>failed.has(v));
   toggle.textContent=blocked?'Retry autoplay':`Scroll autoplay · ${autoplayEnabled?'On':'Off'}`;
   toggle.setAttribute('aria-pressed',String(autoplayEnabled));
   document.body.dataset.scrollAutoplay=blocked?'blocked':autoplayEnabled?'on':'off';
   notice.hidden=!blocked;
   if(blocked){
     const policyBlocked=[...eligible].some(v=>v.dataset.playbackError==='NotAllowedError');
     notice.textContent=policyBlocked?'Browser blocked playback. Click Retry autoplay.':'Video playback failed. Click Retry autoplay.';
   }
 }

 function visibility(element){
   const r=element.getBoundingClientRect(),h=window.innerHeight,w=window.innerWidth;
   if(!r.width||!r.height)return null;
   const shown=Math.max(0,Math.min(r.bottom,h)-Math.max(r.top,0));
   const across=Math.max(0,Math.min(r.right,w)-Math.max(r.left,0));
   const fraction=shown/Math.min(r.height,h);
   if(fraction<.35||across/Math.min(r.width,w)<.35)return null;
   return fraction-.35*Math.min(1,Math.abs((r.top+r.bottom)/2-h/2)/h);
 }
 function pause(v){
   if(v===concepts?.leader){
     if(!v.paused)expectedPause.add(v);
     concepts.pause();return;
   }
   if(!v.paused){expectedPause.add(v);v.pause();}
 }
 function start(v){
   if(!v.paused||manualPaused.has(v)||failed.has(v)||(v===concepts?.leader&&concepts.loading))return;
   if(v.ended)v.currentTime=0;
   expectedPlay.add(v);
   (v===concepts?.leader?concepts.play():v.play()).catch(error=>{
     expectedPlay.delete(v);
     // Aborted play is normal when a fast scroll pauses a video before it loads.
     if(error.name!=='AbortError'){failed.add(v);v.dataset.playbackError=error.name;refreshMode();}
   });
 }
 function update(){
   frame=0;
   if(document.hidden){videos.forEach(pause);return;}
   const scores=new Map(),visible=new Set();
   videos.forEach(v=>{
     const score=visibility(v);
     if(score!==null){visible.add(v);scores.set(group(v),Math.max(scores.get(group(v))??-Infinity,score));}
   });
   // On narrow screens the trajectory may be visible without either camera.
   const trajectoryScore=visibility(document.getElementById('rollout-trajectory'));
   if(trajectoryScore!==null)scores.set('base-rollout',Math.max(scores.get('base-rollout')??-Infinity,trajectoryScore));
   let next=[...scores].sort((a,b)=>b[1]-a[1])[0]?.[0]||null;
   if(manualFocus&&!scores.has(manualFocus))manualFocus=null;
   if(manualFocus)next=manualFocus;
   // A small dead band prevents two adjacent regions fighting at the boundary.
   else if(active&&scores.has(active)&&next&&scores.get(next)-scores.get(active)<.06)next=active;
   if(next!==active){manualPaused.clear();failed.clear();active=next;}
   document.body.dataset.activePlayback=active||'';
   const wanted=new Set(videos.filter(v=>group(v)===active&&visible.has(v)));
   // Base is the clock for wrist RGB and the canvas. Keep this measured group synchronized.
   if(active==='base-rollout'){wanted.add(base);wanted.add(wrist);}
   if(active==='residual-concept'&&concepts){wanted.add(concepts.leader);wanted.add(concepts.follower);}
   eligible.forEach(v=>{if(!wanted.has(v)){manualPaused.delete(v);failed.delete(v);}});
   eligible=wanted;
   videos.forEach(v=>{if(!wanted.has(v))pause(v);});
   if(autoplayEnabled)wanted.forEach(v=>{if(v!==wrist&&v!==concepts?.follower)start(v);});
   refreshMode();
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(update);}
 videos.forEach(v=>{
   v.addEventListener('play',()=>{
     if(v===wrist||v===concepts?.follower)return; // Shared-clock controllers own their followers.
     const automatic=expectedPlay.delete(v);
     if(!automatic&&!v.paused){manualPaused.delete(v);failed.delete(v);if(visibility(v)!==null)manualFocus=group(v);}
     schedule();
   });
   v.addEventListener('pause',()=>{
     const automatic=expectedPause.delete(v);
     if(v===wrist||v===concepts?.follower||automatic||!v.paused)return;
     if(group(v)===active&&eligible.has(v))manualPaused.add(v);
   });
   v.addEventListener('ended',()=>manualPaused.add(v));
   v.addEventListener('loadedmetadata',schedule);
   v.addEventListener('error',()=>{failed.add(v);v.dataset.playbackError=`MediaError:${v.error?.code||'unknown'}`;refreshMode();});
 });
 concepts?.leader.addEventListener('conceptmanualpause',()=>manualPaused.add(concepts.leader));
 window.addEventListener('scroll',schedule,{passive:true});
 window.addEventListener('resize',schedule,{passive:true});
 window.addEventListener('pageshow',schedule);
 document.addEventListener('visibilitychange',()=>{
   if(document.hidden)videos.forEach(pause);else schedule();
 });
 toggle.addEventListener('click',()=>{
   const retry=autoplayEnabled&&[...eligible].some(v=>failed.has(v));
   autoplayEnabled=retry||!autoplayEnabled;
   if(!autoplayEnabled)videos.forEach(pause);
   else{
     eligible.forEach(v=>{if(v.error)v.load();delete v.dataset.playbackError;});
     manualPaused.clear();failed.clear();manualFocus=null;
   }
   // Run in the click event itself so the retry retains the browser's user activation.
   if(frame){cancelAnimationFrame(frame);frame=0;}
   update();
 });
 // Font and media layout can settle after the initial viewport calculation.
 if('ResizeObserver' in window)new ResizeObserver(schedule).observe(document.querySelector('main'));
 document.fonts?.ready.then(schedule);
 schedule();
})();
