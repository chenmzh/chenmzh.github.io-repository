// Central configuration for GARGANTUA: quality presets, render parameters,
// camera presets and persistence keys.

export const STORAGE_KEY = 'gargantua.settings.v1';

export const QUALITY_PRESETS = {
  standard: {
    label: 'Standard',
    renderScale: 0.75,
    maxPixelRatio: 1.5,
    samples: 1,
    blurIterations: 4,
    maxSteps: 192,
    stepScale: 0.095,
  },
  high: {
    label: 'High',
    renderScale: 0.9,
    maxPixelRatio: 2.0,
    samples: 1,
    blurIterations: 5,
    maxSteps: 288,
    stepScale: 0.08,
  },
  cinematic: {
    label: 'Cinematic',
    renderScale: 1.0,
    maxPixelRatio: 2.0,
    samples: 2,
    blurIterations: 6,
    maxSteps: 384,
    stepScale: 0.07,
  },
};

export const DEFAULT_QUALITY = 'high';

export const PARAM_DEFS = [
  { key: 'exposure',        label: '曝光 Exposure',           min: 0.2,  max: 4.0,  step: 0.01, value: 1.15, group: '成像 Imaging' },
  { key: 'bloomStrength',   label: '辉光强度 Bloom',          min: 0.0,  max: 3.0,  step: 0.01, value: 1.00, group: '成像 Imaging' },
  { key: 'bloomThreshold',  label: '辉光阈值 Threshold',      min: 0.0,  max: 3.0,  step: 0.01, value: 0.85, group: '成像 Imaging' },
  { key: 'aberration',      label: '色散 Dispersion',         min: 0.0,  max: 3.0,  step: 0.01, value: 0.85, group: '成像 Imaging' },
  { key: 'vignette',        label: '暗角 Vignette',           min: 0.0,  max: 1.0,  step: 0.01, value: 0.42, group: '成像 Imaging' },
  { key: 'grain',           label: '胶片颗粒 Grain',          min: 0.0,  max: 1.0,  step: 0.01, value: 0.30, group: '成像 Imaging' },
  { key: 'saturation',      label: '饱和度 Saturation',       min: 0.0,  max: 2.0,  step: 0.01, value: 1.18, group: '成像 Imaging' },
  { key: 'diskBrightness',  label: '盘面亮度 Disk Brightness', min: 0.0, max: 8.0, step: 0.01, value: 2.70, group: '吸积盘 Disk' },
  { key: 'diskInner',       label: '盘内半径 Inner Radius',   min: 1.6,  max: 5.0,  step: 0.01, value: 3.00, group: '吸积盘 Disk' },
  { key: 'diskOuter',       label: '盘外半径 Outer Radius',   min: 6.0,  max: 26.0, step: 0.10, value: 14.0, group: '吸积盘 Disk' },
  { key: 'diskOpacity',     label: '盘面密度 Opacity',        min: 0.0,  max: 6.0,  step: 0.01, value: 2.20, group: '吸积盘 Disk' },
  { key: 'diskTurbulence',  label: '湍流强度 Turbulence',     min: 0.0,  max: 3.0,  step: 0.01, value: 1.05, group: '吸积盘 Disk' },
  { key: 'diskSpeed',       label: '湍流速度 Flow Speed',     min: 0.0,  max: 3.0,  step: 0.01, value: 0.85, group: '吸积盘 Disk' },
  { key: 'diskThickness',   label: '盘面厚度 Thickness',      min: 0.01, max: 0.20, step: 0.001, value: 0.055, group: '吸积盘 Disk' },
  { key: 'diskTempK',       label: '盘面色温 Temp (K)',       min: 3000, max: 15000, step: 10,  value: 6500, group: '吸积盘 Disk' },
  { key: 'ringBoost',       label: '光子环增强 Ring Boost',   min: 0.0,  max: 4.0,  step: 0.01, value: 1.25, group: '吸积盘 Disk' },
  { key: 'starBrightness',  label: '恒星亮度 Stars',          min: 0.0,  max: 3.0,  step: 0.01, value: 0.90, group: '星空 Galaxy' },
  { key: 'galaxyBrightness',label: '银河亮度 Galaxy',         min: 0.0,  max: 2.5,  step: 0.01, value: 0.70, group: '星空 Galaxy' },
  { key: 'starDensity',     label: '恒星密度 Star Density',   min: 30.0, max: 200.0, step: 1.0,  value: 110.0, group: '星空 Galaxy' },
  { key: 'fov',             label: '视场角 FOV',              min: 35.0, max: 90.0, step: 0.5,  value: 60.0, group: '相机 Camera' },
  { key: 'maxSteps',        label: '积分步数 Max Steps',      min: 64.0, max: 512.0, step: 8.0,  value: 320.0, group: '相机 Camera' },
  { key: 'stepScale',       label: '积分步长 Step Scale',     min: 0.03, max: 0.18, step: 0.005, value: 0.075, group: '相机 Camera' },
  { key: 'musicVolume',     label: '音乐音量 Music Volume',    min: 0.0,  max: 1.0,  step: 0.01, value: 0.35, group: '音频 Audio' },
];

export const DEFAULT_PARAMS = Object.fromEntries(PARAM_DEFS.map((p) => [p.key, p.value]));

export const VIEW_PRESETS = [
  {
    id: 'horizon',
    label: '事件视界',
    desc: '近距离掠过强引力场',
    distance: 3.1,
    polar: 1.46,   // radians from +Y
    azimuth: 0.52,
    fov: 68,
  },
  {
    id: 'photon',
    label: '光子环',
    desc: '临界碰撞参数与引力透镜',
    distance: 4.6,
    polar: 1.36,
    azimuth: 2.12,
    fov: 55,
  },
  {
    id: 'disk',
    label: '吸积盘全景',
    desc: '倾斜视角展示多普勒增亮',
    distance: 10.5,
    polar: 1.12,
    azimuth: 0.82,
    fov: 52,
  },
  {
    id: 'cinema',
    label: '电影镜头',
    desc: '慢速环绕自动运镜',
    distance: 15.5,
    polar: 1.18,
    azimuth: 0.30,
    fov: 48,
  },
];

export const DEBUG_VIEWS = [
  '完整合成 Full',
  '原始测地线 Raw',
  '仅吸积盘 Disk Only',
  '碰撞参数 Impact b',
  '光子环临界曲线 Ring',
  '盘面穿越次数 Crossings',
  'Doppler/红移频移 g',
  '仅星空背景 Background',
  '仅辉光 Bloom',
  '积分步数 Step Cost',
];
