// ImageGen source is kept intact. The atlas uses a magenta color key, composed
// once on load, as classic sprite engines do for RGB textures without alpha.
export const NPC_FRAMES=Object.freeze({
 tea:Object.freeze([218,578,942,1303].map((px,i)=>Object.freeze({x:i*384,y:0,w:384,h:512,px,py:504}))),
 herbalist:Object.freeze([220,582,947,1313].map((px,i)=>Object.freeze({x:i*384,y:512,w:384,h:512,px,py:1014}))),
});
const IDLE=[0,0,0,1,2,2,3,0];
export function npcFrame(id,time=0){
 const frames=NPC_FRAMES[id];if(!frames)return null;
 const offset=id==='herbalist'?3:0;
 return frames[IDLE[(Math.floor(Math.max(0,time)*2.5)+offset)%IDLE.length]];
}
export function colorKeyAlpha(r,g,b,alpha){
 return r>100&&b>80&&Math.min(r,b)-g>38?0:alpha;
}
export class ChapterNPCs{
 constructor(){this.image=new Image();this.image.src='./assets/chapter-npcs-keyed.png';this.texture=null;}
 prepare(){
  const canvas=document.createElement('canvas');canvas.width=this.image.naturalWidth;canvas.height=this.image.naturalHeight;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(this.image,0,0);
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),data=pixels.data;
  for(let i=0;i<data.length;i+=4)data[i+3]=colorKeyAlpha(data[i],data[i+1],data[i+2],data[i+3]);
  ctx.putImageData(pixels,0,0);this.texture=canvas;
 }
 draw(ctx,person,time,{near=false,faceLeft=false}={}){
  const frame=npcFrame(person.id,time);if(!this.texture||!frame)return false;
  const scale=112/490;
  ctx.save();ctx.translate(Math.round(person.x),Math.round(person.y));ctx.imageSmoothingEnabled=false;
  ctx.fillStyle='#071c2488';ctx.beginPath();ctx.ellipse(0,0,22,7,0,0,Math.PI*2);ctx.fill();
  if(near){ctx.strokeStyle='#e9d099a0';ctx.lineWidth=1.5;ctx.stroke();}
  if(faceLeft)ctx.scale(-1,1);
  ctx.drawImage(this.texture,frame.x,frame.y,frame.w,frame.h,(frame.x-frame.px)*scale,(frame.y-frame.py)*scale,frame.w*scale,frame.h*scale);
  ctx.restore();return true;
 }
}
