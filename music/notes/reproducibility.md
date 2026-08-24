# 复现说明

## 环境

本次 v1.2 渲染环境记录为：

- Python `3.12.3`
- NumPy `1.26.4`
- FFmpeg `6.1.1`（只用于把下载的 CC0 MP3 转成项目内 WAV；正式渲染不依赖 FFmpeg）
- 外部参考音：`music/assets/samples/guzheng-cc0-preview.wav`
- 随机种子：`20260824`
- 参考音基准音：A3 / MIDI 57 / 约 220 Hz
- 复音池：最多 24 个 voice；同音重触发淡出 12 ms，偷音淡出 35 ms

## 从源文件重新生成

在仓库根目录执行：

```bash
python3 -m py_compile music/source/create_guzheng.py
python3 music/source/create_guzheng.py --engine hybrid \
  --composition music/source/moonlit-stream.json \
  --sample music/assets/samples/guzheng-cc0-preview.wav \
  --wav music/audio/moonlit-stream.wav \
  --midi music/audio/moonlit-stream.mid \
  --metadata music/notes/moonlit-stream.metadata.json
```

当前页面直接提供以下产物：

```text
music/audio/moonlit-stream.mp3
music/audio/moonlit-stream.wav
music/audio/moonlit-stream.mid
music/notes/moonlit-stream.metadata.json
```

如果要复现无采样加性音色对照：

```bash
python3 music/source/create_guzheng.py --engine additive \
  --composition music/source/moonlit-stream.json \
  --wav /tmp/moonlit-stream-additive.wav \
  --midi /tmp/moonlit-stream-additive.mid \
  --metadata /tmp/moonlit-stream-additive.metadata.json
```

## 验证

```bash
sha256sum -c music/notes/SHA256SUMS.txt
```

参考音的来源与许可见 [`../assets/LICENSES.md`](../assets/LICENSES.md)。若需要从公开预览重新生成项目内 WAV：

```bash
curl -fL -o /tmp/guzheng-cc0-preview.mp3 \
  'https://cdn.freesound.org/previews/847/847157_18537710-hq.mp3'
ffmpeg -y -i /tmp/guzheng-cc0-preview.mp3 -ar 44100 -ac 2 -sample_fmt s16 \
  music/assets/samples/guzheng-cc0-preview.wav
```

WAV 预期为 `pcm_s16le`、44,100 Hz、2 声道、52.5 秒；参考采样和最终产物的哈希均记录在文档中。

## 可调参数

- 旋律、低音和装饰：编辑 JSON 的 `events`。
- 速度与时长：编辑 `tempo_bpm` 和 `bars`。
- 音色随机细节：编辑 `seed`；改 seed 会改变轻微变调和指甲瞬态，也会改变输出哈希。
- 复音和音色参数：编辑 `music/source/create_guzheng.py` 顶部的 `TIMBRE_CONFIG`，包括声部上限、淡出、起音、衰减、谐波、高频收束与各层增益。
- 采样音色：替换 `music/assets/samples/guzheng-cc0-preview.wav`，并同步更新 `music/assets/LICENSES.md` 与哈希。
- 回退模型：`--engine additive` 使用纯 NumPy 加性模型，不需要采样文件。

变更后请在日志中新增版本号，不要把不同版本的产物混写成同一个哈希记录。
