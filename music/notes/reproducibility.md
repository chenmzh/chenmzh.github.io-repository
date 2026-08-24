# 复现说明

## 公开版本

页面公开了音符源 `music/source/moonlit-stream.json`、合成器 `music/source/create_guzheng.py` 和最终音频。原始创作使用 Python `3.12.3`、NumPy `1.26.4`，固定随机种子为 `20260824`，不依赖外部采样库。

## 从公开源文件重新生成

在仓库根目录安装 NumPy 后执行。输出写到临时目录，避免覆盖网站上的发布文件：

```bash
python3 -m pip install numpy==1.26.4
python3 music/source/create_guzheng.py \
  --composition music/source/moonlit-stream.json \
  --wav /tmp/moonlit-stream.wav \
  --midi /tmp/moonlit-stream.mid \
  --metadata /tmp/moonlit-stream.metadata.json
```

脚本也可以单独复制回原始项目布局后使用；参数优先于默认路径。

## 发布文件验证

```bash
sha256sum -c music/notes/SHA256SUMS.txt
```

页面发布的 MP3、WAV、MIDI 和 JSON 校验和都记录在 [`SHA256SUMS.txt`](./SHA256SUMS.txt) 中。WAV 预期为 44.1 kHz、立体声、16-bit PCM，时长 52.5 秒。

如果安装了 FFmpeg，可检查网页 MP3：

```bash
ffprobe -v error \
  -show_entries format=duration:stream=codec_name,sample_rate,channels \
  -of default=noprint_wrappers=1 music/audio/moonlit-stream.mp3
```

## 可调参数

- 旋律、低音和装饰：编辑 JSON 的 `events`。
- 速度与时长：编辑 `tempo_bpm` 和 `bars`。
- 音色随机细节：编辑 `seed`；改 seed 会改变拨弦噪声/相位，也会改变输出哈希。
- 声音模型：编辑合成器中的谐波衰减、拨弦噪声、混响 tap 和层级增益。

变更后请在创作日志中新增版本号，不要把不同版本的产物混写成同一个哈希记录。
