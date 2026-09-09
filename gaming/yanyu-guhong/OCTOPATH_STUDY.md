# HD-2D 制作研究与本轮落实

研究日期：2026-09-10。

一手资料：
- [Square Enix / Acquire 制作访谈，Unreal Engine，2023-08-22](https://www.unrealengine.com/developer-interviews/octopath-traveler-ii-builds-a-bigger-bolder-world-in-its-stunning-hd-2d-style?lang=en-US)
- [八方旅人 II 官方系统说明](https://www.jp.square-enix.com/octopathtraveler2/system/)

制作团队说明：角色为 2D 像素图，背景几乎全部为 3D；续作提高地图细节，仍保留有机的像素美术。灯光与镜头需要协调两种素材；Sequencer 用于战斗招式、事件及镜头编排。潜力槽让玩家选择爆发时机。

本轮落实：用 ImageGen 重做青溪渡背景，增强瓦片、湿石、木构、灯笼、河面与远景层次。生成六姿势奥义图集，以代码时间轴编排 3.8 秒的蓄气、突进、斩击及收剑。引入敌人意图、剑意资源、重击反制，玩家可选择立即削盾或等待破防后的增伤。

技术边界：本试玩是 Canvas 2D + 预绘背景，镜头缩放也是二维变换，不能实现八方旅人真正的三维旋转和动态遮挡。目前不等同于成品 HD-2D。Blender 可以制作模型、像素贴图及预渲染素材，但不能直接替代运行游戏逻辑的引擎。下一阶段若需要旋转镜头，应导出带像素纹理的 glTF 到 WebGL 游戏场景；现有 Blender 简模保留用于构图参考。

生成式图集的透明底两次失败，因此最终明确生成纯黑底，并在奥义暗场中采用 screen 混合。没有把伪透明棋盘格投入游戏。帧图是六关键姿势而非人工逐帧补间动画。
