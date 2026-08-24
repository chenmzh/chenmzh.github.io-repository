# 技术验收记录

验收对象：`月下流水 v1.1`（古筝实录参考音混合引擎）
验收时间：2026-08-24 21:06 +02:00；网页资源复核待本次发布后执行

## 自动检查

| 项目 | 结果 | 证据 |
|---|---|---|
| Python 语法 | PASS | `python3 -m py_compile` 返回 0 |
| 参考音格式 | PASS | 44,100 Hz / 2 声道 / 16-bit PCM WAV |
| WAV 可解析 | PASS | Python `wave` 读取成功 |
| WAV 参数 | PASS | 44,100 Hz / 2 声道 / 16-bit PCM |
| WAV 时长 | PASS | 2,315,250 frames / 44,100 = 52.5 秒 |
| WAV 有效采样 | PASS | 无 NaN；RMS 约 0.0784 |
| 削波检查 | PASS | 峰值 29,490/32,767，低于削波上限 |
| MIDI 结构 | PASS | `MThd`、Type-0、1 轨、PPQ 480 |
| 混合引擎 | PASS | metadata 标记 `hybrid-cc0-sample`，基准音 A3/MIDI 57 |
| 音色许可 | PASS | 参考采样页面明确标示 CC0 1.0，详见 `music/assets/LICENSES.md` |
| 文件完整性 | PASS | 源文件、WAV、MIDI、参考 WAV 哈希全部一致 |
| 回退路径 | PASS | `--engine additive` 可在无采样文件时生成纯合成版本 |

## v1.1 音色改进信号

在同一旋律、同一随机种子下，起始 4096 帧的频谱分析为：

- v1.0 加性版本：频谱质心约 579 Hz，高频（≥2 kHz）比例约 2%。
- v1.1 混合版本：频谱质心约 1,962 Hz，高频比例约 32%。
- 这反映了真实录音中的指甲拨弦瞬态和高次谐波被保留下来；最终是否符合个人审美仍以人工试听为准。

## 公开交付

- [x] 页面：`music/index.html`
- [x] 在线播放：`music/audio/moonlit-stream.mp3`
- [x] 无损下载：`music/audio/moonlit-stream.wav`
- [x] 可编辑音符：`music/audio/moonlit-stream.mid`
- [x] 可复现源数据：`music/source/moonlit-stream.json`
- [x] 合成脚本：`music/source/create_guzheng.py`
- [x] CC0 参考音：`music/assets/samples/guzheng-cc0-preview.wav`
- [x] 许可记录：`music/assets/LICENSES.md`
- [x] 全过程日志：`music/notes/creation-log.md`
- [x] 复现说明：`music/notes/reproducibility.md`
- [x] 元数据：`music/notes/moonlit-stream.metadata.json`
- [x] 哈希：`music/notes/SHA256SUMS.txt`

## 人工试听说明

本轮完成了文件级、信号级和许可记录验收，但当前环境没有记录人工耳听设备反馈。因此文档确认新版本使用了真实古筝录音模板和更高频的拨弦瞬态，不把它表述为专业多采样商业古筝音源。
