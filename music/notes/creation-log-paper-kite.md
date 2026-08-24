# 纸鸢 · Paper Kite — 创作记录

> 项目：《纸鸢》（Paper Kite），《月下流水》《松间月》之后的第三首古筝小品。
> 记录时间：2026-08-25 +02:00
> 工作目录：`/media/mingzhchen/新加卷/deepseek_workspace/18_music/1_guzheng_simulator`

## 1. 主题来源

本曲依据 `docs/creation-log.md`、`docs/acceptance.md`、`docs/reproducibility.md` 三份文档创作：

- 文档确立了可复现管线：G 五声调式、持续和声、8 音琶音、装饰音、Voice Pool、
  CC0 实录古筝 A3 核心 + 确定性重采样、固定随机种子；
- 前两首（月下流水、松间月）都是「月夜」主题——听水、望月，同一片夜色；
- 本曲刻意换一个主题：白昼与东风。春日晴空下，纸鸢离地、攀高、乘气流打转、
  最后收线落到掌心。与前两首的静夜对比，这一首是明亮、上行的「轻快」情绪；
- 调式从 D 五声改为 G 五声（G、A、B、D、E），速度从 70/80 BPM 提到 92 BPM，
  音色引擎与渲染器版本完全不变，仍为 v1.3.0 `hybrid-cc0-sample`。

## 2. 规格

| 项目 | 值 |
|---|---|
| 标题 | 纸鸢 / Paper Kite |
| 调式 | G 五声调式（G、A、B、D、E），中心音 G4 |
| 速度 | 92 BPM，4/4 |
| 结构 | 20 小节（引子空悬 → 主题上行 → 气流打转 → 高峰 B5/D6 → 收线回落 → G4 长音收束） |
| 时长 | 56.7 秒（52.2 秒主体 + 4.5 秒自然尾响） |
| 音域 | G2（MIDI 43，低音支撑）至 E6（MIDI 88，琶音高峰），全部落在 21 弦古筝 D2–D7 内 |
| 种子 | 20260826 |

## 3. 编曲要点

- 167 个源事件：116 条旋律、40 个持续和声、20 个低音支撑、7 组 8 音琶音；
  展开后共 228 个可渲染音符。
- 全部音符人工校验属于 G 五声音阶（含琶音展开与倚音），并校验无负起始时间。
- 琶音用 G 五声原始音程（G A B D E）构建：引子的 [0,2,5,7,9,12,14,12] 从 D5 逐级
  爬升再回落，模拟纸鸢离地；中段下行 [16,14,12,9,7,4,2,0] 模拟乘气流打转。
- 主题句（第 3–5 小节 G4→A4→B4→D5→E5→G5）沿五声音阶逐级攀高，象征纸鸢越飞越高；
  第 9 小节翻上 B5/D6 高峰后逐层回落。
- 第 8 小节 E5 摇指（tremolo）是「风中颤动」的刻画；结尾第 20 小节以 G4 长音
  收线，旋律止于 G 三音与五音上方，与引子的空悬高音呼应。

## 4. 渲染与验收

- 渲染器：`src/create_guzheng.py` v1.3.0（与《月下流水》相同版本），引擎 `hybrid`。
- `python3 src/create_guzheng.py --composition composition/paper_kite.json --engine hybrid`
- 验收结果：WAV 44.1 kHz / 2 声道 / 16-bit / 56.674 秒；无 NaN；峰值 0.86（无削波）；
  RMS 约 0.078；MIDI SMF Type-0 / PPQ 480 / 单轨 / 228 音。
- Voice Pool：最高 14 个同时 voice、97 次同音重触发、0 次偷音。
- 校验：WAV/MIDI/源 JSON 的 SHA-256 均记录在 `notes/SHA256SUMS.txt`，
  与 `outputs/paper_kite.metadata.json` 内的哈希完全一致。

## 5. 交付

- `audio/paper-kite.mp3` / `audio/paper-kite.wav` / `audio/paper-kite.mid`
- `source/paper-kite.json` — 可继续编辑的音符源
- `notes/paper-kite.metadata.json` — 渲染参数、声部统计与哈希
- `notes/SHA256SUMS.txt` — 追加本曲校验行
- 页面：`index.html` 新增第 03 区「Listening room / 纸鸢」播放器，
  位于《松间月》之下；前两首作品内容（第 01/02 区）原样未动。
