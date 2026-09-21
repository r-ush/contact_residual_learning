(() => {
 'use strict';
 const D=window.BASE_ROLLOUT;
 if(!D)return;
 const get=id=>document.getElementById(id),base=get('base-insertion'),wrist=get('rollout-wrist');
 const canvas=get('rollout-trajectory'),ctx=canvas.getContext('2d');
 const slider=get('rollout-progress'),play=get('rollout-play'),clock=get('rollout-time');
 const W=640,H=640,project=p=>{
   const h=D.projection.map(row=>row[0]*p[0]+row[1]*p[1]+row[2]*p[2]+row[3]);
   return [h[0]/h[2],h[1]/h[2]];
 };
 const points=[...D.pose,...D.target],bounds=[0,1].map(d=>[Math.min(...points.map(p=>project(p)[d])),Math.max(...points.map(p=>project(p)[d]))]);
 const scale=Math.min((W-100)/(bounds[0][1]-bounds[0][0]),(H-155)/(bounds[1][1]-bounds[1][0]));
 const P=p=>{const v=project(p);return [W/2+(v[0]-(bounds[0][0]+bounds[0][1])/2)*scale,285+(v[1]-(bounds[1][0]+bounds[1][1])/2)*scale];};
 const poses=D.pose.map(P),targets=D.target.map(P);
 const cache=document.createElement('canvas');cache.width=W;cache.height=H;
 const bg=cache.getContext('2d');
 let raf=0,presented=-1,lastFrame=-1;
 function line(context,points,color,width,until=points.length-1){
   context.strokeStyle=color;context.lineWidth=width;context.beginPath();
   for(let i=0;i<=until;i++){if(i===0)context.moveTo(...points[i]);else context.lineTo(...points[i]);}context.stroke();
 }
 function dot(p,color,r){ctx.beginPath();ctx.fillStyle=color;ctx.arc(...p,r,0,7);ctx.fill();}
 // Stable whole-rollout extent. One camera and one coordinate frame, no per-frame re-centering.
 line(bg,poses,'#d5e1e8',2.8);
 bg.setLineDash([6,7]);line(bg,targets,'#e0e3e5',2);bg.setLineDash([]);
 // Axis direction marker uses the same perspective projection's local differential.
 const center=[0,1,2].map(d=>D.pose.reduce((s,p)=>s+p[d],0)/D.n),anchor=[74,545];
 const pc=project(center),colors=['#bd5858','#549168','#547baf'];
 ['X','Y','Z'].forEach((name,d)=>{
   const q=[...center];q[d]+=.03;const r=project(q),dx=(r[0]-pc[0])*scale,dy=(r[1]-pc[1])*scale;
   const length=Math.hypot(dx,dy),ratio=48/Math.max(length,1e-9);const end=[anchor[0]+dx*ratio,anchor[1]+dy*ratio];
   line(bg,[anchor,end],colors[d],2);bg.fillStyle=colors[d];bg.font='19px Arial';bg.fillText(name,end[0]+4,end[1]-4);
 });
 bg.fillStyle='#7e8990';bg.font='18px Arial';bg.fillText('Absolute base coordinates · meters',22,H-22);
 function draw(force=false){
   const time=Math.max(0,Math.min(D.duration,base.currentTime||0));
   let k=Math.min(D.n-1,Math.floor(time*D.fps+1e-4));
   if(!base.paused&&!base.seeking&&presented>=0)k=presented;
   if(k!==lastFrame||force){
     lastFrame=k;ctx.clearRect(0,0,W,H);ctx.drawImage(cache,0,0);
     line(ctx,poses,'#2088b7',4,k);ctx.setLineDash([7,7]);line(ctx,targets,'#7c858c',2.4,k);ctx.setLineDash([]);
     line(ctx,[poses[k],targets[k]],'#7c858c',1.5);
     dot(targets[k],'#7c858c',5);dot(poses[k],'white',9);dot(poses[k],'#2088b7',6);
     get('rollout-sample').textContent=`Same rollout · ep03 · log ${D.sampleTime[k].toFixed(2)} s · sample ${D.sampleIndex[k]}`;
   }
   slider.value=Math.round(time*D.fps);clock.value=`${time.toFixed(1)} / 15.0 s`;
 }
 function sync(force=false){
   if(wrist.readyState<1)return;
   const t=Math.min(D.duration-1/D.fps,base.currentTime||0);
   wrist.playbackRate=base.playbackRate;
   if(force||Math.abs(wrist.currentTime-t)>.065)wrist.currentTime=t;
 }
 function tick(){sync();draw();if(!base.paused&&!base.ended)raf=requestAnimationFrame(tick);}
 function pause(){wrist.pause();cancelAnimationFrame(raf);play.textContent='Play rollout';sync(true);draw(true);}
 function start(){
   play.textContent='Pause rollout';sync(true);
   wrist.play().catch(()=>{});cancelAnimationFrame(raf);raf=requestAnimationFrame(tick);
 }
 function seek(seconds){presented=-1;base.currentTime=Math.max(0,Math.min(D.duration,seconds));sync(true);draw(true);}
 base.addEventListener('play',start);base.addEventListener('pause',pause);
 base.addEventListener('ended',pause);base.addEventListener('seeking',()=>{presented=-1;sync(true);draw(true);});
 base.addEventListener('timeupdate',()=>{sync();draw();});base.addEventListener('ratechange',()=>sync(true));
 base.addEventListener('waiting',()=>wrist.pause());
 base.addEventListener('playing',()=>{if(!base.paused)wrist.play().catch(()=>{});});
 wrist.addEventListener('loadedmetadata',()=>{sync(true);if(!base.paused)wrist.play().catch(()=>{});});
 if('requestVideoFrameCallback' in wrist){
   const onFrame=(_now,meta)=>{presented=Math.min(D.n-1,Math.round(meta.mediaTime*D.fps));if(!base.paused)draw();wrist.requestVideoFrameCallback(onFrame);};
   wrist.requestVideoFrameCallback(onFrame);
 }
 slider.addEventListener('input',()=>seek(+slider.value/D.fps));
 play.addEventListener('click',()=>{
   if(!base.paused){base.pause();wrist.pause();}
   else{if(base.ended||base.currentTime>=D.duration-.03)seek(0);base.play().catch(()=>{});}
 });
 get('rollout-replay').addEventListener('click',()=>{seek(0);base.play().catch(()=>{});});
 draw(true);
})();
