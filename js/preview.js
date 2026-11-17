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
      this.startTime = Date.now();
      this.answerValue = '';
      this.pendingAskResolver = null;

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
        this._emitTelemetry();
      });
      this.canvas.addEventListener('mousedown', (e) => {
        toScratchCoords(e);
        this.mouseDown = true;
        this._handleCanvasClick();
        this._emitTelemetry();
      });
      window.addEventListener('mouseup', () => {
        this.mouseDown = false;
      });
    }

    _handleCanvasClick() {
      if (!this.isRunning) return;
      const myRunId = this.runId;
      let clickedSprite = false;

      for (let i = this.actors.length - 1; i >= 0; i--) {
        const actor = this.actors[i];
        if (actor.isStage || !actor.visible) continue;
        const dist = Math.hypot(actor.x - this.mouseX, actor.y - this.mouseY);
        const radius = 24 * (actor.size / 100);
        if (dist <= radius) {
          clickedSprite = true;
          this._triggerHandlersOnActor(actor, 'when_this_sprite_clicked', null, myRunId);
          break;
        }
      }

      if (!clickedSprite) {
        const stageActor = this.actors.find((a) => a.isStage);
        if (stageActor) {
          this._triggerHandlersOnActor(stageActor, 'when_stage_clicked', null, myRunId);
        }
      }
    }

    playSynthSound(soundName) {
      if (this.muted) return;
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        if (!this._audioCtx) this._audioCtx = new AudioCtx();
        const ctx = this._audioCtx;
        if (ctx.state === 'suspended') ctx.resume();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const now = ctx.currentTime;
        const isLaser = String(soundName).toLowerCase().includes('laser');

        osc.type = isLaser ? 'sawtooth' : 'sine';
        osc.frequency.setValueAtTime(isLaser ? 880 : 523.25, now);
        if (isLaser) {
          osc.frequency.exponentialRampToValueAtTime(220, now + 0.14);
        } else {
          osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.09);
        }

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (isLaser ? 0.14 : 0.1));

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + (isLaser ? 0.15 : 0.11));
      } catch (_) {}
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

      if (assetsMap && typeof Image !== 'undefined') {
        for (const [md5ext, content] of assetsMap.entries()) {
          if (this.imageCache.has(md5ext)) continue;
          if (md5ext.endsWith('.svg') && typeof content === 'string') {
            const img = new Image();
            img.onload = () => this.render();
            img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(content);
            this.imageCache.set(md5ext, img);
          } else if (
            (md5ext.endsWith('.png') || md5ext.endsWith('.jpg')) &&
            content instanceof Uint8Array &&
            typeof Blob !== 'undefined' &&
            typeof URL !== 'undefined'
          ) {
            const blob = new Blob([content]);
            const img = new Image();
            img.onload = () => this.render();
            img.src = URL.createObjectURL(blob);
            this.imageCache.set(md5ext, img);
          }
        }
      }
    }

    reset() {
      this.runId++;
      this.isRunning = false;
      this.startTime = Date.now();
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
        for (const t of this.projectJson.targets) {
          for (const [, v] of Object.entries(t.variables || {})) {
            this.vars[v[0]] = v[1];
          }
          for (const [, l] of Object.entries(t.lists || {})) {
            this.lists[l[0]] = Array.isArray(l[1]) ? [...l[1]] : [];
          }
          this.actors.push(this._createActorFromTarget(t));
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
        currentCostume: 0,
        colorEffect: 0,
        penDown: false,
        penColor: '#00ffcc',
        penSize: 3,
        sayText: '',
        sayType: 'say',
        sayUntil: 0,
        volume: 100,
        ast: [],
        procedures: {}
      };
    }

    _createActorFromTarget(t) {
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
        currentCostume: Number(t.currentCostume) || 0,
        colorEffect: 0,
        penDown: false,
        penColor: '#00ffcc',
        penSize: 3,
        sayText: '',
        sayType: 'say',
        sayUntil: 0,
        volume: t.volume !== undefined ? Number(t.volume) : 100,
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
        isRunning: this.isRunning
      });
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

      if (actor.colorEffect) {
        ctx.filter = `hue-rotate(${(actor.colorEffect * 3.6) % 360}deg)`;
      }

      const costumeObj = actor.costumes && actor.costumes[actor.currentCostume];
      const cachedImg = costumeObj && costumeObj.md5ext ? this.imageCache.get(costumeObj.md5ext) : null;

      if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
        const rx = costumeObj.rotationCenterX || cachedImg.naturalWidth / 2;
        const ry = costumeObj.rotationCenterY || cachedImg.naturalHeight / 2;
        ctx.drawImage(cachedImg, -rx, -ry);
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

      // 1. Render Stage Backdrop
      const stageTarget =
        this.projectJson && this.projectJson.targets
          ? this.projectJson.targets.find((t) => t.isStage)
          : null;
      const bgCostume =
        stageTarget && stageTarget.costumes
          ? stageTarget.costumes.find((c) => c.name === this.currentBackdrop)
          : null;
      const bgImg = bgCostume && bgCostume.md5ext ? this.imageCache.get(bgCostume.md5ext) : null;

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

      // 2. Render Pen layer
      ctx.drawImage(this.penCanvas, 0, 0);

      // 3. Render all visible Sprites & Clones
      for (const actor of this.actors) {
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
          tasks.push(this.execBlock(h.body, myRunId, mainSprite, {}));
        }
      }
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
            tasks.push(this.execBlock(h.body, myRunId, actor, {}));
          }
        }
      }
      this._emitTelemetry();
      await Promise.all(tasks);
      if (this.runId === myRunId) {
        this._emitTelemetry();
      }
    }

    _triggerHandlersOnActor(actor, decorator, argMatch, myRunId) {
      const tasks = [];
      for (const h of actor.ast || []) {
        if (h.type === 'Handler' && h.decorator === decorator) {
          if (argMatch !== null) {
            const targetArg = h.decArgs && h.decArgs[0] ? String(h.decArgs[0].value) : '';
            if (targetArg !== argMatch && !(decorator === 'when_key_pressed' && targetArg === 'any')) {
              continue;
            }
          }
          tasks.push(this.execBlock(h.body, myRunId, actor, {}));
        }
      }
      return tasks;
    }

    triggerKey(key) {
      if (!this.isRunning && this.activeAst) {
        this.isRunning = true;
      }
      const myRunId = this.runId;
      for (const actor of this.actors) {
        this._triggerHandlersOnActor(actor, 'when_key_pressed', key, myRunId);
      }
    }

    triggerBackdrop(bgName) {
      const myRunId = this.runId;
      const tasks = [];
      for (const actor of this.actors) {
        tasks.push(...this._triggerHandlersOnActor(actor, 'when_backdrop_switches', bgName, myRunId));
      }
      return Promise.all(tasks);
    }

    triggerBroadcast(msg) {
      const myRunId = this.runId;
      const tasks = [];
      for (const actor of this.actors) {
        tasks.push(...this._triggerHandlersOnActor(actor, 'when_message_received', msg, myRunId));
      }
      return Promise.all(tasks);
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
        case 'Var':
          if (localScope && Object.prototype.hasOwnProperty.call(localScope, expr.name)) {
            return localScope[expr.name];
          }
          return this.vars[expr.name] !== undefined ? this.vars[expr.name] : 0;
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
            case '==': return l == r;
            case '!=': return l != r;
            case '<': return Number(l) < Number(r);
            case '>': return Number(l) > Number(r);
            case '<=': return Number(l) <= Number(r);
            case '>=': return Number(l) >= Number(r);
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
            case 'math_op': {
              const op = String(evalArg(0));
              const v = Number(evalArg(1));
              if (op === 'abs') return Math.abs(v);
              if (op === 'floor') return Math.floor(v);
              if (op === 'ceiling') return Math.ceil(v);
              if (op === 'sqrt') return Math.sqrt(Math.max(0, v));
              if (op === 'sin') return Math.sin((v * Math.PI) / 180);
              if (op === 'cos') return Math.cos((v * Math.PI) / 180);
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
                return Math.abs(actor.x) >= 225 || Math.abs(actor.y) >= 165;
              }
              if (target === 'mouse' || target === '_mouse_') {
                return Math.hypot(actor.x - this.mouseX, actor.y - this.mouseY) <= 24 * (actor.size / 100);
              }
              const other = this.actors.find((a) => a.name === target && a.visible);
              if (other) {
                return Math.hypot(actor.x - other.x, actor.y - other.y) <= 32 * ((actor.size + other.size) / 200);
              }
              return false;
            }
            case 'distance_to': {
              const target = String(evalArg(0));
              if (target === 'mouse' || target === '_mouse_') {
                return Math.round(Math.hypot(actor.x - this.mouseX, actor.y - this.mouseY));
              }
              const other = this.actors.find((a) => a.name === target);
              if (other) {
                return Math.round(Math.hypot(actor.x - other.x, actor.y - other.y));
              }
              return 0;
            }
            case 'list_item': {
              const arr = this.lists[String(evalArg(0))] || [];
              const idx = Math.floor(Number(evalArg(1))) - 1;
              return arr[idx] !== undefined ? arr[idx] : '';
            }
            case 'list_length': {
              const arr = this.lists[String(evalArg(0))] || [];
              return arr.length;
            }
            case 'list_contains': {
              const arr = this.lists[String(evalArg(0))] || [];
              const item = String(evalArg(1));
              return arr.some((el) => String(el) === item);
            }
          }
          return 0;
        }
      }
      return 0;
    }

    moveActorTo(actor, nx, ny) {
      const clampedX = Math.max(-240, Math.min(240, nx));
      const clampedY = Math.max(-180, Math.min(180, ny));
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

    sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    async execBlock(stmts, myRunId, actor = this.sprite, localScope = {}) {
      for (const stmt of stmts) {
        if (this.runId !== myRunId || actor._deleted) return;

        if (stmt.type === 'Pass') {
          continue;
        } else if (stmt.type === 'Assign') {
          this.vars[stmt.name] = this.evalExpr(stmt.value, actor, localScope);
        } else if (stmt.type === 'ChangeVar') {
          this.vars[stmt.name] =
            (Number(this.vars[stmt.name]) || 0) + Number(this.evalExpr(stmt.value, actor, localScope));
        } else if (stmt.type === 'Repeat') {
          const count = Math.max(0, Math.floor(Number(this.evalExpr(stmt.count, actor, localScope))));
          for (let i = 0; i < count; i++) {
            if (this.runId !== myRunId || actor._deleted) return;
            await this.execBlock(stmt.body, myRunId, actor, localScope);
            this.render();
            this._emitTelemetry(actor);
            await this.sleep(16);
          }
        } else if (stmt.type === 'Forever') {
          while (this.runId === myRunId && !actor._deleted) {
            await this.execBlock(stmt.body, myRunId, actor, localScope);
            this.render();
            this._emitTelemetry(actor);
            await this.sleep(16);
          }
        } else if (stmt.type === 'RepeatUntil') {
          while (this.runId === myRunId && !actor._deleted && !this.evalExpr(stmt.cond, actor, localScope)) {
            await this.execBlock(stmt.body, myRunId, actor, localScope);
            this.render();
            this._emitTelemetry(actor);
            await this.sleep(16);
          }
        } else if (stmt.type === 'If') {
          if (this.evalExpr(stmt.cond, actor, localScope)) {
            await this.execBlock(stmt.thenBody, myRunId, actor, localScope);
          } else if (stmt.elseBody) {
            await this.execBlock(stmt.elseBody, myRunId, actor, localScope);
          }
        } else if (stmt.type === 'Call') {
          const stopSignal = await this.execCall(stmt, myRunId, actor, localScope);
          if (stopSignal === 'RETURN_SCRIPT') return;
        }
        this.render();
        this._emitTelemetry(actor);
      }
    }

    async execCall(stmt, myRunId, actor = this.sprite, localScope = {}) {
      const arg = (i) => this.evalExpr(stmt.args[i], actor, localScope);

      if (actor.procedures && actor.procedures[stmt.name]) {
        const proc = actor.procedures[stmt.name];
        const childScope = { ...localScope };
        proc.params.forEach((pName, idx) => {
          childScope[pName] = arg(idx);
        });
        await this.execBlock(proc.body, myRunId, actor, childScope);
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
          actor.direction += Number(arg(0));
          break;
        case 'turn_left':
          actor.direction -= Number(arg(0));
          break;
        case 'point_in_direction':
          actor.direction = Number(arg(0));
          break;
        case 'point_towards': {
          const dest = String(arg(0));
          let tx = this.mouseX;
          let ty = this.mouseY;
          if (dest !== 'mouse' && dest !== '_mouse_') {
            const other = this.actors.find((a) => a.name === dest);
            if (other) {
              tx = other.x;
              ty = other.y;
            }
          }
          const dx = tx - actor.x;
          const dy = ty - actor.y;
          actor.direction = Math.round((Math.atan2(dx, dy) * 180) / Math.PI);
          break;
        }
        case 'goto':
          if (stmt.args.length === 1) {
            const dest = String(arg(0));
            if (dest === 'random' || dest === '_random_') {
              this.moveActorTo(actor, Math.floor(Math.random() * 440) - 220, Math.floor(Math.random() * 320) - 160);
            } else if (dest === 'mouse' || dest === '_mouse_') {
              this.moveActorTo(actor, this.mouseX, this.mouseY);
            } else {
              const other = this.actors.find((a) => a.name === dest);
              if (other) this.moveActorTo(actor, other.x, other.y);
            }
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
          const targetX = Number(arg(1));
          const targetY = Number(arg(2));
          const startX = actor.x;
          const startY = actor.y;
          const steps = Math.max(1, Math.floor((secs * 1000) / 16));
          for (let i = 1; i <= steps; i++) {
            if (this.runId !== myRunId || actor._deleted) return;
            const t = i / steps;
            this.moveActorTo(actor, startX + (targetX - startX) * t, startY + (targetY - startY) * t);
            this.render();
            await this.sleep(16);
          }
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
        case 'if_on_edge_bounce':
          if (actor.x <= -225 || actor.x >= 225) {
            actor.direction = -actor.direction;
            actor.x = Math.max(-224, Math.min(224, actor.x));
          }
          if (actor.y <= -165 || actor.y >= 165) {
            actor.direction = 180 - actor.direction;
            actor.y = Math.max(-164, Math.min(164, actor.y));
          }
          break;
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
        case 'set_pen_color':
          actor.penColor = String(arg(0));
          break;
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
        case 'set_effect':
          if (String(arg(0)).toLowerCase() === 'color') actor.colorEffect = Number(arg(1));
          break;
        case 'change_effect':
          if (String(arg(0)).toLowerCase() === 'color') actor.colorEffect += Number(arg(1));
          break;
        case 'clear_effects':
          actor.colorEffect = 0;
          break;
        case 'switch_costume': {
          const cName = String(arg(0));
          const idx = (actor.costumes || []).findIndex((c) => c.name === cName);
          if (idx >= 0) actor.currentCostume = idx;
          break;
        }
        case 'next_costume':
          if (actor.costumes && actor.costumes.length > 0) {
            actor.currentCostume = (actor.currentCostume + 1) % actor.costumes.length;
          }
          break;
        case 'switch_backdrop': {
          const bg = String(arg(0));
          this.currentBackdrop = bg;
          if (this.onBackdropChange) this.onBackdropChange(bg);
          this.triggerBackdrop(bg);
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
        case 'think':
          actor.sayType = stmt.name;
          actor.sayText = String(arg(0));
          if (stmt.args.length >= 2) {
            const sec = Math.max(0, Number(arg(1)));
            actor.sayUntil = Date.now() + sec * 1000;
            this.render();
            await this.sleep(sec * 1000);
            if (this.runId === myRunId) actor.sayText = '';
          } else {
            actor.sayUntil = 0;
          }
          break;

        case 'play_sound':
          this.playSynthSound(arg(0));
          break;
        case 'play_sound_until_done':
          this.playSynthSound(arg(0));
          await this.sleep(140);
          break;
        case 'stop_all_sounds':
          break;
        case 'set_volume':
          actor.volume = Math.max(0, Math.min(100, Number(arg(0))));
          break;
        case 'change_volume':
          actor.volume = Math.max(0, Math.min(100, actor.volume + Number(arg(0))));
          break;

        case 'wait':
          await this.sleep(Math.max(0, Number(arg(0)) * 1000));
          break;
        case 'wait_until':
          while (this.runId === myRunId && !actor._deleted && !this.evalExpr(stmt.args[0], actor, localScope)) {
            await this.sleep(16);
          }
          break;
        case 'broadcast':
          this.triggerBroadcast(String(arg(0)));
          break;
        case 'broadcast_and_wait':
          await this.triggerBroadcast(String(arg(0)));
          break;
        case 'create_clone': {
          if (this.actors.length > 150) break;
          const targetName = stmt.args.length > 0 ? String(arg(0)) : 'myself';
          const src =
            targetName === 'myself' || targetName === '_myself_'
              ? actor
              : this.actors.find((a) => a.name === targetName) || actor;
          const clone = {
            ...src,
            isClone: true,
            sayText: '',
            _deleted: false
          };
          this.actors.push(clone);
          this._triggerHandlersOnActor(clone, 'when_cloned', null, myRunId);
          break;
        }
        case 'delete_this_clone':
          if (actor.isClone) {
            actor._deleted = true;
            const idx = this.actors.indexOf(actor);
            if (idx >= 0) this.actors.splice(idx, 1);
            return 'RETURN_SCRIPT';
          }
          break;
        case 'reset_timer':
          this.startTime = Date.now();
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
              this.onAsk(question, (submittedVal) => {
                this.pendingAskResolver = null;
                resolve(submittedVal);
              });
            });
            this.answerValue = String(ans || '');
          }
          if (this.runId === myRunId) actor.sayText = '';
          break;
        }
        case 'list_add': {
          const listName = String(arg(0));
          if (!this.lists[listName]) this.lists[listName] = [];
          this.lists[listName].push(arg(1));
          break;
        }
        case 'list_delete': {
          const listName = String(arg(0));
          const arr = this.lists[listName];
          if (Array.isArray(arr)) {
            const idx = Math.floor(Number(arg(1))) - 1;
            if (idx >= 0 && idx < arr.length) arr.splice(idx, 1);
          }
          break;
        }
        case 'list_clear': {
          const listName = String(arg(0));
          this.lists[listName] = [];
          break;
        }
        case 'list_insert': {
          const listName = String(arg(0));
          if (!this.lists[listName]) this.lists[listName] = [];
          const idx = Math.max(0, Math.floor(Number(arg(1))) - 1);
          this.lists[listName].splice(idx, 0, arg(2));
          break;
        }
        case 'list_replace': {
          const listName = String(arg(0));
          const arr = this.lists[listName];
          if (Array.isArray(arr)) {
            const idx = Math.floor(Number(arg(1))) - 1;
            if (idx >= 0 && idx < arr.length) arr[idx] = arg(2);
          }
          break;
        }
        case 'stop': {
          const opt = stmt.args.length > 0 ? String(arg(0)) : 'all';
          if (opt === 'this script') {
            return 'RETURN_SCRIPT';
          }
          this.isRunning = false;
          this.runId++;
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
