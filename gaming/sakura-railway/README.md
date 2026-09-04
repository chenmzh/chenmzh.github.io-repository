# 春の線路 · 日本春日樱花铁路体素世界

一个全屏沉浸式 WebGL 页面：日本近郊春日白昼，银白色通勤列车沿铁轨从远处驶来、
穿过樱花与电线杆的中景、从画面右缘远去，相机不追车。整页即影片，无导航、无卡片。

## 运行

```bash
npm install
npm run dev        # http://127.0.0.1:5173
npm run build      # 产物在 dist/（index.html 电影 + map.html 沙盘）
npm run preview
```

## 体验方式

- 打开即自动播放（150 秒循环）。
- 滚动页面 = 拖动时间轴（450vh 的滚动空间对应整部影片）。
- 桌面端移动指针有 ≤1.6° 的视差呼吸；`prefers-reduced-motion` 下关闭。
- 右下角「音」按钮：点击后才合成环境音（风噪 + 鸟鸣 + 列车低频轰鸣，无外部音频素材）。
- 切走标签页自动暂停，回来无时间跳变。

## 体素地图（map.html）

同一座小镇的**沙盘版**：不是电影，是一张可以自己逛的体素沙盘。

- **左键拖拽**环视四周，**WASD** 前后左右移动（Shift ×3 / Ctrl ×0.3），
  **滚轮/双指捏合**沿视线推近拉远，**右键/双指**平移。视角不锁定任何中心点。
- **Q/E 在时间上前进/后退**：按住 E 世界时钟快进、Q 倒带——列车会倒着开。
- 铁路改为约 1.34 km 的**开放贯通线**：列车从西侧边界外驶入，经村镇、田园小站与道口，
  再从东北边界外驶出；边界外短暂停留后才重置下一班，地图内不会瞬移。
- 地图专属场景增加乡村站台、候车棚、站房、稻田秧苗、远端农舍、农具仓库、水塔和铁路维护设施。
- 江南河道贯穿沙盘南北边界，连续石岸与缓慢南移的浅色水纹表现河流方向，不再像封闭水潭。
- **道口栏杆会动**：列车接近 40 m 内放杆、离开后抬起，警報機灯在动作期间闪烁。
- 整个小镇放在**暖木色沙盘底座**上（四边可见台面与边沿）。
- 花瓣为高处视角调静：数量减半、摆动幅度 ×0.45、关闭相机近景大片花瓣层。
- 右下「視点リセット」一键回到默认视角；右上角与电影版互切（两页都有入口）。
- 同一个 `createScene()`：`mapMode` 切换自由相机（SandboxCamera）、开放贯通铁路、地图专属内容、
  底座与时间轴节奏；地图静止时 30fps、操作时恢复屏幕刷新率。

## 六个分镜（时间轴 P）

| P | 分镜 | 内容 |
|---|------|------|
| 0.00–0.10 | Establishing | 镜头在树冠下，道口与铁轨延伸，无列车 |
| 0.10–0.30 | Arrival | 列车从远处雾中浮现，驶近中景 |
| 0.30–0.52 | Sakura | 一阵风，花瓣密度上升，列车在中景 |
| 0.52–0.68 | Passing | 列车贴近中景经过，被樱花/电线杆部分遮挡 |
| 0.68–0.88 | Leaving | 列车从画面右缘远去（曲线近端扫向相机右后方，无瞬移） |
| 0.88–1.00 | Silence | 相机升至树冠线上方，回望天空与樱花树线 |

列车骑乘同一条 CatmullRom 曲线（`src/world/railway.js` 的 `railwayCurve`），
道床、轨枕、钢轨、接触网、信号、道口全部由该曲线推导。

## 技术

- Vite + Three.js（ES modules），无 React、无 glTF，全部程序化几何。
- 体素 = 合并 BoxGeometry（顶点色）或 InstancedMesh + instanceColor；
  树冠/草/花瓣/轨枕/道砟均为单 draw call 实例化。
- 风：GPU 顶点摆动（`onBeforeCompile` 注入 Lambert），共享 uniforms 一次更新驱动所有摆动材质。
- 色彩管线：ACES Filmic（渲染器原生）+ 相机挂载的屏幕空间暗角贴片（无 EffectComposer，
  跨驱动稳定——composer 的 RT 链在 SwiftShader 下会撕裂）。
- 种子随机：mulberry32，seed 20260414，布局每次重载一致；花瓣粒子用 Math.random。

### 质量档（`src/utils/performance.js`）

| | LOW(移动/小屏) | MED | HIGH |
|---|---|---|---|
| 花瓣 | 450 | 1100 | 2200 |
| 草 | 1100 | 2600 | 5200 |
| 阴影 | 512 / 关闭投射 | 1024 | 2048 |
| DPR 上限 | 移动 1.1 / 桌面 1.5 | 移动 1.25 / 桌面 1.5 | 移动 1.25 / 桌面 1.5 |

地图 HIGH 档约 65 draw calls / 29 万三角形（SwiftShader QA，预算 <150 calls）。
`FpsProbe` 持续低帧时会降低 DPR、花瓣、草、道砟、稻苗与树冠密度，并收缩阴影图。

## 目录

```
index.html               全屏 canvas + 450vh 滚动空间 + whisper 文案 + 音按钮
map.html                 体素地图版：自由旋转/缩放/平移 + 重置按钮 + 操作提示
src/
  main.js                入口：质量、渲染循环、滚动/指针/可见性/降级
  map.js                 地图入口：OrbitControls 自由相机、连续列车循环
  scene.js               场景装配（天空/灯光/雾/世界/系统；mapMode 选项）
  style.css              全屏画布、淡入、角落文案、地图版控件样式
  utils/                 rng(种子) / windShared / performance / voxel(体素工具)
  world/                 railway / sakura / terrain / houses / environment / train
  systems/               wind / timeline / petals / cameraMotion / postprocessing / audio
```

## 验证说明

桌面 QA 用 headless Chrome + SwiftShader（软件 GL）截图验证结构与构图
（`../qa-harness/qa.mjs` 出 7 张分镜截图 + 控制台/性能指标）。
软件渲染的 FPS 与色调不代表真实 GPU 表现；色彩管线（ACES+sRGB 编码）在
真实 GPU 上即为最终效果。
