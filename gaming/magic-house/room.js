import { CATALOG_ITEMS, SERIES, seriesForItem } from './catalog.js';
import { animalProfile, animalAction } from './animal-behavior.js';
import { ROOM_IMAGES, ROOM_SPRITES } from './room-assets.js';
import { createRoomAnimation } from './room-animation.js';
import { FIGURE_PROFILES, figureAction } from './figure-actions.js';
import { createSceneEffects } from './scene-effects.js';
import { SCENES, SCENE_ACTIONS, sceneById, currentScene, sceneActionAllowed } from './scenes.js';
import { roomItems, ownedItems, placeItem, changeItem, removeItem, fitPosition, switchScene, ROOM_LIMIT } from './room-state.js';
const interactions = {
  'D-13': ['squish', '星星抱枕凹下去，又慢慢鼓起来。'],
  'F-08': ['page', '翻开森林漫记，和小狐狸一起看林间风景。'],
  'D-04': ['puppy', '汪！动物伙伴开心地向你招手。'], 'D-05': ['sway', '星星挂件轻轻摇晃。'],
  'D-06': ['sway', '围裙随风摆动，今天想做什么料理？'], 'D-07': ['glow', '给小屋留一盏温柔的灯。'],
  'D-08': ['sip', '慢下来，喝一口热茶。'], 'D-09': ['grow', '浇一点水，叶子舒展开了。'],
  'D-10': ['music', '音乐盒转动起来，听一小段旋律。'], 'D-11': ['squish', '软乎乎的抱枕，捏一下就回弹。'],
  'D-12': ['tick', '滴答，滴答。现在是属于你的时间。'], LAST: ['glow', '晚安月亮，愿你今晚有个好梦。'],
};
export function createRoom({ getState, getBusy, transact: save, toast }) {
  const $ = selector => document.querySelector(selector);
  const stage = $('#room-stage');
  let selectedId = null, drag = null, sound = false, audio, playing = false, followAt = 0, petAt = 0;
  const animation = createRoomAnimation(stage), effects = createSceneEffects($('#scene-effects'));
  let renderedScene = null, throwNumber = 0, inventorySeries = 'all';
  $('#room-series-filter').innerHTML = '<option value="all">全部系列</option>' + SERIES.map(series => `<option value="${series.id}">${series.name}</option>`).join('');
  $('#room-series-filter').addEventListener('change', event => { inventorySeries = event.target.value; render(); });
  function transact(operation) {
    const expectedScene = currentScene(getState());
    return save(state => {
      if (currentScene(state) !== expectedScene) throw new Error('场景已在另一个标签页切换，本次操作未执行，请在当前场景重试。');
      return operation(state);
    });
  }
  function selected() { return roomItems(getState()).find(item => item.id === selectedId); }
  function say(text) { $('#room-status').textContent = text; }
  function render() {
    drag = null;
    const state = getState(), items = roomItems(state), counts = ownedItems(state);
    const scene = sceneById(currentScene(state));
    if (renderedScene !== scene.id) {
      selectedId = null; animation.reset(); animation.setPlaying(playing); effects.clear(); renderedScene = scene.id;
    }
    $('.room-scene').style.backgroundImage = `url("${scene.image}")`;
    $('.room-scene').dataset.scene = scene.id;
    $('#scene-title').textContent = `${scene.name} · ${scene.caption}`;
    $('#scene-picker').innerHTML = SCENES.map(entry => `<button data-scene="${entry.id}" aria-pressed="${entry.id === scene.id}" ${getBusy() ? 'disabled' : ''}><img src="${entry.image}" alt="" loading="lazy"><span>${entry.name}</span></button>`).join('');
    $('#scene-actions').innerHTML = scene.actions.map(id => {
      const action = SCENE_ACTIONS[id], allowed = sceneActionAllowed(scene.id,id,items);
      return `<button data-scene-action="${id}" ${!allowed || getBusy() ? 'disabled' : ''}><strong>${action.name}</strong><small>${allowed ? '点击联动物品与动物伙伴' : action.needs}</small></button>`;
    }).join('');
    const focusId = stage.contains(document.activeElement) ? document.activeElement.dataset.roomItem : null;
    if (!items.some(item => item.id === selectedId)) selectedId = null;
    stage.innerHTML = items.map((item, index) => {
      const catalog = CATALOG_ITEMS.find(entry => entry.id === item.key), sprite = ROOM_SPRITES[item.key];
      return `<button class="room-object cutout ${sprite ? 'has-sprite' : ''} ${item.active ? 'is-lit' : ''} ${selectedId === item.id ? 'selected' : ''}" data-room-item="${item.id}" data-item-key="${item.key}" style="left:${item.x}%;top:${item.y}%;width:${item.size}%;z-index:${index + 1}" aria-label="${catalog.name}，${playing ? '轻点抚摸或互动' : '拖动移动，点击互动，方向键调整，Delete 收回'}" title="${catalog.name}"><img src="${ROOM_IMAGES[item.key]}" alt="${catalog.name}" draggable="false">${sprite ? `<canvas width="${sprite.cell}" height="${sprite.cell}" hidden aria-hidden="true"></canvas>` : ''}<span class="room-object-label">${catalog.name}</span></button>`;
    }).join('');
    $('#room-empty').hidden = items.length > 0;
    $('#room-count').textContent = `${items.length} / ${ROOM_LIMIT} 件已摆出`;
    $('#room-inventory').innerHTML = CATALOG_ITEMS.filter(item => counts[item.id] > 0 && (inventorySeries === 'all' || seriesForItem(item.id)?.id === inventorySeries)).map(item => {
      const placed = items.filter(entry => entry.key === item.id).length, left = counts[item.id] - placed;
      return `<button class="room-inventory-item" data-place-item="${item.id}" ${left && !getBusy() ? '' : 'disabled'}><img src="${ROOM_IMAGES[item.id]}" alt="" loading="lazy"><span><strong>${item.name}</strong><small>可摆 ${left} / 拥有 ${counts[item.id]}${item.legacy ? ' · 旧辑' : ''}</small></span><b aria-hidden="true">＋</b></button>`;
    }).join('') || '<p class="room-inventory-empty">当前系列暂无已拥有的藏品。试试其他系列、抽赏或市集。<button class="text-button" data-view="draw">去选一张签 →</button></p>';
    animation.mount(items); effects.mount(scene.id, items);
    controls();
    if (focusId) stage.querySelector(`[data-room-item="${focusId}"]`)?.focus({ preventScroll: true });
  }
  function controls() {
    const item = selected();
    $('#room-selected').textContent = item ? CATALOG_ITEMS.find(entry => entry.id === item.key).name : '选中一件物品，开始布置';
    for (const id of ['room-play', 'room-remove', 'room-smaller', 'room-larger']) $('#'+id).disabled = !item || getBusy();
    if (item) { $('#room-smaller').disabled = getBusy() || item.size <= 8; $('#room-larger').disabled = getBusy() || item.size >= 28; }
    const figureActions = item && FIGURE_PROFILES[item.key];
    const figureControls = $('#room-figure-actions');
    figureControls.hidden = !figureActions;
    figureControls.innerHTML = figureActions ? '<span>角色专属动作</span>' + figureActions.map(action => `<button data-figure-action="${action.id}" ${getBusy() ? 'disabled' : ''}>${action.name}</button>`).join('') : '';
    $('#room-play').textContent = figureActions ? figureActions[0].name : '互动';
    const petProfile=item && animalProfile(item.key), petControls=$('#room-pet-actions');
    petControls.hidden=!petProfile;
    petControls.setAttribute('aria-label',petProfile?`${petProfile.name}专属动作`:'动物专属动作');
    petControls.innerHTML=petProfile?`<span>${petProfile.name}专属动作</span>`+petProfile.buttons.map(a=>`<button data-pet-action="${a.id}" ${getBusy()?'disabled':''}>${a.label}</button>`).join(''):'';
    if(petProfile)$('#room-play').textContent=petProfile.actions[petProfile.greet].label;
    for (const el of stage.querySelectorAll('.room-object')) el.classList.toggle('selected', el.dataset.roomItem === selectedId);
  }
  function melody() {
    if (!sound) return;
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      void audio.resume();
      [523.25, 659.25, 783.99, 659.25, 587.33, 523.25].forEach((hz, index) => {
        const osc = audio.createOscillator(), gain = audio.createGain(), start = audio.currentTime + index * .22;
        osc.type = 'sine'; osc.frequency.value = hz;
        gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(.055, start + .02); gain.gain.exponentialRampToValueAtTime(.001, start + .4);
        osc.connect(gain); gain.connect(audio.destination); osc.start(start); osc.stop(start + .42);
        osc.onended = () => { osc.disconnect(); gain.disconnect(); };
      });
    } catch { say('此浏览器无法播放音效，动画仍可互动。'); }
  }
  async function interact() {
    const item = selected();
    if (!item || getBusy()) return;
    const figure = figureAction(item.key);
    if (figure) { animation.action(item.id, figure.id); say(figure.message); return; }
    if (animation.isPet(item.id)) {
      const profile=animalProfile(item.key);
      animation.action(item.id, profile.greet);
      const el = stage.querySelector(`[data-room-item="${item.id}"]`);
      el?.classList.add('playing');
      say(profile.actions[profile.greet].message);
      return;
    }
    const [motion, message] = interactions[item.key] || [item.key.startsWith('E-') ? 'travel' : item.key.startsWith('F-') ? 'page' : 'puppy', '和这份收藏打个招呼，快乐已收到。'];
    if (motion === 'glow') {
      const result = await transact(state => {
        const latest = roomItems(state).find(entry => entry.id === item.id);
        if (!latest) throw new Error('这件藏品已被收回。');
        return changeItem(state, item.id, { active: !latest.active });
      });
      if (!result) return;
    }
    const el = stage.querySelector(`[data-room-item="${item.id}"]`);
    if (!el) return;
    el.classList.remove('playing'); void el.offsetWidth;
    el.dataset.motion = motion; el.classList.add('playing');
    animation.action(item.id);
    say(message);
    if (item.key === 'D-10') melody();
  }
  $('#room-inventory').addEventListener('click', async event => {
    const button = event.target.closest('[data-place-item]');
    if (!button || button.disabled) return;
    const result = await transact(state => placeItem(state, button.dataset.placeItem));
    if (!result) return;
    selectedId = roomItems(result).at(-1).id; controls();
    say('已摆进小屋并保存。拖动换位置，轻点和它互动。');
    stage.querySelector(`[data-room-item="${selectedId}"]`)?.focus({ preventScroll: true });
  });
  stage.addEventListener('pointerdown', event => {
    const el = event.target.closest('[data-room-item]');
    if (getBusy() || !el || (event.pointerType === 'mouse' && event.button !== 0) || drag) return;
    selectedId = el.dataset.roomItem; controls();
    if (playing) { el.focus({ preventScroll: true }); return; }
    const item = selected();
    drag = { id: item.id, pointerId: event.pointerId, el, item, rect: stage.getBoundingClientRect(), startX: event.clientX, startY: event.clientY, moved: false };
    el.setPointerCapture(event.pointerId); el.focus({ preventScroll: true }); event.preventDefault();
  });
  stage.addEventListener('pointermove', event => {
    if (playing && !getBusy() && event.pointerType !== 'touch') {
      const now = performance.now(), el = event.target.closest('[data-room-item]');
      if (el && animation.isPet(el.dataset.roomItem) && now - petAt > 1800) {
        const profile=animalProfile(el.dataset.itemKey);
        animation.action(el.dataset.roomItem, profile.play); petAt = now;
        say(profile.actions[profile.play].message);
      } else if (!el && now - followAt > 140) {
        const r = stage.getBoundingClientRect();
        animation.follow((event.clientX-r.left)/r.width*100,(event.clientY-r.top)/r.height*100); followAt = now;
      }
      return;
    }
    if (!drag || event.pointerId !== drag.pointerId) return;
    const dx = event.clientX - drag.startX, dy = event.clientY - drag.startY;
    if (Math.hypot(dx, dy) < 5 && !drag.moved) return;
    drag.moved = true;
    drag.position = fitPosition(drag.item.x + dx / drag.rect.width * 100, drag.item.y + dy / drag.rect.height * 100, drag.item.size);
    drag.el.style.left = drag.position.x + '%'; drag.el.style.top = drag.position.y + '%';
    drag.el.classList.add('dragging');
  });
  stage.addEventListener('pointerup', async event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const end = drag; drag = null;
    end.el.releasePointerCapture(event.pointerId); end.el.classList.remove('dragging');
    if (end.moved) {
      const result = await transact(state => changeItem(state, end.id, end.position));
      if (result) say('位置已自动保存。'); else render();
    } else void interact();
  });
  function cancelDrag() { if (drag) { drag = null; render(); say('移动已取消，保留原位置。'); } }
  stage.addEventListener('pointercancel', cancelDrag);
  stage.addEventListener('lostpointercapture', cancelDrag);
  stage.addEventListener('click', event => {
    const el = event.target.closest('[data-room-item]');
    if (getBusy()) return;
    if (el && (playing || event.detail === 0)) { selectedId = el.dataset.roomItem; controls(); void interact(); }
    else if (playing && !el) {
      const r = stage.getBoundingClientRect();
      animation.summon((event.clientX-r.left)/r.width*100,(event.clientY-r.top)/r.height*100);
      say('过来吧！伙伴按各自步态靠近：小猫轻步、小象慢走、企鹅摇摆。减少动态效果时原地回应。');
    }
  });
  stage.addEventListener('keydown', async event => {
    const el = event.target.closest('[data-room-item]');
    if (!el || getBusy()) return;
    selectedId = el.dataset.roomItem;
    const item = selected(), step = event.shiftKey ? 1 : 3;
    const offsets = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (offsets[event.key]) {
      event.preventDefault();
      if (playing) {
        const profile=animalProfile(item.key);
        if(profile){animation.action(item.id,profile.play);say(profile.actions[profile.play].message);}else void interact();
        return;
      }
      const [dx, dy] = offsets[event.key];
      await transact(state => {
        const latest = roomItems(state).find(entry => entry.id === item.id);
        if (!latest) throw new Error('这件藏品已被收回。');
        return changeItem(state, item.id, { x: latest.x + dx, y: latest.y + dy });
      });
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault(); await transact(state => removeItem(state, item.id));
    } else if (event.key === 'Escape') { cancelDrag(); selectedId = null; controls(); }
  });
  $('#room-play').addEventListener('click', interact);
  $('#room-figure-actions').addEventListener('click', event => {
    const button = event.target.closest('[data-figure-action]'), item = selected();
    if (!button || button.disabled || !item || getBusy()) return;
    const definition = figureAction(item.key, button.dataset.figureAction);
    if (definition && animation.action(item.id, definition.id)) say(definition.message);
  });
  function setMode(value) {
    cancelDrag(); playing = value;
    for (const tab of document.querySelectorAll('[data-room-mode]')) tab.setAttribute('aria-pressed', String((tab.dataset.roomMode === 'play') === value));
    stage.classList.toggle('is-play-mode', playing); animation.setPlaying(playing);
    if (!playing) effects.clear();
    render();
  }
  for (const button of document.querySelectorAll('[data-room-mode]')) button.addEventListener('click', () => {
    setMode(button.dataset.roomMode === 'play');
    say(playing ? '陪玩中：移动鼠标吸引动物伙伴，轻点地板召唤，轻点动物伙伴摸头。走动不改写布置位置。' : '布置中：动物伙伴回到摆放位置，可以安心拖动和缩放。');
  });
  $('#scene-picker').addEventListener('click', async event => {
    const button = event.target.closest('[data-scene]');
    if (!button || button.disabled || button.dataset.scene === currentScene(getState())) return;
    if (await transact(state => switchScene(state,button.dataset.scene))) {
      $(`#scene-picker [data-scene="${currentScene(getState())}"]`)?.focus({preventScroll:true});
      say('已切换并保存。新场景从空布置开始，返回时恢复该场景的布置；收藏数量不变。');
    }
  });
  $('#scene-ambient').addEventListener('click', () => {
    const enabled=effects.toggle();$('#scene-ambient').setAttribute('aria-pressed',String(enabled));
    $('#scene-ambient').textContent=`环境动效：${enabled?'开':'关'}`;
  });
  $('#scene-actions').addEventListener('click', async event => {
    const button=event.target.closest('[data-scene-action]');
    if(!button || button.disabled || getBusy())return;
    const action=button.dataset.sceneAction, scene=currentScene(getState());
    if(!sceneActionAllowed(scene,action,roomItems(getState())))return;
    if(action==='bedtime' && roomItems(getState()).some(i=>['D-07','LAST'].includes(i.key))) {
      const result=await transact(state => roomItems(state).filter(i=>['D-07','LAST'].includes(i.key)).reduce((next,item)=>changeItem(next,item.id,{active:true}),state));
      if(!result)return;
    }
    if(currentScene(getState())!==scene)return;
    if(!playing)setMode(true);
    const items=roomItems(getState()), target={x:throwNumber++%2?32:72,y:87};
    animation.sceneAction(action,items,target);effects.play(action,items,target);
    $(`#scene-actions [data-scene-action="${action}"]`)?.focus({preventScroll:true});
    stage.scrollIntoView({block:'center',behavior:'auto'});
    for(const item of items) {
      const motion=['water','shower'].includes(action)&&item.key==='D-09'?'grow':action==='mud'&&item.key==='D-06'?'sway':action==='tea'&&item.key==='D-08'?'sip':action==='stargaze'&&['A','A-01','D-05','E-03'].includes(item.key)?'glow':null;
      const el=stage.querySelector(`[data-room-item="${item.id}"]`);
      if(motion&&el){el.classList.remove('playing');void el.offsetWidth;el.dataset.motion=motion;el.classList.add('playing');}
    }
    if(['concert','parade'].includes(action))melody();
    const hasDogs=items.some(i=>animation.isPet(i.id));
    const message = action === 'tea' ? [items.some(i=>i.key==='D-08')?'茶杯升起轻轻的热气。':'',items.some(i=>i.key.startsWith('F-'))?'卡册翻开新一页。':'',hasDogs?'已摆出的伙伴按各自习惯回应，安静陪你读故事。':''].join('') :
      action === 'bedtime' ? [items.some(i=>['D-07','LAST'].includes(i.key))?'摆出的灯具已点亮并保存。':'',hasDogs?'已摆出的伙伴按各自习惯蜷身、伏卧或缩颈歇息。':''].join('') : SCENE_ACTIONS[action].message;
    say(message + (hasDogs?'':'（当前没有摆出动物伙伴，仅联动物品。）'));
  });
  $('#room-pet-actions').addEventListener('click', event => {
    const button=event.target.closest('[data-pet-action]'),item=selected();
    if(!button || button.disabled || !item || getBusy() || !animation.isPet(item.id))return;
    const action=animalAction(item.key,button.dataset.petAction);
    if(action && animation.action(item.id,action.id))say(action.message);
  });
  $('#room-remove').addEventListener('click', async () => {
    const item = selected(); if (!item) return;
    if (await transact(state => removeItem(state, item.id))) say('已收回收藏，不会消耗或丢失物品。');
  });
  for (const [id, delta] of [['room-smaller', -2], ['room-larger', 2]]) $('#'+id).addEventListener('click', async () => {
    const item = selected(); if (!item) return;
    await transact(state => {
      const latest = roomItems(state).find(entry => entry.id === item.id);
      if (!latest) throw new Error('这件藏品已被收回。');
      return changeItem(state, item.id, { size: Math.max(8, Math.min(28, latest.size + delta)) });
    });
  });
  $('#room-sound').addEventListener('click', () => {
    sound = !sound; $('#room-sound').setAttribute('aria-pressed', String(sound));
    $('#room-sound').textContent = `音乐盒音效：${sound ? '开' : '关'}`;
    toast(sound ? '仅点击音乐盒时播放短旋律，无背景音乐。' : '音效已关闭。');
  });
  return { render, suspend() { animation.stopFigures(); }, reset() {
    drag = null; selectedId = null; playing = false; renderedScene = null; animation.reset(); effects.clear();
    stage.classList.remove('is-play-mode');
    for (const tab of document.querySelectorAll('[data-room-mode]')) tab.setAttribute('aria-pressed', String(tab.dataset.roomMode === 'edit'));
    render(); say('把喜欢的物品，摆成自己的小世界。');
  } };
}
