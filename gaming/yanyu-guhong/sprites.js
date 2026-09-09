// Original ImageGen PNGs stay untouched. Rectangles and foot pivots compensate
// for the generated atlas's nonuniform gutters, avoiding clipping and foot jitter.
const frame=(x,y,w,h,px,py)=>({x,y,w,h,px,py});
export const HERO_FRAMES=[
 ...Array.from({length:4},(_,i)=>frame(64+i*314,20,207,285,160+i*314,300)),
 ...Array.from({length:4},(_,i)=>frame(54+i*314,333,222,279,180+i*314,604)),
 ...Array.from({length:4},(_,i)=>frame(66+i*314,643,195,287,157+i*314,925)),
 frame(0,1010,265,216,164,1220),frame(352,958,248,266,474,1220),
 frame(653,974,354,251,793,1220),frame(1010,960,199,264,1117,1220)
];
export const CAST_FRAMES=[
 ...Array.from({length:4},(_,i)=>frame(54+i*362,20,255,335,180+i*362,349)),
 frame(45,373,224,322,161,687),frame(414,380,235,315,523,687),
 frame(769,380,285,315,885,687),frame(1061,395,385,300,1193,687),
 frame(3,700,285,364,161,1056),frame(354,700,308,364,523,1056),
 frame(725,700,293,364,885,1056),frame(1050,700,397,364,1207,1056)
];
export function heroFrame(p,time){
 time=Math.max(0,time||0);const a=p.facing??0;
 if(p.actionTime>0){const f=Math.min(3,Math.floor((1-p.actionTime/p.actionDuration)*4));return {index:12+Math.max(0,f),flip:Math.cos(a)<-.1,action:p.action};}
 if(p.dash>0)return {index:12,flip:Math.cos(a)<-.1,action:'dash'};
 const row=Math.abs(Math.sin(a))>.65?(Math.sin(a)<0?2:0):1;
 return {index:row*4+(p.moving?Math.floor(time*9)%4:1),flip:row===1&&Math.cos(a)<0,action:p.moving?'walk':'idle'};
}
export class SpriteAtlas {
 constructor(onLoad=()=>{}){this.hero=new Image();this.cast=new Image();for(const [img,src] of [[this.hero,'hero-hd-sheet.png'],[this.cast,'cast-hd-sheet.png']]){img.onload=onLoad;img.src=`./assets/${src}`;}}
 draw(c,kind,p,time,{previewScale=1,ghost=false}={}){
 time=Math.max(0,time||0);const hero=kind==='hero',img=hero?this.hero:this.cast;
 if(!img.complete||!img.naturalWidth)return false;
 let selection;
 if(hero)selection=heroFrame(p,time);
 else if(kind==='npc')selection={index:[0,1,0,2,0,3][Math.floor(time*2)%6],flip:false,action:'idle'};
 else selection={index:(kind==='boss'?8:4)+(p.attackAnim>0?3:p.wind>0?0:p.moving?1+Math.floor(time*7)%2:0),flip:Math.cos(p.facing??Math.PI)<0,action:p.attackAnim>0?'attack':p.moving?'walk':'idle'};
 const f=(hero?HERO_FRAMES:CAST_FRAMES)[selection.index];
 const scale=(hero?88/270:kind==='boss'?112/350:86/320)*previewScale;
 const breathe=selection.action==='idle'?Math.sin(time*2.5)*.6*previewScale:0;
 c.save();c.translate(p.x,p.y+18);c.imageSmoothingEnabled=false;
 if(!ghost){c.fillStyle='#071c2490';c.beginPath();c.ellipse(0,0,(kind==='boss'?29:21)*previewScale,7*previewScale,0,0,Math.PI*2);c.fill();if(hero){c.strokeStyle='#ead39a80';c.lineWidth=1;c.beginPath();c.ellipse(0,0,25*previewScale,9*previewScale,0,0,Math.PI*2);c.stroke();}}
 if(selection.flip)c.scale(-1,1);
 c.drawImage(img,f.x,f.y,f.w,f.h,(f.x-f.px)*scale,(f.y-f.py)*scale+breathe,f.w*scale,f.h*scale);
 c.restore();return true;
 }
}
