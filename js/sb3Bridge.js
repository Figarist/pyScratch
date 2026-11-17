/**
 * sb3Bridge.js
 * Handles .sb3 (ZIP) unpacking, packing, binary/SVG asset preservation, sprite/backdrop management,
 * and built-in default project templates compliant with Scratch 3.0 VM specification.
 */

(function (global) {
  'use strict';

  // RFC 1321 compliant MD5 implementation for Scratch assetId calculation (supports strings and Uint8Array)
  function md5Bytes(bytes) {
    function add32(a, b) {
      return (a + b) & 0xffffffff;
    }
    function cmn(q, a, b, x, s, t) {
      a = add32(add32(a, q), add32(x, t));
      return add32((a << s) | (a >>> (32 - s)), b);
    }
    function ff(a, b, c, d, x, s, t) { return cmn((b & c) | (~b & d), a, b, x, s, t); }
    function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & ~d), a, b, x, s, t); }
    function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
    function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | ~d), a, b, x, s, t); }

    function md5cycle(x, k) {
      let a = x[0], b = x[1], c = x[2], d = x[3];
      a = ff(a, b, c, d, k[0], 7, -680876936); d = ff(d, a, b, c, k[1], 12, -389564586);
      c = ff(c, d, a, b, k[2], 17, 606105819); b = ff(b, c, d, a, k[3], 22, -1044525330);
      a = ff(a, b, c, d, k[4], 7, -176418897); d = ff(d, a, b, c, k[5], 12, 1200080426);
      c = ff(c, d, a, b, k[6], 17, -1473231341); b = ff(b, c, d, a, k[7], 22, -45705983);
      a = ff(a, b, c, d, k[8], 7, 1770035416); d = ff(d, a, b, c, k[9], 12, -1958414417);
      c = ff(c, d, a, b, k[10], 17, -42063); b = ff(b, c, d, a, k[11], 22, -1990404162);
      a = ff(a, b, c, d, k[12], 7, 1804603682); d = ff(d, a, b, c, k[13], 12, -40341101);
      c = ff(c, d, a, b, k[14], 17, -1502002290); b = ff(b, c, d, a, k[15], 22, 1236535329);
      a = gg(a, b, c, d, k[1], 5, -165796510); d = gg(d, a, b, c, k[6], 9, -1069501632);
      c = gg(c, d, a, b, k[11], 14, 643717713); b = gg(b, c, d, a, k[0], 20, -373897302);
      a = gg(a, b, c, d, k[5], 5, -701558691); d = gg(d, a, b, c, k[10], 9, 38016083);
      c = gg(c, d, a, b, k[15], 14, -660478335); b = gg(b, c, d, a, k[4], 20, -405537848);
      a = gg(a, b, c, d, k[9], 5, 568446438); d = gg(d, a, b, c, k[14], 9, -1019803690);
      c = gg(c, d, a, b, k[3], 14, -187363961); b = gg(b, c, d, a, k[8], 20, 1163531501);
      a = gg(a, b, c, d, k[13], 5, -1444681467); d = gg(d, a, b, c, k[2], 9, -51403784);
      c = gg(c, d, a, b, k[7], 14, 1735328473); b = gg(b, c, d, a, k[12], 20, -1926607734);
      a = hh(a, b, c, d, k[5], 4, -378558); d = hh(d, a, b, c, k[8], 11, -2022574463);
      c = hh(c, d, a, b, k[11], 16, 1839030562); b = hh(b, c, d, a, k[14], 23, -35309556);
      a = hh(a, b, c, d, k[1], 4, -1530992060); d = hh(d, a, b, c, k[4], 11, 1272893353);
      c = hh(c, d, a, b, k[7], 16, -155497632); b = hh(b, c, d, a, k[10], 23, -1094730640);
      a = hh(a, b, c, d, k[13], 4, 681279174); d = hh(d, a, b, c, k[0], 11, -358537222);
      c = hh(c, d, a, b, k[3], 16, -722521979); b = hh(b, c, d, a, k[6], 23, 76029189);
      a = hh(a, b, c, d, k[9], 4, -640364487); d = hh(d, a, b, c, k[12], 11, -421815835);
      c = hh(c, d, a, b, k[15], 16, 530742520); b = hh(b, c, d, a, k[2], 23, -995338651);
      a = ii(a, b, c, d, k[0], 6, -198630844); d = ii(d, a, b, c, k[7], 10, 1126891415);
      c = ii(c, d, a, b, k[14], 15, -1416354905); b = ii(b, c, d, a, k[5], 21, -57434055);
      a = ii(a, b, c, d, k[12], 6, 1700485571); d = ii(d, a, b, c, k[3], 10, -1894986606);
      c = ii(c, d, a, b, k[10], 15, -1051523); b = ii(b, c, d, a, k[1], 21, -2054922799);
      a = ii(a, b, c, d, k[8], 6, 1873313359); d = ii(d, a, b, c, k[15], 10, -30611744);
      c = ii(c, d, a, b, k[6], 15, -1560198380); b = ii(b, c, d, a, k[13], 21, 1309151649);
      a = ii(a, b, c, d, k[4], 6, -145523070); d = ii(d, a, b, c, k[11], 10, -1120210379);
      c = ii(c, d, a, b, k[2], 15, 718787259); b = ii(b, c, d, a, k[9], 21, -343485551);
      x[0] = add32(a, x[0]); x[1] = add32(b, x[1]); x[2] = add32(c, x[2]); x[3] = add32(d, x[3]);
    }

    const n = bytes.length;
    const state = [1732584193, -271733879, -1732584194, 271733878];
    let i;
    for (i = 64; i <= n; i += 64) {
      const blk = new Array(16);
      for (let j = 0; j < 64; j += 4) {
        const idx = i - 64 + j;
        blk[j >> 2] = bytes[idx] | (bytes[idx + 1] << 8) | (bytes[idx + 2] << 16) | (bytes[idx + 3] << 24);
      }
      md5cycle(state, blk);
    }
    const tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const rem = n - (i - 64);
    for (let j = 0; j < rem; j++) {
      tail[j >> 2] |= bytes[i - 64 + j] << ((j % 4) << 3);
    }
    tail[rem >> 2] |= 0x80 << ((rem % 4) << 3);
    if (rem > 55) {
      md5cycle(state, tail);
      for (let j = 0; j < 16; j++) tail[j] = 0;
    }
    tail[14] = (n * 8) >>> 0;
    tail[15] = Math.floor((n * 8) / 0x100000000);
    md5cycle(state, tail);

    const hexChr = '0123456789abcdef';
    let out = '';
    for (let j = 0; j < 4; j++) {
      const v = state[j];
      for (let k = 0; k < 4; k++) {
        out += hexChr[(v >> (k * 8 + 4)) & 0x0f] + hexChr[(v >> (k * 8)) & 0x0f];
      }
    }
    return out;
  }

  function stringToUtf8Bytes(str) {
    if (typeof TextEncoder !== 'undefined') {
      return new TextEncoder().encode(str);
    }
    const utf8 = unescape(encodeURIComponent(str));
    const arr = new Uint8Array(utf8.length);
    for (let i = 0; i < utf8.length; i++) arr[i] = utf8.charCodeAt(i);
    return arr;
  }

  function utf8BytesToString(bytes) {
    if (typeof bytes === 'string') return bytes;
    if (typeof TextDecoder !== 'undefined') {
      return new TextDecoder().decode(bytes);
    }
    let s = '';
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return decodeURIComponent(escape(s));
  }

  function md5(input) {
    if (typeof input === 'string') {
      return md5Bytes(stringToUtf8Bytes(input));
    }
    if (input instanceof Uint8Array) {
      return md5Bytes(input);
    }
    return md5Bytes(stringToUtf8Bytes(String(input)));
  }

  // Generate a minimal valid WAV file (sine beep) so sound blocks work out of the box in Scratch 3.0
  function createBeepWavBytes(freqHz = 523.25, durationSec = 0.12) {
    const sampleRate = 22050;
    const numSamples = Math.floor(sampleRate * durationSec);
    const buf = new Uint8Array(44 + numSamples * 2);
    const view = new DataView(buf.buffer);

    function writeStr(offset, str) {
      for (let i = 0; i < str.length; i++) buf[offset + i] = str.charCodeAt(i);
    }

    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, numSamples * 2, true);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const env = Math.min(1, (numSamples - i) / (sampleRate * 0.03));
      const sample = Math.sin(2 * Math.PI * freqHz * t) * 0.35 * env;
      view.setInt16(44 + i * 2, Math.max(-32768, Math.min(32767, Math.floor(sample * 32767))), true);
    }
    return { bytes: buf, sampleCount: numSamples, rate: sampleRate };
  }

  const DEFAULT_BACKDROPS = [
    {
      name: 'space_bg',
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360"><rect width="480" height="360" fill="#0c1016"/><circle cx="70" cy="60" r="2" fill="#e2e8f0"/><circle cx="190" cy="90" r="1.5" fill="#94a3b8"/><circle cx="340" cy="50" r="2.5" fill="#f8fafc"/><circle cx="420" cy="140" r="2" fill="#38bdf8"/><circle cx="120" cy="240" r="1.8" fill="#f8fafc"/><circle cx="290" cy="280" r="2" fill="#e2e8f0"/><circle cx="410" cy="310" r="1.5" fill="#94a3b8"/><circle cx="240" cy="180" r="110" fill="none" stroke="#1e293b" stroke-width="1" stroke-dasharray="4 4"/></svg>'
    },
    {
      name: 'level_2',
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360"><rect width="480" height="360" fill="#131b2e"/><rect y="290" width="480" height="70" fill="#1e293b"/><line x1="0" y1="290" x2="480" y2="290" stroke="#38bdf8" stroke-width="2"/><circle cx="400" cy="70" r="28" fill="#eab308" opacity="0.9"/></svg>'
    },
    {
      name: 'grid_bg',
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360"><rect width="480" height="360" fill="#f8fafc"/><g stroke="#e2e8f0" stroke-width="1"><path d="M60 0V360M120 0V360M180 0V360M300 0V360M360 0V360M420 0V360M0 60H480M0 120H480M0 240H480M0 300H480"/></g><path d="M240 0 V360 M0 180 H480" stroke="#94a3b8" stroke-width="2"/></svg>'
    }
  ];

  const DEFAULT_SPRITE_COSTUMES = [
    {
      name: 'costume1',
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><polygon points="54,32 14,12 24,32 14,52" fill="#38bdf8" stroke="#0284c7" stroke-width="3" stroke-linejoin="round"/><circle cx="34" cy="32" r="4" fill="#e0f2fe"/></svg>'
    },
    {
      name: 'costume2',
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><polygon points="56,32 12,10 22,32 12,54" fill="#22c55e" stroke="#15803d" stroke-width="3" stroke-linejoin="round"/><circle cx="36" cy="32" r="5" fill="#dcfce7"/></svg>'
    }
  ];

  const STAR_SPRITE_COSTUME = {
    name: 'star',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><polygon points="24,4 30,17 44,18 33,28 36,42 24,34 12,42 15,28 4,18 18,17" fill="#eab308" stroke="#ca8a04" stroke-width="2.5" stroke-linejoin="round"/></svg>'
  };

  function registerSvgAsset(assetsMap, name, svgStr, centerX, centerY) {
    const id = md5(svgStr);
    const md5ext = id + '.svg';
    assetsMap.set(md5ext, svgStr);
    return {
      name,
      bitmapResolution: 1,
      dataFormat: 'svg',
      assetId: id,
      md5ext,
      rotationCenterX: centerX,
      rotationCenterY: centerY
    };
  }

  function registerSoundAsset(assetsMap, name, wavInfo) {
    const id = md5(wavInfo.bytes);
    const md5ext = id + '.wav';
    assetsMap.set(md5ext, wavInfo.bytes);
    return {
      name,
      assetId: id,
      dataFormat: 'wav',
      format: '',
      rate: wavInfo.rate,
      sampleCount: wavInfo.sampleCount,
      md5ext
    };
  }

  function createDefaultProject() {
    const assetsMap = new Map();

    const backdrops = DEFAULT_BACKDROPS.map((bg) =>
      registerSvgAsset(assetsMap, bg.name, bg.svg, 240, 180)
    );

    const spriteCostumes = DEFAULT_SPRITE_COSTUMES.map((c) =>
      registerSvgAsset(assetsMap, c.name, c.svg, 32, 32)
    );

    const popSound = registerSoundAsset(assetsMap, 'pop', createBeepWavBytes(523.25, 0.1));
    const laserSound = registerSoundAsset(assetsMap, 'laser', createBeepWavBytes(783.99, 0.14));

    const projectJson = {
      targets: [
        {
          isStage: true,
          name: 'Stage',
          variables: {},
          lists: {},
          broadcasts: {},
          blocks: {},
          comments: {},
          currentCostume: 0,
          costumes: backdrops,
          sounds: [popSound],
          volume: 100,
          layerOrder: 0,
          tempo: 60,
          videoTransparency: 50,
          videoState: 'on',
          textToSpeechLanguage: null
        },
        {
          isStage: false,
          name: 'Sprite1',
          variables: {},
          lists: {},
          broadcasts: {},
          blocks: {},
          comments: {},
          currentCostume: 0,
          costumes: spriteCostumes,
          sounds: [popSound, laserSound],
          volume: 100,
          layerOrder: 1,
          visible: true,
          x: 0,
          y: 0,
          size: 100,
          direction: 90,
          draggable: false,
          rotationStyle: 'all around'
        }
      ],
      monitors: [],
      extensions: [],
      meta: {
        semver: '3.0.0',
        vm: '2.3.0',
        agent: 'pyScratch-2.0'
      }
    };

    return { projectJson, assetsMap };
  }

  function addSpriteToProject(projectJson, assetsMap, customName) {
    const existingNames = new Set(projectJson.targets.map((t) => t.name));
    let idx = projectJson.targets.filter((t) => !t.isStage).length + 1;
    let name = customName || `Sprite${idx}`;
    while (existingNames.has(name)) {
      idx++;
      name = `Sprite${idx}`;
    }

    const costume = registerSvgAsset(assetsMap, STAR_SPRITE_COSTUME.name, STAR_SPRITE_COSTUME.svg, 24, 24);
    const popSound = registerSoundAsset(assetsMap, 'pop', createBeepWavBytes(659.25, 0.1));
    const maxLayer = projectJson.targets.reduce((m, t) => Math.max(m, t.layerOrder || 0), 0);

    const newSprite = {
      isStage: false,
      name,
      variables: {},
      lists: {},
      broadcasts: {},
      blocks: {},
      comments: {},
      currentCostume: 0,
      costumes: [costume],
      sounds: [popSound],
      volume: 100,
      layerOrder: maxLayer + 1,
      visible: true,
      x: Math.min(180, (idx - 1) * 60),
      y: 0,
      size: 100,
      direction: 90,
      draggable: false,
      rotationStyle: 'all around'
    };

    projectJson.targets.push(newSprite);
    return newSprite;
  }

  function toUint8Array(data) {
    if (data instanceof Uint8Array) return data;
    if (data instanceof ArrayBuffer) return new Uint8Array(data);
    if (ArrayBuffer.isView(data)) {
      return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    }
    throw new Error('Очікувались бінарні дані (Uint8Array або ArrayBuffer).');
  }

  function makeUniqueName(existingNames, rawName, fallback) {
    const base = String(rawName || '').trim() || fallback;
    let candidate = base;
    let n = 2;
    while (existingNames.has(candidate)) {
      candidate = `${base}_${n++}`;
    }
    return candidate;
  }

  function parseSvgDimensions(svgText) {
    const vbMatch = svgText.match(/viewBox\s*=\s*["']\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)\s*["']/i);
    if (vbMatch) {
      const w = parseFloat(vbMatch[1]);
      const h = parseFloat(vbMatch[2]);
      if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
        return { width: w, height: h };
      }
    }
    const wMatch = svgText.match(/\bwidth\s*=\s*["']\s*([\d.]+)/i);
    const hMatch = svgText.match(/\bheight\s*=\s*["']\s*([\d.]+)/i);
    if (wMatch && hMatch) {
      const w = parseFloat(wMatch[1]);
      const h = parseFloat(hMatch[1]);
      if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
        return { width: w, height: h };
      }
    }
    return null;
  }

  function parseRasterDimensions(bytes, format) {
    if (!bytes || bytes.length < 24) return null;
    if (format === 'png') {
      if (
        bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
        bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
      ) {
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        const width = view.getUint32(16, false);
        const height = view.getUint32(20, false);
        if (width > 0 && height > 0) return { width, height };
      }
      return null;
    }
    if (format === 'jpg') {
      if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
      let offset = 2;
      while (offset + 4 < bytes.length) {
        if (bytes[offset] !== 0xff) {
          offset++;
          continue;
        }
        while (offset < bytes.length && bytes[offset] === 0xff) offset++;
        if (offset >= bytes.length) break;
        const marker = bytes[offset++];
        if (marker === 0xd9 || marker === 0xda) break;
        if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
        if (offset + 2 > bytes.length) break;
        const segLen = (bytes[offset] << 8) | bytes[offset + 1];
        if (segLen < 2 || offset + segLen > bytes.length) break;
        if (
          (marker >= 0xc0 && marker <= 0xc3) ||
          (marker >= 0xc5 && marker <= 0xc7) ||
          (marker >= 0xc9 && marker <= 0xcb) ||
          (marker >= 0xcd && marker <= 0xcf)
        ) {
          if (offset + 7 <= bytes.length) {
            const height = (bytes[offset + 3] << 8) | bytes[offset + 4];
            const width = (bytes[offset + 5] << 8) | bytes[offset + 6];
            if (width > 0 && height > 0) return { width, height };
          }
          break;
        }
        offset += segLen;
      }
    }
    return null;
  }

  function parseWavMetadata(bytes) {
    const fallback = { rate: 22050, sampleCount: 0 };
    if (!bytes || bytes.length < 44) return fallback;
    const ascii = (start, len) => {
      let s = '';
      for (let i = 0; i < len && start + i < bytes.length; i++) {
        s += String.fromCharCode(bytes[start + i]);
      }
      return s;
    };
    if (ascii(0, 4) !== 'RIFF' || ascii(8, 4) !== 'WAVE') {
      return fallback;
    }

    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let rate = 0;
    let channels = 0;
    let bitsPerSample = 0;
    let dataSize = 0;

    let offset = 12;
    while (offset + 8 <= bytes.length) {
      const chunkId = ascii(offset, 4);
      const chunkSize = view.getUint32(offset + 4, true);
      const dataStart = offset + 8;
      const available = Math.max(0, bytes.length - dataStart);
      const clampedSize = Math.min(chunkSize, available);

      if (chunkId === 'fmt ' && clampedSize >= 16) {
        channels = view.getUint16(dataStart + 2, true);
        rate = view.getUint32(dataStart + 4, true);
        bitsPerSample = view.getUint16(dataStart + 14, true);
      } else if (chunkId === 'data') {
        dataSize = clampedSize;
      }

      const step = 8 + chunkSize + (chunkSize % 2);
      if (!Number.isFinite(step) || step < 8) break;
      offset += step;
    }

    const sampleRate = rate > 0 ? rate : 22050;
    let sampleCount = 0;
    if (dataSize > 0 && channels > 0 && bitsPerSample > 0) {
      const frameBytes = channels * (bitsPerSample / 8);
      if (frameBytes > 0) {
        sampleCount = Math.floor(dataSize / frameBytes);
      }
    }
    return { rate: sampleRate, sampleCount };
  }

  function validateTargetIndex(projectJson, targetIdx) {
    if (!projectJson || !Array.isArray(projectJson.targets)) {
      throw new Error('Некоректний об’єкт projectJson.');
    }
    if (!Number.isInteger(targetIdx) || targetIdx < 0 || targetIdx >= projectJson.targets.length) {
      throw new Error('Некоректний індекс об’єкта у проєкті.');
    }
    return projectJson.targets[targetIdx];
  }

  function renameSprite(projectJson, targetIdx, newName) {
    const target = validateTargetIndex(projectJson, targetIdx);
    if (target.isStage) {
      throw new Error('Неможливо перейменувати Сцену (Stage).');
    }
    const trimmed = String(newName ?? '').trim();
    if (!trimmed) {
      throw new Error('Назва спрайта не може бути порожньою.');
    }
    if (trimmed === 'Stage') {
      throw new Error('Назва "Stage" зарезервована для Сцени.');
    }
    const duplicate = projectJson.targets.some((t, i) => i !== targetIdx && t.name === trimmed);
    if (duplicate) {
      throw new Error(`Спрайт з назвою "${trimmed}" вже існує.`);
    }
    const oldName = target.name;
    target.name = trimmed;
    if (Array.isArray(projectJson.monitors)) {
      for (const m of projectJson.monitors) {
        if (m && m.spriteName === oldName) {
          m.spriteName = trimmed;
        }
      }
    }
    return target;
  }

  function deleteSprite(projectJson, targetIdx) {
    const target = validateTargetIndex(projectJson, targetIdx);
    if (target.isStage) {
      throw new Error('Неможливо видалити Сцену (Stage).');
    }
    const spriteCount = projectJson.targets.filter((t) => !t.isStage).length;
    if (spriteCount <= 1) {
      throw new Error('Неможливо видалити останній спрайт у проєкті.');
    }
    const [removed] = projectJson.targets.splice(targetIdx, 1);
    if (Array.isArray(projectJson.monitors) && removed && removed.name) {
      projectJson.monitors = projectJson.monitors.filter((m) => !m || m.spriteName !== removed.name);
    }
    return removed;
  }

  const VALID_ROTATION_STYLES = new Set(['all around', 'left-right', "don't rotate"]);

  function updateSpriteProps(projectJson, targetIdx, props) {
    const target = validateTargetIndex(projectJson, targetIdx);
    if (target.isStage) {
      throw new Error('Властивості координат та вигляду доступні лише для спрайтів.');
    }
    if (!props || typeof props !== 'object') {
      return target;
    }
    if (props.x !== undefined) {
      const x = Number(props.x);
      if (Number.isFinite(x)) target.x = Math.round(x * 100) / 100;
    }
    if (props.y !== undefined) {
      const y = Number(props.y);
      if (Number.isFinite(y)) target.y = Math.round(y * 100) / 100;
    }
    if (props.size !== undefined) {
      const size = Number(props.size);
      if (Number.isFinite(size)) target.size = Math.max(5, Math.min(500, Math.round(size * 100) / 100));
    }
    if (props.direction !== undefined) {
      const direction = Number(props.direction);
      if (Number.isFinite(direction)) target.direction = Math.round(direction * 100) / 100;
    }
    if (props.visible !== undefined) {
      target.visible = Boolean(props.visible);
    }
    if (props.draggable !== undefined) {
      target.draggable = Boolean(props.draggable);
    }
    if (props.rotationStyle !== undefined && VALID_ROTATION_STYLES.has(props.rotationStyle)) {
      target.rotationStyle = props.rotationStyle;
    }
    return target;
  }

  function addCostumeAsset(projectJson, assetsMap, targetIdx, name, dataFormat, content, centerX, centerY) {
    const target = validateTargetIndex(projectJson, targetIdx);
    if (!Array.isArray(target.costumes)) target.costumes = [];

    let fmt = String(dataFormat || '').trim().toLowerCase().replace(/^\./, '');
    if (fmt === 'jpeg') fmt = 'jpg';
    if (!['svg', 'png', 'jpg'].includes(fmt)) {
      throw new Error(`Непідтримуваний формат костюма: "${dataFormat}". Використовуйте svg, png або jpg.`);
    }

    let storedContent;
    let dims = null;
    if (fmt === 'svg') {
      storedContent = typeof content === 'string' ? content : utf8BytesToString(toUint8Array(content));
      if (!storedContent.trim()) {
        throw new Error('SVG-файл порожній.');
      }
      dims = parseSvgDimensions(storedContent);
    } else {
      storedContent = toUint8Array(content);
      if (storedContent.length === 0) {
        throw new Error('Файл зображення порожній.');
      }
      dims = parseRasterDimensions(storedContent, fmt);
    }

    const existingNames = new Set(target.costumes.map((c) => c.name));
    const uniqueName = makeUniqueName(existingNames, name, target.isStage ? 'backdrop' : 'costume');

    const assetId = md5(storedContent);
    const md5ext = `${assetId}.${fmt}`;
    if (assetsMap) {
      assetsMap.set(md5ext, storedContent);
    }

    const defaultX = dims ? Math.round(dims.width / 2) : target.isStage ? 240 : 32;
    const defaultY = dims ? Math.round(dims.height / 2) : target.isStage ? 180 : 32;
    const rx = centerX !== undefined && centerX !== null && Number.isFinite(Number(centerX)) ? Number(centerX) : defaultX;
    const ry = centerY !== undefined && centerY !== null && Number.isFinite(Number(centerY)) ? Number(centerY) : defaultY;

    const costumeObj = {
      name: uniqueName,
      bitmapResolution: 1,
      dataFormat: fmt,
      assetId,
      md5ext,
      rotationCenterX: rx,
      rotationCenterY: ry
    };

    target.costumes.push(costumeObj);
    return costumeObj;
  }

  function addSoundAsset(projectJson, assetsMap, targetIdx, name, dataFormat, uint8Bytes) {
    const target = validateTargetIndex(projectJson, targetIdx);
    if (!Array.isArray(target.sounds)) target.sounds = [];

    const fmt = String(dataFormat || '').trim().toLowerCase().replace(/^\./, '');
    if (!['wav', 'mp3'].includes(fmt)) {
      throw new Error(`Непідтримуваний формат звуку: "${dataFormat}". Використовуйте wav або mp3.`);
    }

    const bytes = toUint8Array(uint8Bytes);
    if (bytes.length === 0) {
      throw new Error('Аудіофайл порожній.');
    }

    const existingNames = new Set(target.sounds.map((s) => s.name));
    const uniqueName = makeUniqueName(existingNames, name, 'sound');

    const assetId = md5(bytes);
    const md5ext = `${assetId}.${fmt}`;
    if (assetsMap) {
      assetsMap.set(md5ext, bytes);
    }

    const meta = fmt === 'wav' ? parseWavMetadata(bytes) : { rate: 44100, sampleCount: 0 };

    const soundObj = {
      name: uniqueName,
      assetId,
      dataFormat: fmt,
      format: '',
      rate: meta.rate,
      sampleCount: meta.sampleCount,
      md5ext
    };

    target.sounds.push(soundObj);
    return soundObj;
  }

  async function loadSb3(arrayBuffer) {
    if (typeof JSZip === 'undefined') {
      throw new Error('Бібліотеку JSZip не завантажено.');
    }
    const zip = await JSZip.loadAsync(arrayBuffer);
    const projectFile = zip.file('project.json');
    if (!projectFile) {
      throw new Error('У файлі .sb3 відсутній project.json');
    }
    const projectText = await projectFile.async('string');
    const projectJson = JSON.parse(projectText);
    if (!projectJson || !Array.isArray(projectJson.targets)) {
      throw new Error('Некоректна структура project.json у файлі .sb3');
    }

    const assetsMap = new Map();
    const entries = Object.keys(zip.files);
    for (const filename of entries) {
      if (filename === 'project.json' || zip.files[filename].dir) continue;
      if (filename.toLowerCase().endsWith('.svg')) {
        const svgText = await zip.files[filename].async('string');
        assetsMap.set(filename, svgText);
      } else {
        const data = await zip.files[filename].async('uint8array');
        assetsMap.set(filename, data);
      }
    }

    return { projectJson, assetsMap };
  }

  async function saveSb3(projectJson, assetsMap, outputType = 'blob') {
    if (typeof JSZip === 'undefined') {
      throw new Error('Бібліотеку JSZip не завантажено.');
    }
    const zip = new JSZip();
    zip.file('project.json', JSON.stringify(projectJson));

    if (assetsMap) {
      for (const [filename, data] of assetsMap.entries()) {
        zip.file(filename, data);
      }
    }

    return await zip.generateAsync({ type: outputType, compression: 'DEFLATE' });
  }

  function getTargetAssets(projectJson, assetsMap) {
    const stageIdx = projectJson.targets.findIndex((t) => t.isStage);
    const stage = stageIdx >= 0 ? projectJson.targets[stageIdx] : null;
    const sprites = projectJson.targets
      .map((t, idx) => ({ t, idx }))
      .filter(({ t }) => !t.isStage);
    return {
      backdrops: stage
        ? (stage.costumes || []).map((c) => ({
            name: c.name,
            md5ext: c.md5ext,
            dataFormat: c.dataFormat,
            svg: assetsMap && typeof assetsMap.get(c.md5ext) === 'string' ? assetsMap.get(c.md5ext) : null
          }))
        : [],
      stageSounds: stage ? (stage.sounds || []).map((snd) => snd.name) : [],
      sprites: sprites.map(({ t: s, idx }) => ({
        targetIdx: idx,
        name: s.name,
        x: s.x,
        y: s.y,
        size: s.size,
        direction: s.direction,
        visible: s.visible,
        rotationStyle: s.rotationStyle || 'all around',
        draggable: !!s.draggable,
        costumes: (s.costumes || []).map((c) => ({
          name: c.name,
          md5ext: c.md5ext,
          dataFormat: c.dataFormat,
          svg: assetsMap && typeof assetsMap.get(c.md5ext) === 'string' ? assetsMap.get(c.md5ext) : null
        })),
        sounds: (s.sounds || []).map((snd) => snd.name)
      }))
    };
  }

  const api = {
    md5,
    utf8BytesToString,
    createDefaultProject,
    addSpriteToProject,
    renameSprite,
    deleteSprite,
    updateSpriteProps,
    addCostumeAsset,
    addSoundAsset,
    loadSb3,
    saveSb3,
    getTargetAssets
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.Sb3Bridge = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
