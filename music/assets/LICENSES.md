# 音色资产与许可

## CC0 古筝参考采样

- 原作者/上传者：`nanliu_music`
- 来源页面：https://freesound.org/people/nanliu_music/sounds/847157/
- 公开预览文件：https://cdn.freesound.org/previews/847/847157_18537710-hq.mp3
- 页面标示许可：Creative Commons 0（CC0 1.0 Public Domain Dedication）
- 许可全文：https://creativecommons.org/publicdomain/zero/1.0/
- 页面描述：Traditional Chinese Guzheng 的单音录音，明亮、共鸣、典雅。
- 获取/记录日期：2026-08-24
- 原始预览 MP3 SHA-256：`5e0204e3f110922f9dc19b0f24d029406ec0bc0e0ae2eaa80e27682952eacacf`
- 项目内解码 WAV SHA-256：`b2e728b7ac983298da9bd377447ddd410a0f130703ff2409fff0fbd4847882b5`

## 使用方式

项目只截取公开预览的第一段古筝拨弦作为 A3（约 220 Hz）参考音，再通过确定性的重采样变调覆盖旋律音域；同时叠加很轻的合成指甲瞬态。最终 WAV/MP3 是新的混合作品，不是把原始预览直接作为整曲播放。

如果上游预览链接未来失效，项目仍保留 `music/source/create_guzheng.py --engine additive` 的无采样回退路径；但要复现当前 v1.1 的真实录音质感，需要保留项目内的 WAV 参考文件。

未使用任何商业音源、付费采样包或许可不明的音频。
