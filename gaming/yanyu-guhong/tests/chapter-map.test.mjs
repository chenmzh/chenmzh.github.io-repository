import test from 'node:test';
import assert from 'node:assert/strict';
import {ChapterMap,MAP_POINTS,findPath,isWalkable} from '../chapter-map.js';

const anchor=point=>point.approach??point;
test('all eight interactions are mutually reachable on collision-safe paths',()=>{
 assert.equal(MAP_POINTS.length,8);
 for(const source of MAP_POINTS)for(const target of MAP_POINTS){
  const path=findPath(anchor(source),anchor(target));
  assert.ok(path.length,`${source.id} → ${target.id} has no path`);
  assert.ok(Math.hypot(path.at(-1).x-target.x,path.at(-1).y-target.y)<95,'destination is close enough to interact');
  let prev=anchor(source);
  for(const point of path){
   const n=Math.max(1,Math.ceil(Math.hypot(point.x-prev.x,point.y-prev.y)/2));
   for(let i=0;i<=n;i++){const t=i/n;assert.ok(isWalkable(prev.x+(point.x-prev.x)*t,prev.y+(point.y-prev.y)*t),`${source.id} → ${target.id} crosses obstacle`);}
   prev=point;
  }
 }
});
test('painted water, buildings, crates and flower beds block movement while dock connects to street',()=>{
 for(const point of [{x:1000,y:810},{x:300,y:750},{x:700,y:350},{x:360,y:560},{x:650,y:620},{x:1140,y:700}])assert.equal(isWalkable(point),false,JSON.stringify(point));
 for(const point of [{x:470,y:520},{x:1000,y:625},{x:1000,y:665},{x:1000,y:710},{x:650,y:535}])assert.equal(isWalkable(point),true,JSON.stringify(point));
 assert.equal(isWalkable(NaN,500),false);
 assert.deepEqual(findPath({x:NaN,y:0},{x:470,y:520}),[]);
});
function simulatedMap(x=750,y=520){
 const map=Object.create(ChapterMap.prototype);
 Object.assign(map,{hero:{x,y,facing:0},stick:{x:1,y:0},keys:new Set(),path:[],pending:null,paused:false,destroyed:false,last:1000,time:0,savedAt:1000,savedPosition:{x,y},handlers:{onMove:()=>{}},draw:()=>{},updateNear:()=>{}});
 return map;
}
test('10 FPS movement covers the same distance as 60 FPS without slowing simulation',()=>{
 const previous=globalThis.requestAnimationFrame;globalThis.requestAnimationFrame=()=>1;
 try{
  const slow=simulatedMap(),fast=simulatedMap();
  for(let i=1;i<=10;i++)slow.tick(1000+i*100);
  for(let i=1;i<=60;i++)fast.tick(1000+i*1000/60);
  assert.ok(Math.abs(slow.hero.x-fast.hero.x)<.01);
  assert.ok(Math.abs(slow.hero.x-975)<.01);
 }finally{globalThis.requestAnimationFrame=previous;}
});
test('long frames use collision substeps and pause immediately when an interaction opens',()=>{
 const previous=globalThis.requestAnimationFrame;globalThis.requestAnimationFrame=()=>1;
 try{
  const map=simulatedMap(650,535);map.stick={x:0,y:1};map.tick(1500);
  assert.ok(isWalkable(map.position));assert.ok(map.hero.y<=552,'cannot jump across flower bed');
  const paused=simulatedMap();let steps=0;
  paused.move=()=>{steps++;paused.paused=true;};paused.tick(1500);assert.equal(steps,1);
 }finally{globalThis.requestAnimationFrame=previous;}
});
test('goTo walks toward a distant NPC and only triggers after arriving in interaction range',()=>{
 const map=simulatedMap(470,520);let interacted=null;
 map.handlers.onInteract=id=>{interacted=id;map.setPaused(true);};
 assert.equal(map.goTo('ferryman'),true);assert.equal(interacted,null);
 assert.ok(map.path.length);assert.deepEqual(map.position,{x:470,y:520});
 for(let i=0;i<1000&&!interacted;i++)map.move(1/60);
 assert.equal(interacted,'ferryman');assert.ok(Math.hypot(map.hero.x-1000,map.hero.y-710)<95);
});

test('returning from the herbalist reaches the exact street corner before walking to tea',()=>{
 for(const y of [480,485,489]){
  const map=simulatedMap(600,y);let interacted=null;
  map.handlers.onInteract=id=>{interacted=id;map.setPaused(true);};
  assert.equal(map.goTo('tea'),true);
  for(let i=0;i<240&&!interacted;i++){map.move(1/60);assert.ok(isWalkable(map.position));}
  assert.equal(interacted,'tea',`return from y=${y} must finish within four seconds`);
 }
});
