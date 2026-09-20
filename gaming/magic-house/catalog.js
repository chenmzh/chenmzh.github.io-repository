// Pool versions describe ticket eligibility, not ownership. Old identities and quotas stay permanent.
export const CURRENT_POOL_VERSION = 4;
export const SERIES = Object.freeze([
  { id: 'astronaut', name: '星际领航', description: '探索星空的机械伙伴。' },
  { id: 'plush', name: '抱抱伙伴', description: '柔软温暖的毛绒伙伴。' },
  { id: 'fairies', name: '森林精灵', description: '来自花园与森林的童话信使。' },
  { id: 'dogs', name: '汪汪伙伴', description: '小屋里的八位犬类朋友。' },
  { id: 'cats', name: '喵喵伙伴', description: '四种不同个性的猫咪。' },
  { id: 'zoo', name: '动物园伙伴', description: '六位来自动物园的朋友。' },
  { id: 'buildings', name: '街角小店', description: '咖啡屋、面包房与花店的微缩街角。' },
  { id: 'vehicles', name: '奇想出行', description: '驶向海陆天空的六种交通模型。' },
  { id: 'household', name: '日常惊喜', description: '点亮小屋日常的生活物品。' },
  { id: 'albums', name: '风景来信', description: '记录月夜、森林与远方的插画卡册。' },
  { id: 'bonus', name: '晚安纪念', description: '可选最后赏，不占普通奖池。' },
]);
const SERIES_KEYS = {
  astronaut: ['A', 'A-01'], plush: ['B', 'B-01'], fairies: ['C', 'C-01'],
  dogs: ['D-04', 'E-07', 'E-08', 'E-09', 'E-10', 'E-11', 'E-12', 'E-13'],
  cats: ['E-14', 'E-15', 'E-16', 'E-23'],
  zoo: ['E-17', 'E-18', 'E-19', 'E-20', 'E-21', 'E-22'],
  buildings: ['D-01', 'D-02', 'D-03'],
  vehicles: ['E-01', 'E-02', 'E-03', 'E-04', 'E-05', 'E-06'],
  household: ['D-05', 'D-06', 'D-07', 'D-08', 'D-09', 'D-10', 'D-11', 'D-12', 'D-13'],
  albums: ['F-01', 'F-02', 'F-03', 'F-04', 'F-05', 'F-06', 'F-07', 'F-08'],
  bonus: ['LAST'],
};
const seriesIdFor = key => Object.keys(SERIES_KEYS).find(id => SERIES_KEYS[id].includes(key));
export const PRIZES = Object.freeze([
  { id: 'A', name: '星际领航', subtitle: '机械宇航员 · 典藏大娃', count: 1, value: 1399, color: '#dcc085', kind: 'astronaut', format: '固定款大娃', story: '不是换一顶帽子的玩偶。金属装甲、琥珀面罩、推进背包与星轨底座，组成一位完整的星际领航员。', features: ['镜面装甲', '琥珀面罩', '星轨展台'] },
  { id: 'B', name: '云朵抱抱', subtitle: '垂耳兔 · 毛绒大娃', count: 2, value: 899, color: '#abcbbb', kind: 'cloud', format: '固定款大娃', story: '软乎乎的大肚子、自然垂落的长耳朵，抱着一只月牙靠枕。它属于沙发，不属于太空。', features: ['蓬松绒感', '不对称长耳', '月牙抱枕'] },
  { id: 'C', name: '草莓漫游', subtitle: '花园精灵 · 造型大娃', count: 3, value: 599, color: '#ecb9b4', kind: 'berry', format: '固定款大娃', story: '戴着草莓帽的小精灵，从花园里走来。透光翅膀、果实裙摆和花草底座，是一整个童话角色。', features: ['草莓帽冠', '透光翅膀', '花园底座'] },
  { id: 'D', name: '日常惊喜', subtitle: '9 种生活物件 · 不只是换色', count: 54, value: 299, color: '#d6b88a', kind: 'household', format: '生活惊喜款', story: '小狗、挂件、围裙、台灯、茶杯、盆栽、音乐盒、抱枕、座钟。拆开之前，不知道哪一种生活小物会来住进你的小屋。', features: ['9 种不同物品', '每款 6 份', '可布置与互动'] },
  { id: 'E', name: '汪汪伙伴', subtitle: '6 种犬种 · 会跑会回应', count: 12, value: 129, color: '#acc9d6', kind: 'dog', format: '犬种随机款', story: '柴犬、金毛、哈士奇、腊肠犬、贵宾犬、边牧。六种不同体型与性格的小狗，在小屋里走跑、跟随、抬爪、嗅闻和睡觉。', features: ['6 种不同犬种', '每款 2 份', '差分动作陪玩'] },
  { id: 'F', name: '风景来信', subtitle: '插画卡册 · 7 款主题', count: 28, value: 69, color: '#c7ccb1', kind: 'album', format: '系列随机款', story: '一本卡册，一幅不同的风景。封面插画、配色和主题各不相同，记录月夜、花园与远方。', features: ['7 款卡册', '每款 4 份', '本场可重复'] },
  { id: 'LAST', name: '晚安月亮', subtitle: '模拟最后赏 · 纪念摆件', count: 1, value: null, color: '#c6b4e4', kind: 'moon-sleep', format: '可选加赠', story: '属于这一场最后一张签的小纪念。仅在开启最后赏的场次加赠。', features: ['独立纪念款', '每场至多 1 份', '模拟规则'] },
]);
export const VARIANTS = Object.freeze([
  ...[
    ['D-04', '奶油小狗', '#d5b176', 'puppy'], ['D-05', '星星挂件', '#96bfd4', 'charm'],
    ['D-06', '雏菊围裙', '#a7b499', 'apron'], ['D-07', '蘑菇台灯', '#d7b553', 'lamp'],
    ['D-08', '云朵茶杯', '#bed2dd', 'cup'], ['D-09', '心叶盆栽', '#9eb687', 'plant'],
    ['D-10', '旋转音乐盒', '#a7beb5', 'music'], ['D-11', '蜂蜜抱枕', '#dfc890', 'cushion'],
    ['D-12', '晨光座钟', '#b89e80', 'clock'],
  ].map(([id, name, color, motif]) => ({ id, prize: 'D', name, color, motif, count: 6 })),
  // Original buildings retain their historical identities and rejoin pool v4.
  { id: 'D-01', prize: 'D', name: '月光咖啡屋', count: 0, legacy: true, color: '#b7a788', motif: 'cafe' },
  { id: 'D-02', prize: 'D', name: '暖炉面包房', count: 0, legacy: true, color: '#d9ab83', motif: 'bakery' },
  { id: 'D-03', prize: 'D', name: '玻璃花店', count: 0, legacy: true, color: '#a3b8a0', motif: 'florist' },
  { id: 'E-01', prize: 'E', name: '日落巴士', count: 0, legacy: true, color: '#dfaf80', motif: 'bus' },
  { id: 'E-02', prize: 'E', name: '海盐帆船', count: 0, legacy: true, color: '#94b9c9', motif: 'boat' },
  { id: 'E-03', prize: 'E', name: '星际火箭', count: 0, legacy: true, color: '#b7adcb', motif: 'rocket' },
  { id: 'E-04', prize: 'E', name: '晴空飞机', count: 0, legacy: true, color: '#d9c28c', motif: 'plane' },
  { id: 'E-05', prize: 'E', name: '薄荷列车', count: 0, legacy: true, color: '#a2bdac', motif: 'train' },
  { id: 'E-06', prize: 'E', name: '露营房车', count: 0, legacy: true, color: '#bc9c91', motif: 'camper' },
  ...[
    ['E-07', '柴犬 · 栗子', '#d9b37c', 'shiba'], ['E-08', '金毛 · 麦麦', '#d5bc80', 'retriever'],
    ['E-09', '哈士奇 · 冰糖', '#a9bdc8', 'husky'], ['E-10', '腊肠犬 · 可可', '#ba916f', 'dachshund'],
    ['E-11', '贵宾犬 · 卷卷', '#d8bda4', 'poodle'], ['E-12', '边牧 · 芝麻', '#a6b6ac', 'collie'],
  ].map(([id, name, color, motif]) => ({ id, prize: 'E', name, color, motif, count: 2 })),
  // Former shop exclusives join v4; premium prices remain stable for shop receipt replay.
  ...[
    ['E-13', '萨摩耶 · 雪团', '#ddd8ef', 'samoyed'],
    ['E-14', '三花猫 · 花卷', '#c4b393', 'calico'],
    ['E-15', '橘猫 · 橘子', '#dea764', 'tabby'],
    ['E-16', '布偶猫 · 蓝莓', '#b2bfd9', 'ragdoll'],
  ].map(([id, name, color, motif]) => ({ id, prize: 'E', name, color, motif, count: 0, shopPremium: true, introducedIn: 4 })),
  ...[
    ['E-17', '小河马 · 泡芙', '#b8a9c2', 'hippo'], ['E-18', '小猪 · 桃桃', '#e7bbc2', 'piglet'],
    ['E-19', '水豚 · 慢慢', '#bfa17c', 'capybara'], ['E-20', '小象 · 芋圆', '#b5b5c1', 'elephant'],
    ['E-21', '企鹅 · 饭团', '#aecbc8', 'penguin'], ['E-22', '小熊猫 · 栗栗', '#c38863', 'red-panda'],
  ].map(([id,name,color,motif])=>({id,prize:'E',name,color,motif,count:0,shopPremium:true,introducedIn:4,zoo:true})),
  { id: 'F-01', prize: 'F', name: '月夜来信', count: 4, color: '#a4acc8', motif: 'moon' },
  { id: 'F-02', prize: 'F', name: '云间邮局', count: 4, color: '#a6c3c7', motif: 'clouds' },
  { id: 'F-03', prize: 'F', name: '花园手记', count: 4, color: '#b4c3a1', motif: 'garden' },
  { id: 'F-04', prize: 'F', name: '日落散步', count: 4, color: '#d5ae95', motif: 'sunset' },
  { id: 'F-05', prize: 'F', name: '咖啡日常', count: 4, color: '#bba48e', motif: 'coffee' },
  { id: 'F-06', prize: 'F', name: '海边假期', count: 4, color: '#96b9c9', motif: 'sea' },
  { id: 'F-07', prize: 'F', name: '星野记录', count: 4, color: '#b4a2c3', motif: 'stars' },
  ...[
    ['A-01', 'A', '月球漫步者', '#bdc8d4', 'lunar-rover'],
    ['B-01', 'B', '森林抱抱狐', '#d79671', 'fox'],
    ['C-01', 'C', '蘑菇信使', '#d9a695', 'mushroom-fairy'],
    ['D-13', 'D', '星星抱枕', '#e0c67c', 'star-cushion'],
    ['E-23', 'E', '英短蓝猫 · 团团', '#a9b8cc', 'british-shorthair'],
    ['F-08', 'F', '森林漫记', '#a3b58d', 'woodland'],
  ].map(([id, prize, name, color, motif]) => ({ id, prize, name, color, motif, count: 0, introducedIn: 4 })),
].map(item => ({ ...item, seriesId: seriesIdFor(item.id) })));

