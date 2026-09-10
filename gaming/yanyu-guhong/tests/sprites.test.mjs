import test from 'node:test';
import assert from 'node:assert/strict';
import {heroFrame,HERO_FRAMES,CAST_FRAMES} from '../sprites.js';
test('atlas rectangles stay in source image and keep valid foot pivots',()=>{for(const [frames,w,h]of[[HERO_FRAMES,1254,1254],[CAST_FRAMES,1448,1086]])for(const f of frames){assert.ok(f.x>=0&&f.y>=0&&f.x+f.w<=w&&f.y+f.h<=h);assert.ok(f.px>=f.x&&f.px<=f.x+f.w&&f.py>=f.y&&f.py<=f.y+f.h);}});
test('walk uses directional frame rows and mirrors west',()=>{assert.equal(heroFrame({facing:0,moving:true},0).index,4);assert.equal(heroFrame({facing:Math.PI,moving:true},.2).flip,true);assert.equal(heroFrame({facing:-Math.PI/2,moving:true},0).index,8);assert.equal(heroFrame({facing:Math.PI/2,moving:true},0).index,0);assert.notEqual(heroFrame({moving:true},0).index,heroFrame({moving:true},.2).index);});
test('attack advances through four poses then returns to locomotion',()=>{const p={facing:0,action:'attack',actionDuration:.4};assert.deepEqual([.4,.3,.19,.01].map(t=>heroFrame({...p,actionTime:t},0).index),[12,13,14,15]);assert.equal(heroFrame({...p,actionTime:0},0).index,5);assert.equal(heroFrame({dash:.1},0).index,12);});
test('first-frame timestamps cannot select a negative animation frame',()=>{assert.equal(heroFrame({moving:true},-.002).index,4);});
