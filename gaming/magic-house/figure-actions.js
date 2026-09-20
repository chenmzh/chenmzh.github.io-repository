// Presentation-only choreography. Never reads/writes inventory, RNG, room layout or storage.
const action = (id, name, effect, frames, message) => Object.freeze({
  id, name, effect, frames: Object.freeze(frames), duration: 4200, message,
});
export const FIGURE_PROFILES = Object.freeze({
  A: Object.freeze([
    action('star-core', '星核启动', 'thruster', [0,1,1,2,3,3,3,2,1,0], '星核蓄能！宇航员抬臂启动，蓝金推进光与轨道一起展开。'),
    action('planet-orbit', '掌中星河', 'orbit', [0,4,5,5,6,6,7,7,4,0], '托起掌中的星球，星轨环绕，最后向你敬一个宇宙礼。'),
  ]),
  'A-01': Object.freeze([
    action('moon-boost', '月面蓄力', 'thruster', [0,1,1,2,3,3,3,2,1,0], '月球漫步者压低底盘蓄力，举起机械爪释放蓝色能量。'),
    action('radar-scan', '雷达巡星', 'radar', [0,4,5,5,6,6,5,7,7,0], '天线转向，机械爪展开，雷达光圈扫描周围的小宇宙。'),
  ]),
  B: Object.freeze([
    action('moon-hug', '月亮抱抱', 'hearts', [0,1,2,2,2,3,3,2,1,0], '把月亮抱紧一点！兔兔的耳朵弯下来，软绒抱抱冒出暖心光点。'),
    action('cloud-dream', '云上好梦', 'clouds', [0,4,5,5,6,6,7,7,4,0], '长耳朵舒展开，月亮枕轻轻抬起，云朵和小星星围成一个好梦。'),
  ]),
  'B-01': Object.freeze([
    action('fox-hug', '暖心抱抱', 'hearts', [0,1,2,2,2,3,3,2,1,0], '抱抱狐举爪比心，再张开双臂，送你一圈暖暖的爱心。'),
    action('tail-cloud', '绒尾云朵', 'clouds', [0,4,5,5,6,6,7,7,4,0], '狐狸抱住蓬松尾巴，甩甩尾尖挥挥爪，软云朵跟着散开。'),
  ]),
  C: Object.freeze([
    action('petal-spell', '花翼魔法', 'petals', [0,1,1,2,3,3,3,2,1,0], '草莓精灵挥杖展翅，花瓣沿着魔法光环飞舞。'),
    action('garden-bloom', '花园绽放', 'bloom', [0,4,5,5,6,6,7,7,4,0], '魔杖轻点花园，花朵次第绽放，精灵捧出一朵小雏菊。'),
  ]),
  'C-01': Object.freeze([
    action('forest-letter', '森林来信', 'letters', [0,1,1,2,3,3,3,2,1,0], '蘑菇信使翻开邮包，展翅递信，森林的问候化作流光信笺。'),
    action('leaf-awakening', '叶翼苏醒', 'leaves', [0,4,5,5,6,6,7,7,4,0], '轻触大地，展开叶翅！绿叶与萤光沿着魔法环升起。'),
  ]),
});
export function figureAction(key, id) {
  const actions = FIGURE_PROFILES[key];
  return id == null ? actions?.[0] : actions?.find(entry => entry.id === id);
}
export function sampleFigureAction(definition, elapsed, reduced = false) {
  const phase = Math.max(0, Math.min(1, elapsed / definition.duration));
  const done = phase === 1;
  return { done, phase: reduced ? .5 : phase,
    frame: done ? 0 : reduced ? definition.frames[4] : definition.frames[Math.min(definition.frames.length - 1, Math.floor(phase * definition.frames.length))],
    alpha: done ? 0 : reduced ? .65 : Math.min(1, phase * 7, (1 - phase) * 7),
  };
}
const TAU = Math.PI * 2;
function star(ctx, x, y, radius, color) {
  ctx.fillStyle = color; ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const r = i % 2 ? radius * .25 : radius, angle = i * Math.PI / 4;
    ctx.lineTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
  }
  ctx.closePath(); ctx.fill();
}
function heart(ctx, x, y, size) {
  ctx.save(); ctx.translate(x, y); ctx.scale(size, size); ctx.beginPath();
  ctx.moveTo(0, .8); ctx.bezierCurveTo(-1.6, -.1, -.8, -1.4, 0, -.55);
  ctx.bezierCurveTo(.8, -1.4, 1.6, -.1, 0, .8); ctx.fill(); ctx.restore();
}
function ellipse(ctx, x, y, rx, ry, color, rotation = 0, start = 0, end = TAU) {
  ctx.strokeStyle = color; ctx.beginPath(); ctx.ellipse(x,y,rx,ry,rotation,start,end); ctx.stroke();
}
export function drawFigureAura(canvas, definition, sample, reduced = false) {
  const ctx = canvas.getContext('2d'), size = canvas.width;
  ctx.clearRect(0, 0, size, size);
  if (!sample.alpha) return;
  ctx.save(); ctx.scale(size / 1000, size / 1000); ctx.globalAlpha = sample.alpha;
  ctx.lineWidth = 3; ctx.lineCap = 'round';
  const t = sample.phase, effect = definition.effect;
  const tech = ['thruster','orbit','radar'].includes(effect);
  const plush = ['hearts','clouds'].includes(effect);
  const color = tech ? '#85e9ff' : plush ? '#ffafbd' : '#b2f5ae';
  const glow = ctx.createRadialGradient(500,520,80,500,520,360);
  glow.addColorStop(0, tech ? '#51d7ff00' : '#fff4d500');
  glow.addColorStop(.65, tech ? '#53caff16' : plush ? '#ffc2d920' : '#adffc620');
  glow.addColorStop(1, '#ffffff00'); ctx.fillStyle = glow; ctx.fillRect(80,80,840,840);
  if (tech) {
    ellipse(ctx,500,720,280,65,color,0,t * TAU,t * TAU + Math.PI * 1.7);
    ellipse(ctx,500,440,300,135,'#ffd57b',-.45,-t * TAU,-t * TAU + 4.7);
    if (effect === 'radar') {
      for (let i = 0; i < (reduced ? 1 : 3); i++) {
        const radius = 130 + ((t * 1.4 + i / 3) % 1) * 230;
        ellipse(ctx,500,460,radius,radius,'#87f0ff80');
      }
      ctx.strokeStyle = '#adfcff'; ctx.beginPath(); ctx.moveTo(500,460);
      ctx.lineTo(500 + Math.cos(t * TAU) * 350,460 + Math.sin(t * TAU) * 350); ctx.stroke();
    } else if (effect === 'thruster' && !reduced) {
      for (const x of [330,670]) {
        const jet = ctx.createLinearGradient(x,570,x,850);
        jet.addColorStop(0,'#fff9dbcc'); jet.addColorStop(.3,'#72e7ffbb'); jet.addColorStop(1,'#4e9fff00');
        ctx.fillStyle = jet; ctx.beginPath(); ctx.moveTo(x-16,570); ctx.quadraticCurveTo(x-42,690,x,850);
        ctx.quadraticCurveTo(x+42,690,x+16,570); ctx.fill();
      }
    }
  } else if (plush) {
    ctx.fillStyle = '#fff6ecaa';
    for (let i = 0; i < 5; i++) {
      ctx.beginPath(); ctx.ellipse(290+i*104,740+Math.sin(i+t*TAU)*13,65,34,0,0,TAU); ctx.fill();
    }
  } else {
    ellipse(ctx,500,730,290,78,'#b8efbc');
    ellipse(ctx,500,730,255,60,'#ffe0a4',0,t*TAU,t*TAU+5.7);
    for (let i=0;i<8;i++) star(ctx,500+Math.cos(i*TAU/8)*280,730+Math.sin(i*TAU/8)*75,8,'#fff3ba');
  }
  const count = reduced ? 4 : 18;
  for (let i=0;i<count;i++) {
    const p=(i/count+t*.6)%1, angle=i*2.399+t*TAU*.35;
    const x=500+Math.cos(angle)*(225+55*Math.sin(i)), y=740-p*570;
    ctx.globalAlpha=sample.alpha*(reduced?1:Math.sin(p*Math.PI));
    if (tech || effect==='clouds') star(ctx,x,y,7+i%4*3,i%2?'#fff0b2':color);
    else if (effect==='hearts') { ctx.fillStyle=i%2?'#ffd18d':'#ff9db9'; heart(ctx,x,y,12+i%3*3); }
    else if (effect==='letters') {
      ctx.save(); ctx.translate(x,y); ctx.rotate(Math.sin(angle)*.3);
      ctx.fillStyle='#fff4d8'; ctx.strokeStyle='#ccad74'; ctx.fillRect(-17,-11,34,22); ctx.strokeRect(-17,-11,34,22);
      ctx.beginPath();ctx.moveTo(-17,-11);ctx.lineTo(0,2);ctx.lineTo(17,-11);ctx.stroke();ctx.restore();
    } else if (effect==='bloom') {
      ctx.fillStyle=i%2?'#ffcbdc':'#fff0bc';
      for(let j=0;j<5;j++){const a=j*TAU/5;ctx.beginPath();ctx.ellipse(x+Math.cos(a)*9,y+Math.sin(a)*9,8,5,a,0,TAU);ctx.fill();}
      ctx.fillStyle='#e6b85d';ctx.beginPath();ctx.arc(x,y,4,0,TAU);ctx.fill();
    } else {
      ctx.fillStyle=effect==='petals'?(i%2?'#ffbdcf':'#ffe4bd'):(i%2?'#d4ef98':'#95d6a1');
      ctx.beginPath();ctx.ellipse(x,y,7,16,angle,0,TAU);ctx.fill();
    }
  }
  ctx.restore();
}
