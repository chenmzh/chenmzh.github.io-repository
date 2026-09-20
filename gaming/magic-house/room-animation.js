import { ROOM_SPRITES, PET_ACTION_SPRITES } from './room-assets.js';
import { FIGURE_PROFILES, figureAction, sampleFigureAction, drawFigureAura } from './figure-actions.js';
import { zooPlan } from './zoo.js';
import { animalProfile, animalAction, animalSceneResponse } from './animal-behavior.js';
import { createPet, petAction, petTarget, stepPet } from './pet-motion.js';
const cache = new Map();
function load(src) {
  if (!cache.has(src)) cache.set(src, new Promise(resolve => {
    const image = new Image(); image.onload = () => resolve(image); image.onerror = () => resolve(null); image.src = src;
  }));
  return cache.get(src);
}
export function createRoomAnimation(stage) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let bindings = new Map(), pets = new Map(), playing = false, handle = 0, previous = 0;
  function paint(binding, frame, face = 1) {
    let { canvas, image, sprite, el } = binding;
    let sourceFrame=frame;
    if(binding.extra && frame>=binding.extra.offset) {
      if(binding.extraImage){image=binding.extraImage;sprite=binding.extra;sourceFrame=frame-binding.extra.offset;}
      else {frame=sourceFrame=0;}
    }
    if (!image || (binding.frame === frame && binding.face === face && binding.paintedImage===image)) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    if (face < 0) { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(image, sourceFrame % sprite.columns * sprite.cell, Math.floor(sourceFrame / sprite.columns) * sprite.cell, sprite.cell, sprite.cell, 0, 0, canvas.width, canvas.height);
    ctx.restore();
    binding.frame = frame; binding.face = face; binding.paintedImage=image;
    canvas.hidden = false; el.querySelector('img').hidden = true;
    el.dataset.frame = frame;
  }
  function finishFigure(binding) {
    binding.figure = null; binding.auraStamp = null;
    delete binding.el.dataset.figureAction;
    if (binding.aura) { binding.aura.hidden = true; binding.aura.getContext('2d').clearRect(0, 0, 576, 576); }
    paint(binding, 0);
  }
  function startFigure(binding, definition) {
    if (!definition) return false;
    binding.figure = { definition, elapsed: 0 }; binding.auraStamp = null;
    binding.el.dataset.figureAction = definition.id;
    return true;
  }
  function tick(now) {
    handle = 0;
    if (document.hidden || !stage.offsetParent) { previous = 0; return; }
    const dt = previous ? (now - previous) / 1000 : 0; previous = now;
    if (!document.querySelector('dialog[open]')) for (const [id, binding] of bindings) {
      const pet = pets.get(id);
      if (binding.sprite.kind === 'figure') {
        if (!binding.figure) continue;
        const current = binding.figure;
        current.elapsed += Math.min(dt, .1) * 1000;
        const sample = sampleFigureAction(current.definition, current.elapsed, reduced.matches);
        if (sample.done) { finishFigure(binding); continue; }
        paint(binding, sample.frame);
        const stamp = reduced.matches ? `${current.definition.id}:reduced` : current.elapsed;
        if (binding.aura && stamp !== binding.auraStamp) {
          drawFigureAura(binding.aura, current.definition, sample, reduced.matches);
          binding.aura.hidden = false; binding.auraStamp = stamp;
        }
      } else if (pet) {
        stepPet(pet, now, dt, { playing, reduced: reduced.matches });
        if (playing) {
          binding.el.style.left = pet.x + '%'; binding.el.style.top = pet.y + '%';
          binding.el.style.zIndex = String(100 + Math.round(pet.y));
        }
        binding.el.dataset.petAction = pet.action;
        binding.el.dataset.petIntent = pet.target?.source || '';
        if (binding.choreo) {
          const c=binding.choreo;
          if(now>=c.until){binding.choreo=null;delete binding.el.dataset.zooAction;delete binding.el.dataset.zooReady;}
          else if(!pet.target){
            binding.el.dataset.zooReady='true';pet.until=now+250;pet.nextDecision=now+250;
            c.arrived??=now;
            const frame=reduced.matches?c.still:c.frames[Math.floor((now-c.arrived)/c.interval)%c.frames.length];
            if(c.action==='hide' && frame===c.hiddenFrame){const anchor=stage.querySelector(`[data-room-item="${c.anchor.id}"]`);binding.el.style.zIndex=String(Math.max(0,Number(anchor?.style.zIndex||1)-1));}
            paint(binding,frame,1);continue;
          }
        }
        paint(binding, pet.frame, pet.face);
      } else {
        const elapsed = now - (binding.started || 0), active = binding.started && elapsed < 2800;
        const sequence = binding.sprite.kind === 'carousel' ? [0, 1, 2, 3, 0, 1, 2, 3] : [0, 1, 2, 3, 2, 1, 0];
        const frame = binding.sprite.kind === 'lamp' ? binding.item.active ? 2 : 0 : active ? reduced.matches ? 2 : sequence[Math.min(sequence.length - 1, Math.floor(elapsed / (2800 / sequence.length)))] : 0;
        paint(binding, frame);
      }
    }
    if (bindings.size) handle = requestAnimationFrame(tick);
  }
  function wake() { if (!handle && !document.hidden) handle = requestAnimationFrame(tick); }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(handle); handle = 0; previous = 0; } else wake();
  });
  reduced.addEventListener('change', wake);
  return {
    mount(items) {
      const next = new Map(), alive = new Set(items.map(item => item.id));
      for (const id of pets.keys()) if (!alive.has(id)) pets.delete(id);
      for (const item of items) {
        const sprite = ROOM_SPRITES[item.key], el = stage.querySelector(`[data-room-item="${item.id}"]`);
        if (!sprite || !el) continue;
        const canvas = el.querySelector('canvas');
        const binding = { el, canvas, sprite, item, image: null, started: bindings.get(item.id)?.started || 0 };
        if (sprite.kind === 'figure') {
          const aura = document.createElement('canvas');
          aura.width = aura.height = 576; aura.className = 'figure-aura'; aura.hidden = true;
          aura.setAttribute('aria-hidden', 'true'); el.append(aura); binding.aura = aura;
        }
        next.set(item.id, binding);
        if (['dog','cat','zoo'].includes(sprite.kind)) {
          el.dataset.species=animalProfile(item.key).species;
          binding.extra=PET_ACTION_SPRITES[item.key];
          if(binding.extra)void load(binding.extra.src).then(image=>{
            if(bindings.get(item.id)!==binding)return;
            binding.extraImage=image;
            if(!image){el.dataset.speciesSpriteFailed='true';return;}
            paint(binding,pets.get(item.id)?.frame || 0);wake();
          });
          const old = pets.get(item.id);
          if (!old || old.homeX !== item.x || old.homeY !== item.y || old.size !== item.size) pets.set(item.id, createPet(item, performance.now()));
        }
        void load(sprite.src).then(image => {
          if (bindings.get(item.id) !== binding) return;
          binding.image = image;
          if (!image) { el.dataset.spriteFailed = 'true'; return; }
          paint(binding, sprite.kind === 'lamp' && item.active ? 2 : 0); wake();
        });
      }
      bindings = next; wake();
    },
    stopFigures() {
      for (const binding of bindings.values()) if (binding.sprite.kind === 'figure') finishFigure(binding);
    },
    setPlaying(value) {
      playing = value;
      for (const binding of bindings.values()) if (binding.sprite.kind === 'figure') finishFigure(binding);
      for(const binding of bindings.values()){binding.choreo=null;delete binding.el.dataset.zooAction;delete binding.el.dataset.zooReady;}
      for (const [id, pet] of pets) {
        const item = bindings.get(id)?.item;
        if (item) pets.set(id, createPet(item, performance.now()));
      }
      wake();
    },
    sceneAction(action, items, target = { x: 67, y: 88 }) {
      for(const binding of bindings.values()){binding.choreo=null;delete binding.el.dataset.zooAction;delete binding.el.dataset.zooReady;}
      const plan=zooPlan(action,items),now=performance.now();
      if(plan){
        plan.actors.forEach((item,i)=>{
          const pet=pets.get(item.id),binding=bindings.get(item.id);if(!pet||!binding)return;
          const arrival=plan.definition.responses[item.key],pose=animalAction(item.key,arrival);
          binding.choreo={action,anchor:plan.anchor,frames:pose.frames,still:pose.still,interval:pose.interval,hiddenFrame:plan.definition.hiddenFrame,until:now+plan.duration};binding.el.dataset.zooAction=action;
          if(reduced.matches)petAction(pet,arrival,now,plan.duration);
          else petTarget(pet,plan.anchor.x+(action==='hide'?2:-10)+(i%3)*9,plan.anchor.y+2-Math.floor(i/3)*7,now,action,arrival);
        });
        if(action==='parade'){const b=bindings.get(plan.anchor.id);if(b)b.started=now;}
        wake();return;
      }
      const anchor = action === 'shelter' || action === 'bedtime' ? items.find(i => ['D-11', 'D-13'].includes(i.key)) :
        action === 'water' ? items.find(i => i.key === 'D-09') :
        action === 'concert' ? items.find(i => i.key === 'D-10') : items.find(i => i.key === 'D-08' || i.key.startsWith('F-'));
      const point = action === 'fetch' ? target : anchor ? { x: anchor.x, y: Math.max(76, anchor.y) } : { x: action === 'shelter' ? 27 : 55, y: 84 };
      [...pets.values()].forEach((pet,i) => {
        const arrival=animalSceneResponse(pet.key,action);
        if(!arrival)return;
        if (reduced.matches) petAction(pet, arrival, performance.now(), 6000);
        else petTarget(pet, point.x+(i%3-1)*11, point.y-Math.floor(i/3)*7, performance.now(), action, arrival);
      });
      for (const binding of bindings.values()) if (!pets.has(binding.item.id)) {
        if ((action === 'tea' && binding.sprite.kind === 'book') || (action === 'concert' && binding.sprite.kind === 'carousel') || (action === 'bedtime' && binding.sprite.kind === 'moon') || (action === 'stargaze' && binding.item.key.startsWith('A'))) binding.started = performance.now();
        if (action === 'stargaze' && binding.sprite.kind === 'figure' && binding.item.key.startsWith('A')) startFigure(binding, FIGURE_PROFILES[binding.item.key][1]);
      }
      wake();
    },
    isPet: id => pets.has(id),
    action(id, action) {
      const pet = pets.get(id), binding = bindings.get(id);
      if (!binding) return false;
      if(pet){action ||= animalProfile(pet.key).greet;if(!animalAction(pet.key,action))return false;}
      binding.choreo=null;delete binding.el.dataset.zooAction;delete binding.el.dataset.zooReady;
      if (binding.sprite.kind === 'figure') {
        if (!startFigure(binding, figureAction(binding.item.key, action))) return false;
      } else if (pet) {
        if(!petAction(pet, action, performance.now(), action === animalProfile(pet.key).rest ? 5000 : 3200))return false;
      }
      else binding.started = performance.now();
      wake(); return true;
    },
    follow(x, y) {
      if (!playing || reduced.matches) return;
      const near = [...pets.values()].filter(pet => animalProfile(pet.key).follows && performance.now() >= pet.until).sort((a,b) => Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0];
      if (near && !bindings.get(near.id)?.choreo && Math.hypot(near.x-x,near.y-y) < 38) petTarget(near, x, y, performance.now(), 'follow');
      wake();
    },
    summon(x, y) {
      if (!playing) return;
      [...pets.values()].forEach((pet, i) => {
        const binding=bindings.get(pet.id);if(binding){binding.choreo=null;delete binding.el.dataset.zooAction;delete binding.el.dataset.zooReady;}
        if (reduced.matches) petAction(pet, animalProfile(pet.key).greet, performance.now());
        else petTarget(pet, x + (i % 3 - 1) * 12, y - Math.floor(i / 3) * 8, performance.now());
      });
      wake();
    },
    reset() { pets.clear(); bindings.clear(); playing = false; cancelAnimationFrame(handle); handle = 0; previous = 0; },
  };
}