export const prizeById = id => PRIZES.find(p => p.id === id);
export function prizeForPool(id, version = CURRENT_POOL_VERSION) {
  const p = prizeById(id);
  if (version === 4 && p && id !== 'LAST') return {
    ...p, name: ({ B: '抱抱伙伴', C: '森林精灵', D: '生活与街角', E: '奇趣伙伴' })[id] || p.name,
    subtitle: `${variantsFor(id, version).length} 款独立设计 · 随机入池`, format: '多款随机赏',
    story: '每签在开场时独立随机绑定本档的一款藏品。可能重复，也可能缺款；一场不保证集齐。',
    features: ['各款等概率入池', '本场可能重复或缺款', '跨场收集'],
  };
  if (id === 'D' && version === 1) return { ...p, name: '街角小店（旧辑）', subtitle: '保留原有 3 款建筑', kind: 'building', count: 6, story: '原有咖啡屋、面包房与花店，保留具体身份和库存。', features: ['旧辑 3 款建筑', '每款 2 份', '保留旧收藏'] };
  if (id === 'E' && version < 3) return { ...p, name: '奇想出行（旧辑）', subtitle: '交通模型 · 6 款载具', kind: 'vehicle', format: '系列随机款', count: version === 1 ? 18 : 12, story: '巴士、帆船、火箭、飞机、列车、房车。旧交通模型不会变成小狗；新场才启用汪汪伙伴。', features: ['旧辑 6 款载具', `每款 ${version === 1 ? 3 : 2} 份`, '保留旧收藏'] };
  if (id === 'F' && version === 1) return { ...p, count: 70, features: ['7 款卡册', '每款 10 份（旧场）', '本场可重复'] };
  return p;
}
// v1-v3 return exact per-style quotas. In v4 count:null means eligible, not guaranteed stock.
// Originals A/B/C keep their permanent keys and bind tickets with variant:null.
export function variantsFor(id, poolVersion = CURRENT_POOL_VERSION) {
  if (poolVersion === 4) return id === 'LAST' ? [] : CATALOG_ITEMS.filter(item => item.prize === id)
    .map(item => ({ ...item, count: null, variant: item.id === id ? null : item.id }));
  return VARIANTS.filter(v => (!v.introducedIn || v.introducedIn <= poolVersion) && v.prize === id &&
    (id !== 'D' || (poolVersion === 1 ? v.legacy : !v.legacy)) &&
    (id !== 'E' || (poolVersion < 3 ? v.legacy : !v.legacy))
  ).map(v => ({ ...v, count: poolVersion === 1 ? ({ D: 2, E: 3, F: 10 })[id] : id === 'E' ? 2 : v.count }));
}
export const variantById = (prize, id) => VARIANTS.find(v => v.prize === prize && v.id === id);
export const CATALOG_ITEMS = Object.freeze(PRIZES.flatMap(p => [
  ...(['A', 'B', 'C', 'LAST'].includes(p.id) ? [{ id: p.id, prize: p.id, name: p.name, count: p.count, color: p.color, motif: null, seriesId: seriesIdFor(p.id) }] : []),
  ...VARIANTS.filter(v => v.prize === p.id),
]));
export const seriesForItem = key => SERIES.find(series => series.id === seriesIdFor(key));
export const itemsForSeries = id => CATALOG_ITEMS.filter(item => item.seriesId === id);
export function catalogForPool(version = CURRENT_POOL_VERSION) {
  return PRIZES.flatMap(p => {
    const variants = variantsFor(p.id, version);
    return variants.length ? variants : CATALOG_ITEMS.filter(item => item.id === p.id);
  });
}
export const itemKey = result => result.variant || result.prize;
export const itemName = result => variantById(result.prize, result.variant)?.name || prizeById(result.prize)?.name;
