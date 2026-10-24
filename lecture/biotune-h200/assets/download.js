/* Build a standard, uncompressed ZIP locally; source files remain independently inspectable. */
(() => {
  'use strict';
  const encoder = new TextEncoder();
  const table = Uint32Array.from({length: 256}, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  function crc32(bytes) {
    let c = 0xffffffff;
    for (const b of bytes) c = table[(c ^ b) & 255] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  function buildZip(files) {
    const body = [], directory = [];
    let offset = 0, directorySize = 0;
    for (const file of files) {
      const name = encoder.encode(file.path), data = file.data, crc = crc32(data);
      const local = new Uint8Array(30 + name.length), lv = new DataView(local.buffer);
      lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true);
      lv.setUint16(6, 0x0800, true); lv.setUint16(12, (46 << 9) | (10 << 5) | 24, true);
      lv.setUint32(14, crc, true); lv.setUint32(18, data.length, true);
      lv.setUint32(22, data.length, true); lv.setUint16(26, name.length, true);
      local.set(name, 30); body.push(local, data);
      const central = new Uint8Array(46 + name.length), cv = new DataView(central.buffer);
      cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true); cv.setUint16(8, 0x0800, true);
      cv.setUint16(14, (46 << 9) | (10 << 5) | 24, true);
      cv.setUint32(16, crc, true); cv.setUint32(20, data.length, true);
      cv.setUint32(24, data.length, true); cv.setUint16(28, name.length, true);
      cv.setUint32(42, offset, true); central.set(name, 46);
      directory.push(central); directorySize += central.length;
      offset += local.length + data.length;
    }
    const end = new Uint8Array(22), ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, files.length, true);
    ev.setUint16(10, files.length, true); ev.setUint32(12, directorySize, true);
    ev.setUint32(16, offset, true);
    return new Blob([...body, ...directory, end], {type: 'application/zip'});
  }
  let busy = false;
  window.BioTuneDownload = async function (notify) {
    if (busy) return;
    busy = true;
    const buttons = [...document.querySelectorAll('[data-download]')];
    buttons.forEach(b => { b.disabled = true; });
    try {
      notify('正在读取并校验课程源文件…');
      const response = await fetch('assets/files.json', {cache: 'no-cache'});
      if (!response.ok) throw new Error('文件清单读取失败');
      const manifest = await response.json();
      const files = await Promise.all(manifest.map(async file => {
        const res = await fetch(file.url, {cache: 'no-cache'});
        if (!res.ok) throw new Error('读取失败：' + file.path);
        const data = new Uint8Array(await res.arrayBuffer());
        if (data.length !== file.bytes) throw new Error('文件长度不匹配：' + file.path);
        if (crypto.subtle) {
          const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', data));
          const hex = [...digest].map(b => b.toString(16).padStart(2, '0')).join('');
          if (hex !== file.sha256) throw new Error('文件校验失败：' + file.path);
        }
        return {path: file.path, data};
      }));
      const url = URL.createObjectURL(buildZip(files)), a = document.createElement('a');
      a.href = url; a.download = 'H200_Bio_Finetuning_Course_ZH.zip';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      notify('课程与代码包已生成，正在下载');
    } catch (error) {
      notify('下载未完成，请重试或从 GitHub 课程目录获取文件。');
      console.error(error);
    } finally {
      busy = false; buttons.forEach(b => { b.disabled = false; });
    }
  };
  window.BioTuneBuildZip = buildZip;
})();
