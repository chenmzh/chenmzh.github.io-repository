# 思维链（工程化整理版）

> 为满足「连同思维链」的交付要求，这里提供一份可公开、可复现的工程推理日志。
> 它按开发顺序记录了关键推导、方案取舍、失败与修复、测试结论；不是隐藏推理过程的逐字稿，
> 而是对本次会话完整工程思考的整理与复现。

---

## 0. 需求分解

把需求拆成四个独立但互相依赖的问题：

1. **物理正确性**：真实积分 Schwarzschild 零测地线，不能有黑球 / 圆环 / 贴图。
2. **视觉正确性**：事件视界深黑、吸积盘 HDR 高温、光子环临界结构清晰、Doppler / 红移可见。
3. **工程完整性**：无构建、本地 Three.js、OrbitControls、四视角、HUD、21+ 参数、0–9 调试视图、
   快捷键、音乐、三档画质、移动端 / Retina、持久化、错误恢复、URL 截图自动化。
4. **可验证性**：headless 浏览器自动化，证明无控制台错误、无黑屏、阴影中心为 0、交互全部可用。

---

## 1. 测地线：从度规到可积分方程

### 1.1 单位与守恒量

取 `rs = 2GM/c² = 1`。Schwarzschild 度规：

```
ds² = -B dt² + B⁻¹ dr² + r²(dθ² + sin²θ dφ²),   B = 1 - 1/r
```

对零测地线取仿射参数 λ，令远处光子能量 `E = B · dt/dλ = 1`。守恒角动量写成
`L = |x × p|`。

### 1.2 初始条件

相机位于有限半径 `r0` 时不能简单地把方向向量归一化。由零条件：

```
-B(p^t)² + g_ij p^i p^j = 0,   p^t = 1/B
```

得到坐标速度的**径向 / 切向分解**：

```
(v_r)² = 1 - B · (v_⊥)²
```

这解释了最初数值实验里“临界 b 看起来是 2.50 而不是 2.598”的假象：
有限半径处的横向坐标速度与无穷远观测到的碰撞参数之间差一个 `sqrt(1/B)` 因子。

### 1.3 直角坐标加速度

直接从 2D Lagrangian 推径向方程会得到：

```
r'' = L²/r³ - (3/2)L²/r⁴
```

但这不是直角坐标加速度。把 `x = r·n` 展开后，向心项 `-rφ'² n` 与上式中的
`L²/r³` 恰好抵消，最终：

```
d²x/dλ² = -(3/2) · L² · x / r⁵
```

这就是 shader 里用的紧凑形式。它同时保证了光子球 `r = 1.5` 是圆形轨道解，
并且临界碰撞参数：

```
b_crit = 3√3/2 ≈ 2.598076
```

### 1.4 积分器选择（关键实验）

| 方案 | 结论 |
| --- | --- |
| 显式 Euler / 半隐式 Euler | 光子球附近不稳定，临界 b 误差不可接受 |
| Leapfrog（速度 Verlet，动态更新 L²） | 能量漂移导致光子环糊掉 |
| RK4 + 初始守恒 L² 作为常量 | 临界 b 误差在 `dt=0.08·r` 时约 `2.5e-6`，采用 |

RK4 虽然每步 4 次受力评估，但 `L²` 只算一次，受力是纯径向中心力，代价可接受；
换来的是光子环能稳定绕转多个半圈后逃逸或被俘获，临界曲线干净锐利。

### 1.5 终止与背景

- `r < 1.02`：被事件视界俘获，返回黑色（不画任何球）。
- `r > 64`：把当前速度方向作为渐近方向，送入程序化星空 / 银河。
- 超出步数预算：只保留沿途累计的盘面辐射；仍绕在光子球附近的射线自然压暗，
  使临界曲线由真实测地线行为呈现，而不是画出来的环。

---

## 2. 吸积盘

### 2.1 轨道量与频移

在 `rs=1` 单位下 `GM=0.5`，Kepler 角速度：

```
Ω = sqrt(GM/r³) = sqrt(0.5/r³)
```

圆轨道观者的时间分量：

```
u^t = 1/sqrt(1 - 3GM/r) = 1/sqrt(1 - 1.5/r)
```

光子 4-动量与盘面观者 4-速度投影给出观测 / 发射频率比：

```
g = 1 / [ u^t · (1 - b·Ω) ]
```

其中 `b = dot(cross(x, p), n)`。该式同时包含引力红移和 Doppler 效应。
为确认符号，用一个接近盘面的相机位置做了数值抽查：
最大 g 恰好出现在“盘面物质朝向相机运动”的一侧，最小 g 在背离侧，
因此着色器采用 `Ω` 为负（绕 +Y 轴从 +X 转向 +Z 的旋转方向）。

### 2.2 着色与增亮

- 温度剖面 `T ∝ r^(-3/4)`。
- 黑体色用 Tanner Helland / Bartlett 多项式近似，再做近似线性化。
- 观测强度乘 `g³`（Doppler beaming），色温同时按 `T·g` 平移，
  这样既增亮又变蓝 / 变红。
- 内缘叠加一个高温 rim，让 ISCO 附近更明亮。

### 2.3 多层穿越

沿同一根测地线按仿射参数顺序检测 `y=0` 平面穿越；每次命中：

```
radiance += diskColor * transmittance
transmittance *= 1 - alpha
```

这样主像、次级像、多次绕转的盘面像按顺序叠加，**不需要任何后画圆环**。

### 2.4 厚度与湍流

- 盘厚 `h = thickness · r`，柱密度近似 `sqrt(π)·h/|cosInc|`，
  使掠射方向的像比垂直方向更不透明。
