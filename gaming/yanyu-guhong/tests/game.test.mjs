import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const fakeWindow={addEventListener(){}};
globalThis.document={activeElement:null};
globalThis.Image=class{complete=false};
globalThis.requestAnimationFrame=()=>0;
const {Game}=await import('../game.js');
function makeGame(){const context=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:()=>{}});const events=[];globalThis.window=fakeWindow;const game=new Game({getContext:()=>context},{onEnd:s=>events.push(s.stage)});delete globalThis.window;game.setMuted(true);game.start();return {game,events};}
test('quest closes from village request through herbs, bandits, boss and reward',()=>{const {game:g,events}=makeGame();Object.assign(g.player,g.npc);g.interact();assert.ok(g.dialog);g.chooseDialog(0);assert.equal(g.stage,'hunt');for(const herb of g.plants){Object.assign(g.player,{x:herb.x,y:herb.y});g.interact();}assert.equal(g.herbs,3);for(const e of g.enemies.slice(0,3))g.hit(e,100,0);assert.equal(g.stage,'boss');assert.equal(g.enemies[3].active,true);g.hit(g.enemies[3],250,0);assert.equal(g.stage,'return');Object.assign(g.player,g.npc);g.interact();g.chooseDialog(0);assert.equal(g.stage,'won');assert.deepEqual(events,['won']);});
test('movement respects map boundary and pause blocks combat resources',()=>{const {game:g}=makeGame();g.keys.add('a');for(let i=0;i<200;i++)g.update(.03);assert.ok(g.player.x>=325);g.pause(true);g.skill();assert.equal(g.player.qi,100);g.pause(false);g.skill();assert.equal(g.player.qi,70);g.skill();assert.equal(g.player.qi,70);g.player.hp=30;g.heal();assert.equal(g.player.hp,75);assert.equal(g.potions,2);});
test('enemy telegraph damages hero and can be avoided by dash immunity',()=>{const {game:g}=makeGame();g.stage='hunt';const e=g.enemies[0];Object.assign(g.player,{x:e.x,y:e.y});e.wind=.01;g.update(.02);assert.equal(g.player.hp,88);g.player.inv=0;g.dash();e.wind=.01;g.update(.02);assert.equal(g.player.hp,88);});
test('restart clears completion and restores core resources',()=>{const {game:g}=makeGame();g.stage='lost';g.player.hp=0;g.restart();assert.equal(g.stage,'intro');assert.equal(g.player.hp,100);assert.equal(g.kills,0);assert.equal(g.potions,3);});
