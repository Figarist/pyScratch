(function (global) {
  'use strict';

  const PROJECT_JSON_LIMIT_BYTES = 5 * 1024 * 1024; // Scratch Online 5 MB project.json limit
  const ASSET_LIMIT_BYTES = 10 * 1024 * 1024;       // Scratch Online 10 MB per-asset limit
  const LARGE_ASSET_BYTES = 500 * 1024;             // 500 KB threshold for optimization hints

  const HAT_OPCODES = new Set([
    'event_whenflagclicked',
    'event_whenkeypressed',
    'event_whenthisspriteclicked',
    'event_whenstageclicked',
    'event_whenbackdropswitchesto',
    'event_whengreaterthan',
    'event_whenbroadcastreceived',
    'event_whentouchingobject',
    'event_whenstageclicked',
    'control_start_as_clone',
    'procedures_definition'
  ]);

  const TOTAL_SB3_WARN_BYTES = 50 * 1024 * 1024;

  function isHatOpcode(op) {
    return typeof op === 'string' && (HAT_OPCODES.has(op) || op.includes('_when'));
  }

  function getByteLength(data) {
    if (data == null) return 0;
    if (typeof data === 'string') {
      if (typeof TextEncoder !== 'undefined') {
        return new TextEncoder().encode(data).length;
      }
      return Buffer.byteLength(data, 'utf8');
    }
    if (data instanceof Uint8Array) return data.byteLength;
    if (typeof ArrayBuffer !== 'undefined' && data instanceof ArrayBuffer) return data.byteLength;
    if (typeof data.byteLength === 'number') return data.byteLength;
    if (typeof data.length === 'number') return data.length;
    return 0;
  }

  function formatBytes(bytes) {
    if (!bytes || bytes < 1024) return `${bytes || 0} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function collectReferencedAssets(projectJson) {
    const referenced = new Set();
    const targets = (projectJson && Array.isArray(projectJson.targets)) ? projectJson.targets : [];
    for (const target of targets) {
      for (const costume of target.costumes || []) {
        if (costume.md5ext) referenced.add(costume.md5ext);
        else if (costume.assetId && costume.dataFormat) {
          referenced.add(`${costume.assetId}.${costume.dataFormat}`);
        }
      }
      for (const sound of target.sounds || []) {
        if (sound.md5ext) referenced.add(sound.md5ext);
        else if (sound.assetId && sound.dataFormat) {
          referenced.add(`${sound.assetId}.${sound.dataFormat}`);
        }
      }
    }
    return referenced;
  }

  function analyzeProject(projectJson, assetsMap) {
    const targets = (projectJson && Array.isArray(projectJson.targets)) ? projectJson.targets : [];
    const map = assetsMap instanceof Map ? assetsMap : new Map();

    let spritesCount = 0;
    let backdropsCount = 0;
    let costumesCount = 0;
    let soundsCount = 0;
    let globalVarsCount = 0;
    let globalListsCount = 0;
    let localVarsCount = 0;
    let localListsCount = 0;
    let totalBlocks = 0;
    let orphanScripts = 0;

    const assets = [];
    const seenAssetKeys = new Set();

    for (const target of targets) {
      const varsCount = target.variables ? Object.keys(target.variables).length : 0;
      const listsCount = target.lists ? Object.keys(target.lists).length : 0;
      const targetCostumes = Array.isArray(target.costumes) ? target.costumes : [];
      const targetSounds = Array.isArray(target.sounds) ? target.sounds : [];

      if (target.isStage) {
        backdropsCount += targetCostumes.length;
        globalVarsCount += varsCount;
        globalListsCount += listsCount;
      } else {
        spritesCount += 1;
        costumesCount += targetCostumes.length;
        localVarsCount += varsCount;
        localListsCount += listsCount;
      }
      soundsCount += targetSounds.length;

      const blocks = target.blocks || {};
      for (const blockId of Object.keys(blocks)) {
        const block = blocks[blockId];
        if (!block || typeof block !== 'object' || Array.isArray(block)) continue;
        if (!block.shadow) {
          totalBlocks += 1;
          // Lone top-level reporters (value blocks) are harmless; only stack blocks count.
          const isReporter = block.next == null && !block.parent &&
            /^(operator_|data_(itemoflist|lengthoflist|listcontents|itemnumoflist|listcontainsitem)|sensing_|motion_(xposition|yposition|direction)|looks_(size|costumenumbername|backdropnumbername)|argument_reporter)/.test(block.opcode || '') &&
            !/^(sensing_(resettimer|askandwait|setdragmode|setdragmode))$/.test(block.opcode || '');
          if (block.topLevel && !isHatOpcode(block.opcode) && !isReporter) {
            orphanScripts += 1;
          }
        }
      }

      for (const costume of targetCostumes) {
        const key = costume.md5ext || `${costume.assetId}.${costume.dataFormat}`;
        const bytes = getByteLength(map.get(key));
        seenAssetKeys.add(key);
        assets.push({
          md5ext: key,
          name: costume.name || key,
          dataFormat: (costume.dataFormat || '').toLowerCase(),
          bytes,
          targetName: target.name || 'Sprite',
          kind: target.isStage ? 'backdrop' : 'costume',
          isOversized: bytes > ASSET_LIMIT_BYTES,
          isLarge: bytes > LARGE_ASSET_BYTES
        });
      }

      for (const sound of targetSounds) {
        const key = sound.md5ext || `${sound.assetId}.${sound.dataFormat}`;
        const bytes = getByteLength(map.get(key));
        seenAssetKeys.add(key);
        assets.push({
          md5ext: key,
          name: sound.name || key,
          dataFormat: (sound.dataFormat || '').toLowerCase(),
          bytes,
          targetName: target.name || 'Sprite',
          kind: 'sound',
          isOversized: bytes > ASSET_LIMIT_BYTES,
          isLarge: bytes > LARGE_ASSET_BYTES
        });
      }
    }

    const unusedAssets = [];
    for (const [key, val] of map.entries()) {
      if (!seenAssetKeys.has(key)) {
        unusedAssets.push({ md5ext: key, bytes: getByteLength(val) });
      }
    }

    const referencedKeys = collectReferencedAssets(projectJson);
    const missingAssets = Array.from(referencedKeys).filter((k) => !map.has(k));
    const projectJsonBytes = getByteLength(JSON.stringify(projectJson || {}));
    const totalAssetsBytes = assets.reduce((acc, a) => acc + a.bytes, 0) +
      unusedAssets.reduce((acc, u) => acc + u.bytes, 0);

    const totalSb3Bytes = projectJsonBytes + totalAssetsBytes;
    return {
      missingAssets,
      totalSb3Bytes,
      totalSb3WarnBytes: TOTAL_SB3_WARN_BYTES,
      isTotalSizeLarge: totalSb3Bytes > TOTAL_SB3_WARN_BYTES,
      spritesCount,
      backdropsCount,
      costumesCount,
      soundsCount,
      globalVarsCount,
      globalListsCount,
      localVarsCount,
      localListsCount,
      totalBlocks,
      orphanScripts,
      projectJsonBytes,
      projectJsonLimitBytes: PROJECT_JSON_LIMIT_BYTES,
      projectJsonRatio: projectJsonBytes / PROJECT_JSON_LIMIT_BYTES,
      isProjectJsonOversized: projectJsonBytes > PROJECT_JSON_LIMIT_BYTES,
      assetLimitBytes: ASSET_LIMIT_BYTES,
      largeAssetBytes: LARGE_ASSET_BYTES,
      totalAssetsBytes,
      assets: assets.sort((a, b) => b.bytes - a.bytes),
      unusedAssets
    };
  }

  function removeUnusedAssets(projectJson, assetsMap) {
    if (!(assetsMap instanceof Map)) {
      return { removedCount: 0, freedBytes: 0, removedKeys: [] };
    }
    const referenced = collectReferencedAssets(projectJson);
    const removedKeys = [];
    let freedBytes = 0;

    for (const [key, val] of Array.from(assetsMap.entries())) {
      if (!referenced.has(key)) {
        freedBytes += getByteLength(val);
        removedKeys.push(key);
        assetsMap.delete(key);
      }
    }

    return {
      removedCount: removedKeys.length,
      freedBytes,
      removedKeys
    };
  }

  function replaceAssetData(projectJson, assetsMap, oldMd5ext, newBytesOrData, newDataFormat, md5Fn) {
    const computeMd5 =
      typeof md5Fn === 'function'
        ? md5Fn
        : (typeof Sb3Bridge !== 'undefined' && typeof Sb3Bridge.md5 === 'function'
            ? Sb3Bridge.md5
            : (typeof require === 'function' ? require('./sb3Bridge.js').md5 : null));

    if (!computeMd5) {
      throw new Error('MD5 function is required to replace asset data.');
    }

    const oldBytes = assetsMap instanceof Map ? getByteLength(assetsMap.get(oldMd5ext)) : 0;
    const fmt = String(newDataFormat || oldMd5ext.split('.').pop() || 'png').toLowerCase();
    const newAssetId = computeMd5(newBytesOrData);
    const newMd5ext = `${newAssetId}.${fmt}`;
    const newBytes = getByteLength(newBytesOrData);

    if (assetsMap instanceof Map) {
      if (oldMd5ext !== newMd5ext) {
        assetsMap.delete(oldMd5ext);
      }
      assetsMap.set(newMd5ext, newBytesOrData);
    }

    const oldAssetId = oldMd5ext.includes('.') ? oldMd5ext.slice(0, oldMd5ext.lastIndexOf('.')) : oldMd5ext;
    const targets = (projectJson && Array.isArray(projectJson.targets)) ? projectJson.targets : [];
    for (const target of targets) {
      for (const costume of target.costumes || []) {
        if (costume.md5ext === oldMd5ext || costume.assetId === oldAssetId) {
          costume.assetId = newAssetId;
          costume.md5ext = newMd5ext;
          costume.dataFormat = fmt;
        }
      }
      for (const sound of target.sounds || []) {
        if (sound.md5ext === oldMd5ext || sound.assetId === oldAssetId) {
          sound.assetId = newAssetId;
          sound.md5ext = newMd5ext;
          sound.dataFormat = fmt;
        }
      }
    }

    return {
      oldMd5ext,
      newMd5ext,
      newAssetId,
      oldBytes,
      newBytes
    };
  }

  const api = {
    PROJECT_JSON_LIMIT_BYTES,
    ASSET_LIMIT_BYTES,
    LARGE_ASSET_BYTES,
    getByteLength,
    formatBytes,
    collectReferencedAssets,
    analyzeProject,
    removeUnusedAssets,
    replaceAssetData
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.PyScratchInspector = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
