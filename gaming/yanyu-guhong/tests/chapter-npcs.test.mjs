import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {NPC_FRAMES,npcFrame,colorKeyAlpha,ChapterNPCs} from '../chapter-npcs.js';

test('both NPC idle loops use four full-body atlas cells without drifting their foot anchors',()=>{
 const png=readFileSync(new URL('../assets/chapter-npcs-keyed.png',import.meta.url));
 const width=png.readUInt32BE(16),height=png.readUInt32BE(20);
 for(const id of ['tea','herbalist']){
  assert.equal(new Set(Array.from({length:8},(_,i)=>npcFrame(id,i*.4+.01))).size,4);
  assert.equal(npcFrame(id,.1),npcFrame(id,3.3));
  for(const frame of NPC_FRAMES[id]){
   assert.ok(frame.x>=0&&frame.y>=0&&frame.x+frame.w<=width&&frame.y+frame.h<=height);
   assert.ok(frame.px>frame.x&&frame.px<frame.x+frame.w&&frame.py<=frame.y+frame.h);
   assert.equal(frame.y+frame.h-frame.py,id==='tea'?8:10);
  }
 }
});
test('color-key compositing removes magenta and preserves skin, rose fabric, grey hair and input alpha',()=>{
 for(const rgb of [[255,0,255],[218,16,202],[245,90,223]])assert.equal(colorKeyAlpha(...rgb,255),0);
 for(const rgb of [[214,160,104],[144,72,79],[183,178,158],[48,68,36],[26,25,24]])assert.equal(colorKeyAlpha(...rgb,255),255);
 assert.equal(colorKeyAlpha(183,178,158,90),90);
});
test('map NPC rendering selects different actual image frames and uses one fixed world foot position',()=>{
 const draws=[],translations=[],ctx={save(){},restore(){},translate(...p){translations.push(p);},scale(){},beginPath(){},ellipse(){},fill(){},stroke(){},drawImage(...args){draws.push(args);}};
 const atlas=Object.create(ChapterNPCs.prototype);atlas.texture={};
 for(const time of [0,1.25,1.65,2.45])assert.equal(atlas.draw(ctx,{id:'tea',x:330,y:490},time),true);
 assert.equal(new Set(draws.map(d=>d[1])).size,4);
 assert.ok(translations.every(p=>p[0]===330&&p[1]===490));
 assert.ok(draws.every(d=>d[8]>110&&d[8]<120),'full body renders at hero-compatible height');
 assert.equal(atlas.draw(ctx,{id:'unknown'},0),false);
});
