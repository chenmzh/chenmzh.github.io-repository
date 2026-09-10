const VERSION = 1;
const THRESHOLDS = [50, 120];
const ENDINGS = ['witness', 'shelter'];
const FLAG_NAMES = ['intro', 'ferryman', 'tea', 'herbQuest', 'herbs', 'medicine', 'shrine', 'chest', 'battleWon'];
const JOURNAL_KEYS = [...FLAG_NAMES, 'level_2', 'level_3', 'learn_sword', 'learn_vitality', 'ending_witness', 'ending_shelter'];
const clone = value => JSON.parse(JSON.stringify(value));
const integer = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const freshState = () => ({
  version: VERSION,
  hero: { level: 1, xp: 0, skillPoints: 0, hp: 160, maxHp: 160, qi: 60, maxQi: 60, potions: 3, attackBonus: 0 },
  flags: { intro: false, ferryman: false, tea: false, herbQuest: false, herbs: false, medicine: false, shrine: false, chest: false, battleWon: false, ending: null },
  learned: { sword: false, vitality: false },
  journal: [],
  position: { x: 460, y: 520 }
});

function restore(saved) {
  if (typeof saved === 'string') saved = JSON.parse(saved);
  if (!saved || saved.version !== VERSION) throw new Error('存档版本不兼容');
  const { hero: h, flags: f, learned: l, journal, position: p } = saved;
  if (!h || !f || !l || !p || FLAG_NAMES.some(key => typeof f[key] !== 'boolean')) throw new Error('存档字段损坏');
  if (!(f.ending === null || ENDINGS.includes(f.ending)) || (f.ending && !f.battleWon)) throw new Error('结局进度损坏');
  if ((f.herbs && !f.herbQuest) || (f.medicine && !f.herbs) || (f.battleWon && (!f.tea || !f.shrine))) throw new Error('任务进度损坏');
  if (typeof l.sword !== 'boolean' || typeof l.vitality !== 'boolean') throw new Error('招式进度损坏');
  const xp = (f.tea ? 15 : 0) + (f.medicine ? 25 : 0) + (f.shrine ? 20 : 0) + (f.chest ? 10 : 0) + (f.battleWon ? 60 : 0);
  const level = 1 + THRESHOLDS.filter(threshold => xp >= threshold).length;
  const maxHp = 160 + (level - 1) * 20 + (l.vitality ? 25 : 0);
  const maxQi = 60 + (level - 1) * 6;
  const skillPoints = level - 1 - Number(l.sword) - Number(l.vitality);
  if (h.xp !== xp || h.level !== level || h.maxHp !== maxHp || h.maxQi !== maxQi || h.skillPoints !== skillPoints || skillPoints < 0 || h.attackBonus !== (l.sword ? 5 : 0)) throw new Error('成长数据损坏');
  if (!integer(h.hp, 1, maxHp) || !integer(h.qi, 0, maxQi) || !integer(h.potions, 0, 3 + Number(f.chest) + Number(f.medicine))) throw new Error('角色资源损坏');
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || p.x < 0 || p.x > 1600 || p.y < 0 || p.y > 1000) throw new Error('位置损坏');
  if (!Array.isArray(journal) || journal.some(key => !JOURNAL_KEYS.includes(key)) || new Set(journal).size !== journal.length) throw new Error('日志损坏');
  return {
    version: VERSION,
    hero: Object.fromEntries(Object.keys(freshState().hero).map(key => [key, h[key]])),
    flags: { ...Object.fromEntries(FLAG_NAMES.map(key => [key, f[key]])), ending: f.ending },
    learned: { sword: l.sword, vitality: l.vitality }, journal: [...journal], position: { x: p.x, y: p.y }
  };
}

export class ChapterState {
  constructor(saved = null) {
    this.restored = false;
    this.invalidSave = false;
    this.state = freshState();
    this._battle = null;
    if (saved !== null) {
      try { this.state = restore(saved); this.restored = true; }
      catch { this.invalidSave = true; }
    }
  }

  snapshot() { return clone(this.state); }

  _record(key) {
    if (!this.state.journal.includes(key)) this.state.journal.push(key);
  }

  _gainXP(amount) {
    const h = this.state.hero;
    h.xp += amount;
    const level = 1 + THRESHOLDS.filter(threshold => h.xp >= threshold).length;
    while (h.level < level) {
      h.level++; h.skillPoints++; h.maxHp += 20; h.hp += 20; h.maxQi += 6; h.qi += 6;
      this._record(`level_${h.level}`);
    }
  }

  markIntro() { this.state.flags.intro = true; this._record('intro'); }