- 湍流：`fbm(log r, φ - Ω(r)·t)` 4-octave 值噪声 + 额外时间平流，
  形成较差自转和持续演化的盘面结构。

---

## 3. 程序化星空与银河

- 星空：方向向量映射到立方体方向网格，搜索 8 个相邻 cell 内的 hash 星点，
  用高斯角半径做抗锯齿；所有星点随测地线弯曲，形成引力透镜。
- 银河：给定银道面法向，构造正交基，在 `(lat, band-uv)` 上叠加两层 fbm
  作为尘埃与亮带，再加一个高幂次核心辉光。
- 两者都输出 HDR 值，Bloom 会对亮星和盘面同时起反应。

---

## 4. 渲染架构

只使用本地 `three.module.js` + `OrbitControls.js`，后处理全部手写，
避免引入 EffectComposer 一整套 addon：

```
main fullscreen quad
  -> sceneRT (RGBA16F HalfFloat)
  -> bright pass (HDR 阈值 + 软 knee)
  -> downsample 到半分辨率
  -> Kawase 模糊 ping-pong（质量档控制次数）
  -> final quad: scene + bloom -> exposure -> ACES -> 色散/暗角/颗粒 -> sRGB
```

关键点：

- `renderer.outputColorSpace = LinearSRGBColorSpace`，sRGB OETF 在 final shader 手工完成，
  避免自定义 ShaderMaterial 被 Three.js 自动编码二次处理。
- 主渲染与后处理都使用 `gl_FragCoord / uResolution`，纹理方向严格一致。
- 质量档用 `#define` 外的**常量循环上限 + break**，换档不需要重编译 shader。
- SSAA 由 quality.samples 控制（1 / 2 spp），每帧 subpixel jitter。

---

## 5. 质量档与性能

初始版本 High 为 1.0 分辨率 + 2 spp，Intel UHD 630 上只有约 10 FPS。
按“Standard 是实时档、High 是均衡档、Cinematic 是录制档”的思路重调：

| 档位 | 内部分辨率 | AA | 积分预算 | 实测 |
| --- | --- | --- | --- | --- |
| Standard | 75% | 1 spp | 192 步 | 约 30 FPS |
| High | 90% | 1 spp | 288 步 | 约 21 FPS |
| Cinematic | 100% | 2 spp | 384 步 | 约 10 FPS |

移动端 / 触屏自动默认 Standard，Retina 像素比按档位封顶。

---

## 6. 开发与调试记录

1. **执行环境**：宿主没有可用文件沙箱后端，需要以 unrestricted 模式运行工具链；
   Python 缺少 sympy，建 venv 安装后完成公式验证。
2. **公式错误两次**：第一次把径向 `r''` 直接当直角坐标加速度，第二次用
   `L²/r³ - 1.5L²/r⁴` 当向量加速度，数值结果与光子球轨道矛盾；
   最终通过“球坐标 EL 方程 + 直角坐标展开”确认 `-1.5L²x/r⁵`。
3. **GLSL 编译错误**：Three.js `ShaderMaterial` 会自动注入 `position` / `uv`，
   顶点 shader 再次声明导致 redefinition，删除后编译通过。
4. **Bloom 全黑**：bright pass 没有把 `sceneRT.texture` 赋给 `uTex`，
   debug 8 显示全黑，修复后 Bloom 正常。
5. **调试视图 2 / 7 全黑**：`traceRay` 只返回合成色，没有把盘面与背景分开输出；
   增加 `diskOut` / `bgOut` 两个 out 通道后，仅盘面 / 仅背景视图正确。
6. **URL 参数优先级**：`preset` 会覆盖 URL 里的 `fov`，持久化相机又会压过
   URL `preset`；增加 `fovSpecified` / `presetSpecified` 标记修正。
7. **窗口缩放遗漏**：初版只初始化时 resize，补上 `window.resize`、
   `orientationchange` 与 `visualViewport.resize` 监听。
8. **SwiftShader 测试假象**：headless 默认软渲染跑 High 档会卡到几乎无帧，
   换成 `headless: shell + --use-angle=gl` 使用真实 GPU 后测试稳定。
9. **音频生成**：ffmpeg `aevalsrc` 双声道表达式用 `|` 而非 `:` 分隔；
   所有振荡器频率与 LFO 频率都取 60 秒内整数周期，保证循环无缝。
10. **移动端验证**：390×844、DPR=2、触屏模拟下自动选择 Standard，
    绘制缓冲 438×949，零控制台错误。

---

## 7. 最终验收

`tests/e2e.mjs` 启动静态服务器 + 真实 Chrome headless，自动执行：

- 启动 ready、无错误遮罩；
- 主渲染非黑屏，中心事件视界阴影严格为 0，外围场景高亮；
- 0–9 调试视图逐个切换无错误；
- 4 个视角预设逐个切换；
- Standard → High 画质切换及缓冲尺寸变化；
- 曝光参数写入 localStorage 后刷新仍生效；
- `?screenshot=1&wait=…` URL 自动化产出 PNG；
- 主会话零 console error / pageerror。

最终结果：全部 PASS，证据 PNG 写入 `tests/results/`。

---

## 8. 已知边界

- Cinematic 是质量优先档，核显上约 10 FPS；实时游玩推荐 Standard / High。
- 薄盘用“平面穿越 + 柱密度”近似，不模拟真实辐射转移 / 盘面自身阴影。
- 相机最近距离限制在 2.2 rs（大于视界但允许进入强场区），避免数值奇异性。
- 色散实现为径向 RGB 采样偏移（色差），不是逐波长光谱重积分。
