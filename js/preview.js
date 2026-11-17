/**
 * preview.js
 * Full-featured Canvas 2D Scratch 3.0 Stage Simulator (480x360)
 * Supports Multi-Sprites, SVG Costumes/Backdrops, Pen + Stamp, Glide, Clones,
 * Custom Procedures (def), Broadcasts, Mouse/Key Sensing, Ask/Answer inline prompt,
 * Variables/Lists telemetry, and Web Audio sound playback.
 */

(function (global) {
  'use strict';

  class StagePreview {
    constructor(canvas, callbacks = {}) {
      if (typeof callbacks === 'function') {
        this.onBackdropChange = callbacks;
        this.onTelemetry = null;
        this.onAsk = null;
      } else {
        this.onBackdropChange = callbacks.onBackdropChange || null;
        this.onTelemetry = callbacks.onTelemetry || null;
        this.onAsk = callbacks.onAsk || null;
      }

      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');

      this.penCanvas = document.createElement('canvas');
      this.penCanvas.width = 480;
      this.penCanvas.height = 360;
      this.penCtx = this.penCanvas.getContext('2d');

      this.runId = 0;
      this.isRunning = false;
      this.pressedKeys = new Set();
      this.mouseX = 0;
      this.mouseY = 0;
      this.mouseDown = false;
      this.muted = false;
      this.musicTempo = 60;
      this.ttsVoice = 'ALTO';
      this.ttsLang = 'en';
      this.startTime = Date.now();
      this.answerValue = '';
      this.pendingAskResolver = null;

      this._activeAudioNodes = new Set();
      this._audioBufferCache = new Map();
      this._soundEpoch = 0;
      this._activeBroadcasts = new WeakMap();
      this._activeKeyHandlers = new WeakMap();
      this._activeClickHandlers = new WeakMap();
      this._gtInterval = null;
      this._draggingActor = null;
      this._dragOffsetX = 0;
      this._dragOffsetY = 0;
      this.hiddenMonitors = new Set();
      this.visibleMonitors = new Set();

      this.imageCache = new Map();
      this.backdrops = ['space_bg', 'level_2', 'grid_bg'];
      this.backdropColors = {
        space_bg: '#0c1016',
        level_2: '#131b2e',
        grid_bg: '#f8fafc'
      };

      this._bindCanvasMouse();
      this.reset();
    }

    _bindCanvasMouse() {
      if (!this.canvas || !this.canvas.addEventListener) return;
      const toScratchCoords = (e) => {
        const rect = this.canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const scaleX = 480 / rect.width;
        const scaleY = 360 / rect.height;
        const cx = (e.clientX - rect.left) * scaleX;
        const cy = (e.clientY - rect.top) * scaleY;
        this.mouseX = Math.max(-240, Math.min(240, Math.round(cx - 240)));
        this.mouseY = Math.max(-180, Math.min(180, Math.round(180 - cy)));
      };

      this.canvas.addEventListener('mousemove', (e) => {
        toScratchCoords(e);
        if (this.isRunning && this.mouseDown && this._draggingActor && !this._draggingActor._deleted) {
          this._draggingActor.x = Math.max(-240, Math.min(240, this.mouseX + this._dragOffsetX));
          this._draggingActor.y = Math.max(-180, Math.min(180, this.mouseY + this._dragOffsetY));
          this.render();
        }
        this._emitTelemetry();
      });
      this.canvas.addEventListener('mousedown', (e) => {
        toScratchCoords(e);
        this.mouseDown = true;
        this._handleCanvasClick();
        this._emitTelemetry();
      });
      if (typeof window !== 'undefined' && window.addEventListener) {
        window.addEventListener('mouseup', () => {
          this.mouseDown = false;
          this._draggingActor = null;
        });
      }
    }

    _getActorHalfSize(actor) {
      const scale = Math.max(0.05, (actor && actor.size !== undefined ? actor.size : 100) / 100);
      let halfW = 24 * scale;
      let halfH = 24 * scale;
      const costumeObj = actor && actor.costumes && actor.costumes[actor.currentCostume];
      const cachedImg = costumeObj && costumeObj.md5ext ? this.imageCache.get(costumeObj.md5ext) : null;
      if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
        halfW = (cachedImg.naturalWidth / 2) * scale;
        halfH = (cachedImg.naturalHeight / 2) * scale;
      }
      return {
        halfW: Math.min(halfW, 239),
        halfH: Math.min(halfH, 179)
      };
    }

    _getSortedSprites() {
      return this.actors
        .filter((a) => !a.isStage)
        .sort((a, b) => (Number(a.layerOrder) || 1) - (Number(b.layerOrder) || 1));
    }

    _normalizeLayerOrders() {
      const sprites = this._getSortedSprites();
      sprites.forEach((a, idx) => {
        a.layerOrder = idx + 1;
      });
      const stage = this.actors.find((a) => a.isStage);
      if (stage) stage.layerOrder = 0;
    }

    _handleCanvasClick() {
      if (!this.isRunning) return;
      const myRunId = this.runId;
      let clickedSprite = false;

      const sortedSprites = this._getSortedSprites();
      for (let i = sortedSprites.length - 1; i >= 0; i--) {
        const actor = sortedSprites[i];
        if (!actor.visible) continue;
        const { halfW, halfH } = this._getActorHalfSize(actor);
        const hitRadius = Math.max(halfW, halfH, 24 * (actor.size / 100));
        const dist = Math.hypot(actor.x - this.mouseX, actor.y - this.mouseY);
        if (dist <= hitRadius) {
          clickedSprite = true;
          if (actor.draggable) {
            this._draggingActor = actor;
            this._dragOffsetX = actor.x - this.mouseX;
            this._dragOffsetY = actor.y - this.mouseY;
          }
          this._triggerHandlersOnActor(actor, 'when_this_sprite_clicked', null, myRunId);
          break;
        }
      }

      if (!clickedSprite) {
        const stageActor = this.actors.find((a) => a.isStage);
        if (stageActor) {
          this._triggerHandlersOnActor(stageActor, 'when_stage_clicked', null, myRunId);
          this._triggerHandlersOnActor(stageActor, 'when_this_sprite_clicked', null, myRunId);
        }
      }
    }

    _getAudioContext() {
      if (typeof window === 'undefined') return null;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      if (!this._audioCtx) this._audioCtx = new AudioCtx();
      if (this._audioCtx.state === 'suspended' && typeof this._audioCtx.resume === 'function') {
        try {
          const r = this._audioCtx.resume();
          if (r && typeof r.catch === 'function') r.catch(() => {});
        } catch (_) {}
      }
      return this._audioCtx;
    }

    _stopAllSounds() {
      this._soundEpoch = (this._soundEpoch || 0) + 1;
      if (!this._activeAudioNodes) return;
      for (const node of Array.from(this._activeAudioNodes)) {
        try {
          if (typeof node.stop === 'function') node.stop();
        } catch (_) {}
        try {
          if (typeof node.disconnect === 'function') node.disconnect();
        } catch (_) {}
        if (typeof node._resolveEnded === 'function') {
          node._resolveEnded();
        }
      }
      this._activeAudioNodes.clear();
    }

    _cancelSpeech() {
      try {
        if (typeof window !== 'undefined' && window.speechSynthesis && typeof window.speechSynthesis.cancel === 'function') {
          window.speechSynthesis.cancel();
        }
      } catch (_) {}
    }

    // --- Music extension: a tiny oscillator / noise synth (beats are timed by the project tempo) ---
    _beatsToMs(beats) {
      const b = Math.max(0, Number(beats) || 0);
      return (b * 60000) / (this.musicTempo || 60);
    }

    _setTempo(bpm) {
      const v = Number(bpm);
      this.musicTempo = Math.max(20, Math.min(500, Number.isFinite(v) ? v : 60));
    }

    _playNoteSynth(midi, secs, actor) {
      if (this.muted) return;
      try {
        const ctx = this._getAudioContext();
        if (!ctx) return;
        const waves = [
          'sine', 'triangle', 'square', 'triangle', 'sawtooth', 'sine', 'triangle', 'sawtooth', 'sawtooth', 'square',
          'sawtooth', 'sine', 'sine', 'square', 'sine', 'sine', 'sine', 'triangle', 'triangle', 'square', 'sine'
        ];
        const inst = Math.max(1, Math.min(21, Math.round(Number(actor && actor.instrument) || 1)));
        const note = Math.max(0, Math.min(130, Number(midi) || 0));
        const vol = actor && actor.volume !== undefined ? Math.max(0, Math.min(1, actor.volume / 100)) : 1;
        const now = ctx.currentTime || 0;
        const dur = Math.max(0.06, secs);
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = waves[inst - 1];
        osc.frequency.setValueAtTime(440 * Math.pow(2, (note - 69) / 12), now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.16 * vol + 0.0001, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        this._activeAudioNodes.add(osc);
        osc.onended = () => {
          this._activeAudioNodes.delete(osc);
          try { osc.disconnect(); } catch (_) {}
          try { gain.disconnect(); } catch (_) {}
        };
        osc.start(now);
        osc.stop(now + dur + 0.02);
      } catch (_) {}
    }

    _playDrumSynth(drum, actor) {
      if (this.muted) return;
      try {
        const ctx = this._getAudioContext();
        if (!ctx) return;
        const id = Math.max(1, Math.min(18, Math.round(Number(drum) || 1)));
        // [tone start Hz, tone end Hz, noise high-pass Hz (0 = none), length in seconds]
        const kit = {
          1: [180, 120, 1200, 0.18], 2: [120, 45, 0, 0.25], 3: [900, 700, 0, 0.05], 4: [0, 0, 5000, 0.9],
          5: [0, 0, 7000, 0.4], 6: [0, 0, 8000, 0.08], 7: [0, 0, 6000, 0.2], 8: [0, 0, 1500, 0.15],
          9: [2500, 2500, 0, 0.06], 10: [1000, 800, 0, 0.08], 11: [560, 540, 0, 0.3], 12: [3000, 3000, 0, 0.6],
          13: [330, 280, 0, 0.18], 14: [200, 160, 0, 0.25], 15: [0, 0, 9000, 0.1], 16: [0, 0, 4000, 0.25],
          17: [0, 0, 3000, 0.5], 18: [400, 250, 0, 0.3]
        };
        const [f0, f1, hp, len] = kit[id];
        const vol = actor && actor.volume !== undefined ? Math.max(0, Math.min(1, actor.volume / 100)) : 1;
        const now = ctx.currentTime || 0;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.2 * vol + 0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + len);
        gain.connect(ctx.destination);
        const nodes = [];
        if (f0 > 0) {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f0, now);
          osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), now + len);
          osc.connect(gain);
          osc.start(now);
          osc.stop(now + len + 0.02);
          nodes.push(osc);
        }
        if (hp > 0 && typeof ctx.createBuffer === 'function' && typeof ctx.createBufferSource === 'function') {
          const frames = Math.max(1, Math.floor((ctx.sampleRate || 44100) * len));
          const buf = ctx.createBuffer(1, frames, ctx.sampleRate || 44100);
          const data = buf.getChannelData(0);
          for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
          const src = ctx.createBufferSource();
          src.buffer = buf;
          const filter = ctx.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.setValueAtTime(hp, now);
          src.connect(filter);
          filter.connect(gain);
          src.start(now);
          nodes.push(src);
        }
        for (const n of nodes) this._activeAudioNodes.add(n);
        const last = nodes[nodes.length - 1];
        if (last) {
          last.onended = () => {
            for (const n of nodes) {
              this._activeAudioNodes.delete(n);
              try { n.disconnect(); } catch (_) {}
            }
            try { gain.disconnect(); } catch (_) {}
          };
        }
      } catch (_) {}
    }

    // --- Text to Speech extension: browser speechSynthesis when available (otherwise a silent no-op) ---
    async _speak(text, scriptCtx) {
      const str = String(text === undefined || text === null ? '' : text);
      if (this.muted || !str) return;
      if (typeof window === 'undefined') return;
      const synth = window.speechSynthesis;
      const Utter = window.SpeechSynthesisUtterance || (typeof SpeechSynthesisUtterance !== 'undefined' ? SpeechSynthesisUtterance : null);
      if (!synth || !Utter || typeof synth.speak !== 'function') return;
      const voices = {
        ALTO: [1, 1],
        TENOR: [0.7, 0.95],
        SQUEAK: [1.9, 1.15],
        GIANT: [0.2, 0.75],
        KITTEN: [1.6, 1.1]
      };
      const [pitch, rate] = voices[String(this.ttsVoice).toUpperCase()] || voices.ALTO;
      await new Promise((resolve) => {
        let done = false;
        let poll = null;
        let timer = null;
        const finish = () => {
          if (done) return;
          done = true;
          if (poll) clearInterval(poll);
          if (timer) clearTimeout(timer);
          resolve();
        };
        try {
          const u = new Utter(str);
          u.lang = String(this.ttsLang || 'en');
          u.pitch = pitch;
          u.rate = rate;
          u.onend = finish;
          u.onerror = finish;
          synth.speak(u);
        } catch (_) {
          finish();
          return;
        }
        timer = setTimeout(finish, Math.max(3000, str.length * 150));
        poll = setInterval(() => {
          if (scriptCtx && scriptCtx.isStopped()) {
            this._cancelSpeech();
            finish();
          }
        }, 100);
      });
    }

    playSynthSound(soundName, actor = this.sprite) {
      if (this.muted) return Promise.resolve();
      try {
        const ctx = this._getAudioContext();
        if (!ctx) return Promise.resolve();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const now = ctx.currentTime || 0;
        const isLaser = String(soundName).toLowerCase().includes('laser');
        const pitch = actor && actor.soundEffects ? Number(actor.soundEffects.pitch) || 0 : 0;
        const pitchMult = Math.max(0.05, Math.pow(2, pitch / 120));
        const vol = actor && actor.volume !== undefined ? Math.max(0, Math.min(1, actor.volume / 100)) : 1;
        const dur = isLaser ? 0.14 : 0.1;

        osc.type = isLaser ? 'sawtooth' : 'sine';
        osc.frequency.setValueAtTime((isLaser ? 880 : 523.25) * pitchMult, now);
        if (isLaser) {
          osc.frequency.exponentialRampToValueAtTime(220 * pitchMult, now + dur);
        } else {
          osc.frequency.exponentialRampToValueAtTime(659.25 * pitchMult, now + 0.09);
        }

        gain.gain.setValueAtTime(0.15 * vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        this._activeAudioNodes.add(osc);
        return new Promise((resolve) => {
          let settled = false;
          const done = () => {
            if (settled) return;
            settled = true;
            this._activeAudioNodes.delete(osc);
            try { osc.disconnect(); } catch (_) {}
            try { gain.disconnect(); } catch (_) {}
            resolve();
          };
          osc._resolveEnded = done;
          osc.onended = done;
          const fallbackTimer = setTimeout(done, (dur + 0.05) * 1000);
          if (fallbackTimer && typeof fallbackTimer.unref === 'function') fallbackTimer.unref();
          osc.start(now);
          osc.stop(now + dur + 0.01);
        });
      } catch (_) {
        return Promise.resolve();
      }
    }

    async playProjectSound(soundName, actor = this.sprite) {
      if (this.muted) return;
      const ctx = this._getAudioContext();
      if (!ctx) return;
      const myEpoch = this._soundEpoch;

      const sName = String(soundName || '');
      let soundObj = null;
      const findInList = (sounds) => {
        if (!Array.isArray(sounds) || sounds.length === 0) return null;
        const byName = sounds.find((s) => s.name === sName);
        if (byName) return byName;
        const num = Number(sName);
        if (Number.isInteger(num) && num >= 1 && num <= sounds.length) return sounds[num - 1];
        return null;
      };

      if (actor && Array.isArray(actor.sounds)) {
        soundObj = findInList(actor.sounds);
      }
      if (!soundObj && this.projectJson && Array.isArray(this.projectJson.targets)) {
        const target = actor ? this.projectJson.targets.find((t) => t.name === actor.name) : null;
        if (target) soundObj = findInList(target.sounds);
        if (!soundObj) {
          for (const t of this.projectJson.targets) {
            soundObj = findInList(t.sounds);
            if (soundObj) break;
          }
        }
      }

      const md5ext = soundObj
        ? soundObj.md5ext || (soundObj.assetId && soundObj.dataFormat ? `${soundObj.assetId}.${soundObj.dataFormat}` : null)
        : null;
      const rawBytes = md5ext && this.assetsMap ? this.assetsMap.get(md5ext) : null;

      if (!rawBytes || typeof ctx.createBufferSource !== 'function' || typeof ctx.decodeAudioData !== 'function') {
        await this.playSynthSound(soundName, actor);
        return;
      }

      try {
        let audioBuffer = this._audioBufferCache.get(md5ext);
        if (!audioBuffer) {
          const arrayBuf =
            rawBytes instanceof ArrayBuffer
              ? rawBytes.slice(0)
              : rawBytes.buffer.slice(rawBytes.byteOffset, rawBytes.byteOffset + rawBytes.byteLength);
          audioBuffer = await ctx.decodeAudioData(arrayBuf);
          if (audioBuffer) {
            this._audioBufferCache.set(md5ext, audioBuffer);
          }
        }
        if (myEpoch !== this._soundEpoch || this.muted) return;
        if (!audioBuffer) {
          await this.playSynthSound(soundName, actor);
          return;
        }

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        const pitch = actor && actor.soundEffects ? Number(actor.soundEffects.pitch) || 0 : 0;
        if (source.playbackRate) {
          source.playbackRate.value = Math.max(0.05, Math.pow(2, pitch / 120));
        }

        const gain = ctx.createGain();
        const vol = actor && actor.volume !== undefined ? Math.max(0, Math.min(1, actor.volume / 100)) : 1;
        if (gain.gain) gain.gain.value = vol;

        const pan = actor && actor.soundEffects ? Number(actor.soundEffects.pan) || 0 : 0;
        let panner = null;
        if (pan !== 0 && typeof ctx.createStereoPanner === 'function') {
          panner = ctx.createStereoPanner();
          if (panner.pan) panner.pan.value = Math.max(-1, Math.min(1, pan / 100));
          source.connect(gain);
          gain.connect(panner);
          panner.connect(ctx.destination);
        } else {
          source.connect(gain);
          gain.connect(ctx.destination);
        }

        this._activeAudioNodes.add(source);
        await new Promise((resolve) => {
          let settled = false;
          const rate = source.playbackRate ? source.playbackRate.value : 1;
          const fallbackMs = Math.max(40, ((audioBuffer.duration || 0.2) / Math.max(0.05, rate)) * 1000 + 250);
          let fallbackTimer = null;
          const done = () => {
            if (settled) return;
            settled = true;
            if (fallbackTimer) clearTimeout(fallbackTimer);
            this._activeAudioNodes.delete(source);
            try { source.disconnect(); } catch (_) {}
            try { gain.disconnect(); } catch (_) {}
            if (panner) {
              try { panner.disconnect(); } catch (_) {}
            }
            resolve();
          };
          source._resolveEnded = done;
          source.onended = done;
          fallbackTimer = setTimeout(done, fallbackMs);
          if (fallbackTimer && typeof fallbackTimer.unref === 'function') fallbackTimer.unref();
          source.start(0);
        });
      } catch (_) {
        await this.playSynthSound(soundName, actor);
      }
    }

    syncProjectAssets(projectJson, assetsMap) {
      if (!projectJson || !Array.isArray(projectJson.targets)) return;
      this.projectJson = projectJson;
      this.assetsMap = assetsMap;

      const stage = projectJson.targets.find((t) => t.isStage);
      if (stage && Array.isArray(stage.costumes) && stage.costumes.length > 0) {
        this.backdrops = stage.costumes.map((c) => c.name);
        if (!this.backdrops.includes(this.currentBackdrop)) {
          this.currentBackdrop = this.backdrops[0];
        }
      }

      // Prune stale cached images and audio buffers no longer present in assetsMap
      if (assetsMap instanceof Map) {
        for (const key of Array.from(this.imageCache.keys())) {
          if (!assetsMap.has(key)) this.imageCache.delete(key);
        }
        for (const key of Array.from(this._audioBufferCache.keys())) {
          if (!assetsMap.has(key)) this._audioBufferCache.delete(key);
        }
      }

      if (assetsMap && typeof Image !== 'undefined') {
        for (const [md5ext, content] of assetsMap.entries()) {
          if (this.imageCache.has(md5ext)) continue;
          const lowerName = String(md5ext).toLowerCase();
          if (lowerName.endsWith('.svg') && (typeof content === 'string' || content instanceof Uint8Array)) {
            const svgText = typeof content === 'string'
              ? content
              : (typeof Sb3Bridge !== 'undefined' && Sb3Bridge.utf8BytesToString
                ? Sb3Bridge.utf8BytesToString(content)
                : new TextDecoder('utf-8').decode(content));
            const img = new Image();
            img.onload = () => this.render();
            img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(svgText);
            this.imageCache.set(md5ext, img);
          } else if (
            (lowerName.endsWith('.png') || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) &&
            content instanceof Uint8Array &&
            typeof Blob !== 'undefined' &&
            typeof URL !== 'undefined'
          ) {
            const blob = new Blob([content]);
            const objectUrl = URL.createObjectURL(blob);
            const img = new Image();
            img.onload = () => {
              URL.revokeObjectURL(objectUrl);
              this.render();
            };
            img.onerror = () => {
              URL.revokeObjectURL(objectUrl);
            };
            img.src = objectUrl;
            this.imageCache.set(md5ext, img);
          }
        }
      }
    }

    reset() {
      this.runId++;
      this.isRunning = false;
      this.startTime = Date.now();
      this._clearGreaterThanWatcher();
      this._stopAllSounds();
      this._cancelSpeech();
      this.musicTempo = 60;
      this.ttsVoice = 'ALTO';
      this.ttsLang = 'en';
      this._draggingActor = null;
      this._activeBroadcasts = new WeakMap();
      this._activeKeyHandlers = new WeakMap();
      this._activeClickHandlers = new WeakMap();
      this.hiddenMonitors = new Set();
      this.visibleMonitors = new Set();

      if (this.pendingAskResolver) {
        this.pendingAskResolver('');
        this.pendingAskResolver = null;
      }
      if (this.onAsk) this.onAsk(null);

      this.vars = {};
      this.lists = {};
      this.currentBackdrop = this.backdrops[0] || 'space_bg';
      this.actors = [];

      if (this.projectJson && Array.isArray(this.projectJson.targets)) {
        const hasStage = this.projectJson.targets.some((t) => t.isStage);
        for (const t of this.projectJson.targets) {
          if (t.isStage || !hasStage) {
            for (const [, v] of Object.entries(t.variables || {})) {
              this.vars[v[0]] = v[1];
            }
            for (const [, l] of Object.entries(t.lists || {})) {
              this.lists[l[0]] = Array.isArray(l[1]) ? [...l[1]] : [];
            }
          }
          this.actors.push(this._createActorFromTarget(t));
        }
        if (Array.isArray(this.projectJson.monitors)) {
          for (const m of this.projectJson.monitors) {
            const name = m.params && (m.params.VARIABLE || m.params.LIST);
            if (!name) continue;
            if (m.visible === false) this.hiddenMonitors.add(name);
            else this.visibleMonitors.add(name);
          }
        }
      } else {
        this.actors.push(this._createDefaultSpriteActor('Sprite1'));
      }

      const firstSprite = this.actors.find((a) => !a.isStage) || this._createDefaultSpriteActor('Sprite1');
      this.sprite = firstSprite;

      this.penCtx.clearRect(0, 0, 480, 360);
      if (this.onBackdropChange) this.onBackdropChange(this.currentBackdrop);
      this.render();
      this._emitTelemetry();
    }

    _createDefaultSpriteActor(name) {
      return {
        name,
        isStage: false,
        isClone: false,
        x: 0,
        y: 0,
        direction: 90,
        size: 100,
        visible: true,
        rotationStyle: 'all around',
        costumes: [{ name: 'costume1', md5ext: null }],
        sounds: [],
        currentCostume: 0,
        effects: { color: 0, ghost: 0, brightness: 0, fisheye: 0, whirl: 0, pixelate: 0, mosaic: 0 },
        colorEffect: 0,
        layerOrder: 1,
        draggable: false,
        soundEffects: { pitch: 0, pan: 0 },
        penDown: false,
        penColor: '#00ffcc',
        penHsl: { h: 168, s: 100, l: 50, a: 1 },
        penSize: 3,
        sayText: '',
        sayType: 'say',
        sayUntil: 0,
        volume: 100,
        localVars: {},
        localLists: {},
        _scriptGen: 0,
        _deleted: false,
        ast: [],
        procedures: {}
      };
    }

    _createActorFromTarget(t) {
      const localVars = {};
      const localLists = {};
      if (!t.isStage) {
        for (const [, v] of Object.entries(t.variables || {})) {
          localVars[v[0]] = v[1];
        }
        for (const [, l] of Object.entries(t.lists || {})) {
          localLists[l[0]] = Array.isArray(l[1]) ? [...l[1]] : [];
        }
      }
      return {
        name: t.name,
        isStage: !!t.isStage,
        isClone: false,
        x: Number(t.x) || 0,
        y: Number(t.y) || 0,
        direction: t.direction !== undefined ? Number(t.direction) : 90,
        size: t.size !== undefined ? Number(t.size) : 100,
        visible: t.visible !== undefined ? !!t.visible : true,
        rotationStyle: t.rotationStyle || 'all around',
        costumes: Array.isArray(t.costumes) ? t.costumes : [],
        sounds: Array.isArray(t.sounds) ? t.sounds : [],
        currentCostume: Number(t.currentCostume) || 0,
        effects: { color: 0, ghost: 0, brightness: 0, fisheye: 0, whirl: 0, pixelate: 0, mosaic: 0 },
        colorEffect: 0,
        layerOrder: t.layerOrder !== undefined ? Number(t.layerOrder) : (t.isStage ? 0 : 1),
        draggable: !!t.draggable,
        soundEffects: { pitch: 0, pan: 0 },
        penDown: false,
        penColor: '#00ffcc',
        penHsl: { h: 168, s: 100, l: 50, a: 1 },
        penSize: 3,
        sayText: '',
        sayType: 'say',
        sayUntil: 0,
        volume: t.volume !== undefined ? Number(t.volume) : 100,
        localVars,
        localLists,
        _scriptGen: 0,
        _deleted: false,
        ast: [],
        procedures: {}
      };
    }

    setBackdrops(names) {
      if (names && names.length > 0) {
        this.backdrops = names.map((n) => (typeof n === 'string' ? n : n.name));
        this.currentBackdrop = this.backdrops[0];
      }
    }

    toCanvasX(x) { return 240 + x; }
    toCanvasY(y) { return 180 - y; }

    _emitTelemetry(activeActor) {
      if (!this.onTelemetry) return;
      const actor = activeActor || this.sprite || this.actors.find((a) => !a.isStage);
      this.onTelemetry({
        x: actor ? Math.round(actor.x) : 0,
        y: actor ? Math.round(actor.y) : 0,
        direction: actor ? Math.round(actor.direction) : 90,
        size: actor ? Math.round(actor.size) : 100,
        visible: actor ? actor.visible : true,
        backdrop: this.currentBackdrop,
        timer: ((Date.now() - this.startTime) / 1000).toFixed(1),
        mouseX: this.mouseX,
        mouseY: this.mouseY,
        vars: { ...this.vars },
        lists: { ...this.lists },
        localVars: actor && actor.localVars ? { ...actor.localVars } : {},
        localLists: actor && actor.localLists ? { ...actor.localLists } : {},
        hiddenMonitors: Array.from(this.hiddenMonitors),
        isRunning: this.isRunning
      });
    }

    _applyGraphicEffects(ctx, actor) {
      const effects = (actor && actor.effects) || {};
      const colorVal = effects.color !== undefined ? Number(effects.color) || 0 : Number(actor && actor.colorEffect) || 0;
      const ghostVal = Number(effects.ghost) || 0;
      const brightnessVal = Number(effects.brightness) || 0;

      if (ghostVal !== 0) {
        ctx.globalAlpha = Math.max(0, Math.min(1, 1 - ghostVal / 100));
      }
      const filters = [];
      if (colorVal !== 0) {
        filters.push(`hue-rotate(${(colorVal * 3.6) % 360}deg)`);
      }
      if (brightnessVal !== 0) {
        filters.push(`brightness(${Math.max(0, 100 + brightnessVal)}%)`);
      }
      if (filters.length > 0) {
        ctx.filter = filters.join(' ');
      }
    }

    _drawActor(ctx, actor) {
      if (actor.isStage || !actor.visible) return;
      const cx = this.toCanvasX(actor.x);
      const cy = this.toCanvasY(actor.y);
      const scale = Math.max(0.05, actor.size / 100);

      let rad = ((actor.direction - 90) * Math.PI) / 180;
      let flipX = 1;
      if (actor.rotationStyle === "don't rotate") {
        rad = 0;
      } else if (actor.rotationStyle === 'left-right') {
        rad = 0;
        if (((actor.direction % 360) + 360) % 360 > 180) {
          flipX = -1;
        }
      }

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rad);
      ctx.scale(scale * flipX, scale);

      this._applyGraphicEffects(ctx, actor);

      const effects = actor.effects || {};
      const pixelateVal = Number(effects.pixelate) || 0;
      const mosaicVal = Number(effects.mosaic) || 0;

      const costumeObj = actor.costumes && actor.costumes[actor.currentCostume];
      const cachedImg = costumeObj && costumeObj.md5ext ? this.imageCache.get(costumeObj.md5ext) : null;

      if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
        const w = cachedImg.naturalWidth;
        const h = cachedImg.naturalHeight;
        const rx = costumeObj.rotationCenterX !== undefined ? costumeObj.rotationCenterX : w / 2;
        const ry = costumeObj.rotationCenterY !== undefined ? costumeObj.rotationCenterY : h / 2;

        let drawable = cachedImg;
        if (Math.abs(pixelateVal) > 0 && typeof document !== 'undefined' && typeof document.createElement === 'function') {
          const pFactor = Math.max(1, Math.min(32, Math.floor(Math.abs(pixelateVal) / 5) + 1));
          if (pFactor > 1) {
            const pw = Math.max(1, Math.floor(w / pFactor));
            const ph = Math.max(1, Math.floor(h / pFactor));
            const pCanvas = this._pixelCanvas || (this._pixelCanvas = document.createElement('canvas'));
            if (pCanvas && typeof pCanvas.getContext === 'function') {
              pCanvas.width = pw;
              pCanvas.height = ph;
              const pCtx = pCanvas.getContext('2d');
              if (pCtx && typeof pCtx.drawImage === 'function') {
                pCtx.clearRect(0, 0, pw, ph);
                pCtx.drawImage(cachedImg, 0, 0, pw, ph);
                drawable = pCanvas;
                ctx.imageSmoothingEnabled = false;
              }
            }
          }
        }

        const tiles = Math.abs(mosaicVal) >= 5 ? Math.max(1, Math.min(8, Math.floor(Math.abs(mosaicVal) / 10) + 1)) : 1;
        if (tiles > 1) {
          const tileW = w / tiles;
          const tileH = h / tiles;
          for (let tx = 0; tx < tiles; tx++) {
            for (let ty = 0; ty < tiles; ty++) {
              ctx.drawImage(drawable, -rx + tx * tileW, -ry + ty * tileH, tileW, tileH);
            }
          }
        } else {
          ctx.drawImage(drawable, -rx, -ry, w, h);
        }
      } else {
        ctx.fillStyle = '#38bdf8';
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(18, 0);
        ctx.lineTo(-12, -12);
        ctx.lineTo(-6, 0);
        ctx.lineTo(-12, 12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();

      if (actor.sayText && (actor.sayUntil === 0 || Date.now() < actor.sayUntil)) {
        const bx = Math.min(Math.max(cx + 18, 12), 290);
        const by = Math.max(cy - 36, 28);
        ctx.font = '600 12px "Outfit", -apple-system, sans-serif';
        const textWidth = ctx.measureText(actor.sayText).width;
        const w = Math.min(Math.max(textWidth + 20, 48), 220);

        ctx.fillStyle = '#f8fafc';
        ctx.strokeStyle = actor.sayType === 'think' ? '#38bdf8' : '#64748b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(bx, by - 18, w, 26, actor.sayType === 'think' ? 13 : 6);
        } else {
          ctx.rect(bx, by - 18, w, 26);
        }
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#0c1016';
        ctx.fillText(actor.sayText, bx + 10, by - 1, 200);
      }
    }

    render() {
      const ctx = this.ctx;
      if (!ctx) return;
      ctx.clearRect(0, 0, 480, 360);

      // 1. Render Stage Backdrop
      const stageTarget =
        this.projectJson && this.projectJson.targets
          ? this.projectJson.targets.find((t) => t.isStage)
          : null;
      const stageActor = this.actors.find((a) => a.isStage);
      const bgCostume =
        stageTarget && stageTarget.costumes
          ? stageTarget.costumes.find((c) => c.name === this.currentBackdrop)
          : null;
      const bgImg = bgCostume && bgCostume.md5ext ? this.imageCache.get(bgCostume.md5ext) : null;

      ctx.save();
      if (stageActor) {
        this._applyGraphicEffects(ctx, stageActor);
      }
      if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
        ctx.drawImage(bgImg, 0, 0, 480, 360);
      } else {
        const bg = this.backdropColors[this.currentBackdrop] || '#121820';
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, 480, 360);

        if (this.currentBackdrop === 'grid_bg') {
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(240, 0);
          ctx.lineTo(240, 360);
          ctx.moveTo(0, 180);
          ctx.lineTo(480, 180);
          ctx.stroke();
        }
      }
      ctx.restore();

      // 2. Render Pen layer
      ctx.drawImage(this.penCanvas, 0, 0);

      // 3. Render all visible Sprites & Clones sorted by layerOrder
      for (const actor of this._getSortedSprites()) {
        this._drawActor(ctx, actor);
      }
    }

    _prepareActorAst(actor, ast) {
      actor.ast = ast || [];
      actor.procedures = {};
      for (const node of actor.ast) {
        if (node.type === 'ProcDef') {
          actor.procedures[node.fnName] = node;
        }
      }
    }

    _createScriptCtx(actor, myRunId) {
      const ctx = {
        actor,
        runId: myRunId,
        gen: actor ? actor._scriptGen || 0 : 0,
        cancelled: false,
        isStopped: () => {
          if (ctx.cancelled) return true;
          if (this.runId !== myRunId) return true;
          if (!actor || actor._deleted) return true;
          if (ctx.gen !== (actor._scriptGen || 0)) return true;
          return false;
        }
      };
      return ctx;
    }

    _clearGreaterThanWatcher() {
      if (this._gtInterval) {
        clearInterval(this._gtInterval);
        this._gtInterval = null;
      }
    }

    _evalGreaterThanSensor(sensorName) {
      const s = String(sensorName || '').toLowerCase();
      if (s === 'timer') {
        return (Date.now() - this.startTime) / 1000;
      }
      if (s === 'loudness') {
        return 0;
      }
      return 0;
    }

    _startGreaterThanWatcher(myRunId) {
      this._clearGreaterThanWatcher();
      const hasGt = this.actors.some(
        (a) =>
          Array.isArray(a.ast) &&
          a.ast.some((h) => h.type === 'Handler' && (h.decorator === 'when_greater_than' || h.decorator === 'when_touching'))
      );
      if (!hasGt) return;

      const prevAbove = new WeakMap();
      const checkAll = () => {
        if (!this.isRunning || this.runId !== myRunId) {
          this._clearGreaterThanWatcher();
          return;
        }
        for (const actor of [...this.actors]) {
          if (actor._deleted) continue;
          let actorMap = prevAbove.get(actor);
          if (!actorMap) {
            actorMap = new Map();
            prevAbove.set(actor, actorMap);
          }
          for (const h of actor.ast || []) {
            if (h.type !== 'Handler') continue;
            if (h.decorator === 'when_touching') {
              // Edge-triggered hat: the script starts when the sprite begins to touch the object
              if (actor.isStage) continue;
              const dest = h.decArgs && h.decArgs[0] ? String(this.evalExpr(h.decArgs[0], actor, {})) : 'mouse';
              const touchingNow =
                !!actor.visible &&
                Boolean(this.evalExpr({ type: 'Call', name: 'touching', args: [{ type: 'String', value: dest }] }, actor, {}));
              const wasTouching = actorMap.get(h) || false;
              actorMap.set(h, touchingNow);
              if (touchingNow && !wasTouching) {
                const scriptCtx = this._createScriptCtx(actor, myRunId);
                this.execBlock(h.body, myRunId, actor, {}, false, scriptCtx);
              }
              continue;
            }
            if (h.decorator !== 'when_greater_than') continue;
            const arg0 = h.decArgs && h.decArgs[0];
            const sensor = arg0
              ? arg0.type === 'Var' && (arg0.name === 'timer' || arg0.name === 'loudness')
                ? arg0.name
                : this.evalExpr(arg0, actor, {})
              : 'timer';
            const threshold = h.decArgs && h.decArgs[1] ? Number(this.evalExpr(h.decArgs[1], actor, {})) : 0;
            const curVal = this._evalGreaterThanSensor(sensor);
            const isAbove = curVal > threshold;
            const wasAbove = actorMap.get(h) || false;
            actorMap.set(h, isAbove);
            if (isAbove && !wasAbove) {
              const scriptCtx = this._createScriptCtx(actor, myRunId);
              this.execBlock(h.body, myRunId, actor, {}, false, scriptCtx);
            }
          }
        }
      };

      checkAll();
      this._gtInterval = setInterval(checkAll, 50);
      if (this._gtInterval && typeof this._gtInterval.unref === 'function') {
        this._gtInterval.unref();
      }
    }

    async runAst(ast) {
      this.reset();
      this.isRunning = true;
      const myRunId = this.runId;
      this.activeAst = ast;

      const mainSprite = this.actors.find((a) => !a.isStage) || this.sprite;
      this._prepareActorAst(mainSprite, ast);

      this._emitTelemetry(mainSprite);
      const tasks = [];
      for (const h of ast) {
        if (h.type === 'Handler' && h.decorator === 'when_flag_clicked') {
          const scriptCtx = this._createScriptCtx(mainSprite, myRunId);
          tasks.push(this.execBlock(h.body, myRunId, mainSprite, {}, false, scriptCtx));
        }
      }
      this._startGreaterThanWatcher(myRunId);
      await Promise.all(tasks);
      if (this.runId === myRunId) {
        this._emitTelemetry(mainSprite);
      }
    }

    async runProject(astByTargetIdx, projectJson, assetsMap) {
      this.syncProjectAssets(projectJson, assetsMap);
      this.reset();
      this.isRunning = true;
      const myRunId = this.runId;

      this.actors.forEach((actor, idx) => {
        const ast = astByTargetIdx.get(idx) || [];
        this._prepareActorAst(actor, ast);
      });

      const tasks = [];
      for (const actor of this.actors) {
        for (const h of actor.ast) {
          if (h.type === 'Handler' && h.decorator === 'when_flag_clicked') {
            const scriptCtx = this._createScriptCtx(actor, myRunId);
            tasks.push(this.execBlock(h.body, myRunId, actor, {}, false, scriptCtx));
          }
        }
      }
      this._startGreaterThanWatcher(myRunId);
      this._emitTelemetry();
      await Promise.all(tasks);
      if (this.runId === myRunId) {
        this._emitTelemetry();
      }
    }

    _triggerBroadcastOnActor(actor, msg, myRunId) {
      if (!this._activeBroadcasts) this._activeBroadcasts = new WeakMap();
      let msgMap = this._activeBroadcasts.get(actor);
      if (!msgMap) {
        msgMap = new Map();
        this._activeBroadcasts.set(actor, msgMap);
      }
      let activeSet = msgMap.get(msg);
      if (activeSet && activeSet.size > 0) {
        for (const prevCtx of activeSet) {
          prevCtx.cancelled = true;
        }
        activeSet.clear();
      } else {
        activeSet = new Set();
        msgMap.set(msg, activeSet);
      }

      const tasks = [];
      for (const h of actor.ast || []) {
        if (h.type === 'Handler' && h.decorator === 'when_message_received') {
          const targetArg = h.decArgs && h.decArgs[0] ? String(h.decArgs[0].value) : '';
          if (targetArg !== msg) continue;
          const scriptCtx = this._createScriptCtx(actor, myRunId);
          activeSet.add(scriptCtx);
          const p = this.execBlock(h.body, myRunId, actor, {}, false, scriptCtx).finally(() => {
            activeSet.delete(scriptCtx);
          });
          tasks.push(p);
        }
      }
      return tasks;
    }

    _triggerHandlersOnActor(actor, decorator, argMatch, myRunId) {
      if (decorator === 'when_message_received' && argMatch !== null) {
        return this._triggerBroadcastOnActor(actor, argMatch, myRunId);
      }
      const tasks = [];
      for (const h of actor.ast || []) {
        if (h.type === 'Handler' && h.decorator === decorator) {
          if (argMatch !== null) {
            const targetArg = h.decArgs && h.decArgs[0] ? String(h.decArgs[0].value) : '';
            if (targetArg !== argMatch && !(decorator === 'when_key_pressed' && targetArg === 'any')) {
              continue;
            }
          }
          if (decorator === 'when_key_pressed') {
            let keyMap = this._activeKeyHandlers.get(actor);
            if (!keyMap) {
              keyMap = new Map();
              this._activeKeyHandlers.set(actor, keyMap);
            }
            const prevCtx = keyMap.get(h);
            if (prevCtx && !prevCtx.isStopped()) {
              continue;
            }
            const scriptCtx = this._createScriptCtx(actor, myRunId);
            keyMap.set(h, scriptCtx);
            const p = this.execBlock(h.body, myRunId, actor, {}, false, scriptCtx).finally(() => {
              if (keyMap.get(h) === scriptCtx) keyMap.delete(h);
            });
            tasks.push(p);
            continue;
          }
          if (decorator === 'when_this_sprite_clicked' || decorator === 'when_stage_clicked') {
            let clickMap = this._activeClickHandlers.get(actor);
            if (!clickMap) {
              clickMap = new Map();
              this._activeClickHandlers.set(actor, clickMap);
            }
            const prevCtx = clickMap.get(h);
            if (prevCtx) prevCtx.cancelled = true;
            const scriptCtx = this._createScriptCtx(actor, myRunId);
            clickMap.set(h, scriptCtx);
            const p = this.execBlock(h.body, myRunId, actor, {}, false, scriptCtx).finally(() => {
              if (clickMap.get(h) === scriptCtx) clickMap.delete(h);
            });
            tasks.push(p);
            continue;
          }
          const scriptCtx = this._createScriptCtx(actor, myRunId);
          tasks.push(this.execBlock(h.body, myRunId, actor, {}, false, scriptCtx));
        }
      }
      return tasks;
    }

    triggerKey(key) {
      if (!this.isRunning && (this.activeAst || this.actors.some((a) => a.ast && a.ast.length > 0))) {
        this.isRunning = true;
      }
      const myRunId = this.runId;
      for (const actor of [...this.actors]) {
        if (actor._deleted) continue;
        this._triggerHandlersOnActor(actor, 'when_key_pressed', key, myRunId);
      }
    }

    triggerBackdrop(bgName) {
      const myRunId = this.runId;
      const tasks = [];
      for (const actor of [...this.actors]) {
        if (actor._deleted) continue;
        tasks.push(...this._triggerHandlersOnActor(actor, 'when_backdrop_switches', bgName, myRunId));
      }
      return Promise.all(tasks);
    }

    triggerBroadcast(msg) {
      const myRunId = this.runId;
      const tasks = [];
      for (const actor of [...this.actors]) {
        if (actor._deleted) continue;
        tasks.push(...this._triggerBroadcastOnActor(actor, msg, myRunId));
      }
      return Promise.all(tasks);
    }

    _resolveVarAccess(name, isLocalFlag, actor, localScope, forWrite = false) {
      const strName = String(name || '');
      const rawName = strName.startsWith('self.') ? strName.slice(5) : strName;
      const isExplicitLocal = Boolean(isLocalFlag || strName.startsWith('self.'));
      if (!forWrite && !isExplicitLocal && localScope && Object.prototype.hasOwnProperty.call(localScope, rawName)) {
        return { target: 'scope', name: rawName };
      }
      if (
        actor &&
        !actor.isStage &&
        actor.localVars &&
        (isExplicitLocal || Object.prototype.hasOwnProperty.call(actor.localVars, rawName))
      ) {
        return { target: 'local', name: rawName };
      }
      return { target: 'global', name: rawName };
    }

    _getListContainer(actor, listName, forceLocal = false, createIfMissing = false) {
      if (forceLocal) {
        if (actor && !actor.isStage) {
          if (!actor.localLists) actor.localLists = {};
          if (createIfMissing && !Array.isArray(actor.localLists[listName])) {
            actor.localLists[listName] = [];
          }
          return actor.localLists;
        }
        if (createIfMissing && !Array.isArray(this.lists[listName])) {
          this.lists[listName] = [];
        }
        return this.lists;
      }
      if (
        actor &&
        !actor.isStage &&
        actor.localLists &&
        Object.prototype.hasOwnProperty.call(actor.localLists, listName)
      ) {
        return actor.localLists;
      }
      if (createIfMissing && !Array.isArray(this.lists[listName])) {
        this.lists[listName] = [];
      }
      return this.lists;
    }

    _listItem(arr, rawIdx) {
      if (!Array.isArray(arr) || arr.length === 0) return '';
      const key = String(rawIdx);
      if (key === 'last') return arr[arr.length - 1];
      if (key === 'random' || key === 'any') return arr[Math.floor(Math.random() * arr.length)];
      if (key === 'all') return arr.join(' ');
      const idx = Math.floor(Number(rawIdx)) - 1;
      return Number.isFinite(idx) && idx >= 0 && idx < arr.length ? arr[idx] : '';
    }

    _listIndexOf(arr, item) {
      if (!Array.isArray(arr) || arr.length === 0) return 0;
      const target = String(item);
      let idx = arr.findIndex((el) => String(el) === target);
      if (idx < 0) idx = arr.findIndex((el) => String(el).toLowerCase() === target.toLowerCase());
      return idx >= 0 ? idx + 1 : 0;
    }

    _listDelete(container, listName, rawIdx) {
      const arr = container[listName];
      if (!Array.isArray(arr)) return;
      const key = String(rawIdx);
      if (key === 'all') {
        container[listName] = [];
        return;
      }
      if (key === 'last') {
        if (arr.length > 0) arr.pop();
        return;
      }
      if (key === 'random' || key === 'any') {
        if (arr.length > 0) arr.splice(Math.floor(Math.random() * arr.length), 1);
        return;
      }
      const idx = Math.floor(Number(rawIdx)) - 1;
      if (Number.isFinite(idx) && idx >= 0 && idx < arr.length) arr.splice(idx, 1);
    }

    _listInsert(arr, rawIdx, val) {
      if (!Array.isArray(arr)) return;
      const key = String(rawIdx);
      if (key === 'last') {
        arr.push(val);
        return;
      }
      if (key === 'random' || key === 'any') {
        arr.splice(Math.floor(Math.random() * (arr.length + 1)), 0, val);
        return;
      }
      const num = Math.floor(Number(rawIdx));
      if (!Number.isFinite(num)) return;
      const idx = Math.max(0, Math.min(arr.length, num - 1));
      arr.splice(idx, 0, val);
    }

    _listReplace(arr, rawIdx, val) {
      if (!Array.isArray(arr) || arr.length === 0) return;
      const key = String(rawIdx);
      if (key === 'last') {
        arr[arr.length - 1] = val;
        return;
      }
      if (key === 'random' || key === 'any') {
        arr[Math.floor(Math.random() * arr.length)] = val;
        return;
      }
      if (key === 'all') {
        for (let i = 0; i < arr.length; i++) arr[i] = val;
        return;
      }
      const idx = Math.floor(Number(rawIdx)) - 1;
      if (Number.isFinite(idx) && idx >= 0 && idx < arr.length) arr[idx] = val;
    }

    _parseColorToRgb(color) {
      const s = String(color || '').trim();
      let m = /^#([0-9a-f]{6})$/i.exec(s);
      if (m) {
        const n = parseInt(m[1], 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
      }
      m = /^#([0-9a-f]{3})$/i.exec(s);
      if (m) {
        return [
          parseInt(m[1][0] + m[1][0], 16),
          parseInt(m[1][1] + m[1][1], 16),
          parseInt(m[1][2] + m[1][2], 16)
        ];
      }
      m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(s);
      if (m) {
        return [Number(m[1]), Number(m[2]), Number(m[3])];
      }
      return null;
    }

    _rgbToHsl(r, g, b) {
      const rn = r / 255;
      const gn = g / 255;
      const bn = b / 255;
      const max = Math.max(rn, gn, bn);
      const min = Math.min(rn, gn, bn);
      const l = (max + min) / 2;
      let h = 0;
      let s = 0;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
        else if (max === gn) h = (bn - rn) / d + 2;
        else h = (rn - gn) / d + 4;
        h *= 60;
      }
      return { h, s: s * 100, l: l * 100, a: 1 };
    }

    _syncPenColorFromHsl(actor) {
      const hsl = actor.penHsl || (actor.penHsl = { h: 168, s: 100, l: 50, a: 1 });
      const h = Math.round(((hsl.h % 360) + 360) % 360);
      const s = Math.round(Math.max(0, Math.min(100, hsl.s)));
      const l = Math.round(Math.max(0, Math.min(100, hsl.l)));
      const a = Number(Math.max(0, Math.min(1, hsl.a)).toFixed(3));
      actor.penColor = `hsla(${h}, ${s}%, ${l}%, ${a})`;
    }

    _colorsMatch(r1, g1, b1, r2, g2, b2) {
      return Math.abs(r1 - r2) <= 16 && Math.abs(g1 - g2) <= 16 && Math.abs(b1 - b2) <= 16;
    }

    _getActorPixelBox(actor) {
      const cx = Math.round(this.toCanvasX(actor.x));
      const cy = Math.round(this.toCanvasY(actor.y));
      const { halfW, halfH } = this._getActorHalfSize(actor);
      const pad = 4;
      const x0 = Math.max(0, Math.floor(cx - halfW - pad));
      const y0 = Math.max(0, Math.floor(cy - halfH - pad));
      const x1 = Math.min(480, Math.ceil(cx + halfW + pad));
      const y1 = Math.min(360, Math.ceil(cy + halfH + pad));
      return {
        x0,
        y0,
        sw: Math.max(0, x1 - x0),
        sh: Math.max(0, y1 - y0)
      };
    }

    _resolveTargetPoint(dest) {
      if (dest === 'random' || dest === '_random_') {
        return {
          x: Math.floor(Math.random() * 440) - 220,
          y: Math.floor(Math.random() * 320) - 160
        };
      }
      if (dest === 'mouse' || dest === '_mouse_') {
        return { x: this.mouseX, y: this.mouseY };
      }
      const other =
        this.actors.find((a) => !a.isClone && a.name === dest) ||
        this.actors.find((a) => a.name === dest);
      if (other) {
        return { x: other.x, y: other.y };
      }
      return null;
    }

    _applySwitchBackdrop(bgArg) {
      const bg = String(bgArg);
      if (bg === 'next backdrop' && this.backdrops.length > 0) {
        const idx = (this.backdrops.indexOf(this.currentBackdrop) + 1) % this.backdrops.length;
        this.currentBackdrop = this.backdrops[idx];
      } else if (bg === 'previous backdrop' && this.backdrops.length > 0) {
        const idx = (this.backdrops.indexOf(this.currentBackdrop) - 1 + this.backdrops.length) % this.backdrops.length;
        this.currentBackdrop = this.backdrops[idx];
      } else if (bg === 'random backdrop' && this.backdrops.length > 0) {
        this.currentBackdrop = this.backdrops[Math.floor(Math.random() * this.backdrops.length)];
      } else if (!this.backdrops.includes(bg) && typeof bgArg === 'number' && this.backdrops.length > 0 && bgArg >= 1) {
        this.currentBackdrop = this.backdrops[(Math.floor(bgArg) - 1) % this.backdrops.length];
      } else {
        this.currentBackdrop = bg;
      }
      if (this.onBackdropChange) this.onBackdropChange(this.currentBackdrop);
    }

    _toNumericIfValid(val) {
      if (typeof val === 'number') return Number.isFinite(val) ? val : NaN;
      if (typeof val === 'boolean' || val === null || val === undefined) return NaN;
      const s = String(val).trim();
      if (s === '') return NaN;
      const n = Number(s);
      return Number.isFinite(n) ? n : NaN;
    }

    _equalsValues(a, b) {
      const na = this._toNumericIfValid(a);
      const nb = this._toNumericIfValid(b);
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return na === nb;
      if (typeof a === 'boolean' || typeof b === 'boolean') {
        return String(a).toLowerCase() === String(b).toLowerCase();
      }
      return String(a).toLowerCase() === String(b).toLowerCase();
    }

    _compareValues(a, b) {
      const na = this._toNumericIfValid(a);
      const nb = this._toNumericIfValid(b);
      if (!Number.isNaN(na) && !Number.isNaN(nb)) {
        return na < nb ? -1 : na > nb ? 1 : 0;
      }
      const sa = String(a).toLowerCase();
      const sb = String(b).toLowerCase();
      return sa < sb ? -1 : sa > sb ? 1 : 0;
    }

    evalExpr(expr, actor = this.sprite, localScope = {}) {
      if (!expr) return 0;
      switch (expr.type) {
        case 'Number':
          return expr.value;
        case 'String':
          return expr.value;
        case 'Bool':
          return expr.value;
        case 'Var': {
          const acc = this._resolveVarAccess(expr.name, expr.isLocal, actor, localScope, false);
          if (acc.target === 'scope') return localScope[acc.name];
          if (acc.target === 'local') {
            return actor.localVars[acc.name] !== undefined ? actor.localVars[acc.name] : 0;
          }
          return this.vars[acc.name] !== undefined ? this.vars[acc.name] : 0;
        }
        case 'UnaryOp':
          if (expr.op === '-') return -Number(this.evalExpr(expr.expr, actor, localScope));
          if (expr.op === 'not') return !this.evalExpr(expr.expr, actor, localScope);
          return 0;
        case 'BinOp': {
          const l = this.evalExpr(expr.left, actor, localScope);
          const r = this.evalExpr(expr.right, actor, localScope);
          switch (expr.op) {
            case '+': return Number(l) + Number(r);
            case '-': return Number(l) - Number(r);
            case '*': return Number(l) * Number(r);
            case '/': return Number(r) === 0 ? 0 : Number(l) / Number(r);
            case '%': return Number(r) === 0 ? 0 : Number(l) % Number(r);
            case '==': return this._equalsValues(l, r);
            case '!=': return !this._equalsValues(l, r);
            case '<': return this._compareValues(l, r) < 0;
            case '>': return this._compareValues(l, r) > 0;
            case '<=': return this._compareValues(l, r) <= 0;
            case '>=': return this._compareValues(l, r) >= 0;
            case 'and': return Boolean(l && r);
            case 'or': return Boolean(l || r);
          }
          return 0;
        }
        case 'Call': {
          const evalArg = (i) => this.evalExpr(expr.args[i], actor, localScope);
          switch (expr.name) {
            case 'x_position': return Math.round(actor.x);
            case 'y_position': return Math.round(actor.y);
            case 'direction': return Math.round(actor.direction);
            case 'size': return Math.round(actor.size);
            case 'costume_number': return (actor.currentCostume || 0) + 1;
            case 'costume_name': {
              const c = actor.costumes && actor.costumes[actor.currentCostume];
              return c ? c.name : 'costume1';
            }
            case 'backdrop_name': return this.currentBackdrop;
            case 'backdrop_number': return Math.max(1, this.backdrops.indexOf(this.currentBackdrop) + 1);
            case 'volume': return actor.volume;
            case 'answer': return this.answerValue;
            case 'mouse_x': return this.mouseX;
            case 'mouse_y': return this.mouseY;
            case 'mouse_down': return this.mouseDown;
            case 'timer': return Number(((Date.now() - this.startTime) / 1000).toFixed(2));
            case 'loudness': return 0;
            case 'tempo': return this.musicTempo;
            case 'language': return 'en';
            case 'translate': return String(evalArg(0));
            case 'username': return 'player';
            case 'days_since_2000':
              return (Date.now() - Date.UTC(2000, 0, 1, 0, 0, 0)) / 86400000;
            case 'current_time':
            case 'current': {
              const d = new Date();
              const unit = String(evalArg(0)).toLowerCase();
              if (unit === 'year') return d.getFullYear();
              if (unit === 'month') return d.getMonth() + 1;
              if (unit === 'date') return d.getDate();
              if (unit === 'dayofweek') return d.getDay() + 1;
              if (unit === 'hour') return d.getHours();
              if (unit === 'minute') return d.getMinutes();
              if (unit === 'second') return d.getSeconds();
              return 0;
            }
            case 'attribute_of': {
              const attr = String(evalArg(0));
              const targetName = String(evalArg(1));
              const target =
                targetName === '_stage_' || targetName.toLowerCase() === 'stage'
                  ? this.actors.find((a) => a.isStage)
                  : this.actors.find((a) => !a.isClone && a.name === targetName) ||
                    this.actors.find((a) => a.name === targetName);
              if (!target) return 0;
              if (target.isStage) {
                if (attr === 'backdrop #' || attr === 'backdrop number') {
                  return Math.max(1, this.backdrops.indexOf(this.currentBackdrop) + 1);
                }
                if (attr === 'backdrop name') return this.currentBackdrop;
                if (attr === 'volume') return target.volume;
                return Object.prototype.hasOwnProperty.call(this.vars, attr) ? this.vars[attr] : 0;
              }
              if (attr === 'x position') return Math.round(target.x);
              if (attr === 'y position') return Math.round(target.y);
              if (attr === 'direction') return Math.round(target.direction);
              if (attr === 'costume #' || attr === 'costume number') return (target.currentCostume || 0) + 1;
              if (attr === 'costume name') {
                const c = target.costumes && target.costumes[target.currentCostume];
                return c ? c.name : '';
              }
              if (attr === 'size') return Math.round(target.size);
              if (attr === 'volume') return target.volume;
              if (target.localVars && Object.prototype.hasOwnProperty.call(target.localVars, attr)) {
                return target.localVars[attr];
              }
              return Object.prototype.hasOwnProperty.call(this.vars, attr) ? this.vars[attr] : 0;
            }
            case 'random': {
              const a = Number(evalArg(0));
              const b = Number(evalArg(1));
              const min = Math.min(a, b);
              const max = Math.max(a, b);
              return Math.floor(Math.random() * (max - min + 1)) + min;
            }
            case 'join': return String(evalArg(0)) + String(evalArg(1));
            case 'letter_of': {
              const idx = Math.floor(Number(evalArg(0))) - 1;
              const s = String(evalArg(1));
              return idx >= 0 && idx < s.length ? s[idx] : '';
            }
            case 'length_of': return String(evalArg(0)).length;
            case 'len': {
              const v = evalArg(0);
              return Array.isArray(v) ? v.length : String(v).length;
            }
            case 'contains':
              return String(evalArg(0)).toLowerCase().includes(String(evalArg(1)).toLowerCase());
            case 'round_num':
            case 'round':
              return Math.round(Number(evalArg(0)));
            case 'abs': return Math.abs(Number(evalArg(0)));
            case 'floor': return Math.floor(Number(evalArg(0)));
            case 'ceil':
            case 'ceiling': return Math.ceil(Number(evalArg(0)));
            case 'sqrt': return Math.sqrt(Math.max(0, Number(evalArg(0))));
            case 'sin': return Number(Math.sin((Number(evalArg(0)) * Math.PI) / 180).toFixed(4));
            case 'cos': return Number(Math.cos((Number(evalArg(0)) * Math.PI) / 180).toFixed(4));
            case 'tan': return Number(Math.tan((Number(evalArg(0)) * Math.PI) / 180).toFixed(4));
            case 'asin': return (Math.asin(Number(evalArg(0))) * 180) / Math.PI;
            case 'acos': return (Math.acos(Number(evalArg(0))) * 180) / Math.PI;
            case 'atan': return (Math.atan(Number(evalArg(0))) * 180) / Math.PI;
            case 'ln': return Math.log(Number(evalArg(0)));
            case 'log': return Math.log10(Number(evalArg(0)));
            case 'exp': return Math.exp(Number(evalArg(0)));
            case 'pow10': return Math.pow(10, Number(evalArg(0)));
            case 'math_op': {
              const op = String(evalArg(0));
              const v = Number(evalArg(1));
              if (op === 'abs') return Math.abs(v);
              if (op === 'floor') return Math.floor(v);
              if (op === 'ceiling' || op === 'ceil') return Math.ceil(v);
              if (op === 'sqrt') return Math.sqrt(Math.max(0, v));
              if (op === 'sin') return Number(Math.sin((v * Math.PI) / 180).toFixed(10));
              if (op === 'cos') return Number(Math.cos((v * Math.PI) / 180).toFixed(10));
              if (op === 'tan') return Number(Math.tan((v * Math.PI) / 180).toFixed(10));
              if (op === 'asin') return (Math.asin(v) * 180) / Math.PI;
              if (op === 'acos') return (Math.acos(v) * 180) / Math.PI;
              if (op === 'atan') return (Math.atan(v) * 180) / Math.PI;
              if (op === 'ln') return Math.log(v);
              if (op === 'log') return Math.log10(v);
              if (op === 'e ^') return Math.exp(v);
              if (op === '10 ^') return Math.pow(10, v);
              return v;
            }
            case 'key_pressed': {
              const k = String(evalArg(0));
              if (k === 'any') return this.pressedKeys.size > 0;
              return this.pressedKeys.has(k);
            }
            case 'touching': {
              const target = String(evalArg(0));
              if (target === 'edge' || target === '_edge_') {
                const { halfW, halfH } = this._getActorHalfSize(actor);
                return Math.abs(actor.x) >= 240 - halfW || Math.abs(actor.y) >= 180 - halfH;
              }
              if (target === 'mouse' || target === '_mouse_') {
                return Math.hypot(actor.x - this.mouseX, actor.y - this.mouseY) <= 24 * (actor.size / 100);
              }
              const matches = this.actors.filter((a) => a !== actor && !a.isStage && a.name === target && a.visible);
              return matches.some(
                (other) => Math.hypot(actor.x - other.x, actor.y - other.y) <= 32 * ((actor.size + other.size) / 200)
              );
            }
            case 'touching_color': {
              if (!this.ctx || typeof this.ctx.getImageData !== 'function' || !actor || !actor.visible) return false;
              const targetRgb = this._parseColorToRgb(evalArg(0));
              if (!targetRgb) return false;
              const { x0, y0, sw, sh } = this._getActorPixelBox(actor);
              if (sw <= 0 || sh <= 0) return false;
              try {
                const img = this.ctx.getImageData(x0, y0, sw, sh);
                const data = img && img.data;
                if (!data) return false;
                for (let i = 0; i < data.length; i += 4) {
                  if (
                    data[i + 3] > 0 &&
                    this._colorsMatch(data[i], data[i + 1], data[i + 2], targetRgb[0], targetRgb[1], targetRgb[2])
                  ) {
                    return true;
                  }
                }
              } catch (_) {
                return false;
              }
              return false;
            }
            case 'color_is_touching_color': {
              if (!this.ctx || typeof this.ctx.getImageData !== 'function' || !actor || !actor.visible) return false;
              const rgb1 = this._parseColorToRgb(evalArg(0));
              const rgb2 = this._parseColorToRgb(evalArg(1));
              if (!rgb1 || !rgb2) return false;
              const { x0, y0, sw, sh } = this._getActorPixelBox(actor);
              if (sw <= 0 || sh <= 0) return false;
              try {
                const img = this.ctx.getImageData(x0, y0, sw, sh);
                const data = img && img.data;
                if (!data) return false;
                const sameColor = this._colorsMatch(rgb1[0], rgb1[1], rgb1[2], rgb2[0], rgb2[1], rgb2[2]);
                for (let py = 0; py < sh; py++) {
                  for (let px = 0; px < sw; px++) {
                    const idx = (py * sw + px) * 4;
                    if (data[idx + 3] === 0) continue;
                    if (!this._colorsMatch(data[idx], data[idx + 1], data[idx + 2], rgb1[0], rgb1[1], rgb1[2])) continue;
                    for (let dy = -2; dy <= 2; dy++) {
                      const ny = py + dy;
                      if (ny < 0 || ny >= sh) continue;
                      for (let dx = -2; dx <= 2; dx++) {
                        if (!sameColor && dx === 0 && dy === 0) continue;
                        const nx = px + dx;
                        if (nx < 0 || nx >= sw) continue;
                        const nIdx = (ny * sw + nx) * 4;
                        if (
                          data[nIdx + 3] > 0 &&
                          this._colorsMatch(data[nIdx], data[nIdx + 1], data[nIdx + 2], rgb2[0], rgb2[1], rgb2[2])
                        ) {
                          return true;
                        }
                      }
                    }
                  }
                }
              } catch (_) {
                return false;
              }
              return false;
            }
            case 'distance_to': {
              const target = String(evalArg(0));
              if (target === 'mouse' || target === '_mouse_') {
                return Math.round(Math.hypot(actor.x - this.mouseX, actor.y - this.mouseY));
              }
              const other =
                this.actors.find((a) => !a.isClone && a.name === target) ||
                this.actors.find((a) => a.name === target);
              if (other) {
                return Math.round(Math.hypot(actor.x - other.x, actor.y - other.y));
              }
              return 0;
            }
            case 'list_item':
            case 'local_list_item': {
              const forceLocal = expr.name.startsWith('local_');
              const listName = String(evalArg(0));
              const container = this._getListContainer(actor, listName, forceLocal, false);
              return this._listItem(container[listName] || [], evalArg(1));
            }
            case 'list_length':
            case 'local_list_length': {
              const forceLocal = expr.name.startsWith('local_');
              const listName = String(evalArg(0));
              const container = this._getListContainer(actor, listName, forceLocal, false);
              const arr = container[listName] || [];
              return arr.length;
            }
            case 'list_contains':
            case 'local_list_contains': {
              const forceLocal = expr.name.startsWith('local_');
              const listName = String(evalArg(0));
              const container = this._getListContainer(actor, listName, forceLocal, false);
              const arr = container[listName] || [];
              const item = String(evalArg(1));
              return arr.some((el) => String(el) === item || String(el).toLowerCase() === item.toLowerCase());
            }
            case 'list_index_of':
            case 'local_list_index_of': {
              const forceLocal = expr.name.startsWith('local_');
              const listName = String(evalArg(0));
              const container = this._getListContainer(actor, listName, forceLocal, false);
              return this._listIndexOf(container[listName] || [], evalArg(1));
            }
          }
          return 0;
        }
      }
      return 0;
    }

    moveActorTo(actor, nx, ny) {
      const safeX = Number.isFinite(Number(nx)) ? Number(nx) : 0;
      const safeY = Number.isFinite(Number(ny)) ? Number(ny) : 0;
      const clampedX = Math.max(-240, Math.min(240, safeX));
      const clampedY = Math.max(-180, Math.min(180, safeY));
      if (actor.penDown) {
        this.penCtx.strokeStyle = actor.penColor;
        this.penCtx.lineWidth = actor.penSize;
        this.penCtx.lineCap = 'round';
        this.penCtx.lineJoin = 'round';
        this.penCtx.beginPath();
        this.penCtx.moveTo(this.toCanvasX(actor.x), this.toCanvasY(actor.y));
        this.penCtx.lineTo(this.toCanvasX(clampedX), this.toCanvasY(clampedY));
        this.penCtx.stroke();
      }
      actor.x = clampedX;
      actor.y = clampedY;
    }

    _toBoolean(v) {
      if (typeof v === 'string') return !(v === '' || v === '0' || v.toLowerCase() === 'false');
      if (typeof v === 'number') return v !== 0 && !Number.isNaN(v);
      return Boolean(v);
    }

    sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    async _sleepCancellable(ms, scriptCtx) {
      if (ms <= 0) return !(scriptCtx && scriptCtx.isStopped());
      const end = Date.now() + ms;
      while (true) {
        if (scriptCtx && scriptCtx.isStopped()) return false;
        const remaining = end - Date.now();
        if (remaining <= 0) return true;
        await this.sleep(Math.min(50, remaining));
      }
    }

    async _glideToCoords(actor, secs, targetX, targetY, warpMode, scriptCtx) {
      const safeSecs = Number(secs);
      const safeTargetX = Number.isFinite(Number(targetX)) ? Number(targetX) : actor.x;
      const safeTargetY = Number.isFinite(Number(targetY)) ? Number(targetY) : actor.y;
      if (!(safeSecs > 0)) {
        this.moveActorTo(actor, safeTargetX, safeTargetY);
        return true;
      }
      const startX = actor.x;
      const startY = actor.y;
      const steps = Math.max(1, Math.floor((safeSecs * 1000) / 16));
      for (let i = 1; i <= steps; i++) {
        if (scriptCtx && scriptCtx.isStopped()) return false;
        const t = i / steps;
        this.moveActorTo(actor, startX + (safeTargetX - startX) * t, startY + (safeTargetY - startY) * t);
        if (!warpMode) this.render();
        const ok = await this._sleepCancellable(16, scriptCtx);
        if (!ok) return false;
      }
      return true;
    }

    async execBlock(stmts, myRunId, actor = this.sprite, localScope = {}, warpMode = false, scriptCtx = null) {
      if (!scriptCtx) scriptCtx = this._createScriptCtx(actor, myRunId);
      let warpYieldAt = Date.now() + 500;

      for (const stmt of stmts) {
        if (scriptCtx.isStopped()) return 'RETURN_SCRIPT';

        if (stmt.type === 'Pass') {
          continue;
        } else if (stmt.type === 'Assign') {
          const val = this.evalExpr(stmt.value, actor, localScope);
          const acc = this._resolveVarAccess(stmt.name, stmt.isLocal, actor, localScope, true);
          if (acc.target === 'local') {
            if (!actor.localVars) actor.localVars = {};
            actor.localVars[acc.name] = val;
          } else {
            this.vars[acc.name] = val;
          }
        } else if (stmt.type === 'ChangeVar') {
          const delta = Number(this.evalExpr(stmt.value, actor, localScope));
          const acc = this._resolveVarAccess(stmt.name, stmt.isLocal, actor, localScope, true);
          if (acc.target === 'local') {
            if (!actor.localVars) actor.localVars = {};
            actor.localVars[acc.name] = (Number(actor.localVars[acc.name]) || 0) + delta;
          } else {
            this.vars[acc.name] = (Number(this.vars[acc.name]) || 0) + delta;
          }
        } else if (stmt.type === 'Repeat') {
          const count = Math.max(0, Math.floor(Number(this.evalExpr(stmt.count, actor, localScope))));
          const hasPrevLoopVar = stmt.loopVar && Object.prototype.hasOwnProperty.call(localScope, stmt.loopVar);
          const prevLoopVal = hasPrevLoopVar ? localScope[stmt.loopVar] : undefined;
          for (let i = 0; i < count; i++) {
            if (scriptCtx.isStopped()) {
              if (stmt.loopVar) {
                if (hasPrevLoopVar) localScope[stmt.loopVar] = prevLoopVal;
                else delete localScope[stmt.loopVar];
              }
              return 'RETURN_SCRIPT';
            }
            if (stmt.loopVar) {
              localScope[stmt.loopVar] = i;
            }
            const res = await this.execBlock(stmt.body, myRunId, actor, localScope, warpMode, scriptCtx);
            if (res === 'RETURN_SCRIPT' || scriptCtx.isStopped()) {
              if (stmt.loopVar) {
                if (hasPrevLoopVar) localScope[stmt.loopVar] = prevLoopVal;
                else delete localScope[stmt.loopVar];
              }
              return 'RETURN_SCRIPT';
            }
            if (!warpMode) {
              this.render();
              this._emitTelemetry(actor);
              await this.sleep(16);
            } else if (Date.now() > warpYieldAt) {
              await this.sleep(0);
              warpYieldAt = Date.now() + 500;
            }
          }
          if (stmt.loopVar) {
            if (hasPrevLoopVar) localScope[stmt.loopVar] = prevLoopVal;
            else delete localScope[stmt.loopVar];
          }
        } else if (stmt.type === 'Forever') {
          while (!scriptCtx.isStopped()) {
            const res = await this.execBlock(stmt.body, myRunId, actor, localScope, warpMode, scriptCtx);
            if (res === 'RETURN_SCRIPT' || scriptCtx.isStopped()) return 'RETURN_SCRIPT';
            if (!warpMode) {
              this.render();
              this._emitTelemetry(actor);
            }
            await this.sleep(16);
          }
          return 'RETURN_SCRIPT';
        } else if (stmt.type === 'RepeatUntil') {
          while (!scriptCtx.isStopped() && !this.evalExpr(stmt.cond, actor, localScope)) {
            const res = await this.execBlock(stmt.body, myRunId, actor, localScope, warpMode, scriptCtx);
            if (res === 'RETURN_SCRIPT' || scriptCtx.isStopped()) return 'RETURN_SCRIPT';
            if (!warpMode) {
              this.render();
              this._emitTelemetry(actor);
              await this.sleep(16);
            } else if (Date.now() > warpYieldAt) {
              await this.sleep(0);
              warpYieldAt = Date.now() + 500;
            }
          }
          if (scriptCtx.isStopped()) return 'RETURN_SCRIPT';
        } else if (stmt.type === 'If') {
          if (this.evalExpr(stmt.cond, actor, localScope)) {
            const res = await this.execBlock(stmt.thenBody, myRunId, actor, localScope, warpMode, scriptCtx);
            if (res === 'RETURN_SCRIPT') return 'RETURN_SCRIPT';
          } else if (stmt.elseBody) {
            const res = await this.execBlock(stmt.elseBody, myRunId, actor, localScope, warpMode, scriptCtx);
            if (res === 'RETURN_SCRIPT') return 'RETURN_SCRIPT';
          }
        } else if (stmt.type === 'Call') {
          const stopSignal = await this.execCall(stmt, myRunId, actor, localScope, warpMode, scriptCtx);
          if (stopSignal === 'RETURN_SCRIPT' || scriptCtx.isStopped()) return 'RETURN_SCRIPT';
        }
        if (!warpMode) {
          this.render();
          this._emitTelemetry(actor);
        }
      }
    }

    async execCall(stmt, myRunId, actor = this.sprite, localScope = {}, warpMode = false, scriptCtx = null) {
      if (!scriptCtx) scriptCtx = this._createScriptCtx(actor, myRunId);
      const arg = (i) => this.evalExpr(stmt.args[i], actor, localScope);

      if (actor.procedures && actor.procedures[stmt.name]) {
        const proc = actor.procedures[stmt.name];
        const childScope = { ...localScope };
        proc.params.forEach((pName, idx) => {
          const v = arg(idx);
          childScope[pName] = proc.paramTypes && proc.paramTypes[idx] === 'bool' ? this._toBoolean(v) : v;
        });
        const isWarp = Boolean(warpMode || proc.warp);
        const res = await this.execBlock(proc.body, myRunId, actor, childScope, isWarp, scriptCtx);
        if (!warpMode && proc.warp) {
          this.render();
          this._emitTelemetry(actor);
        }
        if (res === 'RETURN_SCRIPT') return 'RETURN_SCRIPT';
        return;
      }

      switch (stmt.name) {
        case 'move': {
          const steps = Number(arg(0));
          const rad = ((actor.direction - 90) * Math.PI) / 180;
          this.moveActorTo(
            actor,
            actor.x + Math.cos(rad) * steps,
            actor.y - Math.sin(rad) * steps
          );
          break;
        }
        case 'turn_right':
          actor.direction += Number.isFinite(Number(arg(0))) ? Number(arg(0)) : 0;
          break;
        case 'turn_left':
          actor.direction -= Number.isFinite(Number(arg(0))) ? Number(arg(0)) : 0;
          break;
        case 'point_in_direction':
          actor.direction = Number.isFinite(Number(arg(0))) ? Number(arg(0)) : 0;
          break;
        case 'point_towards': {
          const dest = String(arg(0));
          let tx = this.mouseX;
          let ty = this.mouseY;
          if (dest !== 'mouse' && dest !== '_mouse_') {
            const pt = this._resolveTargetPoint(dest);
            if (pt) {
              tx = pt.x;
              ty = pt.y;
            }
          }
          const dx = tx - actor.x;
          const dy = ty - actor.y;
          actor.direction = Math.round((Math.atan2(dx, dy) * 180) / Math.PI);
          break;
        }
        case 'goto':
          if (stmt.args.length === 1) {
            const pt = this._resolveTargetPoint(String(arg(0)));
            if (pt) this.moveActorTo(actor, pt.x, pt.y);
          } else {
            this.moveActorTo(actor, Number(arg(0)), Number(arg(1)));
          }
          break;
        case 'goto_random':
          this.moveActorTo(actor, Math.floor(Math.random() * 440) - 220, Math.floor(Math.random() * 320) - 160);
          break;
        case 'goto_mouse':
          this.moveActorTo(actor, this.mouseX, this.mouseY);
          break;
        case 'glide': {
          const secs = Math.max(0, Number(arg(0)));
          if (stmt.args.length === 2) {
            const pt = this._resolveTargetPoint(String(arg(1)));
            const targetX = pt ? pt.x : actor.x;
            const targetY = pt ? pt.y : actor.y;
            const ok = await this._glideToCoords(actor, secs, targetX, targetY, warpMode, scriptCtx);
            if (!ok) return 'RETURN_SCRIPT';
          } else {
            const ok = await this._glideToCoords(actor, secs, Number(arg(1)), Number(arg(2)), warpMode, scriptCtx);
            if (!ok) return 'RETURN_SCRIPT';
          }
          break;
        }
        case 'glide_to': {
          const secs = Math.max(0, Number(arg(0)));
          const pt = this._resolveTargetPoint(String(arg(1)));
          const targetX = pt ? pt.x : actor.x;
          const targetY = pt ? pt.y : actor.y;
          const ok = await this._glideToCoords(actor, secs, targetX, targetY, warpMode, scriptCtx);
          if (!ok) return 'RETURN_SCRIPT';
          break;
        }
        case 'set_x':
          this.moveActorTo(actor, Number(arg(0)), actor.y);
          break;
        case 'set_y':
          this.moveActorTo(actor, actor.x, Number(arg(0)));
          break;
        case 'change_x':
          this.moveActorTo(actor, actor.x + Number(arg(0)), actor.y);
          break;
        case 'change_y':
          this.moveActorTo(actor, actor.x, actor.y + Number(arg(0)));
          break;
        case 'if_on_edge_bounce': {
          const { halfW, halfH } = this._getActorHalfSize(actor);
          const minX = -240 + halfW;
          const maxX = 240 - halfW;
          const minY = -180 + halfH;
          const maxY = 180 - halfH;
          const dirRad = (actor.direction * Math.PI) / 180;
          let dx = Math.sin(dirRad);
          let dy = Math.cos(dirRad);
          let bounced = false;
          if (actor.x <= minX) {
            actor.x = minX;
            if (dx < -1e-9) { dx = -dx; bounced = true; }
          } else if (actor.x >= maxX) {
            actor.x = maxX;
            if (dx > 1e-9) { dx = -dx; bounced = true; }
          }
          if (actor.y <= minY) {
            actor.y = minY;
            if (dy < -1e-9) { dy = -dy; bounced = true; }
          } else if (actor.y >= maxY) {
            actor.y = maxY;
            if (dy > 1e-9) { dy = -dy; bounced = true; }
          }
          if (bounced) {
            actor.direction = (Math.atan2(dx, dy) * 180) / Math.PI;
          }
          break;
        }
        case 'set_rotation_style':
          actor.rotationStyle = String(arg(0));
          break;

        case 'pen_clear':
          this.penCtx.clearRect(0, 0, 480, 360);
          break;
        case 'pen_stamp':
          this._drawActor(this.penCtx, { ...actor, sayText: '' });
          break;
        case 'pen_down':
          actor.penDown = true;
          break;
        case 'pen_up':
          actor.penDown = false;
          break;
        case 'set_pen_color': {
          const c = String(arg(0));
          actor.penColor = c;
          const rgb = this._parseColorToRgb(c);
          if (rgb) actor.penHsl = this._rgbToHsl(rgb[0], rgb[1], rgb[2]);
          break;
        }
        case 'set_pen_param': {
          const param = String(arg(0)).toLowerCase();
          const val = Number(arg(1)) || 0;
          if (!actor.penHsl) actor.penHsl = { h: 168, s: 100, l: 50, a: 1 };
          if (param === 'color') actor.penHsl.h = (((val % 100) + 100) % 100) * 3.6;
          else if (param === 'saturation') actor.penHsl.s = Math.max(0, Math.min(100, val));
          else if (param === 'brightness') actor.penHsl.l = Math.max(0, Math.min(100, val));
          else if (param === 'transparency') actor.penHsl.a = Math.max(0, Math.min(1, 1 - val / 100));
          this._syncPenColorFromHsl(actor);
          break;
        }
        case 'change_pen_param': {
          const param = String(arg(0)).toLowerCase();
          const delta = Number(arg(1)) || 0;
          if (!actor.penHsl) actor.penHsl = { h: 168, s: 100, l: 50, a: 1 };
          if (param === 'color') actor.penHsl.h = (((actor.penHsl.h + delta * 3.6) % 360) + 360) % 360;
          else if (param === 'saturation') actor.penHsl.s = Math.max(0, Math.min(100, actor.penHsl.s + delta));
          else if (param === 'brightness') actor.penHsl.l = Math.max(0, Math.min(100, actor.penHsl.l + delta));
          else if (param === 'transparency') actor.penHsl.a = Math.max(0, Math.min(1, actor.penHsl.a - delta / 100));
          this._syncPenColorFromHsl(actor);
          break;
        }
        case 'set_pen_size':
          actor.penSize = Math.max(1, Number(arg(0)));
          break;
        case 'change_pen_size':
          actor.penSize = Math.max(1, actor.penSize + Number(arg(0)));
          break;

        case 'show':
          actor.visible = true;
          break;
        case 'hide':
          actor.visible = false;
          break;
        case 'set_size':
          actor.size = Math.max(5, Math.min(500, Number(arg(0))));
          break;
        case 'change_size':
          actor.size = Math.max(5, Math.min(500, actor.size + Number(arg(0))));
          break;
        case 'set_effect': {
          const eff = String(arg(0)).toLowerCase();
          const val = Number(arg(1)) || 0;
          if (!actor.effects) {
            actor.effects = { color: 0, ghost: 0, brightness: 0, fisheye: 0, whirl: 0, pixelate: 0, mosaic: 0 };
          }
          actor.effects[eff] = val;
          if (eff === 'color') actor.colorEffect = actor.effects.color;
          break;
        }
        case 'change_effect': {
          const eff = String(arg(0)).toLowerCase();
          const delta = Number(arg(1)) || 0;
          if (!actor.effects) {
            actor.effects = { color: 0, ghost: 0, brightness: 0, fisheye: 0, whirl: 0, pixelate: 0, mosaic: 0 };
          }
          actor.effects[eff] = (Number(actor.effects[eff]) || 0) + delta;
          if (eff === 'color') actor.colorEffect = actor.effects.color;
          break;
        }
        case 'clear_effects':
          actor.effects = { color: 0, ghost: 0, brightness: 0, fisheye: 0, whirl: 0, pixelate: 0, mosaic: 0 };
          actor.colorEffect = 0;
          break;
        case 'go_to_layer': {
          if (actor.isStage) break;
          const layer = String(arg(0)).toLowerCase();
          this._normalizeLayerOrders();
          const sprites = this._getSortedSprites().filter((a) => a !== actor);
          if (layer === 'back') sprites.unshift(actor);
          else sprites.push(actor);
          sprites.forEach((a, idx) => { a.layerOrder = idx + 1; });
          break;
        }
        case 'change_layer': {
          if (actor.isStage) break;
          const dir = String(arg(0)).toLowerCase();
          const delta = Math.round(Number(arg(1))) || 0;
          this._normalizeLayerOrders();
          const sprites = this._getSortedSprites();
          const curIdx = sprites.indexOf(actor);
          if (curIdx >= 0) {
            sprites.splice(curIdx, 1);
            const targetIdx = Math.max(
              0,
              Math.min(sprites.length, dir === 'backward' ? curIdx - delta : curIdx + delta)
            );
            sprites.splice(targetIdx, 0, actor);
            sprites.forEach((a, idx) => { a.layerOrder = idx + 1; });
          }
          break;
        }
        case 'switch_costume': {
          const cArg = arg(0);
          const cName = String(cArg);
          const costumes = actor.costumes || [];
          const idx = costumes.findIndex((c) => c.name === cName);
          if (idx >= 0) {
            actor.currentCostume = idx;
          } else if (costumes.length > 0) {
            if (cName === 'next costume') {
              actor.currentCostume = (actor.currentCostume + 1) % costumes.length;
            } else if (cName === 'previous costume') {
              actor.currentCostume = (actor.currentCostume - 1 + costumes.length) % costumes.length;
            } else if (cName === 'random costume') {
              actor.currentCostume = Math.floor(Math.random() * costumes.length);
            } else if (typeof cArg === 'number' || /^\d+$/.test(cName)) {
              const num = Math.floor(Number(cArg));
              if (num >= 1) actor.currentCostume = (num - 1) % costumes.length;
            }
          }
          break;
        }
        case 'next_costume':
          if (actor.costumes && actor.costumes.length > 0) {
            actor.currentCostume = (actor.currentCostume + 1) % actor.costumes.length;
          }
          break;
        case 'switch_backdrop': {
          this._applySwitchBackdrop(arg(0));
          this.triggerBackdrop(this.currentBackdrop);
          break;
        }
        case 'switch_backdrop_and_wait': {
          this._applySwitchBackdrop(arg(0));
          await this.triggerBackdrop(this.currentBackdrop);
          if (scriptCtx.isStopped()) return 'RETURN_SCRIPT';
          break;
        }
        case 'next_backdrop': {
          const idx = (this.backdrops.indexOf(this.currentBackdrop) + 1) % this.backdrops.length;
          this.currentBackdrop = this.backdrops[idx];
          if (this.onBackdropChange) this.onBackdropChange(this.currentBackdrop);
          this.triggerBackdrop(this.currentBackdrop);
          break;
        }
        case 'say':
        case 'think': {
          const token = (actor._sayToken = (actor._sayToken || 0) + 1);
          actor.sayType = stmt.name;
          actor.sayText = String(arg(0));
          if (stmt.args.length >= 2) {
            const sec = Math.max(0, Number(arg(1)));
            actor.sayUntil = Date.now() + sec * 1000;
            if (!warpMode) this.render();
            const ok = await this._sleepCancellable(sec * 1000, scriptCtx);
            if (actor._sayToken === token && this.runId === myRunId && !actor._deleted) {
              actor.sayText = '';
            }
            if (!ok) return 'RETURN_SCRIPT';
          } else {
            actor.sayUntil = 0;
          }
          break;
        }

        case 'play_sound':
          this.playProjectSound(arg(0), actor).catch(() => {});
          break;
        case 'play_sound_until_done':
          await this.playProjectSound(arg(0), actor);
          if (scriptCtx.isStopped()) return 'RETURN_SCRIPT';
          break;
        case 'stop_all_sounds':
          this._stopAllSounds();
          break;
        case 'set_sound_effect': {
          const eff = String(arg(0)).toLowerCase();
          const val = Number(arg(1)) || 0;
          if (!actor.soundEffects) actor.soundEffects = { pitch: 0, pan: 0 };
          if (eff === 'pitch') actor.soundEffects.pitch = Math.max(-360, Math.min(360, val));
          else if (eff === 'pan') actor.soundEffects.pan = Math.max(-100, Math.min(100, val));
          else actor.soundEffects[eff] = val;
          break;
        }
        case 'change_sound_effect': {
          const eff = String(arg(0)).toLowerCase();
          const delta = Number(arg(1)) || 0;
          if (!actor.soundEffects) actor.soundEffects = { pitch: 0, pan: 0 };
          const cur = Number(actor.soundEffects[eff]) || 0;
          if (eff === 'pitch') actor.soundEffects.pitch = Math.max(-360, Math.min(360, cur + delta));
          else if (eff === 'pan') actor.soundEffects.pan = Math.max(-100, Math.min(100, cur + delta));
          else actor.soundEffects[eff] = cur + delta;
          break;
        }
        case 'clear_sound_effects':
          actor.soundEffects = { pitch: 0, pan: 0 };
          break;
        case 'play_drum': {
          this._playDrumSynth(arg(0), actor);
          const ok = await this._sleepCancellable(this._beatsToMs(arg(1)), scriptCtx);
          if (!ok) return 'RETURN_SCRIPT';
          break;
        }
        case 'rest': {
          const ok = await this._sleepCancellable(this._beatsToMs(arg(0)), scriptCtx);
          if (!ok) return 'RETURN_SCRIPT';
          break;
        }
        case 'play_note': {
          const ms = this._beatsToMs(arg(1));
          this._playNoteSynth(arg(0), ms / 1000, actor);
          const ok = await this._sleepCancellable(ms, scriptCtx);
          if (!ok) return 'RETURN_SCRIPT';
          break;
        }
        case 'set_instrument':
          actor.instrument = Math.max(1, Math.min(21, Math.round(Number(arg(0))) || 1));
          break;
        case 'set_tempo':
          this._setTempo(arg(0));
          break;
        case 'change_tempo':
          this._setTempo(this.musicTempo + (Number(arg(0)) || 0));
          break;
        case 'speak':
          await this._speak(arg(0), scriptCtx);
          if (scriptCtx.isStopped()) return 'RETURN_SCRIPT';
          break;
        case 'set_voice': {
          const v = String(arg(0)).toUpperCase();
          if (['ALTO', 'TENOR', 'SQUEAK', 'GIANT', 'KITTEN'].includes(v)) this.ttsVoice = v;
          break;
        }
        case 'set_language':
          this.ttsLang = String(arg(0)) || 'en';
          break;
        case 'set_volume':
          actor.volume = Math.max(0, Math.min(100, Number(arg(0))));
          break;
        case 'change_volume':
          actor.volume = Math.max(0, Math.min(100, actor.volume + Number(arg(0))));
          break;

        case 'wait': {
          const ok = await this._sleepCancellable(Math.max(0, Number(arg(0)) * 1000), scriptCtx);
          if (!ok) return 'RETURN_SCRIPT';
          break;
        }
        case 'wait_until':
          while (!scriptCtx.isStopped() && !this.evalExpr(stmt.args[0], actor, localScope)) {
            await this.sleep(16);
          }
          if (scriptCtx.isStopped()) return 'RETURN_SCRIPT';
          break;
        case 'broadcast':
          this.triggerBroadcast(String(arg(0)));
          break;
        case 'broadcast_and_wait':
          await this.triggerBroadcast(String(arg(0)));
          if (scriptCtx.isStopped()) return 'RETURN_SCRIPT';
          break;
        case 'create_clone': {
          const cloneCount = this.actors.filter((a) => a.isClone).length;
          if (cloneCount >= 300) break;
          const targetName = stmt.args.length > 0 ? String(arg(0)) : 'myself';
          const src =
            targetName === 'myself' || targetName === '_myself_'
              ? actor
              : this.actors.find((a) => !a.isClone && a.name === targetName) ||
                this.actors.find((a) => a.name === targetName) ||
                null;
          if (!src || src.isStage) break;
          const clone = {
            ...src,
            localVars: { ...(src.localVars || {}) },
            localLists: Object.fromEntries(
              Object.entries(src.localLists || {}).map(([k, v]) => [k, Array.isArray(v) ? [...v] : []])
            ),
            effects: {
              color: 0,
              ghost: 0,
              brightness: 0,
              fisheye: 0,
              whirl: 0,
              pixelate: 0,
              mosaic: 0,
              ...(src.effects || {})
            },
            soundEffects: { pitch: 0, pan: 0, ...(src.soundEffects || {}) },
            penHsl: { h: 168, s: 100, l: 50, a: 1, ...(src.penHsl || {}) },
            layerOrder: src.layerOrder,
            draggable: !!src.draggable,
            _scriptGen: 0,
            isClone: true,
            sayText: '',
            sayUntil: 0,
            _deleted: false
          };
          const srcIdx = this.actors.indexOf(src);
          if (srcIdx >= 0) {
            this.actors.splice(srcIdx, 0, clone);
          } else {
            this.actors.push(clone);
          }
          this._normalizeLayerOrders();
          this._triggerHandlersOnActor(clone, 'when_cloned', null, myRunId);
          break;
        }
        case 'delete_this_clone':
          if (actor.isClone) {
            actor._deleted = true;
            if (this._draggingActor === actor) this._draggingActor = null;
            const idx = this.actors.indexOf(actor);
            if (idx >= 0) this.actors.splice(idx, 1);
            return 'RETURN_SCRIPT';
          }
          break;
        case 'reset_timer':
          this.startTime = Date.now();
          break;
        case 'set_drag_mode':
          actor.draggable = String(arg(0)) === 'draggable';
          break;
        case 'ask': {
          const question = String(arg(0));
          actor.sayType = 'say';
          actor.sayText = question;
          actor.sayUntil = 0;
          this.render();
          if (this.onAsk) {
            const ans = await new Promise((resolve) => {
              this.pendingAskResolver = resolve;
              this._pendingAskScriptCtx = scriptCtx;
              this.onAsk(question, (submittedVal) => {
                this.pendingAskResolver = null;
                this._pendingAskScriptCtx = null;
                resolve(submittedVal);
              });
            });
            this.answerValue = String(ans || '');
          }
          if (this.runId === myRunId && !actor._deleted) actor.sayText = '';
          if (scriptCtx.isStopped()) return 'RETURN_SCRIPT';
          break;
        }
        case 'local_list': {
          const listName = String(arg(0));
          this._getListContainer(actor, listName, true, true);
          break;
        }
        case 'list_add':
        case 'local_list_add': {
          const forceLocal = stmt.name.startsWith('local_');
          const listName = String(arg(0));
          const container = this._getListContainer(actor, listName, forceLocal, true);
          container[listName].push(arg(1));
          break;
        }
        case 'list_delete':
        case 'local_list_delete': {
          const forceLocal = stmt.name.startsWith('local_');
          const listName = String(arg(0));
          const container = this._getListContainer(actor, listName, forceLocal, false);
          this._listDelete(container, listName, arg(1));
          break;
        }
        case 'list_clear':
        case 'local_list_clear': {
          const forceLocal = stmt.name.startsWith('local_');
          const listName = String(arg(0));
          const container = this._getListContainer(actor, listName, forceLocal, true);
          container[listName] = [];
          break;
        }
        case 'list_insert':
        case 'local_list_insert': {
          const forceLocal = stmt.name.startsWith('local_');
          const listName = String(arg(0));
          const container = this._getListContainer(actor, listName, forceLocal, true);
          this._listInsert(container[listName], arg(1), arg(2));
          break;
        }
        case 'list_replace':
        case 'local_list_replace': {
          const forceLocal = stmt.name.startsWith('local_');
          const listName = String(arg(0));
          const container = this._getListContainer(actor, listName, forceLocal, false);
          this._listReplace(container[listName], arg(1), arg(2));
          break;
        }
        case 'show_variable':
        case 'show_list': {
          const arg0 = stmt.args && stmt.args[0];
          const mName = arg0 && arg0.type === 'Var' ? String(arg0.name) : String(arg(0));
          this.hiddenMonitors.delete(mName);
          this.visibleMonitors.add(mName);
          break;
        }
        case 'hide_variable':
        case 'hide_list': {
          const arg0 = stmt.args && stmt.args[0];
          const mName = arg0 && arg0.type === 'Var' ? String(arg0.name) : String(arg(0));
          this.hiddenMonitors.add(mName);
          this.visibleMonitors.delete(mName);
          break;
        }
        case 'stop': {
          const opt = stmt.args.length > 0 ? String(arg(0)) : 'all';
          if (opt === 'this script') {
            return 'RETURN_SCRIPT';
          }
          if (opt === 'other scripts in sprite' || opt === 'other scripts in stage') {
            actor._scriptGen = (actor._scriptGen || 0) + 1;
            if (scriptCtx) scriptCtx.gen = actor._scriptGen;
            if (this.pendingAskResolver && this._pendingAskScriptCtx && this._pendingAskScriptCtx.isStopped()) {
              this.pendingAskResolver('');
              this.pendingAskResolver = null;
              this._pendingAskScriptCtx = null;
              if (this.onAsk) this.onAsk(null);
            }
            break;
          }
          this.isRunning = false;
          this.runId++;
          this._stopAllSounds();
          this._cancelSpeech();
          this._clearGreaterThanWatcher();
          if (this.pendingAskResolver) {
            this.pendingAskResolver('');
            this.pendingAskResolver = null;
          }
          this._pendingAskScriptCtx = null;
          if (this.onAsk) this.onAsk(null);
          for (const a of this.actors) a.sayText = '';
          return 'RETURN_SCRIPT';
        }
      }
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StagePreview };
  } else {
    global.StagePreview = StagePreview;
  }
})(typeof window !== 'undefined' ? window : globalThis);
