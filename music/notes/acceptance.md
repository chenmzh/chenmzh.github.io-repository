# 技术验收记录

验收对象：`月下流水 v1.0`  
验收时间：2026-08-24 20:27:25–20:27:37 +02:00；网页资源复核：20:43 +02:00

## 自动检查

| 项目 | 结果 | 证据 |
|---|---|---|
| Python 语法 | PASS | `python3 -m py_compile` 返回 0 |
| WAV 可解析 | PASS | Python `wave` 读取成功 |
| WAV 参数 | PASS | 44,100 Hz / 2 声道 / 16-bit PCM |
| WAV 时长 | PASS | 2,315,250 frames / 44,100 = 52.5 秒 |
| WAV 有效采样 | PASS | 无 NaN；RMS 约 0.163 |
| 削波检查 | PASS | 峰值 29,490/32,767，低于削波上限 |
| MIDI 结构 | PASS | `MThd`、Type-0、1 轨、PPQ 480 |
| MP3 转码 | PASS | 44,100 Hz / 2 声道 / 约 52.53 秒 |
| 页面链接 | PASS | `/music/` 内所有 CSS、音频、下载和文档链接存在 |
| 本地静态预览 | PASS | 页面及 MP3/WAV/MIDI 均返回 HTTP 200 |
| 文件完整性 | PASS | `music/notes/SHA256SUMS.txt` 四项全部成功 |
| 音源授权 | PASS | 无第三方采样，使用本地合成模型 |

## 公开交付

- [x] 页面：`music/index.html`
- [x] 页面专属样式：`music/music.css`
- [x] 在线播放：`music/audio/moonlit-stream.mp3`
- [x] 无损下载：`music/audio/moonlit-stream.wav`
- [x] 可编辑音符：`music/audio/moonlit-stream.mid`
- [x] 可复现源数据：`music/source/moonlit-stream.json`
- [x] 合成脚本：`music/source/create_guzheng.py`
- [x] 全过程日志：`music/notes/creation-log.md`
- [x] 复现说明：`music/notes/reproducibility.md`
- [x] 哈希：`music/notes/SHA256SUMS.txt`

## 人工试听说明

本轮完成了文件级、信号级和本地静态页面验收，但没有记录人工耳听设备反馈。因此文档只确认“文件有效且声音由古筝风格合成模型生成”，不把合成近似音色表述为真实古筝录音。
