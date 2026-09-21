(() => {
 'use strict';
 const videos=[...document.querySelectorAll('video')];
 const evaluation=[document.getElementById('eval-original'),document.getElementById('eval-back')];
 const play=document.getElementById('play-both');
 const insertion=document.getElementById('base-insertion');
 const speedLabel=document.getElementById('speed-label');
 const updateSpeed=()=>{speedLabel.textContent=insertion.currentTime<5?'3× approach':'1× insertion';};
 ['timeupdate','seeking'].forEach(event=>insertion.addEventListener(event,updateSpeed));
 let paired=false;
 const pauseOthers=exceptions=>videos.forEach(v=>{if(!exceptions.includes(v))v.pause();});
 videos.forEach(video=>video.addEventListener('play',()=>{
   if(paired&&evaluation.includes(video))pauseOthers(evaluation);
   else if(video.dataset.playGroup){paired=false;pauseOthers(videos.filter(v=>v.dataset.playGroup===video.dataset.playGroup));}
   else {paired=false;pauseOthers([video]);}
 }));
 function update(){play.textContent=evaluation.some(v=>!v.paused)?'Pause both':'Play both';}
 evaluation.forEach(v=>['play','pause','ended'].forEach(event=>v.addEventListener(event,update)));
 // Keep the fixed tape and box foot visible, even while paused: controls sit below the image.
 document.querySelectorAll('.clip-controls').forEach(controls=>{
   const video=document.getElementById(controls.dataset.media);
   const button=controls.querySelector('button'),seek=controls.querySelector('input'),time=controls.querySelector('output');
   video.controls=false;controls.hidden=false;
   function refresh(){
     const duration=Number.isFinite(video.duration)?video.duration:15;
     button.textContent=video.paused?'Play':'Pause';
     button.setAttribute('aria-label',`${video.paused?'Play':'Pause'} ${controls.dataset.name} video`);
     seek.value=duration?Math.round(1000*video.currentTime/duration):0;
     time.textContent=`${video.currentTime.toFixed(1)} / ${duration.toFixed(1)} s`;
     seek.setAttribute('aria-valuetext',time.textContent);
   }
   button.addEventListener('click',()=>{if(video.paused)video.play().catch(()=>{});else video.pause();});
   seek.addEventListener('input',()=>{if(Number.isFinite(video.duration))video.currentTime=Number(seek.value)/1000*video.duration;});
   ['play','pause','timeupdate','loadedmetadata','seeking','ended'].forEach(event=>video.addEventListener(event,refresh));
   refresh();
 });
 async function startBoth(reset){
   paired=true;pauseOthers(evaluation);
   if(reset)evaluation.forEach(v=>{v.currentTime=0;});
   await Promise.all(evaluation.map(v=>v.play().catch(()=>{})));update();
 }
 play.addEventListener('click',()=>{
   if(evaluation.some(v=>!v.paused)){evaluation.forEach(v=>v.pause());paired=false;}
   else startBoth(false);
 });
 document.getElementById('replay-both').addEventListener('click',()=>startBoth(true));
})();
