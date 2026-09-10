# 烟雨 · 孤鸿 — 第一章《青溪夜渡》

可玩的中式武侠箱庭 RPG 章节：探索青溪渡、与人物交谈、调查寻妹线索、完成药师委托、升级修习，再经历回合制桥头交锋与原信抉择。

线上试玩：https://chenmzh.github.io/chenmzh.github.io-repository/gaming/yanyu-guhong/

## 本地启动

需要 Python 3 与 Node.js（测试）。无 npm 运行依赖。

```sh
npm start
# http://localhost:4173/
npm test
```

## 游玩流程

茶摊取得口信 → 旧碑发现听雨刻痕 → 桥头与裴照交涉 → 非致死切磋 → 决定原信去留。

可选：药师委托 → 采青露草 → 交药获得阅历/补给；旧木箱取一次补给；驿亭免费恢复气血/真气。阅历50/120升级，可修习流云剑每击+5或气血上限+25，实际带入战斗。

手机点地点按钮自动寻路并交谈、横向查看地图或摇杆移动。电脑点地图/地点、WASD/方向键移动、E交互。战斗为回合制：弱点削盾、蓄势连击、守心重击反制、剑意奥义。

本机浏览器localStorage自动存档；损坏存档重置提示；战斗中刷新回到交锋前。战败保留线索/修习，可休息重试。结局后可回看过江前的渡口补全见闻。

## 代码

- `chapter-game.js` / `index.html` / `chapter-style.css`：章节主控与响应界面。
- `chapter-map.js`：可行走区域、碰撞、A*寻路、角色与人物标记、摇杆接入。
- `chapter-model.js`：任务、奖励、成长、存档校验、战斗资源结算。
- `chapter-content.js`：第一章对白、人物、札记、双结局。
- `battle.html` / `turn-game.js` / `turn-model.js`：独立与章节嵌入两种模式的回合战斗。
- `sprites.js`：原始ImageGen图集帧选择与绘制。
- `tests/`：路径可达、碰撞、成长/存档、完整探索到战斗结局的模型集成，以及原有原型回归。

## 美术与边界

ImageGen探索地图与六个人物肖像：`assets/qingxi-explore.png`、`assets/chapter-portraits.png`。提示词保存在 `assets/CHAPTER-PROMPTS.md`。茶摊与药师在地图上用各自肖像标记；主角、渡夫、裴照使用动画精灵。战斗沿用既有精灵与六姿势大招。

这是Canvas 2D预绘箱庭；不是实时三维场景。当前为一个小章节，尚无室内地图、多地图长篇、商店经济、队伍系统或云端存档。Blender简模工程仍保留于 `blender/`，作为后续3D制作参考。

剧情与验收设计见 `CHAPTER_ONE.md`；HD-2D研究见 `OCTOPATH_STUDY.md`。旧战斗可从 `battle.html` 访问，旧实时动作原型在 `action-classic.html`。
