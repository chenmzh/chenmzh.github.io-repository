(function attachCloudCabinetLogic(root) {
  "use strict";

  const QUIZ_DATA = root.CloudQuizData
    || (typeof module !== "undefined" && module.exports ? require("./quiz-data.js") : null);
  if (!QUIZ_DATA) throw new Error("CloudQuizData 未加载");

  const BOX_COST = 120;
  const CASE_SIZE = 12;
  const SECRET_CASE_RATE = 0.12;
  const PACKING_DURATION_MS = 20_000;
  const PACKING_MAX_PAYOUT = 45;
  const PACKING_WRONG_PENALTY_MS = 2_500;
  const QUIZ_LENGTH = 5;
  const { QUIZ_CONFIG, QUESTION_BANKS } = QUIZ_DATA;

  const ARCADE_CONFIG = Object.freeze({
    platformer: Object.freeze({
      id: "platformer", label: "云端跑堂", english: "CLOUD HOP",
      icon: "▲",
      description: "不限时越过奶油台阶、收集云朵糖；抵达终点或生命耗尽才结算。",
      instructions: "方向键或 A / D 移动，空格或 ↑ 跳跃；共有 3 条生命。",
    }),
    tetris: Object.freeze({
      id: "tetris", label: "方糖堆叠", english: "SUGAR STACK",
      icon: "▦",
      description: "不限时把七种甜品积木排成整行，只有方块堆出顶部才会结束。",
      instructions: "← → 移动，↑ / X 旋转，Z 反转，↓ 软降，空格硬降。堆满才结算。",
    }),
    shooter: Object.freeze({
      id: "shooter", label: "星夜飞行", english: "STAR PATROL",
      icon: "✦",
      description: "驾驶糖霜小飞机迎战无限递增波次，每 5 波出现 Boss，贴弹擦过也能加分。",
      instructions: "方向键或 WASD 移动；飞机自动射击，3 条生命耗尽才返航。",
    }),
  });

  const RARITY = Object.freeze({
    COMMON: "common",
    RARE: "rare",
    EPIC: "epic",
    HIDDEN: "hidden",
  });

  const RARITY_META = Object.freeze({
    [RARITY.COMMON]: {
      label: "日常款",
      english: "EVERYDAY",
      symbol: "●",
      rank: 0,
      sound: "assets/audio/reveal-common.wav",
      reveal: "纸屑轻轻落下，一位熟悉的小店员探出了头。",
    },
    [RARITY.RARE]: {
      label: "稀有款",
      english: "RARE FIND",
      symbol: "★",
      rank: 1,
      sound: "assets/audio/reveal-rare.wav",
      reveal: "玻璃窗亮起了粉色灯牌——这是少见的特别来客。",
    },
    [RARITY.EPIC]: {
      label: "闪耀款",
      english: "SHINING",
      symbol: "✦",
      rank: 2,
      sound: "assets/audio/reveal-epic.wav",
      reveal: "整间甜品店忽然安静，星光从包装缝隙里溢了出来。",
    },
    [RARITY.HIDDEN]: {
      label: "隐藏款",
      english: "SECRET",
      symbol: "♛",
      rank: 3,
      sound: "assets/audio/reveal-hidden.wav",
      reveal: "没有人见过这张值班表。门后的秘密店长终于现身。",
    },
  });

  const BASE_CHARACTERS = [
    {
      id: "strawberry-puff", name: "草莓泡芙", english: "Berry Puff",
      sprite: "assets/characters/strawberry-puff.png",
      rarity: RARITY.COMMON, motif: "berry", role: "果酱试吃员",
      quote: "最后一颗草莓，留给今天最勇敢的人。", ability: "打包开局奖励 +2",
      colors: ["#f05272", "#ffd8d0", "#7d2739"],
      clues: ["里面传来很轻的勺子碰杯声。", "盒子上半部偏轻，摇起来软绵绵的。"],
      visual: { shape: "round", ears: "puff", body: "puffy", outfit: "heart", pose: "wave" },
    },
    {
      id: "caramel-pudding", name: "焦糖布丁", english: "Caramel Pudding",
      sprite: "assets/characters/caramel-pudding.png",
      rarity: RARITY.COMMON, motif: "pudding", role: "情绪安抚师",
      quote: "晃一晃没关系，烦恼会先散掉。", ability: "打包开局奖励 +2",
      colors: ["#d98632", "#ffe29f", "#67371e"],
      clues: ["咚、晃、咚——声音很有弹性。", "重心很低，像有什么稳稳坐在盒底。"],
      visual: { shape: "wide", ears: "round", body: "bell", outfit: "classic", pose: "hold" },
    },
    {
      id: "mint-soda", name: "薄荷苏打", english: "Mint Soda",
      sprite: "assets/characters/mint-soda.png",
      rarity: RARITY.COMMON, motif: "soda", role: "气泡调音师",
      quote: "听，灵感正在瓶子里冒泡。", ability: "打包开局奖励 +2",
      colors: ["#2fb49b", "#c9f4de", "#165f58"],
      clues: ["有一串细密的沙沙声，像气泡升起。", "轮廓似乎很修长，左右晃动得很快。"],
      visual: { shape: "tall", ears: "none", body: "bottle", outfit: "bib", pose: "lean" },
    },
    {
      id: "cookie-bear", name: "曲奇小熊", english: "Cookie Bear",
      sprite: "assets/characters/cookie-bear.png",
      rarity: RARITY.COMMON, motif: "cookie", role: "烤箱守门员",
      quote: "边角也要烤到刚好香香的。", ability: "打包开局奖励 +2",
      colors: ["#b56839", "#efc58e", "#5e321f"],
      clues: ["盒里响起一声干脆的“嗒”。", "拿起来比想象中扎实，几乎不左右滑。"],
      visual: { shape: "square", ears: "bear", body: "round", outfit: "baker", pose: "hold" },
    },
    {
      id: "blueberry-shake", name: "蓝莓奶昔", english: "Blueberry Shake",
      sprite: "assets/characters/blueberry-shake.png",
      rarity: RARITY.COMMON, motif: "berry", role: "慢速搅拌员",
      quote: "慢一点，甜味才来得及追上你。", ability: "打包开局奖励 +2",
      colors: ["#6468ce", "#d9d8ff", "#34366c"],
      clues: ["像吸管轻轻碰到杯壁，只有一下。", "盒子一侧略沉，长长的零件贴着内壁。"],
      visual: { shape: "oval", ears: "long", body: "bottle", outfit: "ribbon", pose: "tilt" },
    },
    {
      id: "lemon-gummy", name: "柠檬软糖", english: "Lemon Gummy",
      sprite: "assets/characters/lemon-gummy.png",
      rarity: RARITY.COMMON, motif: "lemon", role: "酸味点灯员",
      quote: "先酸一下，再亮起来！", ability: "打包开局奖励 +2",
      colors: ["#e1b91d", "#fff19d", "#6d5910"],
      clues: ["摇动时发出短促的弹跳声。", "很轻，里面的小家伙似乎蜷成了一团。"],
      visual: { shape: "bean", ears: "tiny", body: "jelly", outfit: "pocket", pose: "bounce" },
    },
    {
      id: "rose-canele", name: "玫瑰可露丽", english: "Rose Canele",
      sprite: "assets/characters/rose-canele.png",
      rarity: RARITY.COMMON, motif: "canele", role: "脆壳质检官",
      quote: "外壳要坚定，心里可以软一点。", ability: "打包开局奖励 +2",
      colors: ["#a94b56", "#f6c8c4", "#50242d"],
      clues: ["有细小的硬壳摩擦声，随后安静下来。", "整体短短的，重量集中在正中央。"],
      visual: { shape: "fluted", ears: "rose", body: "canele", outfit: "collar", pose: "stand" },
    },
    {
      id: "star-macaron", name: "星星马卡龙", english: "Star Macaron",
      sprite: "assets/characters/star-macaron.png",
      rarity: RARITY.RARE, motif: "star", role: "愿望夹心师",
      quote: "愿望要夹双倍的馅，才不会漏出来。", ability: "打包开局奖励 +5",
      colors: ["#e77fb2", "#ffe0f1", "#853b65"],
      clues: ["有两片薄薄的东西轻轻合在一起。", "上方有几个小尖角，转动时会刮过纸托。"],
      visual: { shape: "round", ears: "star", body: "skirt", outfit: "cape", pose: "jump" },
    },
    {
      id: "moon-mousse", name: "月光慕斯", english: "Moon Mousse",
      sprite: "assets/characters/moon-mousse.png",
      rarity: RARITY.RARE, motif: "moon", role: "夜班守梦人",
      quote: "别怕，夜晚只是另一种柔软。", ability: "打包开局奖励 +5",
      colors: ["#5f6bc4", "#dbe3ff", "#32376c"],
      clues: ["几乎没有声音，偶尔传来柔软布料的擦响。", "一边像披着什么，重心缓慢地来回移动。"],
      visual: { shape: "oval", ears: "droop", body: "cloak", outfit: "cape", pose: "lean" },
    },
    {
      id: "rainbow-donut", name: "彩虹甜甜圈", english: "Rainbow Donut",
      sprite: "assets/characters/rainbow-donut.png",
      rarity: RARITY.RARE, motif: "rainbow", role: "派对领队",
      quote: "绕一整圈，好事会从背后追上来。", ability: "打包开局奖励 +5",
      colors: ["#ed6d61", "#ffdfb4", "#7a3540"],
      clues: ["里面像有一只圆环轻碰着纸盒。", "中间似乎是空的，重量均匀地分在四周。"],
      visual: { shape: "wide", ears: "cloud", body: "ring", outfit: "ring", pose: "jump" },
    },
    {
      id: "cloud-pastry-chef", name: "云端蛋糕师", english: "Cloud Chef",
      sprite: "assets/characters/cloud-pastry-chef.png",
      rarity: RARITY.EPIC, motif: "chef", role: "首席打发官",
      quote: "把云打发到刚刚好，千万别让它下雨。", ability: "打包开局奖励 +9",
      colors: ["#2ca187", "#d6fff0", "#1b6256"],
      clues: ["听起来有一只很小的金属碗。", "顶部蓬松又宽，盒中却站得格外稳。"],
      visual: { shape: "square", ears: "cloud", body: "tall", outfit: "chef", pose: "wave" },
    },
    {
      id: "midnight-chocolate", name: "午夜巧克力", english: "Midnight Choco",
      sprite: "assets/characters/midnight-chocolate.png",
      rarity: RARITY.EPIC, motif: "choco", role: "零点配方师",
      quote: "秘密要在零点以后，慢慢融化。", ability: "打包开局奖励 +9",
      colors: ["#4c365c", "#e0cce7", "#281e31"],
      clues: ["低低的一声碰撞，像厚重盒盖被合上。", "轮廓有两个小尖角，下方像披着长外套。"],
      visual: { shape: "sharp", ears: "horn", body: "cloak", outfit: "royal", pose: "tilt" },
    },
    {
      id: "peach-marshmallow", name: "桃桃棉花糖", english: "Peach Mallow",
      sprite: "assets/characters/peach-marshmallow.png",
      rarity: RARITY.COMMON, motif: "peach", role: "云朵蓬松师",
      quote: "轻轻捏一下，坏心情就会弹回去。", ability: "打包开局奖励 +2",
      colors: ["#e88787", "#ffe2d8", "#7a3b49"],
      clues: ["里面传来一阵很轻的纸团摩擦声。", "几乎没有硬质重心，像抱着一小团云。"],
      visual: { shape: "heart", ears: "cloud", body: "puffy", outfit: "ribbon", pose: "bounce" },
    },
    {
      id: "matcha-roll", name: "抹茶卷卷", english: "Matcha Roll",
      sprite: "assets/characters/matcha-roll.png",
      rarity: RARITY.COMMON, motif: "matcha", role: "茶香卷席员",
      quote: "慢慢卷起来，今天就不会散掉。", ability: "打包开局奖励 +2",
      colors: ["#6b9d57", "#dce8ba", "#334f2b"],
      clues: ["有一声圆滚滚的轻碰，随后停得很稳。", "横向轮廓略宽，重量像卷在正中央。"],
      visual: { shape: "square", ears: "tiny", body: "round", outfit: "collar", pose: "hold" },
    },
    {
      id: "grape-jelly", name: "葡萄啵啵冻", english: "Grape Jelly",
      sprite: "assets/characters/grape-jelly.png",
      rarity: RARITY.COMMON, motif: "grape", role: "果冻弹力员",
      quote: "就算跌下来，也要啵的一声弹回去。", ability: "打包开局奖励 +2",
      colors: ["#8664b1", "#e4d5f3", "#49335f"],
      clues: ["盒里连续响了三下很短的弹跳声。", "下半部软软的，重心会快速回到中间。"],
      visual: { shape: "bean", ears: "round", body: "jelly", outfit: "ribbon", pose: "bounce" },
    },
    {
      id: "coconut-rabbit", name: "椰香白兔", english: "Coco Bunny",
      sprite: "assets/characters/coconut-rabbit.png",
      rarity: RARITY.COMMON, motif: "coconut", role: "椰雪清扫员",
      quote: "地上的白色碎屑，也可能是一场小雪。", ability: "打包开局奖励 +2",
      colors: ["#b99b78", "#fff7e2", "#594b3a"],
      clues: ["两片细长的东西轻轻擦过盒顶。", "整体很轻，只有底部一圈稍微压手。"],
      visual: { shape: "oval", ears: "long", body: "skirt", outfit: "bib", pose: "stand" },
    },
    {
      id: "coffee-eclair", name: "咖啡闪电", english: "Coffee Eclair",
      sprite: "assets/characters/coffee-eclair.png",
      rarity: RARITY.COMMON, motif: "coffee", role: "清醒值班员",
      quote: "困意来之前，我会先把灯全部打开。", ability: "打包开局奖励 +2",
      colors: ["#8a5a3e", "#dfc2a6", "#432a20"],
      clues: ["一声细长的滑动声从盒子侧面划过去。", "轮廓窄而修长，重量偏向一端。"],
      visual: { shape: "tall", ears: "none", body: "tall", outfit: "classic", pose: "lean" },
    },
    {
      id: "honey-toast", name: "蜂蜜吐司", english: "Honey Toast",
      sprite: "assets/characters/honey-toast.png",
      rarity: RARITY.COMMON, motif: "honey", role: "早餐叫醒员",
      quote: "今天的第一格阳光，已经替你烤好了。", ability: "打包开局奖励 +2",
      colors: ["#d59636", "#ffe2a6", "#6b4524"],
      clues: ["听起来像一个方方的东西碰到纸托。", "四角都很稳，顶部还有一点小小凸起。"],
      visual: { shape: "square", ears: "bear", body: "bell", outfit: "pocket", pose: "wave" },
    },
    {
      id: "sakura-mochi", name: "樱花大福", english: "Sakura Mochi",
      sprite: "assets/characters/sakura-mochi.png",
      rarity: RARITY.RARE, motif: "sakura", role: "春日包馅师",
      quote: "花期很短，所以这一口要慢一点。", ability: "打包开局奖励 +5",
      colors: ["#da7898", "#f9dce6", "#77384f"],
      clues: ["有薄薄的花瓣形零件扫过包装内侧。", "圆圆的主体略偏一边，外层似乎包着什么。"],
      visual: { shape: "round", ears: "rose", body: "skirt", outfit: "ribbon", pose: "tilt" },
    },
    {
      id: "aurora-parfait", name: "极光芭菲", english: "Aurora Parfait",
      sprite: "assets/characters/aurora-parfait.png",
      rarity: RARITY.RARE, motif: "aurora", role: "夜空分层师",
      quote: "把颜色一层层放好，黑夜就会变甜。", ability: "打包开局奖励 +5",
      colors: ["#45a8a4", "#d9e6ff", "#315372"],
      clues: ["盒内像有细长杯壁发出清亮的一声。", "重心很高，顶部有几个向外伸出的小角。"],
      visual: { shape: "tall", ears: "star", body: "bottle", outfit: "cape", pose: "float" },
    },
    {
      id: "planet-candy", name: "行星糖", english: "Planet Candy",
      sprite: "assets/characters/planet-candy.png",
      rarity: RARITY.RARE, motif: "planet", role: "糖环观测员",
      quote: "走得再远，也会绕回喜欢的轨道。", ability: "打包开局奖励 +5",
      colors: ["#647bd2", "#d9dcff", "#343b72"],
      clues: ["有一个圆环绕着主体轻轻转动。", "重量分在四周，中心反而有点空。"],
      visual: { shape: "wide", ears: "cloud", body: "ring", outfit: "cape", pose: "tilt" },
    },
    {
      id: "crystal-pear", name: "水晶洋梨", english: "Crystal Pear",
      sprite: "assets/characters/crystal-pear.png",
      rarity: RARITY.RARE, motif: "pear", role: "透明度检验员",
      quote: "看起来透明的心，也会藏着甜味。", ability: "打包开局奖励 +5",
      colors: ["#69aa88", "#dff3cf", "#315b48"],
      clues: ["响声很清脆，像一颗小珠碰到透明杯壁。", "下宽上窄，顶部还有一片薄薄的零件。"],
      visual: { shape: "bean", ears: "wing", body: "jelly", outfit: "collar", pose: "stand" },
    },
    {
      id: "sun-souffle", name: "太阳舒芙蕾", english: "Sun Souffle",
      sprite: "assets/characters/sun-souffle.png",
      rarity: RARITY.EPIC, motif: "sun", role: "晨光膨胀师",
      quote: "太阳升起来，是因为我刚刚打开了烤箱。", ability: "打包开局奖励 +9",
      colors: ["#e49b29", "#fff0b9", "#75501d"],
      clues: ["顶部的小尖角轻碰盒盖，发出明亮的一声。", "整体蓬得很高，底部却只有很小的支点。"],
      visual: { shape: "fluted", ears: "star", body: "tall", outfit: "chef", pose: "jump" },
    },
    {
      id: "winter-opera", name: "冬日歌剧院", english: "Winter Opera",
      sprite: "assets/characters/winter-opera.png",
      rarity: RARITY.EPIC, motif: "snow", role: "雪夜谢幕员",
      quote: "最后一盏灯熄灭时，雪才开始鼓掌。", ability: "打包开局奖励 +9",
      colors: ["#567895", "#dcecf3", "#293e50"],
      clues: ["像厚重帷幕合拢，随后传来一声小铃。", "两侧有对称尖角，长长的下摆几乎不移动。"],
      visual: { shape: "sharp", ears: "horn", body: "royal", outfit: "cape", pose: "float" },
    },
    {
      id: "daydream-manager", name: "白日梦店长", english: "Daydream Keeper",
      sprite: "assets/characters/daydream-manager.png",
      rarity: RARITY.HIDDEN, motif: "key", role: "秘密店长",
      quote: "今天，也准许你在营业时间做一个甜梦。", ability: "打包开局奖励 +15",
      colors: ["#dca02b", "#fff4c9", "#68401d"],
      clues: ["安静了很久，最后响起一声极轻的钥匙声。", "几乎感觉不到重量移动，像悬在盒子中央。"],
      visual: { shape: "heart", ears: "wing", body: "royal", outfit: "royal", pose: "float" },
    },
  ];

  const ANIMATION_SPECS = Object.freeze({
    "strawberry-puff": { motion: "爱心招手", durationMs: 920 },
    "caramel-pudding": { motion: "布丁摇铃", durationMs: 1040 },
    "mint-soda": { motion: "气泡喷发", durationMs: 880 },
    "cookie-bear": { motion: "烤盘出炉", durationMs: 1180 },
    "blueberry-shake": { motion: "吸管搅拌", durationMs: 960 },
    "lemon-gummy": { motion: "酸甜挤脸", durationMs: 820 },
    "rose-canele": { motion: "玫瑰谢幕", durationMs: 1280 },
    "star-macaron": { motion: "星星魔术", durationMs: 940 },
    "moon-mousse": { motion: "月灯哈欠", durationMs: 1340 },
    "rainbow-donut": { motion: "圆环躲猫猫", durationMs: 1000 },
    "cloud-pastry-chef": { motion: "面粉魔法", durationMs: 1080 },
    "midnight-chocolate": { motion: "披风变戏法", durationMs: 1120 },
    "peach-marshmallow": { motion: "棉花糖膨胀", durationMs: 860 },
    "matcha-roll": { motion: "茶筅点茶", durationMs: 1160 },
    "grape-jelly": { motion: "果冻分身", durationMs: 900 },
    "coconut-rabbit": { motion: "长耳扫糖霜", durationMs: 1240 },
    "coffee-eclair": { motion: "蒸汽指挥", durationMs: 980 },
    "honey-toast": { motion: "蜂蜜拉丝", durationMs: 1060 },
    "sakura-mochi": { motion: "花瓣扇舞", durationMs: 1100 },
    "aurora-parfait": { motion: "冰晶折光", durationMs: 1320 },
    "planet-candy": { motion: "糖果公转", durationMs: 1200 },
    "crystal-pear": { motion: "晶翼振翅", durationMs: 1140 },
    "sun-souffle": { motion: "舒芙蕾升起", durationMs: 1020 },
    "winter-opera": { motion: "指挥开幕", durationMs: 1360 },
    "daydream-manager": { motion: "梦境翻页", durationMs: 1440 },
  });

  const CHARACTERS = Object.freeze(BASE_CHARACTERS.map((character) => Object.freeze({
    ...character,
    animation: Object.freeze({
      sheet: `assets/characters/animations/${character.id}-sheet.png`,
      frames: 4,
      ...ANIMATION_SPECS[character.id],
    }),
  })));

  const DESSERTS = Object.freeze([
    { id: "berry-tart", name: "草莓云塔", short: "莓", className: "tart" },
    { id: "mint-soda", name: "薄荷苏打", short: "泡", className: "soda" },
    { id: "cookie-box", name: "曲奇礼盒", short: "酥", className: "cookie" },
  ]);

  function randomUnit(random) {
    const value = Number(random());
    if (!Number.isFinite(value)) throw new Error("随机数生成器必须返回有效数字");
    return Math.min(Math.max(value, 0), 0.999999999);
  }

  function shuffle(items, random) {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const target = Math.floor(randomUnit(random) * (index + 1));
      [result[index], result[target]] = [result[target], result[index]];
    }
    return result;
  }

  function createCase(random = Math.random, caseNumber = 1) {
    const regularIds = CHARACTERS
      .filter((character) => character.rarity !== RARITY.HIDDEN)
      .map((character) => character.id);
    const shuffledIds = shuffle(regularIds, random).slice(0, CASE_SIZE);
    const hasSecret = randomUnit(random) < SECRET_CASE_RATE;
    if (hasSecret) {
      const replacementIndex = Math.floor(randomUnit(random) * CASE_SIZE);
      shuffledIds[replacementIndex] = "daydream-manager";
    }
    return {
      number: caseNumber,
      selectedIndex: null,
      clueLevel: 0,
      hasSecret,
      refreshes: 0,
      boxes: shuffledIds.map((characterId, index) => ({ index, characterId, opened: false })),
    };
  }

  function createInitialState(random = Math.random) {
    return {
      version: 3,
      coins: 240,
      soundOn: true,
      collection: {},
      boxesOpened: 0,
      casesCompleted: 0,
      packingRounds: 0,
      quizRounds: 0,
      arcadeRounds: 0,
      arcadeBestScores: {},
      coinsEarned: 0,
      currentCase: createCase(random, 1),
    };
  }

  function getCharacter(characterId) {
    const character = CHARACTERS.find((item) => item.id === characterId);
    if (!character) throw new Error("角色不存在");
    return character;
  }

  function getOpenedCount(currentCase) {
    return currentCase.boxes.filter((box) => box.opened).length;
  }

  function selectBox(state, index) {
    const box = state.currentCase.boxes[index];
    if (!box) throw new Error("盒子位置不存在");
    if (box.opened) throw new Error("这个位置已经拆过了");
    return {
      ...state,
      currentCase: { ...state.currentCase, selectedIndex: index, clueLevel: 0 },
    };
  }

  function shakeSelectedBox(state) {
    const { selectedIndex, clueLevel, boxes } = state.currentCase;
    if (selectedIndex === null) throw new Error("请先从陈列箱里挑一盒");
    if (boxes[selectedIndex].opened) throw new Error("这个位置已经拆过了");
    const nextLevel = Math.min(2, clueLevel + 1);
    const character = getCharacter(boxes[selectedIndex].characterId);
    return {
      nextState: {
        ...state,
        currentCase: { ...state.currentCase, clueLevel: nextLevel },
      },
      clue: character.clues[nextLevel - 1],
      clueLevel: nextLevel,
      isNewClue: nextLevel !== clueLevel,
    };
  }

  function openSelectedBox(state) {
    const { selectedIndex, clueLevel, boxes } = state.currentCase;
    if (selectedIndex === null) throw new Error("请先从陈列箱里挑一盒");
    if (clueLevel < 1) throw new Error("先摇一摇，听听盒子里的线索");
    if (state.coins < BOX_COST) throw new Error(`云朵币不足，还需要 ${BOX_COST - state.coins} 枚`);
    const selectedBox = boxes[selectedIndex];
    if (selectedBox.opened) throw new Error("这个位置已经拆过了");

    const character = getCharacter(selectedBox.characterId);
    const copyCount = (state.collection[character.id] || 0) + 1;
    const collection = { ...state.collection, [character.id]: copyCount };
    const nextBoxes = boxes.map((box, index) =>
      index === selectedIndex ? { ...box, opened: true } : { ...box },
    );
    const openedCount = nextBoxes.filter((box) => box.opened).length;
    const unlock = copyCount === 1
      ? { type: "new", label: "新店员加入橱窗" }
      : copyCount === 2
        ? { type: "accessory", label: "解锁专属配件" }
        : copyCount === 3
          ? { type: "expression", label: "解锁特别表情" }
          : { type: "star", label: `角色升至 ${copyCount} 星` };

    return {
      character,
      copyCount,
      unlock,
      caseCompleted: openedCount === CASE_SIZE,
      nextState: {
        ...state,
        coins: state.coins - BOX_COST,
        collection,
        boxesOpened: state.boxesOpened + 1,
        casesCompleted: state.casesCompleted + (openedCount === CASE_SIZE ? 1 : 0),
        currentCase: {
          ...state.currentCase,
          selectedIndex: null,
          clueLevel: 0,
          boxes: nextBoxes,
        },
      },
    };
  }

  function createNextCase(state, random = Math.random) {
    if (getOpenedCount(state.currentCase) !== CASE_SIZE) throw new Error("这一箱还有没有拆开的盒子");
    return { ...state, currentCase: createCase(random, state.currentCase.number + 1) };
  }

  function refreshShelf(state, random = Math.random) {
    const openedBoxes = state.currentCase.boxes.filter((box) => box.opened);
    const unopenedCount = CASE_SIZE - openedBoxes.length;
    if (unopenedCount === 0) throw new Error("这一箱已经没有未拆开的盒子，请送来下一整箱");

    const openedIds = new Set(openedBoxes.map((box) => box.characterId));
    const availableRegularIds = CHARACTERS
      .filter((character) => character.rarity !== RARITY.HIDDEN && !openedIds.has(character.id))
      .map((character) => character.id);
    const replacementIds = shuffle(availableRegularIds, random).slice(0, unopenedCount);
    const hiddenAlreadyOpened = openedIds.has("daydream-manager");
    const hasNewSecret = !hiddenAlreadyOpened && randomUnit(random) < SECRET_CASE_RATE;
    if (hasNewSecret) {
      const replacementIndex = Math.floor(randomUnit(random) * unopenedCount);
      replacementIds[replacementIndex] = "daydream-manager";
    }

    let replacementCursor = 0;
    const boxes = state.currentCase.boxes.map((box) => {
      if (box.opened) return { ...box };
      const characterId = replacementIds[replacementCursor];
      replacementCursor += 1;
      return { ...box, characterId, opened: false };
    });

    return {
      ...state,
      currentCase: {
        ...state.currentCase,
        selectedIndex: null,
        clueLevel: 0,
        hasSecret: hiddenAlreadyOpened || hasNewSecret,
        refreshes: (state.currentCase.refreshes || 0) + 1,
        boxes,
      },
    };
  }

  function getCollectionStats(state) {
    const unlocked = CHARACTERS.filter((character) => (state.collection[character.id] || 0) > 0).length;
    return { unlocked, total: CHARACTERS.length, percent: Math.round((unlocked / CHARACTERS.length) * 100) };
  }

  function getPackingStartBonus(state) {
    const rawBonus = CHARACTERS.reduce((sum, character) => {
      if (!(state.collection[character.id] > 0)) return sum;
      return sum + [2, 5, 9, 15][RARITY_META[character.rarity].rank];
    }, 0);
    return Math.min(10, rawBonus);
  }

  function pickDessert(random, excludedId = null) {
    const options = DESSERTS.filter((dessert) => dessert.id !== excludedId);
    return options[Math.floor(randomUnit(random) * options.length)];
  }

  function createPackingRound(state, random = Math.random) {
    const shelfBonus = getPackingStartBonus(state);
    return {
      active: true, settled: false, durationMs: PACKING_DURATION_MS,
      targetId: pickDessert(random).id, score: shelfBonus, shelfBonus,
      combo: 0, bestCombo: 0, correctCount: 0, mistakes: 0,
    };
  }

  function answerPackingOrder(round, dessertId, random = Math.random) {
    if (!round.active || round.settled) throw new Error("打包局已经结束");
    if (!DESSERTS.some((dessert) => dessert.id === dessertId)) throw new Error("甜品选项不存在");
    const correct = dessertId === round.targetId;
    if (!correct) {
      return {
        correct: false, earned: 0, timePenaltyMs: PACKING_WRONG_PENALTY_MS, capped: false,
        nextRound: { ...round, combo: 0, mistakes: round.mistakes + 1 },
      };
    }
    const nextCombo = round.combo + 1;
    const rawEarned = 5 + Math.min(4, Math.floor((nextCombo - 1) / 3));
    const earned = Math.max(0, Math.min(rawEarned, PACKING_MAX_PAYOUT - round.score));
    const nextScore = round.score + earned;
    return {
      correct: true, earned, timePenaltyMs: 0, capped: nextScore >= PACKING_MAX_PAYOUT,
      nextRound: {
        ...round,
        targetId: pickDessert(random, round.targetId).id,
        score: nextScore,
        combo: nextCombo,
        bestCombo: Math.max(round.bestCombo, nextCombo),
        correctCount: round.correctCount + 1,
      },
    };
  }

  function finishPackingRound(state, round) {
    if (round.settled) throw new Error("这一局已经结算过了");
    const earned = Math.min(round.score, PACKING_MAX_PAYOUT);
    return {
      earned,
      nextRound: { ...round, active: false, settled: true },
      nextState: {
        ...state,
        coins: state.coins + earned,
        coinsEarned: state.coinsEarned + earned,
        packingRounds: (state.packingRounds || 0) + 1,
      },
    };
  }

  function createQuizRound(mode, random = Math.random) {
    const config = QUIZ_CONFIG[mode];
    const bank = QUESTION_BANKS[mode];
    if (!config || !bank) throw new Error("答题路线不存在");
    if (bank.length < QUIZ_LENGTH) throw new Error(`${config.label}题库不足 ${QUIZ_LENGTH} 题`);
    const selectedQuestions = shuffle(bank, random).slice(0, QUIZ_LENGTH);
    const answerPositions = shuffle(
      [0, 1, 2, 3, Math.floor(randomUnit(random) * 4)],
      random,
    );
    const questions = selectedQuestions.map((question, index) => {
      const correctOption = question.options[question.answer];
      const distractors = shuffle(
        question.options.filter((option, optionIndex) => optionIndex !== question.answer),
        random,
      );
      const options = [...distractors];
      options.splice(answerPositions[index], 0, correctOption);
      return { ...question, options, answer: answerPositions[index] };
    });
    return {
      mode,
      active: true,
      completed: false,
      settled: false,
      questions,
      currentIndex: 0,
      answered: false,
      selectedIndex: null,
      score: 0,
      correctCount: 0,
      streak: 0,
      bestStreak: 0,
    };
  }

  function answerQuizQuestion(round, optionIndex) {
    if (!round.active || round.completed || round.settled) throw new Error("这轮答题已经结束");
    if (round.answered) throw new Error("这一题已经回答过了");
    const question = round.questions[round.currentIndex];
    if (!question) throw new Error("当前题目不存在");
    if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= question.options.length) {
      throw new Error("答案选项不存在");
    }
    const correct = optionIndex === question.answer;
    const nextStreak = correct ? round.streak + 1 : 0;
    const config = QUIZ_CONFIG[round.mode];
    const streakBonus = correct
      ? Math.min(config.streakCap, Math.max(0, nextStreak - 1) * config.streakStep)
      : 0;
    const earned = correct ? config.baseReward + streakBonus : 0;
    return {
      correct,
      correctIndex: question.answer,
      earned,
      nextRound: {
        ...round,
        answered: true,
        selectedIndex: optionIndex,
        score: round.score + earned,
        correctCount: round.correctCount + (correct ? 1 : 0),
        streak: nextStreak,
        bestStreak: Math.max(round.bestStreak, nextStreak),
      },
    };
  }

  function advanceQuizQuestion(round) {
    if (!round.active || round.completed || round.settled) throw new Error("这轮答题已经结束");
    if (!round.answered) throw new Error("请先回答当前题目");
    if (round.currentIndex === round.questions.length - 1) {
      return { ...round, active: false, completed: true };
    }
    return {
      ...round,
      currentIndex: round.currentIndex + 1,
      answered: false,
      selectedIndex: null,
    };
  }

  function finishQuizRound(state, round) {
    if (round.settled) throw new Error("这一轮已经结算过了");
    if (!round.completed) throw new Error("还有题目没有完成");
    const config = QUIZ_CONFIG[round.mode];
    if (!config) throw new Error("答题路线不存在");
    const perfect = round.correctCount === round.questions.length;
    const perfectBonus = perfect ? config.perfectBonus : 0;
    const earned = round.score + perfectBonus;
    return {
      earned,
      perfect,
      perfectBonus,
      nextRound: { ...round, settled: true },
      nextState: {
        ...state,
        coins: state.coins + earned,
        coinsEarned: (state.coinsEarned || 0) + earned,
        quizRounds: (state.quizRounds || 0) + 1,
      },
    };
  }

  function calculateArcadeReward(mode, score, details = {}) {
    const config = ARCADE_CONFIG[mode];
    if (!config) throw new Error("街机关卡不存在");
    if (!Number.isFinite(score) || score < 0) throw new Error("街机分数无效");
    if (mode === "tetris") {
      const lines = Number.isFinite(details.lines) ? Math.max(0, Math.floor(details.lines)) : 0;
      return Math.floor(score / 8) + lines * 16;
    }
    const scorePerCoin = mode === "platformer" ? 15 : 20;
    return Math.floor(score / scorePerCoin);
  }

  function finishArcadeRun(state, run) {
    if (run.settled) throw new Error("这一局已经结算过了");
    if (!run.completed) throw new Error("这一局还没有结束");
    const config = ARCADE_CONFIG[run.mode];
    if (!config) throw new Error("街机关卡不存在");
    const earned = calculateArcadeReward(run.mode, run.score, run);
    const previousBest = state.arcadeBestScores?.[run.mode] || 0;
    return {
      earned,
      nextRun: { ...run, settled: true },
      nextState: {
        ...state,
        coins: state.coins + earned,
        coinsEarned: (state.coinsEarned || 0) + earned,
        arcadeRounds: (state.arcadeRounds || 0) + 1,
        arcadeBestScores: {
          ...(state.arcadeBestScores || {}),
          [run.mode]: Math.max(previousBest, Math.floor(run.score)),
        },
      },
    };
  }

  const API = Object.freeze({
    BOX_COST, CASE_SIZE, SECRET_CASE_RATE, PACKING_DURATION_MS,
    PACKING_MAX_PAYOUT, PACKING_WRONG_PENALTY_MS, QUIZ_LENGTH,
    RARITY, RARITY_META, CHARACTERS, DESSERTS, QUIZ_CONFIG, QUESTION_BANKS, ARCADE_CONFIG,
    createCase, createInitialState, getCharacter, getOpenedCount,
    selectBox, shakeSelectedBox, openSelectedBox, createNextCase, refreshShelf,
    getCollectionStats, getPackingStartBonus,
    createPackingRound, answerPackingOrder, finishPackingRound,
    createQuizRound, answerQuizQuestion, advanceQuizQuestion, finishQuizRound,
    calculateArcadeReward, finishArcadeRun,
  });

  root.CloudCabinetLogic = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;
})(typeof globalThis !== "undefined" ? globalThis : window);
