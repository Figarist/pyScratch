const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Load local JSZip for full binary .sb3 archive round-trip testing
global.JSZip = require('../vendor/jszip.min.js');

const {
  md5,
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
} = require('../js/sb3Bridge.js');
const { compileToScratch, CompileError, tokenize, parse } = require('../js/compiler.js');
const { decompileTarget, formatBlockUk } = require('../js/decompiler.js');
const { StagePreview } = require('../js/preview.js');
const Inspector = require('../js/inspector.js');
const I18n = require('../js/i18n.js');

async function runAllTests() {
  console.log('--- 1. Testing RFC 1321 MD5 (ASCII, UTF-8 & Binary WAV) ---');
  for (const sample of ['', 'abc', 'Scratch 3.0 УКРАЇНА 🚀', '<svg width="480"></svg>']) {
    const expected = crypto.createHash('md5').update(Buffer.from(sample, 'utf8')).digest('hex');
    const actual = md5(sample);
    assert.strictEqual(actual, expected, `MD5 mismatch for "${sample}"`);
  }

  console.log('--- 2. Testing Default Project, WAV Sound Assets & Add Sprite ---');
  const { projectJson, assetsMap } = createDefaultProject();
  assert.strictEqual(projectJson.targets.length, 2);
  const stage = projectJson.targets[0];
  const sprite1 = projectJson.targets[1];

  // Verify every costume and sound md5ext exists in assetsMap and matches actual content MD5
  for (const t of projectJson.targets) {
    for (const c of t.costumes) {
      assert(assetsMap.has(c.md5ext), `Missing costume asset ${c.md5ext}`);
      assert.strictEqual(md5(assetsMap.get(c.md5ext)), c.assetId, 'Costume assetId must match MD5');
    }
    for (const s of t.sounds) {
      assert(assetsMap.has(s.md5ext), `Missing sound asset ${s.md5ext}`);
      assert.strictEqual(md5(assetsMap.get(s.md5ext)), s.assetId, 'Sound assetId must match MD5');
    }
  }

  const sprite2 = addSpriteToProject(projectJson, assetsMap);
  assert.strictEqual(sprite2.name, 'Sprite2');
  assert.strictEqual(projectJson.targets.length, 3);

  console.log('--- 3. Testing Full DSL Compilation, Custom Procedures, Elif, Lists, Clones & Negative Literals ---');
  const ADVANCED_PYTHON = `# === СКРИПТ ГРАВЦЯ (Sprite1) ===

def draw_poly(sides, length):
    for i in range(sides):
        move(length)
        turn_right((360 / sides))

@when_flag_clicked
def main():
    switch_backdrop("space_bg")
    goto(-150, -40)
    pen_clear()
    set_pen_color("#00ffcc")
    set_pen_size(3)
    pen_down()
    draw_poly(6, 75)
    pen_up()
    pen_stamp()

    score = 0
    score += 5
    score -= 2
    list_clear("bag")
    list_add("bag", "ключ")

    if (score >= 10):
        say("Перемога!", 2)
    elif (score <= 3):
        think("Треба ще балів", 1)
    else:
        say("Нормально")

    while not (key_pressed("space") or touching("edge")):
        change_x(4)
        if (x_position() != 0):
            if_on_edge_bounce()
        wait(0.1)

    play_sound("pop")
    create_clone("myself")
    broadcast("level_up")
    stop("all")

@when_cloned
def on_clone_2():
    change_effect("color", 25)
    glide(0.5, 100, 80)
    delete_this_clone()

@when_key_pressed("space")
def on_key_space():
    change_y(50)
    wait(0.3)
    change_y(-50)

@when_backdrop_switches("level_2")
def on_level_2():
    goto(-120, 0)
    say("Рівень 2 почався!", 2)

@when_message_received("level_up")
def on_level_up():
    next_costume()
`;

  const res = compileToScratch(ADVANCED_PYTHON, sprite1, stage, projectJson);
  assert.strictEqual(res.usesPen, true);
  assert(projectJson.extensions.includes('pen'), 'Pen extension must be enabled');

  // Verify negative literal folding (-150 is stored directly as "-150", NOT operator_subtract(0, 150))
  const gotoBlock = Object.values(sprite1.blocks).find((b) => b.opcode === 'motion_gotoxy');
  assert(gotoBlock, 'motion_gotoxy block should exist');
  assert.deepStrictEqual(gotoBlock.inputs.X, [1, [4, '-150']], 'Negative numbers must be folded into literal -150');

  // Verify control_stop has required Scratch 3.0 mutation
  const stopBlock = Object.values(sprite1.blocks).find((b) => b.opcode === 'control_stop');
  assert(stopBlock && stopBlock.mutation && stopBlock.mutation.hasnext === 'false', 'control_stop must have mutation');

  // Verify global variables and lists are created on Stage so all sprites share them
  const stageVarNames = Object.values(stage.variables).map((v) => v[0]);
  assert(stageVarNames.includes('score'), 'Variable "score" should be registered on Stage');
  const stageListNames = Object.values(stage.lists).map((l) => l[0]);
  assert(stageListNames.includes('bag'), 'List "bag" should be registered on Stage');

  // Verify custom procedure (My Block) generation
  const procDef = Object.values(sprite1.blocks).find((b) => b.opcode === 'procedures_definition');
  const procCall = Object.values(sprite1.blocks).find((b) => b.opcode === 'procedures_call');
  assert(procDef && procCall, 'Custom procedure definition and call blocks must exist');
  assert.strictEqual(procCall.mutation.proccode, 'draw_poly %s %s');

  console.log('--- 4. Testing Lossless Decompilation & Round-Trip Stability ---');
  const decompiled1 = decompileTarget(sprite1);
  assert(decompiled1.includes('def draw_poly(sides, length):'), 'Should decompile custom def');
  assert(decompiled1.includes('draw_poly(6, 75)'), 'Should decompile custom call');
  assert(decompiled1.includes('goto(-150, -40)'), 'Should preserve negative numbers without (0 - 150)');
  assert(decompiled1.includes('if (score >= 10):'), 'Should decompile >= cleanly');
  assert(decompiled1.includes('elif (score <= 3):'), 'Should reconstruct elif and <= cleanly');
  assert(decompiled1.includes('if (x_position() != 0):'), 'Should decompile != cleanly');
  assert(decompiled1.includes('@when_cloned'), 'Should decompile @when_cloned');

  // Re-compile the decompiled Python and decompile again — must be 100% identical!
  compileToScratch(decompiled1, sprite1, stage, projectJson);
  const decompiled2 = decompileTarget(sprite1);
  assert.strictEqual(decompiled2, decompiled1, 'Decompiled code must be 100% idempotent on second round-trip');

  console.log('--- 5. Testing Ukrainian Block Formatter (formatBlockUk) ---');
  for (const bId of Object.keys(sprite1.blocks)) {
    const b = sprite1.blocks[bId];
    if (b.shadow) continue;
    const info = formatBlockUk(bId, sprite1.blocks);
    assert(info.label && info.label.length > 0);
  }

  console.log('--- 6. Testing Binary .sb3 ZIP Save & Load Round-Trip ---');
  const zipUint8 = await saveSb3(projectJson, assetsMap, 'uint8array');
  assert(zipUint8.byteLength > 1000, 'Generated .sb3 archive should be non-empty');

  const unpacked = await loadSb3(zipUint8);
  assert.strictEqual(unpacked.projectJson.targets.length, 3);
  const unpackedDecompiled = decompileTarget(unpacked.projectJson.targets[1]);
  assert.strictEqual(unpackedDecompiled, decompiled1, 'Unpacked .sb3 must decompile to identical Python code');

  console.log('--- 7. Testing StagePreview Execution Engine (Headless Canvas Mock) ---');
  const mockCtx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    fillRect() {},
    clearRect() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    closePath() {},
    stroke() {},
    fill() {},
    save() {},
    restore() {},
    translate() {},
    rotate() {},
    scale() {},
    drawImage() {},
    roundRect() {},
    fillText() {},
    measureText: (t) => ({ width: String(t).length * 7 })
  };
  global.document = {
    createElement: () => ({ width: 480, height: 360, getContext: () => mockCtx })
  };
  global.window = { addEventListener() {} };

  const sim = new StagePreview({ width: 480, height: 360, getContext: () => mockCtx });
  const simCode = `
def step_forward(dist):
    move(dist)

@when_flag_clicked
def run():
    goto(10, 20)
    points = 5
    points += 7
    list_add("items", "sword")
    step_forward(30)
`;
  const simAst = parse(tokenize(simCode));
  await sim.runAst(simAst);
  assert.strictEqual(Math.round(sim.sprite.x), 40, 'Sprite should move from x=10 by 30 steps to x=40');
  assert.strictEqual(Math.round(sim.sprite.y), 20, 'Sprite y should be 20');
  assert.strictEqual(sim.vars.points, 12, 'Variable points should equal 12');
  assert.deepStrictEqual(sim.lists.items, ['sword'], 'List items should contain "sword"');

  console.log('--- 8. Testing Friendly Ukrainian Compiler Error Diagnostics ---');
  assert.throws(
    () => compileToScratch('@when_flag_clicked\ndef main()\n    move(10)\n', sprite1, stage, projectJson),
    (err) => err instanceof CompileError && err.line === 2 && err.message.includes('двокрапку')
  );
  assert.throws(
    () => compileToScratch('@when_flag_clicked\ndef main():\n  move(10)\n    move(20)\n   move(30)\n', sprite1, stage, projectJson),
    (err) => err instanceof CompileError && err.line === 5 && err.message.includes('відступ')
  );
  assert.throws(
    () => compileToScratch('@when_flag_clicked\ndef main():\n    say("Привіт)\n', sprite1, stage, projectJson),
    (err) => err instanceof CompileError && err.line === 3 && err.message.includes('Незакритий')
  );

  console.log('--- 9. Testing Full 1:1 Scratch 3.0 Parity & End-to-End Integration ---');
  const pProj = createDefaultProject();
  const pJson = pProj.projectJson;
  const pAssets = pProj.assetsMap;
  const pStage = pJson.targets[0];
  const pSprite = pJson.targets[1];
  const pSprite2 = addSpriteToProject(pJson, pAssets, 'Target2');

  const PARITY_PYTHON = `# === СПРОБА ПОВНОГО ПАРИТЕТУ (Sprite1) ===

@warp
def fast_accumulate(limit):
    for i in range(limit):
        warp_sum += i

@when_flag_clicked
def main():
    self.hp = 100
    self.hp -= 25
    local_list("local_bag")
    local_list_add("local_bag", "map")
    local_list_add("local_bag", "gem")
    local_list_insert("local_bag", 1, "compass")
    local_list_replace("local_bag", 2, "golden_map")
    idx_loc = local_list_index_of("local_bag", "golden_map")
    item_loc = local_list_item("local_bag", 1)
    len_loc = local_list_length("local_bag")
    has_loc = local_list_contains("local_bag", "gem")
    local_list_delete("local_bag", 3)
    local_list_clear("local_bag_tmp")

    local_list("ui_local")
    show_list("ui_local")
    hide_list("ui_local")
    show_variable(self.hp)
    hide_variable(self.hp)

    list_clear("shared_bag")
    list_add("shared_bag", "alpha")
    list_add("shared_bag", "beta")
    idx_shared = list_index_of("shared_bag", "beta")
    show_variable("idx_shared")
    hide_variable("idx_shared")
    show_list("shared_bag")
    hide_list("shared_bag")

    glide_to(0, "random")
    switch_backdrop_and_wait("level_2")
    go_to_layer("front")
    change_layer("backward", 1)

    set_sound_effect("pitch", 20)
    change_sound_effect("pan", -10)
    clear_sound_effects()

    set_drag_mode("draggable")
    attr_x = attribute_of("x position", "Sprite1")
    hit_red = touching_color("#ff0000")
    hit_pair = color_is_touching_color("#ff0000", "#00ff00")
    yr = current_time("year")
    d2k = days_since_2000()
    uname = username()
    loud = loudness()

    s_len = len("hello")
    m_exp = exp(0)
    m_pow10 = pow10(2)
    m_tan = tan(45)
    m_asin = asin(1)
    m_acos = acos(1)
    m_atan = atan(1)
    m_ln = ln(1)
    m_log = log(100)

    warp_sum = 0
    fast_accumulate(20)

@when_greater_than("timer", 0.01)
def on_timer_gt():
    gt_count += 1
`;

  // 9a. Compile & verify local vars, local lists, @warp mutation, and opcodes
  const pCompiled = compileToScratch(PARITY_PYTHON, pSprite, pStage, pJson);
  const pStageVarNames = Object.values(pStage.variables).map((v) => v[0]);
  const pSpriteVarNames = Object.values(pSprite.variables).map((v) => v[0]);
  assert(pSpriteVarNames.includes('hp'), 'self.hp must be stored on sprite.variables');
  assert(!pStageVarNames.includes('hp'), 'self.hp must NOT be stored on stage.variables');

  const pStageListNames = Object.values(pStage.lists).map((l) => l[0]);
  const pSpriteListNames = Object.values(pSprite.lists).map((l) => l[0]);
  assert(pSpriteListNames.includes('local_bag'), 'local_bag must be stored on sprite.lists');
  assert(pSpriteListNames.includes('ui_local'), 'ui_local must be stored on sprite.lists');
  assert(!pStageListNames.includes('local_bag'), 'local_bag must NOT be on stage.lists');
  assert(pStageListNames.includes('shared_bag'), 'shared_bag must be stored on stage.lists');

  const warpProto = Object.values(pCompiled.blocks).find((b) => b.opcode === 'procedures_prototype');
  const warpCall = Object.values(pCompiled.blocks).find((b) => b.opcode === 'procedures_call');
  assert(warpProto && warpProto.mutation && warpProto.mutation.warp === 'true', '@warp prototype must have warp="true"');
  assert(warpCall && warpCall.mutation && warpCall.mutation.warp === 'true', '@warp call must have warp="true"');

  const expectedOpcodes = [
    'motion_glideto',
    'looks_switchbackdroptoandwait',
    'looks_gotofrontback',
    'looks_goforwardbackwardlayers',
    'sound_seteffectto',
    'sound_changeeffectby',
    'sound_cleareffects',
    'event_whengreaterthan',
    'sensing_of',
    'sensing_touchingcolor',
    'sensing_coloristouchingcolor',
    'sensing_setdragmode',
    'sensing_current',
    'sensing_dayssince2000',
    'sensing_username',
    'sensing_loudness',
    'data_itemnumoflist',
    'data_showvariable',
    'data_hidevariable',
    'data_showlist',
    'data_hidelist',
    'operator_length',
    'operator_mathop'
  ];
  const blockOpcodes = new Set(Object.values(pCompiled.blocks).map((b) => b.opcode));
  for (const op of expectedOpcodes) {
    assert(blockOpcodes.has(op), `Expected compiled opcode "${op}"`);
  }

  // 9b. formatBlockUk must return non-empty labels for all blocks and Ukrainian labels for all hat/statement blocks
  const statementAndHatOpcodes = new Set([
    'procedures_definition',
    'procedures_call',
    'event_whenflagclicked',
    'event_whengreaterthan',
    'control_repeat',
    'data_setvariableto',
    'data_changevariableby',
    'data_addtolist',
    'data_deleteoflist',
    'data_deletealloflist',
    'data_insertatlist',
    'data_replaceitemoflist',
    'data_showvariable',
    'data_hidevariable',
    'data_showlist',
    'data_hidelist',
    'motion_glideto',
    'looks_switchbackdroptoandwait',
    'looks_gotofrontback',
    'looks_goforwardbackwardlayers',
    'sound_seteffectto',
    'sound_changeeffectby',
    'sound_cleareffects',
    'sensing_setdragmode'
  ]);
  for (const bId of Object.keys(pCompiled.blocks)) {
    const b = pCompiled.blocks[bId];
    if (b.shadow) continue;
    const info = formatBlockUk(bId, pCompiled.blocks);
    assert(info.label && info.label.length > 0, `formatBlockUk label missing for ${b.opcode}`);
    if (statementAndHatOpcodes.has(b.opcode)) {
      assert.notStrictEqual(info.label, b.opcode, `formatBlockUk should provide Ukrainian label for ${b.opcode}`);
    }
  }

  // 9c. Decompilation & 2nd round-trip idempotency
  const pDec1 = decompileTarget(pSprite, pStage);
  assert(pDec1.includes('@warp\ndef fast_accumulate(limit):'), 'Should decompile @warp procedure');
  assert(pDec1.includes('self.hp = 100'), 'Should decompile sprite-local assignment self.hp');
  assert(pDec1.includes('self.hp += -25'), 'Should decompile sprite-local mutation self.hp');
  assert(pDec1.includes('local_list_add("local_bag", "map")'), 'Should decompile local_list_add');
  assert(pDec1.includes('local_list_item("local_bag", 1)'), 'Should decompile local_list_item');
  assert(pDec1.includes('local_list_index_of("local_bag", "golden_map")'), 'Should decompile local_list_index_of');
  assert(pDec1.includes('local_list_clear("local_bag_tmp")'), 'Should decompile local_list_clear');
  assert(pDec1.includes('local_list("ui_local")'), 'Should emit local_list declaration for UI-only local list');
  assert(pDec1.includes('show_variable(self.hp)'), 'Should decompile show_variable(self.hp)');
  assert(pDec1.includes('hide_variable(self.hp)'), 'Should decompile hide_variable(self.hp)');
  assert(pDec1.includes('list_index_of("shared_bag", "beta")'), 'Should decompile list_index_of');
  assert(pDec1.includes('glide_to(0, "random")'), 'Should decompile glide_to');
  assert(pDec1.includes('switch_backdrop_and_wait("level_2")'), 'Should decompile switch_backdrop_and_wait');
  assert(pDec1.includes('go_to_layer("front")'), 'Should decompile go_to_layer');
  assert(pDec1.includes('change_layer("backward", 1)'), 'Should decompile change_layer');
  assert(pDec1.includes('set_sound_effect("pitch", 20)'), 'Should decompile set_sound_effect');
  assert(pDec1.includes('change_sound_effect("pan", -10)'), 'Should decompile change_sound_effect');
  assert(pDec1.includes('clear_sound_effects()'), 'Should decompile clear_sound_effects');
  assert(pDec1.includes('@when_greater_than("timer", 0.01)'), 'Should decompile @when_greater_than');
  assert(pDec1.includes('attribute_of("x position", "Sprite1")'), 'Should decompile attribute_of');
  assert(pDec1.includes('touching_color("#ff0000")'), 'Should decompile touching_color');
  assert(pDec1.includes('color_is_touching_color("#ff0000", "#00ff00")'), 'Should decompile color_is_touching_color');
  assert(pDec1.includes('set_drag_mode("draggable")'), 'Should decompile set_drag_mode');
  assert(pDec1.includes('current_time("year")'), 'Should decompile current_time');
  assert(pDec1.includes('days_since_2000()'), 'Should decompile days_since_2000');
  assert(pDec1.includes('username()'), 'Should decompile username');
  assert(pDec1.includes('loudness()'), 'Should decompile loudness');
  assert(pDec1.includes('length_of("hello")'), 'len() compiles to operator_length and decompiles as length_of()');
  assert(pDec1.includes('exp(0)'), 'Should decompile exp');
  assert(pDec1.includes('pow10(2)'), 'Should decompile pow10');
  assert(pDec1.includes('tan(45)'), 'Should decompile tan');
  assert(pDec1.includes('asin(1)'), 'Should decompile asin');
  assert(pDec1.includes('acos(1)'), 'Should decompile acos');
  assert(pDec1.includes('atan(1)'), 'Should decompile atan');
  assert(pDec1.includes('ln(1)'), 'Should decompile ln');
  assert(pDec1.includes('log(100)'), 'Should decompile log');

  compileToScratch(pDec1, pSprite, pStage, pJson);
  const pDec2 = decompileTarget(pSprite, pStage);
  assert.strictEqual(pDec2, pDec1, 'Full Suite 9 parity code must be 100% idempotent on second round-trip');

  // 9d. Sb3Bridge sprite & asset management helpers + .sb3 archive round-trip
  const customSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20" viewBox="0 0 40 20"><rect width="40" height="20" fill="#ff0000"/></svg>';
  const addedSvgCostume = addCostumeAsset(pJson, pAssets, 1, 'hero_badge', 'svg', customSvg);
  assert.strictEqual(addedSvgCostume.name, 'hero_badge');
  assert.strictEqual(addedSvgCostume.rotationCenterX, 20);
  assert.strictEqual(addedSvgCostume.rotationCenterY, 10);
  assert(pAssets.has(addedSvgCostume.md5ext), 'Added SVG costume must be stored in assetsMap');

  // Minimal 24-byte PNG header (16x12) to verify raster dimension & center parsing
  const pngHeader = new Uint8Array(24);
  pngHeader.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  pngHeader.set([0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52], 8);
  new DataView(pngHeader.buffer).setUint32(16, 16, false);
  new DataView(pngHeader.buffer).setUint32(20, 12, false);
  const addedPngCostume = addCostumeAsset(pJson, pAssets, 1, 'pixel_skin', 'png', pngHeader);
  assert.strictEqual(addedPngCostume.dataFormat, 'png');
  assert.strictEqual(addedPngCostume.rotationCenterX, 8);
  assert.strictEqual(addedPngCostume.rotationCenterY, 6);
  assert(pAssets.has(addedPngCostume.md5ext), 'Added PNG costume must be stored in assetsMap');

  // Copy an existing WAV buffer to test addSoundAsset metadata parsing
  const existingPopWav = pAssets.get(pStage.sounds[0].md5ext);
  const addedSound = addSoundAsset(pJson, pAssets, 1, 'hero_beep', 'wav', existingPopWav);
  assert.strictEqual(addedSound.dataFormat, 'wav');
  assert.strictEqual(addedSound.rate, 22050);
  assert(addedSound.sampleCount > 0, 'WAV sampleCount should be parsed');
  assert(pAssets.has(addedSound.md5ext), 'Added WAV sound must be stored in assetsMap');

  updateSpriteProps(pJson, 1, {
    x: 35,
    y: -20,
    size: 125,
    direction: 45,
    visible: false,
    draggable: true,
    rotationStyle: 'left-right'
  });
  assert.strictEqual(pSprite.x, 35);
  assert.strictEqual(pSprite.y, -20);
  assert.strictEqual(pSprite.size, 125);
  assert.strictEqual(pSprite.direction, 45);
  assert.strictEqual(pSprite.visible, false);
  assert.strictEqual(pSprite.draggable, true);
  assert.strictEqual(pSprite.rotationStyle, 'left-right');

  renameSprite(pJson, 1, 'Hero');
  assert.strictEqual(pSprite.name, 'Hero');
  assert.strictEqual(pJson.targets.length, 3);
  const removedSprite = deleteSprite(pJson, 2);
  assert.strictEqual(removedSprite.name, 'Target2');
  assert.strictEqual(pJson.targets.length, 2);
  assert.throws(() => deleteSprite(pJson, 0), /Stage/);
  assert.throws(() => deleteSprite(pJson, 1), /останній/);

  const pArchiveBytes = await saveSb3(pJson, pAssets, 'uint8array');
  const pUnpacked = await loadSb3(pArchiveBytes);
  const uStage = pUnpacked.projectJson.targets[0];
  const uHero = pUnpacked.projectJson.targets[1];
  assert.strictEqual(uHero.name, 'Hero');
  assert.strictEqual(uHero.x, 35);
  assert.strictEqual(uHero.draggable, true);
  assert(pUnpacked.assetsMap.has(addedSvgCostume.md5ext), 'Custom SVG costume must survive .sb3 round-trip');
  assert(pUnpacked.assetsMap.has(addedPngCostume.md5ext), 'Custom PNG costume must survive .sb3 round-trip');
  assert(pUnpacked.assetsMap.has(addedSound.md5ext), 'Custom WAV sound must survive .sb3 round-trip');
  assert.strictEqual(
    decompileTarget(uHero, uStage),
    pDec1.replace('# === СКРИПТ ГРАВЦЯ (Sprite1) ===', '# === СКРИПТ ГРАВЦЯ (Hero) ==='),
    'Unpacked Hero sprite must decompile identically with updated sprite name header'
  );

  // 9e. StagePreview end-to-end execution: clone isolation, @warp speed, loop counter i, layers, sensing, sound, monitors & math
  const pixelMockCtx = {
    ...mockCtx,
    imageSmoothingEnabled: true,
    filter: 'none',
    globalAlpha: 1,
    getImageData(x, y, w, h) {
      const data = new Uint8ClampedArray(w * h * 4);
      if (w >= 2 && h >= 1) {
        // Pixel (0,0) = #ff0000, Pixel (1,0) = #00ff00
        data[0] = 255; data[1] = 0; data[2] = 0; data[3] = 255;
        data[4] = 0; data[5] = 255; data[6] = 0; data[7] = 255;
      }
      return { data, width: w, height: h };
    }
  };

  const sim2 = new StagePreview({ width: 480, height: 360, getContext: () => pixelMockCtx });
  const execProj = createDefaultProject();
  const execJson = execProj.projectJson;
  const execAssets = execProj.assetsMap;
  const execStage = execJson.targets[0];
  const execS1 = execJson.targets[1];
  const execS2 = addSpriteToProject(execJson, execAssets, 'Sprite2');

  const execCodeS1 = `
@warp
def fast_sum(n):
    for i in range(n):
        warp_total += i

@when_flag_clicked
def main():
    self.hp = 100
    local_list("inv")
    local_list_add("inv", "shield")
    create_clone("myself")
    goto(42, -17)
    broadcast_and_wait("inspect_s1")

    glide_to(0, "random")
    glide_x = x_position()
    glide_y = y_position()

    switch_backdrop_and_wait("level_2")
    after_bg_wait = bg_done

    go_to_layer("front")
    front_layer = 1
    change_layer("backward", 1)

    set_sound_effect("pitch", 20)
    change_sound_effect("pan", -10)
    broadcast_and_wait("capture_sound_fx")
    clear_sound_effects()

    set_drag_mode("draggable")
    hit_red = touching_color("#ff0000")
    hit_blue = touching_color("#0000ff")
    hit_pair = color_is_touching_color("#ff0000", "#00ff00")
    yr = current_time("year")
    d2k = days_since_2000()
    uname = username()
    loud = loudness()

    list_clear("bag")
    list_add("bag", "one")
    list_add("bag", "two")
    idx_two = list_index_of("bag", "two")
    show_variable("idx_two")
    show_list("bag")
    hide_variable("hidden_v")
    hide_list("hidden_l")

    s_len = len("hello")
    m_exp = exp(0)
    m_pow10 = pow10(2)
    m_tan = tan(45)
    m_asin = asin(1)
    m_acos = acos(1)
    m_atan = atan(1)
    m_ln = ln(1)
    m_log = log(100)

    warp_total = 0
    fast_sum(40)

    loop_sum = 0
    for i in range(5):
        loop_sum += i

    wait(0.12)

@when_cloned
def on_clone():
    self.hp -= 25
    local_list_add("inv", "potion")
    clone_inv_idx = local_list_index_of("inv", "potion")
    clone_inv_item = local_list_item("inv", 2)

@when_backdrop_switches("level_2")
def on_bg():
    wait(0.04)
    bg_done = 1

@when_greater_than("timer", 0.01)
def on_gt():
    gt_triggered += 1
`;

  const execCodeS2 = `
@when_message_received("inspect_s1")
def inspect():
    s1_attr_x = attribute_of("x position", "Sprite1")
    s1_attr_hp = attribute_of("hp", "Sprite1")
`;

  const astStage = compileToScratch('', execStage, execStage, execJson).ast;
  const astS1 = compileToScratch(execCodeS1, execS1, execStage, execJson).ast;
  const astS2 = compileToScratch(execCodeS2, execS2, execStage, execJson).ast;

  const astByIdx = new Map([
    [0, astStage],
    [1, astS1],
    [2, astS2]
  ]);

  // Attach a small listener via broadcast to capture soundEffects before clear_sound_effects()
  let capturedPitch = null;
  let capturedPan = null;
  const origTriggerBroadcast = sim2.triggerBroadcast.bind(sim2);
  sim2.triggerBroadcast = function (msg) {
    if (msg === 'capture_sound_fx') {
      const s1Actor = sim2.actors.find((a) => !a.isStage && !a.isClone && a.name === 'Sprite1');
      if (s1Actor && s1Actor.soundEffects) {
        capturedPitch = s1Actor.soundEffects.pitch;
        capturedPan = s1Actor.soundEffects.pan;
      }
      return Promise.resolve([]);
    }
    return origTriggerBroadcast(msg);
  };

  const tStart = Date.now();
  await sim2.runProject(astByIdx, execJson, execAssets);
  const elapsedMs = Date.now() - tStart;

  const parentS1 = sim2.actors.find((a) => !a.isStage && !a.isClone && a.name === 'Sprite1');
  const cloneS1 = sim2.actors.find((a) => a.isClone && a.name === 'Sprite1');
  const actorS2 = sim2.actors.find((a) => !a.isStage && !a.isClone && a.name === 'Sprite2');

  assert(parentS1 && cloneS1 && actorS2, 'Parent Sprite1, its clone, and Sprite2 must exist in StagePreview');
  assert.strictEqual(parentS1.localVars.hp, 100, 'Parent self.hp must stay 100');
  assert.strictEqual(cloneS1.localVars.hp, 75, 'Clone self.hp must be isolated and equal 75');
  assert.deepStrictEqual(parentS1.localLists.inv, ['shield'], 'Parent local_list inv must stay ["shield"]');
  assert.deepStrictEqual(cloneS1.localLists.inv, ['shield', 'potion'], 'Clone local_list inv must include "potion"');
  assert.strictEqual(sim2.vars.clone_inv_idx, 2, 'local_list_index_of inside clone should return 2');
  assert.strictEqual(sim2.vars.clone_inv_item, 'potion', 'local_list_item inside clone should return "potion"');

  assert.strictEqual(sim2.vars.s1_attr_x, 42, 'attribute_of("x position", "Sprite1") should return 42');
  assert.strictEqual(sim2.vars.s1_attr_hp, 100, 'attribute_of("hp", "Sprite1") should read parent self.hp=100');
  assert(typeof sim2.vars.glide_x === 'number' && Math.abs(sim2.vars.glide_x) <= 220, 'glide_to(0, "random") must update X within random bounds');
  assert(typeof sim2.vars.glide_y === 'number' && Math.abs(sim2.vars.glide_y) <= 160, 'glide_to(0, "random") must update Y within random bounds');
  assert.strictEqual(sim2.vars.after_bg_wait, 1, 'switch_backdrop_and_wait must await backdrop handler completion');
  assert(parentS1.layerOrder < actorS2.layerOrder, 'After go_to_layer("front") then change_layer("backward", 1), Sprite1 must sit behind Sprite2');
  assert.strictEqual(capturedPitch, 20, 'set_sound_effect("pitch", 20) must set pitch=20');
  assert.strictEqual(capturedPan, -10, 'change_sound_effect("pan", -10) must set pan=-10');
  assert.deepStrictEqual(parentS1.soundEffects, { pitch: 0, pan: 0 }, 'clear_sound_effects() must reset soundEffects');
  assert.strictEqual(parentS1.draggable, true, 'set_drag_mode("draggable") must set actor.draggable=true');
  assert.strictEqual(sim2.vars.hit_red, true, 'touching_color("#ff0000") must match mocked red pixel');
  assert.strictEqual(sim2.vars.hit_blue, false, 'touching_color("#0000ff") must not match missing blue pixel');
  assert.strictEqual(sim2.vars.hit_pair, true, 'color_is_touching_color("#ff0000", "#00ff00") must match adjacent pixels');
  assert.strictEqual(sim2.vars.yr, new Date().getFullYear(), 'current_time("year") must match current year');
  assert(sim2.vars.d2k > 9000, 'days_since_2000() must be > 9000');
  assert.strictEqual(sim2.vars.uname, 'player', 'username() must return "player"');
  assert.strictEqual(sim2.vars.loud, 0, 'loudness() must return 0 in headless mode');
  assert.strictEqual(sim2.vars.idx_two, 2, 'list_index_of("bag", "two") must return 2');
  assert(sim2.visibleMonitors.has('idx_two') && sim2.visibleMonitors.has('bag'), 'show_variable/show_list must register visible monitors');
  assert(sim2.hiddenMonitors.has('hidden_v') && sim2.hiddenMonitors.has('hidden_l'), 'hide_variable/hide_list must register hidden monitors');

  assert.strictEqual(sim2.vars.s_len, 5, 'len("hello") must return 5');
  assert.strictEqual(sim2.vars.m_exp, 1, 'exp(0) must return 1');
  assert.strictEqual(sim2.vars.m_pow10, 100, 'pow10(2) must return 100');
  assert(Math.abs(sim2.vars.m_tan - 1) < 1e-3, 'tan(45) must be ~1');
  assert(Math.abs(sim2.vars.m_asin - 90) < 1e-6, 'asin(1) must be 90 degrees');
  assert(Math.abs(sim2.vars.m_acos) < 1e-6, 'acos(1) must be 0 degrees');
  assert(Math.abs(sim2.vars.m_atan - 45) < 1e-6, 'atan(1) must be 45 degrees');
  assert(Math.abs(sim2.vars.m_ln) < 1e-6, 'ln(1) must be 0');
  assert(Math.abs(sim2.vars.m_log - 2) < 1e-6, 'log(100) must be 2');

  assert.strictEqual(sim2.vars.warp_total, 780, '@warp fast_sum(40) must compute 0+1+...+39 = 780');
  assert.strictEqual(sim2.vars.loop_sum, 10, 'Loop counter i inside for i in range(5) must yield 0+1+2+3+4 = 10');
  assert(elapsedMs < 550, `@warp loop of 40 iterations must skip 16ms sleeps (actual ${elapsedMs}ms)`);
  assert(sim2.vars.gt_triggered >= 1, '@when_greater_than("timer", 0.01) must trigger');

  sim2.reset();

  console.log('--- 10. Testing .sb3 Inspector, Asset Optimizer, i18n & Game Snippets (pong, maze, clicker) ---');
  const inspProj = createDefaultProject();
  const inspStage = inspProj.projectJson.targets.find((t) => t.isStage);
  const inspSprite = inspProj.projectJson.targets.find((t) => !t.isStage);
  compileToScratch('@when_flag_clicked\ndef go():\n    move(10)\n', inspSprite, inspStage, inspProj.projectJson);

  const report1 = Inspector.analyzeProject(inspProj.projectJson, inspProj.assetsMap);
  assert.strictEqual(report1.spritesCount, 1, 'Inspector must count 1 sprite');
  assert(report1.backdropsCount >= 1, 'Inspector must count stage backdrops');
  assert(report1.costumesCount >= 1, 'Inspector must count sprite costumes');
  assert(report1.totalBlocks >= 2, 'Inspector must count compiled blocks');
  assert.strictEqual(report1.orphanScripts, 0, 'Compiled hat script must have 0 orphan scripts');
  assert.strictEqual(report1.isProjectJsonOversized, false, 'Default project.json must be under 5 MB limit');

  // Orphan script detection
  inspSprite.blocks.orphan_1 = {
    opcode: 'motion_movesteps',
    next: null,
    parent: null,
    inputs: {},
    fields: {},
    shadow: false,
    topLevel: true,
    x: 0,
    y: 0
  };
  const reportOrphan = Inspector.analyzeProject(inspProj.projectJson, inspProj.assetsMap);
  assert.strictEqual(reportOrphan.orphanScripts, 1, 'Inspector must detect orphan top-level non-hat script');
  delete inspSprite.blocks.orphan_1;

  // Unused asset cleanup
  const unusedKey = 'deadbeefdeadbeefdeadbeefdeadbeef.png';
  inspProj.assetsMap.set(unusedKey, new Uint8Array([1, 2, 3, 4]));
  const reportUnused = Inspector.analyzeProject(inspProj.projectJson, inspProj.assetsMap);
  assert.strictEqual(reportUnused.unusedAssets.length, 1, 'Inspector must detect 1 unused asset');
  const cleaned = Inspector.removeUnusedAssets(inspProj.projectJson, inspProj.assetsMap);
  assert.strictEqual(cleaned.removedCount, 1, 'removeUnusedAssets must remove 1 unused asset');
  assert.strictEqual(cleaned.freedBytes, 4, 'removeUnusedAssets must report 4 freed bytes');
  assert(!inspProj.assetsMap.has(unusedKey), 'Unused key must be deleted from assetsMap');

  // Asset replacement & MD5 hash update
  const oldCostume = inspSprite.costumes[0];
  const oldMd5ext = oldCostume.md5ext;
  const newPngBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]);
  const replaced = Inspector.replaceAssetData(inspProj.projectJson, inspProj.assetsMap, oldMd5ext, newPngBytes, 'png', md5);
  assert.strictEqual(replaced.newAssetId, md5(newPngBytes), 'replaceAssetData must compute exact MD5');
  assert.strictEqual(replaced.newMd5ext, `${md5(newPngBytes)}.png`, 'replaceAssetData must build new md5ext');
  assert.strictEqual(oldCostume.assetId, replaced.newAssetId, 'Target costume assetId must update');
  assert.strictEqual(oldCostume.md5ext, replaced.newMd5ext, 'Target costume md5ext must update');
  assert(inspProj.assetsMap.has(replaced.newMd5ext), 'assetsMap must contain new asset key');
  assert(!inspProj.assetsMap.has(oldMd5ext), 'assetsMap must remove old asset key');

  // i18n completeness across uk / en / ru
  const ukKeys = Object.keys(I18n.DICT.uk).sort();
  for (const lang of ['en', 'ru']) {
    assert.deepStrictEqual(Object.keys(I18n.DICT[lang]).sort(), ukKeys, `i18n dictionary for ${lang} must match uk keys`);
    I18n.setLang(lang, false);
    assert.strictEqual(I18n.getLang(), lang);
    assert(I18n.t('tab_inspector').length > 0);
  }
  I18n.setLang('uk', false);

  // Extract SNIPPETS from js/app.js and test pong, maze, clicker (compile + decompile + run)
  const appSource = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
  const snippetsMatch = appSource.match(/const SNIPPETS = (\{[\s\S]*?\n  \});/);
  assert(snippetsMatch, 'SNIPPETS object must exist in js/app.js');
  const SNIPPETS = new Function(`return ${snippetsMatch[1]};`)();

  for (const gameKey of ['pong', 'maze', 'clicker']) {
    assert(typeof SNIPPETS[gameKey] === 'string' && SNIPPETS[gameKey].length > 20, `Snippet ${gameKey} must exist`);
    const gProj = createDefaultProject();
    const gStage = gProj.projectJson.targets.find((t) => t.isStage);
    const gSprite = gProj.projectJson.targets.find((t) => !t.isStage);

    const compiledGame = compileToScratch(SNIPPETS[gameKey], gSprite, gStage, gProj.projectJson);
    assert(Object.keys(compiledGame.blocks).length > 5, `${gameKey} must compile to >5 Scratch blocks`);

    const decompiledGame = decompileTarget(gSprite, gStage);
    const recompiledGame = compileToScratch(decompiledGame, gSprite, gStage, gProj.projectJson);
    assert(Object.keys(recompiledGame.blocks).length > 5, `${gameKey} must re-compile cleanly after decompilation`);

    const gSim = new StagePreview({ width: 480, height: 360, getContext: () => mockCtx });
    const astMap = new Map([[1, parse(tokenize(SNIPPETS[gameKey]))]]);
    gSim.runProject(astMap, gProj.projectJson, gProj.assetsMap);
    await new Promise((r) => setTimeout(r, 60));
    gSim.reset();
  }

  console.log('ALL 10 TEST SUITES PASSED SUCCESSFULLY!');
}

runAllTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
