# 松间月 · Moon Through the Pines — 创作记录

> 项目：《松间月》（Moon Through the Pines），《月下流水》的姊妹篇。
> 记录时间：2026-08-25 +02:00
> 工作目录：`/media/mingzhchen/新加卷/deepseek_workspace/18_music/1_guzheng_simulator`

## 1. 主题来源

本曲依据 `docs/creation-log.md`、`docs/acceptance.md`、`docs/reproducibility.md` 三份文档创作：

- 文档反复强调的审美核心是「安静、流动、东方五声音阶氛围」——月夜、流水、松林；
- 取王维「明月松间照，清泉石上流」之意，把上一曲的「流水」主题延展为「松间之月」：
  上一曲听水，这一曲望月，同一片夜色，另一条旋律线；
- 创作方法完全沿用文档记录的 v1.3 管线：D 五声调式、持续和声、8 音琶音、Voice Pool、
  CC0 实录古筝 A3 核心 + 确定性重采样，不做任何转调、照抄或改编既有曲目。

## 2. 规格

| 项目 | 值 |
|---|---|
| 标题 | 松间月 / Moon Through the Pines |
| 调式 | D 五声调式（D、E、升 F、A、B），中心音 D4 |
| 速度 | 70 BPM，4/4 |
| 结构 | 18 小节（引子 → 低音陈述 → 上行流动 → 高音高峰 → 逐层回落 → 静夜收束） |
| 时长 | 66.2 秒（61.7 秒主体 + 4.5 秒自然尾响） |
| 音域 | D2（MIDI 38，第 32 拍低音支撑）至 D6（MIDI 86，第 24 拍高峰），全部落在 21 弦古筝 D2–D7 内 |
| 种子 | 20260825 |

## 3. 编曲要点

- 151 个源事件：88 条旋律、36 个持续和声、18 个低音支撑、10 组 8 音琶音；
  展开后共 236 个可渲染音符。
- 9 组琶音采用与《月下流水》不同的音程模式（含减音程下行波浪与跨八度回落），
  并刻意让中段琶音停留在 B5 以下、把 D6 留给第一条真正的旋律高峰。
- 主题句（第 3 小节 D5→B4→A4→F#4→E4）与《月下流水》第 3 小节的
  A4→F#4→E4→D4 方向相反，形成「揽月而上」的新轮廓。
- 高峰段（第 7–8 小节）进入 D6/B5/A5，随后五声音阶逐层下行回 D4；
  第 15 小节起每句结尾挂短琶音，像松针上的月露滴落。
- 第 18 小节以 D4 长音 + A3 + D5 和声收束，与引子的 D4/A4 开放五度呼应。

## 4. 渲染与验收

- 渲染器：`src/create_guzheng.py` v1.3.0（与《月下流水》相同版本），引擎 `hybrid`。
- `python3 src/create_guzheng.py --composition composition/pine_moon.json --engine hybrid`
- 验收结果：WAV 44.1 kHz / 2 声道 / 16-bit / 66.214 秒；无 NaN；峰值 0.86（无削波）；
  RMS 约 0.073；MIDI SMF Type-0 / PPQ 480 / 单轨 / 236 音。
- Voice Pool：最高 12 个同时 voice、114 次同音重触发、0 次偷音。
- 校验：WAV/MIDI/源 JSON 的 SHA-256 均记录在 `notes/SHA256SUMS.txt`，
  与 `outputs/pine_moon.metadata.json` 内的哈希完全一致。

## 5. 交付

- `audio/pine-moon.mp3` / `audio/pine-moon.wav` / `audio/pine-moon.mid`
- `source/pine-moon.json` — 可继续编辑的音符源
- `notes/pine-moon.metadata.json` — 渲染参数、声部统计与哈希
- `notes/SHA256SUMS.txt` — 追加本曲校验行
- 页面：`index.html` 新增第 02 区「Listening room / 松间月」播放器，
  位于《月下流水》之下；原作品所有内容未改动。