  interact(id) {
    if (this._battle) throw new Error('交锋尚未结束');
    const { flags: f, hero: h } = this.state;
    switch (id) {
      case 'ferryman': {
        const first = !f.ferryman; f.ferryman = true; this._record('ferryman');
        return { dialogue: first ? 'ferryman_first' : 'ferryman_repeat' };
      }
      case 'tea':
        if (f.tea) return { dialogue: 'tea_repeat' };
        f.tea = true; this._record('tea'); this._gainXP(15);
        return { dialogue: 'tea_first', reward: '得到渡口线索 · 阅历 +15' };
      case 'herbalist':
        if (!f.herbQuest) { f.herbQuest = true; this._record('herbQuest'); return { dialogue: 'herbalist_first' }; }
        if (f.herbs && !f.medicine) {
          f.medicine = true; h.potions++; this._record('medicine'); this._gainXP(25);
          return { dialogue: 'herbalist_return', reward: '金疮药 +1 · 阅历 +25' };
        }
        return { dialogue: 'herbalist_repeat' };
      case 'herbs':
        if (!f.herbQuest) return { dialogue: 'herbs_locked' };
        if (f.herbs) return { dialogue: 'herbs_empty' };
        f.herbs = true; this._record('herbs');
        return { dialogue: 'herbs_found', reward: '采得青露草 · 带回药庐' };
      case 'shrine':
        if (f.shrine) return { dialogue: 'shrine_repeat' };
        f.shrine = true; this._record('shrine'); this._gainXP(20);
        return { dialogue: 'shrine_found', reward: '发现旧碑刻 · 阅历 +20' };
      case 'chest':
        if (f.chest) return { dialogue: 'chest_empty' };
        f.chest = true; h.potions++; this._record('chest'); this._gainXP(10);
        return { dialogue: 'chest_found', reward: '金疮药 +1 · 阅历 +10' };
      case 'rest':
        h.hp = h.maxHp; h.qi = h.maxQi;
        return { dialogue: 'rest', reward: '气血与真气已恢复' };
      case 'bridge':
        if (!f.tea || !f.shrine) return { dialogue: 'bridge_locked' };
        if (!f.battleWon) return { dialogue: 'bridge_ready', startBattle: true };
        if (!f.ending) return { dialogue: 'bridge_choice', choice: true };
        return { dialogue: 'bridge_complete' };
      default: throw new Error(`未知交互：${id}`);
    }
  }

  learn(id) {
    const { hero: h, learned } = this.state;
    if (!['sword', 'vitality'].includes(id)) throw new Error('未知修习');
    if (this._battle) throw new Error('交锋中不能修习');
    if (learned[id]) throw new Error('此项已经修习');
    if (h.skillPoints < 1) throw new Error('修习点不足');
    h.skillPoints--; learned[id] = true;
    if (id === 'sword') h.attackBonus += 5;
    else { h.maxHp += 25; h.hp += 25; }
    this._record(`learn_${id}`);
    return { reward: id === 'sword' ? '流云剑精进 · 剑招伤害 +5' : '经脉淬炼 · 气血上限 +25' };
  }

  battleConfig() {
    const { flags: f, hero: h } = this.state;
    if (!f.tea || !f.shrine || f.battleWon) throw new Error('尚未满足交锋条件');
    if (!this._battle) this._battle = { potions: h.potions };
    return { maxHp: h.maxHp, hp: h.hp, maxQi: h.maxQi, qi: h.qi, potions: h.potions, attackBonus: h.attackBonus };
  }

  finishBattle(won, hero) {
    if (!this._battle) return null;
    if (typeof won !== 'boolean' || !hero || !['hp', 'qi', 'potions'].every(key => Number.isFinite(hero[key]))) throw new Error('战斗结果无效');
    const { hero: h, flags: f } = this.state;
    h.hp = clamp(Math.floor(hero.hp), 1, h.maxHp);
    h.qi = clamp(Math.floor(hero.qi), 0, h.maxQi);
    h.potions = clamp(Math.floor(hero.potions), 0, this._battle.potions);
    this._battle = null;
    if (won && !f.battleWon) {
      f.battleWon = true; this._record('battleWon'); this._gainXP(60);
      return { dialogue: 'battle_won', reward: '渡口交锋获胜 · 阅历 +60', choice: true };
    }
    return { dialogue: 'battle_lost' };
  }

  chooseEnding(id) {
    if (!ENDINGS.includes(id)) throw new Error('未知抉择');
    const f = this.state.flags;
    if (!f.battleWon) throw new Error('交锋结束后才能决定原信的去留');
    if (f.ending) return `ending_${f.ending}`;
    f.ending = id; this._record(`ending_${id}`);
    return `ending_${id}`;
  }

  moveTo(x, y) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    this.state.position = { x: clamp(x, 0, 1600), y: clamp(y, 0, 1000) };
  }

  getObjective() {
    const f = this.state.flags;
    if (f.ending) return '第一章已完成 · 可以继续探索青溪渡';
    if (f.battleWon) return '回到石桥，与裴照决定原信的去留';
    if (!f.tea) return '前往茶摊，打听渡口封桥的缘由';
    if (!f.shrine) return '前往旧碑，查看洪水留下的旧碑刻';
    return '线索已齐 · 前往石桥与裴照交涉（可先到驿亭休息、药庐领委托）';
  }
}
