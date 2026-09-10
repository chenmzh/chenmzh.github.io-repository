# GitHub Pages 发布记录

仓库：chenmzh/chenmzh.github.io-repository

发布目录：`gaming/yanyu-guhong/`

试玩地址：https://chenmzh.github.io/chenmzh.github.io-repository/gaming/yanyu-guhong/

目录入口：https://chenmzh.github.io/chenmzh.github.io-repository/gaming/

发布提交：`c2e2600ee4d87499d4dadc6aa493d473dc28020b`

本次新增16个运行所需文件，更新Gaming Lab入口。复用仓库已有Pages工作流；未修改其他游戏、发布设置或工作流。发布内容包含回合制序章、精灵演武场和旧动作原型。Blender工程保留在本地，没有加入网页下载。

移动适配：320/390像素竖屏、844×390横屏；完整画面保持比例，招式两列，大尺寸目标按钮，长对白可滚动，安全区域边距，素材加载与失败重试，切后台暂停。Tab恢复浏览器正常焦点导航；T可切换目标。

验证：回合逻辑测试通过；浏览器检查触屏对白推进、蓄势连击、窄屏溢出和横屏开场面板。桌面和触屏共用同一回合状态机。

## 2026-09-10 美术与战斗升级
发布提交：783f8a4dbf03fe71e40381c143eed0fca762a70c。
新背景 `assets/qingxi-pixel-v2.png`，六姿势奥义 `assets/hero-ultimate.png`，提示词 `assets/V2-PROMPTS.md`，研究 `OCTOPATH_STUDY.md`。
新增剑意、全体奥义、敌方意图、重击反制；按实际时间推进演出，避免低帧率拖慢回合。全部模型/精灵/旧原型测试通过。浏览器确认新背景、手机宽度、弱点积累、反制和大招启动。

## 第一章《青溪夜渡》
提交：c9aec45c0e0e72466794595efcb202c303a238b3。
默认入口改为箱庭探索，独立战斗保留为battle.html；新地图、六人肖像、任务与成长模型、自动存档、iframe战斗桥接和双结局已发布提交。Gaming Lab的第7项介绍同步更新。
实际本地通关“人过青溪”：3级/130阅历/见闻4/4，刷新续档后结局与数值一致。更多验收证据见CHAPTER_QA.md。

## 2026-09-10 NPC 更新

提交 `294acf2b62778bde2aeaa59d0f5d9614be20983e`：阿蘅与顾药师全身四帧待机精灵、对话双方肖像与说话者高亮、320px 窄屏适配。沿用原 GitHub Pages 路径。
