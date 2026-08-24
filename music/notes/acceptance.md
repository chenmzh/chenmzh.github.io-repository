# 技术验收记录

验收对象：`月下流水 v1.2`（24 声部复音古筝混合引擎）
验收时间：2026-08-24 21:06 +02:00

## 自动检查

| 项目 | 结果 | 证据 |
|---|---|---|
| Python 语法 | PASS | `python3 -m py_compile music/source/create_guzheng.py` 返回 0 |
| 参考音格式 | PASS | 44,100 Hz / 2 声道 / 16-bit PCM WAV |
| WAV 可解析 | PASS | Python `wave` 读取成功 |
| WAV 参数 | PASS | 44,100 Hz / 2 声道 / 16-bit PCM |
| WAV 时长 | PASS | 2,315,250 frames / 44,100 = 52.5 秒 |
| WAV 有效采样 | PASS | 无 NaN；RMS 约 0.0810 |
| 削波检查 | PASS | 峰值 28,179/32,767，低于削波上限 |
| MIDI 结构 | PASS | `MThd`、Type-0、1 轨、PPQ 480 |
| 混合引擎 | PASS | metadata 标记 `hybrid-cc0-sample`，基准音 A3/MIDI 57 |
| 音色许可 | PASS | 参考采样页面明确标示 CC0 1.0，详见 `music/assets/LICENSES.md` |
| 文件完整性 | PASS | 源文件、WAV、MIDI、参考 WAV 哈希全部一致 |
| 回退路径 | PASS | `--engine additive` 可在无采样文件时生成旧式纯合成版本 |

## v1.1 历史音色改进信号

在同一旋律、同一随机种子下，起始 4096 帧的频谱分析为：

- v1.0 加性版本：频谱质心约 579 Hz，高频（≥2 kHz）比例约 2%。
- v1.1 混合版本：频谱质心约 1,962 Hz，高频比例约 32%。
- 这反映了真实录音中的指甲拨弦瞬态和高次谐波被保留下来；最终是否符合个人审美仍以人工试听为准。

## v1.2 复音与音色调整

| 项目 | 结果 | 证据 |
|---|---|---|
| 复音事件 | PASS | 130 个源事件、141 个展开音符；每小节加入两条持续和声 |
| Voice Pool | PASS | 上限 24；本曲最高同时 10 voice |
| 同音重触发 | PASS | 本曲统计 69 次；每次旧 voice 以 12 ms 淡出后回收 |
| 偷音路径 | PASS | 35 ms 淡出；独立压力测试覆盖满 24 voice 的旧声部 |
| 古筝音色 | PASS | 8 ms 起音、2.05 s 基础衰减、高次谐波衰减步进 0.26、采样高频 180 ms 收束 |
| 电平安全 | PASS | 混音后自动控制到 0.86 峰值，保留约 1 dB PCM 余量；无削波 |
| 确定性 | PASS | 固定 seed；正式 WAV/MIDI/metadata 可重复生成 |

## 交付完整性

- [x] 页面：`music/index.html`
- [x] 在线播放文件：`music/audio/moonlit-stream.mp3`
- [x] 无损下载：`music/audio/moonlit-stream.wav`
- [x] 可编辑音符：`music/audio/moonlit-stream.mid`
- [x] 可复现源数据：`music/source/moonlit-stream.json`
- [x] 渲染脚本：`music/source/create_guzheng.py`
- [x] 渲染元数据：`music/notes/moonlit-stream.metadata.json`
- [x] CC0 参考音：`music/assets/samples/guzheng-cc0-preview.wav`
- [x] 许可记录：`music/assets/LICENSES.md`
- [x] 过程日志：`music/notes/creation-log.md`
- [x] 复现说明：`music/notes/reproducibility.md`
- [x] 哈希：`music/notes/SHA256SUMS.txt`

## 人工试听说明

本轮完成了文件级、信号级和许可记录验收，但当前环境没有记录人工耳听设备反馈。因此文档确认新版本使用了真实古筝录音模板和更高频的拨弦瞬态，不把它表述为专业多采样商业古筝音源。
