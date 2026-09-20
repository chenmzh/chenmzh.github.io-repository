// Ephemeral play simulation only. Species choose poses, gait, pace and intentions.
import { fitPosition } from './room-state.js';
import { ANIMAL_PROFILES, animalProfile } from './animal-behavior.js';
// Compatibility export for dog-only callers; non-dogs never use this frame table.
export const PET_FRAMES=Object.freeze(Object.fromEntries(Object.values(ANIMAL_PROFILES.dog.actions).map(a=>[a.id,a.frames])));
export function createPet(item,now=0) {
  const profile=animalProfile(item.key);
  if(!profile)throw new Error('该藏品不是可陪玩的动物');
  return {id:item.id,key:item.key,size:item.size,x:item.x,y:item.y,homeX:item.x,homeY:item.y,target:null,action:'idle',since:now,until:now+800,nextDecision:now+900,face:1,frame:profile.actions.idle.still};
}
export function petAction(pet,action,now,duration=2000) {
  const profile=animalProfile(pet.key),definition=profile?.actions[action];
  if(!definition || [profile.move,'cat-stalk'].includes(action))return false;
  pet.target=null;pet.action=action;pet.since=now;pet.until=now+duration;pet.nextDecision=pet.until+600;
  return true;
}
export function petTarget(pet,x,y,now,source='call',arrival=null) {
  if(![x,y].every(Number.isFinite))return false;
  const profile=animalProfile(pet.key);
  if(arrival!==null && (!profile.actions[arrival] || [profile.move,'cat-stalk'].includes(arrival)))return false;
  pet.target={...fitPosition(x,Math.max(67,y),pet.size),source,arrival};
  if(pet.action!==profile.move)pet.since=now;
  pet.action=profile.move;pet.until=0;
  return true;
}
export function stepPet(pet,now,dt,{playing=true,reduced=false,random=Math.random}={}) {
  const profile=animalProfile(pet.key);
  if(reduced) {
    if(pet.target || now>=pet.until)pet.action='idle';
    pet.target=null;pet.frame=profile.actions[pet.action].still;
    return pet;
  }
  if(pet.target && playing) {
    const dx=pet.target.x-pet.x,dy=pet.target.y-pet.y,distance=Math.hypot(dx,dy);
    // Cats stalk the ball before the final spring; slow/heavy animals never inherit dog gallops.
    const stalking=profile.species==='cat' && pet.target.source==='fetch' && distance>8;
    const speed=(pet.target.source==='wander'?9:19)*profile.speed*(stalking ? .4 : 1);
    const travel=speed*Math.max(0,Math.min(dt,.05));
    if(distance<=Math.max(.4,travel)) {
      pet.x=pet.target.x;pet.y=pet.target.y;
      const action=pet.target.arrival || (pet.target.source==='wander'?profile.explore:profile.greet);
      petAction(pet,action,now,action===profile.rest?6000:2400);
    } else {
      if(Math.abs(dx)>.2)pet.face=dx<0?-1:1;
      pet.x+=dx/distance*travel;pet.y+=dy/distance*travel;
      const next=stalking?'cat-stalk':profile.move;
      if(pet.action!==next)pet.since=now;
      pet.action=next;
    }
  } else if(playing && now>=pet.nextDecision && now>=pet.until) {
    const decision=random();
    if(decision<profile.wander)petTarget(pet,12+random()*76,70+random()*25,now,'wander');
    else {
      const action=decision<.76?profile.play:profile.rest;
      petAction(pet,action,now,action===profile.rest?5200:2800);
    }
  } else if(now>=pet.until && !pet.target)pet.action='idle';
  const action=profile.actions[pet.action];
  const moving=pet.action===profile.move;
  const interval=moving?action.interval*profile.gait*(pet.target?.source==='wander'?1.5:1):action.interval;
  pet.frame=action.frames[Math.floor(Math.max(0,now-pet.since)/interval)%action.frames.length];
  return pet;
}
