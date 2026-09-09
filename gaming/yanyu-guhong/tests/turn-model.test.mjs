import test from 'node:test';import assert from 'node:assert/strict';import {TurnBattle} from '../turn-model.js';
test('weakness and boost break an enemy and suppress its turn',()=>{const b=new TurnBattle();const ev=b.act('sword','guard',1);assert.equal(b.enemies[0].shield,0);assert.equal(b.enemies[0].broken,1);assert.ok(ev.some(e=>e.breaking));assert.equal(b.hero.hp,136);assert.equal(b.hero.bp,1);assert.equal(b.round,2);});
test('guard quarters incoming damage, replenishes qi, and uses one turn',()=>{const b=new TurnBattle();b.hero.qi=10;b.act('guard');assert.equal(b.hero.hp,150);assert.equal(b.hero.qi,31);assert.equal(b.round,2);});
test('invalid skill and dead target leave battle state unchanged',()=>{const b=new TurnBattle();b.hero.qi=0;const before=b.snapshot();assert.throws(()=>b.act('qi','chief'));assert.deepEqual(b.snapshot(),before);b.enemies[0].hp=0;assert.throws(()=>b.act('sword','guard'));});
test('healing consumes one item and enemies still act',()=>{const b=new TurnBattle();b.hero.hp=70;b.act('heal');assert.equal(b.hero.hp,97);assert.equal(b.hero.potions,2);});
test('strategic weakness attacks can win and end battle',()=>{const b=new TurnBattle();let turns=0;while(b.phase==='player'&&turns++<20){const e=b.enemies.find(e=>e.id==='chief'&&e.hp>0)||b.enemies.find(e=>e.hp>0);b.act(b.hero.hp<45&&b.hero.potions?'heal':e.weak,e.id,Math.min(3,b.hero.bp));}assert.equal(b.phase,'won');assert.ok(b.hero.hp>0);assert.throws(()=>b.act('guard'));});
test('player defeat terminates remaining enemy actions',()=>{const b=new TurnBattle();b.hero.hp=1;const ev=b.act('sword','chief');assert.equal(b.phase,'lost');assert.equal(ev.at(-1).kind,'lost');assert.equal(ev.filter(e=>e.actor==='chief').length,0);});
test('weakness, breaking and received hits fill sword intent with a cap',()=>{
 const b=new TurnBattle();assert.equal(b.hero.ultimate,20);
 const ev=b.act('sword','guard',1);
 const heroHits=ev.filter(e=>e.kind==='hit'&&e.actor==='hero');
 assert.equal(heroHits[0].state.hero.ultimate,32);
 assert.equal(heroHits[1].state.hero.ultimate,64);
 assert.equal(b.hero.ultimate,72);
 b.hero.ultimate=99;b.act('guard');assert.equal(b.hero.ultimate,100);
});
test('ultimate validation is atomic and requires a full gauge',()=>{
 const b=new TurnBattle(),before=b.snapshot();
 assert.throws(()=>b.act('ultimate'),/剑意未满/);assert.deepEqual(b.snapshot(),before);
});
test('ultimate damages all living enemies, bypasses weakness and preserves boost',()=>{
 const b=new TurnBattle();b.hero.ultimate=100;b.hero.bp=3;
 const ev=b.act('ultimate',undefined,3),ultimate=ev.find(e=>e.kind==='ultimate');
 assert.deepEqual(ultimate.targets,[{id:'guard',amount:90,breaking:true},{id:'chief',amount:90,breaking:false}]);
 assert.equal(ultimate.state.hero.ultimate,0);assert.equal(ultimate.state.hero.bp,3);
 assert.equal(ultimate.state.enemies[1].shield,1);
 assert.equal(b.hero.ultimate,8);assert.equal(b.hero.bp,4);
 assert.equal(ev.filter(e=>e.actor==='guard'&&e.kind==='hit').length,0);
});
test('ultimate rewards an existing break and wins without enemy retaliation',()=>{
 const b=new TurnBattle();b.hero.ultimate=100;
 b.enemies[0].hp=0;b.enemies[1].broken=1;b.enemies[1].shield=0;b.enemies[1].hp=160;
 const ev=b.act('ultimate');
 assert.deepEqual(ev[0].targets,[{id:'chief',amount:162,breaking:false}]);
 assert.equal(b.phase,'won');assert.equal(b.hero.hp,160);assert.equal(b.hero.ultimate,0);
 assert.equal(ev.at(-1).kind,'won');assert.throws(()=>b.act('ultimate'));
});
test('telegraphed heavy attacks can be guarded and countered to break',()=>{
 const b=new TurnBattle();b.round=3;b.hero.ultimate=0;b.enemies[1].shield=1;
 assert.match(b.snapshot().enemies[0].intent,/重劈/);
 const ev=b.act('guard'),counters=ev.filter(e=>e.kind==='counter');
 assert.equal(b.hero.hp,143);assert.equal(counters.length,2);
 assert.equal(b.enemies[0].shield,1);assert.equal(b.enemies[1].broken,2);
 assert.equal(b.hero.ultimate,76);assert.equal(counters[1].breaking,true);
 assert.match(b.snapshot().enemies[1].intent,/无法行动/);
 assert.match(b.snapshot().enemies[0].intent,/试探斩/);
});
test('ordinary guard does not counter and a fatal heavy attack cannot be countered',()=>{
 const b=new TurnBattle();assert.ok(!b.act('guard').some(e=>e.kind==='counter'));
 const fatal=new TurnBattle();fatal.round=3;fatal.hero.hp=1;
 const ev=fatal.act('guard');assert.equal(fatal.phase,'lost');
 assert.ok(!ev.some(e=>e.kind==='counter'));assert.equal(ev.at(-1).kind,'lost');
});
