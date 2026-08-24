# 复现说明

## 公开版本环境

本次 v1.1 使用 Python `3.12.3`、NumPy `1.26.4` 和 FFmpeg `6.1.1`。FFmpeg 只用于把公开 CC0 预览 MP3 转成项目内 WAV；正式渲染只需要 Python、NumPy 和项目内参考 WAV。

- 参考音：`music/assets/samples/guzheng-cc0-preview.wav`
- 基准音：A3 / MIDI 57 / 约 220 Hz
- 随机种子：`20260824`

## 从公开源文件重新生成

在仓库根目录执行。输出写到临时目录，避免覆盖网页发布文件：

```bash
python3 -m pip install numpy==1.26.4
python3 music/source/create_guzheng.py \
  --engine hybrid \
  --composition music/source/moonlit-stream.json \
  --sample music/assets/samples/guzheng-cc0-preview.wav \
  --wav /tmp/moonlit-stream.wav \
  --midi /tmp/moonlit-stream.mid \
  --metadata /tmp/moonlit-stream.metadata.json
```

如果需要无采样的对照版本，将 `--engine hybrid` 改成 `--engine additive` 并省略 `--sample`。

## 发布文件验证

```bash
sha256sum -c music/notes/SHA256SUMS.txt
```

参考音的来源与许可见 [`../assets/LICENSES.md`](../assets/LICENSES.md)。若需要从公开预览重新生成项目内参考 WAV：

```bash
curl -fL -o /tmp/guzheng-cc0-preview.mp3 \
  'https://cdn.freesound.org/previews/847/847157_18537710-hq.mp3'
ffmpeg -y -i /tmp/guzheng-cc0-preview.mp3 -ar 44100 -ac 2 -sample_fmt s16 \
  /tmp/guzheng-cc0-preview.wav
```

当前网页 MP3、WAV、MIDI、JSON 与参考 WAV 的哈希均记录在 [`SHA256SUMS.txt`](./SHA256SUMS.txt) 中。
