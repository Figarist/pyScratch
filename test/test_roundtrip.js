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
    pDec1.replace('# === СКРИПТ ГРАВЦЯ (Sprite1) ===', '# === СКРИПТ ГРАВЦЯ (Hero) ===').replace('attribute_of("x position", "Sprite1")', 'attribute_of("x position", "Hero")'),
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

  console.log('--- 11. Testing Reliability Audit Regression Fixes (F-01..F-11) ---');
  // F-01: Orphan variable/list/broadcast cleanup & pen extension removal on recompile
  const f01Proj = createDefaultProject();
  const f01Stage = f01Proj.projectJson.targets[0];
  const f01Sprite = f01Proj.projectJson.targets[1];
  compileToScratch('@when_flag_clicked\ndef main():\n    temp_x = 1\n    pen_down()\n    broadcast("temp_bc")\n', f01Sprite, f01Stage, f01Proj.projectJson);
  assert(Object.values(f01Stage.variables).some((v) => v[0] === 'temp_x'));
  assert(f01Proj.projectJson.extensions.includes('pen'));
  compileToScratch('@when_flag_clicked\ndef main():\n    final_x = 2\n', f01Sprite, f01Stage, f01Proj.projectJson);
  assert(!Object.values(f01Stage.variables).some((v) => v[0] === 'temp_x'), 'Orphan variable temp_x must be cleaned up');
  assert(Object.values(f01Stage.variables).some((v) => v[0] === 'final_x'), 'Active variable final_x must remain');
  assert(!Object.values(f01Stage.broadcasts).includes('temp_bc'), 'Orphan broadcast temp_bc must be cleaned up');
  assert(!f01Proj.projectJson.extensions.includes('pen'), 'Unused pen extension must be removed');

  // F-04: while inequality without double negation + leading-zero string literal preservation
  compileToScratch('@when_flag_clicked\ndef main():\n    say("007", 1)\n    while x != 10:\n        x += 1\n', f01Sprite, f01Stage, f01Proj.projectJson);
  const f04Dec = decompileTarget(f01Sprite, f01Stage);
  assert(f04Dec.includes('say("007", 1)'), 'Leading-zero string "007" must stay quoted');
  assert(!f04Dec.includes('not (not'), 'while x != 10 must not produce double negation');

  // F-07: Reserved Python keywords in variable names & duplicate event handler deduplication
  f01Sprite.blocks = {
    h1: { opcode: 'event_whenthisspriteclicked', next: 's1', parent: null, inputs: {}, fields: {}, shadow: false, topLevel: true, x: 0, y: 0 },
    s1: { opcode: 'data_setvariableto', next: null, parent: 'h1', inputs: { VALUE: [1, [10, '1']] }, fields: { VARIABLE: ['pass', 'v_pass'] }, shadow: false, topLevel: false },
    h2: { opcode: 'event_whenthisspriteclicked', next: null, parent: null, inputs: {}, fields: {}, shadow: false, topLevel: true, x: 0, y: 100 }
  };
  f01Stage.variables.v_pass = ['pass', 0];
  const f07Dec = decompileTarget(f01Sprite, f01Stage);
  assert(f07Dec.includes('pass_var = 1'), 'Reserved keyword variable "pass" must be sanitized');
  assert(f07Dec.includes('def on_sprite_clicked():') && f07Dec.includes('def on_sprite_clicked_2():'), 'Duplicate handlers must get unique names');
  compileToScratch(f07Dec, f01Sprite, f01Stage, f01Proj.projectJson);

  // F-03, F-05, F-06, F-08: StagePreview key-repeat guard, stop("all") ask cleanup, clearRect, cache pruning, Scratch comparisons
  let clearRectCalled = 0;
  const auditMockCtx = {
    ...mockCtx,
    clearRect() { clearRectCalled++; }
  };
  let lastAskPrompt = 'init';
  const simAudit = new StagePreview(
    { width: 480, height: 360, getContext: () => auditMockCtx },
    { onAsk: (q) => { lastAskPrompt = q; } }
  );
  clearRectCalled = 0;
  simAudit.render();
  assert(clearRectCalled >= 1, 'StagePreview.render() must call ctx.clearRect before drawing');

  simAudit.imageCache.set('stale.png', {});
  simAudit._audioBufferCache.set('stale.wav', {});
  simAudit.syncProjectAssets(f01Proj.projectJson, f01Proj.assetsMap);
  assert(!simAudit.imageCache.has('stale.png'), 'Stale imageCache entries must be pruned');
  assert(!simAudit._audioBufferCache.has('stale.wav'), 'Stale _audioBufferCache entries must be pruned');

  const cmpAst = parse(tokenize(`
@when_flag_clicked
def main():
    flag = True
    bool_ok = (flag == "true")
    str_lt = ("apple" < "banana")
    if flag:
        branch_ok = 1

@when_key_pressed("space")
def on_space():
    key_runs += 1
    wait(0.08)
`));
  await simAudit.runAst(cmpAst);
  assert.strictEqual(simAudit.vars.bool_ok, true, 'Boolean true == "true" must evaluate to true');
  assert.strictEqual(simAudit.vars.str_lt, true, 'String comparison "apple" < "banana" must evaluate to true');
  simAudit.triggerKey('space');
  simAudit.triggerKey('space'); // rapid key repeat while running
  await new Promise((r) => setTimeout(r, 120));
  assert.strictEqual(simAudit.vars.key_runs, 1, 'Key repeat must not spawn duplicate concurrent handlers');

  const askStopAst = parse(tokenize(`
@when_flag_clicked
def main():
    ask("Name?")

@when_flag_clicked
def stopper():
    wait(0.02)
    stop("all")
`));
  await simAudit.runAst(askStopAst);
  assert.strictEqual(lastAskPrompt, null, 'stop("all") must close active ask() overlay');
  simAudit.reset();

  // F-09: Empty WAV chunk (chunkSize === 0) & uppercase .SVG loading
  const baseWav = f01Proj.assetsMap.get(f01Stage.sounds[0].md5ext);
  const junkChunk = new Uint8Array(8);
  junkChunk.set([0x4a, 0x55, 0x4e, 0x4b, 0, 0, 0, 0]); // "JUNK" + size 0
  const wavWithEmptyChunk = new Uint8Array(baseWav.length + 8);
  wavWithEmptyChunk.set(baseWav.slice(0, 12), 0);
  wavWithEmptyChunk.set(junkChunk, 12);
  wavWithEmptyChunk.set(baseWav.slice(12), 20);
  new DataView(wavWithEmptyChunk.buffer).setUint32(4, wavWithEmptyChunk.length - 8, true);
  const wavAdded = addSoundAsset(f01Proj.projectJson, f01Proj.assetsMap, 1, 'junk_wav', 'wav', wavWithEmptyChunk);
  assert(wavAdded.sampleCount > 0, 'WAV with empty JUNK chunk must still parse sampleCount');

  const upperZip = new global.JSZip();
  upperZip.file('project.json', JSON.stringify(f01Proj.projectJson));
  upperZip.file('TESTASSET.SVG', '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>');
  const upperBuf = await upperZip.generateAsync({ type: 'uint8array' });
  const upperLoaded = await loadSb3(upperBuf);
  assert(upperLoaded.assetsMap.get('TESTASSET.SVG') instanceof Uint8Array, 'Uppercase .SVG must load as bytes');

  console.log('--- 12. Testing Reliability Audit Round 2 Fixes (N-01..N-11) ---');
  // N-02 & N-10: Custom procedure parameter sanitization in body & non-numeric shadow type 4..8
  const n02Target = {
    isStage: false,
    name: 'N02Sprite',
    variables: {},
    lists: {},
    blocks: {
      def1: {
        opcode: 'procedures_definition',
        next: 'call1',
        parent: null,
        inputs: { custom_block: [1, 'proto1'] },
        fields: {},
        shadow: false,
        topLevel: true,
        x: 0,
        y: 0
      },
      proto1: {
        opcode: 'procedures_prototype',
        next: null,
        parent: 'def1',
        inputs: {},
        fields: {},
        shadow: true,
        mutation: {
          tagName: 'mutation',
          children: [],
          proccode: 'step_proc %s',
          argumentids: '["arg1"]',
          argumentnames: '["step size"]',
          argumentdefaults: '[""]',
          warp: 'false'
        }
      },
      call1: {
        opcode: 'motion_movesteps',
        next: 'call2',
        parent: 'def1',
        inputs: { STEPS: [3, 'arg_rep1', [4, '10']] },
        fields: {},
        shadow: false,
        topLevel: false
      },
      arg_rep1: {
        opcode: 'argument_reporter_string_number',
        next: null,
        parent: 'call1',
        inputs: {},
        fields: { VALUE: ['step size', null] },
        shadow: false,
        topLevel: false
      },
      call2: {
        opcode: 'motion_movesteps',
        next: null,
        parent: 'call1',
        inputs: { STEPS: [1, [4, 'abc']] },
        fields: {},
        shadow: false,
        topLevel: false
      }
    }
  };
  const n02Dec = decompileTarget(n02Target, f01Stage);
  assert(n02Dec.includes('def step_proc(step_size):'), 'Procedure param must be sanitized');
  assert(n02Dec.includes('move(step_size)'), 'Argument reporter must use sanitized ident');
  assert(n02Dec.includes('move("abc")'), 'Non-numeric type 4 literal must be quoted as string');
  compileToScratch(n02Dec, n02Target, f01Stage, f01Proj.projectJson);

  // N-03: Cycle protection in decompileChain and decompileReporter
  const cyclicTarget = {
    isStage: false,
    name: 'Cyclic',
    variables: {},
    lists: {},
    blocks: {
      hat: { opcode: 'event_whenflagclicked', next: 'b1', parent: null, inputs: {}, fields: {}, shadow: false, topLevel: true, x: 0, y: 0 },
      b1: { opcode: 'motion_movesteps', next: 'b2', parent: 'hat', inputs: { STEPS: [3, 'rep1', [4, '1']] }, fields: {}, shadow: false, topLevel: false },
      b2: { opcode: 'motion_turnright', next: 'b1', parent: 'b1', inputs: { DEGREES: [1, [4, '15']] }, fields: {}, shadow: false, topLevel: false },
      rep1: { opcode: 'operator_add', next: null, parent: 'b1', inputs: { NUM1: [3, 'rep1', [4, '0']], NUM2: [1, [4, '1']] }, fields: {}, shadow: false, topLevel: false }
    }
  };
  const cyclicDec = decompileTarget(cyclicTarget, f01Stage);
  assert(cyclicDec.includes('move('), 'Cyclic block graph must decompile without hanging or stack overflow');

  // N-04, N-05, N-08: show_variable(self.hp), NaN coercion, stop("other scripts in sprite") ask cleanup
  let n08Ask = 'init';
  const simN = new StagePreview(
    { width: 480, height: 360, getContext: () => mockCtx },
    { onAsk: (q) => { n08Ask = q; } }
  );
  const nAst = parse(tokenize(`
@when_flag_clicked
def main():
    self.hp = 100
    show_variable(self.hp)
    goto("bad_x", 25)
    glide("bad_secs", 50, -30)
    turn_right("bad_deg")
    ask("Still there?")

@when_flag_clicked
def cancel_other():
    wait(0.02)
    stop("other scripts in sprite")
`));
  await simN.runAst(nAst);
  assert(simN.visibleMonitors.has('hp') && !simN.visibleMonitors.has('100'), 'show_variable(self.hp) must register monitor "hp", not its value');
  assert(Number.isFinite(simN.sprite.x) && simN.sprite.x === 50, 'glide with NaN secs must snap to finite X=50');
  assert(Number.isFinite(simN.sprite.y) && simN.sprite.y === -30, 'glide with NaN secs must snap to finite Y=-30');
  assert(Number.isFinite(simN.sprite.direction), 'turn_right with NaN must keep finite direction');
  assert.strictEqual(n08Ask, null, 'stop("other scripts in sprite") must close active ask() from stopped sibling');
  simN.reset();

  // N-07: Empty targets validation in loadSb3 & project.json guard in saveSb3
  const emptyZip = new global.JSZip();
  emptyZip.file('project.json', JSON.stringify({ targets: [] }));
  const emptyBuf = await emptyZip.generateAsync({ type: 'uint8array' });
  await assert.rejects(() => loadSb3(emptyBuf), /Некоректна структура project\.json/);

  const guardMap = new Map(f01Proj.assetsMap);
  guardMap.set('project.json', '{"targets":[]}');
  const guardBuf = await saveSb3(f01Proj.projectJson, guardMap, 'uint8array');
  const guardLoaded = await loadSb3(guardBuf);
  assert(guardLoaded.projectJson.targets.length >= 2, 'saveSb3 must not let assetsMap overwrite project.json');

  // N-11: i18n parameter substitution with $& / $$
  const i18nMsg = I18n.t('insp_clean_done', { count: 2, size: '$& $$ 10 KB' });
  assert(i18nMsg.includes('$& $$ 10 KB'), 'i18n.t must preserve literal $ sequences in params');

  console.log('--- 13. Testing Audit 2026-11 Fixes (raw scripts, for-counter, monitors, whitelists, DSL syntax) ---');
  {
    const mk = () => {
      const proj = createDefaultProject();
      return { json: proj.projectJson, stage: proj.projectJson.targets[0], sprite: proj.projectJson.targets[1] };
    };
    const compileErr = (src, onStage = false) => {
      const c = mk();
      try {
        compileToScratch(src, onStage ? c.stage : c.sprite, c.stage, c.json);
      } catch (e) {
        return e;
      }
      return null;
    };
    const ops = (t) => Object.values(t.blocks).map((b) => b.opcode);

    // 0.1 Unsupported scripts survive recompilation of an imported project
    {
      const c = mk();
      c.sprite.blocks = {
        b_1: { opcode: 'event_whenflagclicked', next: 'b_2', parent: null, inputs: {}, fields: {}, shadow: false, topLevel: true, x: 10, y: 10 },
        b_2: { opcode: 'motion_movesteps', next: null, parent: 'b_1', inputs: { STEPS: [1, [4, '10']] }, fields: {}, shadow: false, topLevel: false },
        b_3: { opcode: 'makeymakey_whenMakeyKeyPressed', next: 'b_4', parent: null, inputs: { KEY: [1, 'b_5'] }, fields: {}, shadow: false, topLevel: true, x: 300, y: 300 },
        b_4: { opcode: 'videoSensing_videoToggle', next: null, parent: 'b_3', inputs: { NOTE: [1, [4, '60']], BEATS: [1, [4, '0.25']] }, fields: {}, shadow: false, topLevel: false },
        b_5: { opcode: 'makeymakey_menu_KEY', next: null, parent: 'b_3', inputs: {}, fields: { KEY: ['_mouse_', null] }, shadow: true, topLevel: false }
      };
      c.sprite.comments = {
        cm_dead: { blockId: 'b_2', x: 0, y: 0, width: 100, height: 100, minimized: false, text: 'gone' },
        cm_raw: { blockId: 'b_4', x: 0, y: 0, width: 100, height: 100, minimized: false, text: 'kept' },
        cm_ws: { blockId: null, x: 0, y: 0, width: 100, height: 100, minimized: false, text: 'workspace' }
      };
      const code = decompileTarget(c.sprite, c.stage);
      assert(code.includes('@when_flag_clicked') && code.includes('move(10)'), 'supported script still decompiles');
      assert(code.includes('makeymakey_whenMakeyKeyPressed'), 'unsupported script must be mentioned in a comment');
      assert(!code.includes('невідомий блок'), 'unsupported script must not be half-rendered');
      for (let round = 0; round < 3; round++) {
        compileToScratch(code, c.sprite, c.stage, c.json);
        const o = ops(c.sprite);
        assert.strictEqual(o.filter((x) => x === 'videoSensing_videoToggle').length, 1, 'raw script kept exactly once (round ' + round + ')');
        assert.strictEqual(o.filter((x) => x === 'makeymakey_whenMakeyKeyPressed').length, 1, 'raw hat kept exactly once');
        assert.strictEqual(o.filter((x) => x === 'motion_movesteps').length, 1, 'compiled script not duplicated');
      }
      const rawHatId = Object.keys(c.sprite.blocks).find((k) => c.sprite.blocks[k].opcode === 'makeymakey_whenMakeyKeyPressed');
      const rawHat = c.sprite.blocks[rawHatId];
      assert.notStrictEqual(c.sprite.blocks[rawHat.next].opcode, undefined, 'raw next link resolves');
      assert.strictEqual(c.sprite.blocks[rawHat.next].parent, rawHatId, 'raw parent link follows the id remap');
      assert.strictEqual(c.sprite.blocks[rawHat.inputs.KEY[1]].opcode, 'makeymakey_menu_KEY', 'raw shadow input follows id remap');
      const flagHat = Object.values(c.sprite.blocks).find((b) => b.opcode === 'event_whenflagclicked');
      assert(flagHat && flagHat.next && c.sprite.blocks[flagHat.next].opcode === 'motion_movesteps', 'compiled script intact next to raw');
      const commentTexts = Object.values(c.sprite.comments).map((cm) => cm.text).sort();
      assert.deepStrictEqual(commentTexts, ['kept', 'workspace'], 'comments of regenerated blocks are dropped, raw/workspace comments kept');
      const keptCm = Object.values(c.sprite.comments).find((cm) => cm.text === 'kept');
      assert(c.sprite.blocks[keptCm.blockId], 'kept comment points at an existing block');
    }

    // 0.1b Raw custom block definitions stay callable from DSL code
    {
      const c = mk();
      c.sprite.blocks = {
        d1: { opcode: 'procedures_definition', next: 'd2', parent: null, inputs: { custom_block: [1, 'p1'] }, fields: {}, shadow: false, topLevel: true, x: 0, y: 0 },
        p1: { opcode: 'procedures_prototype', next: null, parent: 'd1', inputs: {}, fields: {}, shadow: true, topLevel: false,
          mutation: { tagName: 'mutation', children: [], proccode: 'jingle %s', argumentids: '["a1"]', argumentnames: '["n"]', argumentdefaults: '[""]', warp: 'false' } },
        d2: { opcode: 'videoSensing_setVideoTransparency', next: null, parent: 'd1', inputs: { TEMPO: [1, [4, '90']] }, fields: {}, shadow: false, topLevel: false }
      };
      compileToScratch('@when_flag_clicked\ndef main():\n    jingle(3)\n', c.sprite, c.stage, c.json);
      assert(ops(c.sprite).includes('videoSensing_setVideoTransparency'), 'raw procedure body preserved');
      const call = Object.values(c.sprite.blocks).find((b) => b.opcode === 'procedures_call');
      assert(call && call.mutation.proccode === 'jingle %s', 'call to a raw custom block compiles');
      assert(compileErr('def jingle(n):\n    move(n)\n') === null, 'sanity: plain def compiles on a fresh sprite');
    }

    // 0.3 for-loop counter
    {
      const c = mk();
      compileToScratch('@when_flag_clicked\ndef main():\n    t = 0\n    for i in range(3):\n        t += i\n    say(t)\n', c.sprite, c.stage, c.json);
      const bl = c.sprite.blocks;
      const rep = Object.values(bl).find((b) => b.opcode === 'control_repeat');
      const init = bl[rep.parent];
      assert.strictEqual(init.opcode, 'data_setvariableto', 'set i to 0 precedes repeat');
      assert.strictEqual(init.fields.VARIABLE[0], 'i');
      assert.strictEqual(init.next, Object.keys(bl).find((k) => bl[k] === rep), 'init links to repeat');
      let last = bl[rep.inputs.SUBSTACK[1]];
      while (last.next) last = bl[last.next];
      assert.strictEqual(last.opcode, 'data_changevariableby', 'change i by 1 ends the body');
      assert.strictEqual(last.inputs.VALUE[1][1], '1');
      const afterId = rep.next;
      assert(afterId && bl[afterId].opcode === 'looks_say', 'statement after the loop chains to the repeat block');
      const dec = decompileTarget(c.sprite, c.stage);
      assert(/for i in range\(3\):/.test(dec) && !/\bi = 0\b/.test(dec) && !/i \+= 1/.test(dec), 'decompiler folds the counter back into for i in range');
      const before = ops(c.sprite).sort().join();
      compileToScratch(dec, c.sprite, c.stage, c.json);
      assert.strictEqual(ops(c.sprite).sort().join(), before, 'for-loop round trip is stable');
      // unused loop variable adds no blocks
      const c2 = mk();
      compileToScratch('@when_flag_clicked\ndef main():\n    for i in range(3):\n        move(1)\n', c2.sprite, c2.stage, c2.json);
      assert(!ops(c2.sprite).includes('data_setvariableto') && !ops(c2.sprite).includes('data_changevariableby'), 'unused loop var: no counter blocks');
    }

    // 0.5 monitors of removed variables / lists are dropped
    {
      const c = mk();
      compileToScratch('@when_flag_clicked\ndef main():\n    score = 1\n    list_add("items", 1)\n', c.sprite, c.stage, c.json);
      const sid = Object.keys(c.stage.variables).find((k) => c.stage.variables[k][0] === 'score');
      const lid = Object.keys(c.stage.lists).find((k) => c.stage.lists[k][0] === 'items');
      c.json.monitors = [{ id: sid, mode: 'default' }, { id: lid, mode: 'list' }, { id: 'keep_me', mode: 'default' }];
      compileToScratch('@when_flag_clicked\ndef main():\n    move(1)\n', c.sprite, c.stage, c.json);
      assert.deepStrictEqual(c.json.monitors.map((m) => m.id), ['keep_me'], 'monitors of deleted var/list removed, others kept');
    }

    // Stage 1: whitelists
    for (const [src, needle] of [
      ['@when_flag_clicked\ndef m():\n    set_effect("sparkle", 5)\n', 'sparkle'],
      ['@when_flag_clicked\ndef m():\n    set_sound_effect("bass", 5)\n', 'bass'],
      ['@when_flag_clicked\ndef m():\n    set_rotation_style("spin")\n', 'spin'],
      ['@when_flag_clicked\ndef m():\n    set_drag_mode("yes")\n', 'yes'],
      ['@when_flag_clicked\ndef m():\n    stop("everything")\n', 'everything'],
      ['@when_flag_clicked\ndef m():\n    x = key_pressed("spacebar")\n', 'spacebar'],
      ['@when_key_pressed("F13")\ndef m():\n    move(1)\n', 'F13'],
      ['@when_flag_clicked\ndef m():\n    x = math_op("cube", 3)\n', 'cube'],
      ['@when_flag_clicked\ndef m():\n    x = current_time("week")\n', 'WEEK'],
      ['@when_flag_clicked\ndef m():\n    x = attribute_of("X position", "Stage")\n', 'x position']
    ]) {
      const e = compileErr(src);
      assert(e instanceof CompileError && /Недопустим/.test(e.message) && e.line >= 1, 'whitelist error for ' + needle + ': ' + (e && e.message));
    }
    assert.strictEqual(compileErr('@when_flag_clicked\ndef m():\n    set_effect("ghost", 5)\n    set_sound_effect("pan", 5)\n    set_rotation_style("left-right")\n    stop("this script")\n    x = math_op("e ^", 1)\n    y = current_time("hour")\n    z = attribute_of("my var", "Stage")\n'), null, 'valid values still compile');

    // Stage 1: sprite-only blocks on Stage
    for (const src of ['@when_flag_clicked\ndef m():\n    move(10)\n', '@when_flag_clicked\ndef m():\n    show()\n', '@when_flag_clicked\ndef m():\n    x = x_position()\n', '@when_cloned\ndef m():\n    wait(1)\n']) {
      const e = compileErr(src, true);
      assert(e instanceof CompileError && /лише спрайтам/.test(e.message), 'stage rejects sprite-only: ' + src.split('\n')[2] + ' -> ' + (e && e.message));
    }
    assert.strictEqual(compileErr('@when_flag_clicked\ndef m():\n    switch_backdrop("a")\n    next_backdrop()\n    wait(1)\n', true), null, 'stage-compatible blocks compile on Stage');

    // Stage 1: global / local name conflict
    {
      const c = mk();
      compileToScratch('@when_flag_clicked\ndef m():\n    hp = 1\n', c.stage, c.stage, c.json);
      assert.throws(
        () => compileToScratch('@when_flag_clicked\ndef m():\n    self.hp = 5\n', c.sprite, c.stage, c.json),
        (e) => e instanceof CompileError && /конфліктує з глобальною/.test(e.message) && e.line === 3
      );
    }

    // Stage 1: custom block argument count
    {
      const e = compileErr('def f(a, b):\n    move(a)\n\n@when_flag_clicked\ndef m():\n    f(1)\n');
      assert(e instanceof CompileError && e.line === 6 && /очікує/.test(e.message), 'wrong custom block arg count: ' + (e && e.message));
      assert.strictEqual(compileErr('def f(a, b):\n    move(a)\n\n@when_flag_clicked\ndef m():\n    f(1, 2)\n'), null);
    }

    // Stage 1: colour shadow 9 only for COLOR inputs
    {
      const c = mk();
      compileToScratch('@when_flag_clicked\ndef m():\n    say("#ff0000")\n    set_pen_color("#ff0000")\n    x = touching_color("#00ff00")\n', c.sprite, c.stage, c.json);
      const bl = Object.values(c.sprite.blocks);
      assert.strictEqual(bl.find((b) => b.opcode === 'looks_say').inputs.MESSAGE[1][0], 10, 'say("#ff0000") stays a string');
      assert.strictEqual(bl.find((b) => b.opcode === 'pen_setPenColorToColor').inputs.COLOR[1][0], 9, 'pen colour input is a colour');
      assert.strictEqual(bl.find((b) => b.opcode === 'sensing_touchingcolor').inputs.COLOR[1][0], 9);
    }

    // Stage 2: line continuation
    {
      const c = mk();
      compileToScratch('@when_flag_clicked\ndef m():\n    goto(\n        10,  # x\n        20\n    )\n    say(join("a",\n        "b"))\n    move(1 + \\\n        2)\n', c.sprite, c.stage, c.json);
      const o = ops(c.sprite);
      assert(o.includes('motion_gotoxy') && o.includes('operator_join') && o.includes('operator_add'), 'continuation inside () and after backslash');
      let e = compileErr('@when_flag_clicked\ndef m():\n    move(10\n    turn_right(5)\n');
      assert(e instanceof CompileError && e.line === 3 && /дужку/.test(e.message), 'unclosed bracket reports the opening line: ' + (e && e.message));
      e = compileErr('@when_flag_clicked\ndef m():\n    move(10))\n');
      assert(e instanceof CompileError && e.line === 3 && /Зайва/.test(e.message));
      e = compileErr('@when_flag_clicked\ndef m():\n    move(1) \\ x\n');
      assert(e instanceof CompileError && /\\/.test(e.message));
    }

    // Stage 2: friendly errors for Python constructs
    for (const [body, needle] of [
      ['    return 5', 'return'],
      ['    break', 'break'],
      ['    continue', 'continue'],
      ['    import math', 'import'],
      ['    x = lambda: 1', 'lambda'],
      ['    x = 2 ** 3', '**'],
      ['    say(f"hi {x}")', 'f-рядки'],
      ['    x = 1 if y else 2', 'Тернарний']
    ]) {
      const e = compileErr('@when_flag_clicked\ndef m():\n' + body + '\n');
      assert(e instanceof CompileError && e.message.includes(needle) && e.line === 3, 'friendly error for ' + needle + ': ' + (e && e.message));
    }
    {
      const e = compileErr('class A:\n    pass\n');
      assert(e instanceof CompileError && /class/.test(e.message) && e.line === 1, 'class at top level: ' + (e && e.message));
    }

    // Stage 2: columns on tokens and errors
    {
      const toks = tokenize('@when_flag_clicked\ndef m():\n    move(10)\n');
      const mv = toks.find((t) => t.value === 'move');
      assert.strictEqual(mv.line, 3);
      assert.strictEqual(mv.col, 5, 'token col is 1-based');
      const e = compileErr('@when_flag_clicked\ndef m():\n    say("a" $)\n');
      assert(e instanceof CompileError && e.line === 3 && e.col === 13, 'CompileError carries col: ' + (e && e.col));
    }

    // Stage 2: string escapes
    {
      const str = (lit) => tokenize('x = ' + lit + '\n').find((t) => t.type === 'STRING').value;
      assert.strictEqual(str('"a\\rb\\\\c\\\'d\\"e"'), 'a\rb\\c\'d"e');
      assert.strictEqual(str('"\\x41\\u0416\\n\\t"'), 'A\u0416\n\t');
      for (const bad of ['"\\q"', '"\\x4"', '"\\u12"']) {
        assert.throws(() => tokenize('x = ' + bad + '\n'), (e) => e instanceof CompileError && /escape/.test(e.message), 'bad escape ' + bad);
      }
      // JSON.stringify output from the decompiler must always be readable again
      const nasty = 'a"b\\c\nd\te\u0001f\u2028';
      assert.strictEqual(str(JSON.stringify(nasty)), nasty);
    }

    // Stage 2: Unicode identifiers and indentation message
    {
      const c = mk();
      compileToScratch('@when_flag_clicked\ndef m():\n    zähler = 1\n    变量 = 2\n    état += 1\n', c.sprite, c.stage, c.json);
      const names = Object.values(c.stage.variables).map((v) => v[0]);
      assert(names.includes('zähler') && names.includes('变量') && names.includes('état'), 'Unicode letters allowed in identifiers');
      const e = compileErr('@when_flag_clicked\ndef main():\n        move(1)\n    move(2)\n');
      assert(e instanceof CompileError && e.line === 4 && !/кратні 4/.test(e.message) && /відступ/.test(e.message), 'indent message matches the real rule: ' + (e && e.message));
    }
  }


  console.log('--- 14. Testing Stage 5 Blocks (when_touching, Music, boolean args, monitors, Text to Speech, Translate) ---');
  {
    const mk = () => {
      const proj = createDefaultProject();
      return { json: proj.projectJson, stage: proj.projectJson.targets[0], sprite: proj.projectJson.targets[1] };
    };
    const compileErr = (src, onStage = false) => {
      const c = mk();
      try {
        compileToScratch(src, onStage ? c.stage : c.sprite, c.stage, c.json);
      } catch (e) {
        return e;
      }
      return null;
    };
    const byOp = (t, op) => Object.values(t.blocks).filter((b) => b.opcode === op);
    // compile -> decompile -> compile -> decompile must be a fixed point
    const roundTrip = (src, c = mk()) => {
      compileToScratch(src, c.sprite, c.stage, c.json);
      const dec1 = decompileTarget(c.sprite, c.stage);
      const c2 = mk();
      compileToScratch(dec1, c2.sprite, c2.stage, c2.json);
      const dec2 = decompileTarget(c2.sprite, c2.stage);
      assert.strictEqual(dec2, dec1, 'second round-trip must be identical');
      return { c, dec1 };
    };

    // 14.1 @when_touching hat with the event_touchingobjectmenu shadow
    {
      const { c, dec1 } = roundTrip('@when_touching("Sprite2")\ndef on_touch():\n    move(10)\n\n@when_touching("edge")\ndef on_edge():\n    turn_right(15)\n\n@when_touching("mouse")\ndef on_mouse():\n    hide()\n');
      const hats = byOp(c.sprite, 'event_whentouchingobject');
      assert.strictEqual(hats.length, 3, 'three touching hats');
      const menu = c.sprite.blocks[hats[0].inputs.TOUCHINGOBJECTMENU[1]];
      assert.strictEqual(menu.opcode, 'event_touchingobjectmenu');
      assert(menu.shadow === true && menu.fields.TOUCHINGOBJECTMENU[0] === 'Sprite2', 'menu shadow carries the sprite name');
      assert.deepStrictEqual(hats.map((h) => c.sprite.blocks[h.inputs.TOUCHINGOBJECTMENU[1]].fields.TOUCHINGOBJECTMENU[0]), ['Sprite2', '_edge_', '_mouse_']);
      assert(dec1.includes('@when_touching("Sprite2")') && dec1.includes('@when_touching("edge")') && dec1.includes('@when_touching("mouse")'), dec1);
      assert(!dec1.includes('збережено без змін'), 'touching hats are no longer preserved raw');
      assert(compileErr('@when_touching("edge")\ndef h():\n    pass\n', true) instanceof CompileError, 'sprite-only hat');
      assert(formatBlockUk(Object.keys(c.sprite.blocks).find((k) => c.sprite.blocks[k] === hats[0]), c.sprite.blocks).label.startsWith('Коли торкається'));
    }

    // 14.2 Music extension: menu shadows, note shadow block, extension bookkeeping
    {
      const src = '@when_flag_clicked\ndef main():\n    set_instrument(3)\n    set_tempo(120)\n    change_tempo(-20)\n    play_drum(2, 0.25)\n    rest(0.5)\n    play_note(64, 1)\n    play_note(tempo(), 0.5)\n';
      const { c, dec1 } = roundTrip(src);
      assert(c.json.extensions.includes('music'), 'music extension registered');
      const drum = byOp(c.sprite, 'music_playDrumForBeats')[0];
      const drumMenu = c.sprite.blocks[drum.inputs.DRUM[1]];
      assert(drumMenu.opcode === 'music_menu_DRUM' && drumMenu.shadow && drumMenu.fields.DRUM[0] === '2', 'drum menu shadow');
      assert.strictEqual(drum.inputs.BEATS[1][1], '0.25');
      const inst = byOp(c.sprite, 'music_setInstrument')[0];
      assert.strictEqual(c.sprite.blocks[inst.inputs.INSTRUMENT[1]].opcode, 'music_menu_INSTRUMENT');
      const notes = byOp(c.sprite, 'music_playNoteForBeats');
      const noteShadow = c.sprite.blocks[notes[0].inputs.NOTE[1]];
      assert(noteShadow.opcode === 'note' && noteShadow.shadow && noteShadow.fields.NOTE[0] === '64', 'note shadow block');
      assert.strictEqual(notes[1].inputs.NOTE[0], 3, 'reporter plugged over the note shadow');
      assert.strictEqual(c.sprite.blocks[notes[1].inputs.NOTE[1]].opcode, 'music_getTempo');
      assert.strictEqual(byOp(c.sprite, 'music_setTempo')[0].inputs.TEMPO[1][1], '120');
      assert.strictEqual(byOp(c.sprite, 'music_changeTempo')[0].inputs.TEMPO[1][1], '-20');
      assert(byOp(c.sprite, 'music_restForBeats').length === 1);
      for (const line of ['set_instrument(3)', 'set_tempo(120)', 'change_tempo(-20)', 'play_drum(2, 0.25)', 'rest(0.5)', 'play_note(64, 1)', 'tempo()']) {
        assert(dec1.includes(line), 'decompiled DSL contains ' + line + '\n' + dec1);
      }
      assert(compileErr('@when_flag_clicked\ndef m():\n    play_note("do", 1)\n') instanceof CompileError, 'non-numeric note literal rejected');
      for (const bl of Object.keys(c.sprite.blocks).filter((k) => !c.sprite.blocks[k].shadow)) {
        const fb = formatBlockUk(bl, c.sprite.blocks);
        assert(fb.label && fb.label !== c.sprite.blocks[bl].opcode, 'Ukrainian label for ' + c.sprite.blocks[bl].opcode);
      }
      // removing the blocks drops the extension again (pen stays untouched)
      compileToScratch('@when_flag_clicked\ndef main():\n    pen_down()\n', c.sprite, c.stage, c.json);
      assert(!c.json.extensions.includes('music') && c.json.extensions.includes('pen'), 'music extension removed when unused');
    }

    // 14.3 Boolean arguments of custom blocks
    {
      const src = 'def jump(height, flag: bool):\n    if flag:\n        change_y(height)\n    else:\n        say(height)\n\n@warp\ndef flip(ok: bool):\n    say(ok)\n\n@when_flag_clicked\ndef main():\n    jump(10, True)\n    jump(5, touching("edge"))\n    flip(False)\n';
      const { c, dec1 } = roundTrip(src);
      const protos = byOp(c.sprite, 'procedures_prototype');
      const jumpProto = protos.find((b) => b.mutation.proccode.startsWith('jump'));
      assert.strictEqual(jumpProto.mutation.proccode, 'jump %s %b');
      assert.strictEqual(jumpProto.mutation.argumentdefaults, JSON.stringify(['', 'false']));
      const protoArgs = Object.values(jumpProto.inputs).map((inp) => c.sprite.blocks[inp[1]].opcode);
      assert.deepStrictEqual(protoArgs, ['argument_reporter_string_number', 'argument_reporter_boolean']);
      const ifBlock = byOp(c.sprite, 'control_if_else')[0];
      const cond = c.sprite.blocks[ifBlock.inputs.CONDITION[1]];
      assert(cond.opcode === 'argument_reporter_boolean' && cond.fields.VALUE[0] === 'flag', 'bool param read as argument_reporter_boolean');
      const sayArg = byOp(c.sprite, 'looks_say').map((b) => c.sprite.blocks[b.inputs.MESSAGE[1]]).find((b) => b && b.opcode === 'argument_reporter_boolean');
      assert(sayArg, 'bool param in a value slot is still a boolean reporter');
      const calls = byOp(c.sprite, 'procedures_call').filter((b) => b.mutation.proccode.startsWith('jump'));
      assert.strictEqual(calls.length, 2);
      assert.strictEqual(calls[0].inputs.arg_jump_flag[0], 2, 'boolean slot holds a boolean block');
      assert.strictEqual(c.sprite.blocks[calls[1].inputs.arg_jump_flag[1]].opcode, 'sensing_touchingobject');
      assert(dec1.includes('def jump(height, flag: bool):') && dec1.includes('def flip(ok: bool):'), dec1);
      assert(dec1.includes('@warp\ndef flip'), 'warp preserved with bool arg');
      assert(compileErr('def f(a: int):\n    pass\n') instanceof CompileError, 'only bool annotation is supported');
      // empty boolean slot of an imported project decompiles as False and compiles again
      const imp = mk();
      compileToScratch('def f(a: bool):\n    pass\n\n@when_flag_clicked\ndef m():\n    f(True)\n', imp.sprite, imp.stage, imp.json);
      const call = byOp(imp.sprite, 'procedures_call')[0];
      delete call.inputs.arg_f_a;
      const impCode = decompileTarget(imp.sprite, imp.stage);
      assert(impCode.includes('f(False)'), impCode);
      compileToScratch(impCode, imp.sprite, imp.stage, imp.json);
      // preview: boolean parameters are coerced to booleans
      const simB = new StagePreview({ width: 480, height: 360, getContext: () => mockCtx });
      await simB.runAst(parse(tokenize('def mark(flag: bool):\n    if flag:\n        yes = 1\n    else:\n        no = 1\n\n@when_flag_clicked\ndef main():\n    mark("false")\n    mark(1)\n')));
      assert.strictEqual(simB.vars.yes, 1);
      assert.strictEqual(simB.vars.no, 1);
    }

    // 14.4 Variable / list monitors
    {
      const c = mk();
      compileToScratch('@when_flag_clicked\ndef main():\n    score = 0\n    self.hp = 5\n    show_variable("score")\n    show_variable(self.hp)\n    hide_variable("score")\n    list_add("bag", 1)\n    show_list("bag")\n    hide_list("bag")\n', c.sprite, c.stage, c.json);
      assert.strictEqual(c.json.monitors.length, 3, 'one monitor per variable / list, no duplicates');
      const scoreId = Object.keys(c.stage.variables).find((k) => c.stage.variables[k][0] === 'score');
      const hpId = Object.keys(c.sprite.variables).find((k) => c.sprite.variables[k][0] === 'hp');
      const bagId = Object.keys(c.stage.lists).find((k) => c.stage.lists[k][0] === 'bag');
      const mScore = c.json.monitors.find((m) => m.id === scoreId);
      const mHp = c.json.monitors.find((m) => m.id === hpId);
      const mBag = c.json.monitors.find((m) => m.id === bagId);
      assert(mScore && mScore.opcode === 'data_variable' && mScore.params.VARIABLE === 'score' && mScore.spriteName === null && mScore.visible === false, 'global variable monitor');
      assert(mHp && mHp.spriteName === 'Sprite1' && mHp.value === 0, 'sprite-local variable monitor is bound to its sprite');
      assert(mBag && mBag.opcode === 'data_listcontents' && mBag.mode === 'list' && mBag.params.LIST === 'bag' && Array.isArray(mBag.value), 'list monitor');
      assert(c.json.monitors.every((m) => Number.isFinite(m.x) && Number.isFinite(m.y)), 'default positions');
      // an existing monitor is kept as is
      mScore.visible = true;
      mScore.x = 99;
      compileToScratch('@when_flag_clicked\ndef main():\n    score = 0\n    self.hp = 5\n    show_variable("score")\n    show_variable(self.hp)\n    list_add("bag", 1)\n    show_list("bag")\n', c.sprite, c.stage, c.json);
      assert.strictEqual(c.json.monitors.length, 3);
      assert(c.json.monitors.find((m) => m.id === scoreId).visible === true && c.json.monitors.find((m) => m.id === scoreId).x === 99, 'existing monitor untouched');
      // dropping a variable removes its monitor, the others stay
      compileToScratch('@when_flag_clicked\ndef main():\n    show_variable("score")\n    self.hp = 5\n    show_variable(self.hp)\n', c.sprite, c.stage, c.json);
      assert(!c.json.monitors.some((m) => m.id === bagId), 'monitor of the removed list is cleaned up');
      assert(c.json.monitors.some((m) => m.id === scoreId) && c.json.monitors.some((m) => m.id === hpId));
      const { dec1 } = roundTrip('@when_flag_clicked\ndef main():\n    score = 1\n    show_variable("score")\n    hide_variable("score")\n    list_add("bag", 1)\n    show_list("bag")\n    hide_list("bag")\n');
      for (const line of ['show_variable("score")', 'hide_variable("score")', 'show_list("bag")', 'hide_list("bag")']) assert(dec1.includes(line), line);
      // preview: hidden monitors recorded in project.json start hidden, show_variable reveals them
      const pj = mk();
      compileToScratch('@when_flag_clicked\ndef main():\n    score = 1\n    show_variable("score")\n', pj.sprite, pj.stage, pj.json);
      const simM = new StagePreview({ width: 480, height: 360, getContext: () => mockCtx });
      simM.projectJson = pj.json;
      simM.reset();
      assert(simM.hiddenMonitors.has('score'), 'generated monitor is initially hidden');
      await simM.runAst(parse(tokenize('@when_flag_clicked\ndef main():\n    score = 1\n    show_variable("score")\n')));
      assert(simM.visibleMonitors.has('score') && !simM.hiddenMonitors.has('score'));
    }

    // 14.5 Text to Speech + Translate
    {
      const src = '@when_flag_clicked\ndef main():\n    set_voice("giant")\n    set_language("es")\n    speak("Hola")\n    say(translate("hello", "fr"))\n    say(language())\n';
      const { c, dec1 } = roundTrip(src);
      assert(c.json.extensions.includes('text2speech') && c.json.extensions.includes('translate'), 'both extensions registered');
      const voice = byOp(c.sprite, 'text2speech_setVoice')[0];
      const vMenu = c.sprite.blocks[voice.inputs.VOICES[1]];
      assert(vMenu.opcode === 'text2speech_menu_voices' && vMenu.fields.voices[0] === 'GIANT' && vMenu.shadow, 'voice menu shadow (upper-cased)');
      const lang = byOp(c.sprite, 'text2speech_setLanguage')[0];
      const lMenu = c.sprite.blocks[lang.inputs.LANGUAGE[1]];
      assert(lMenu.opcode === 'text2speech_menu_languages' && lMenu.fields.languages[0] === 'es');
      assert.strictEqual(byOp(c.sprite, 'text2speech_speakAndWait')[0].inputs.WORDS[1][1], 'Hola');
      const tr = byOp(c.sprite, 'translate_getTranslate')[0];
      assert.strictEqual(c.sprite.blocks[tr.inputs.LANGUAGE[1]].opcode, 'translate_menu_languages');
      assert.strictEqual(c.sprite.blocks[tr.inputs.LANGUAGE[1]].fields.languages[0], 'fr');
      assert(byOp(c.sprite, 'translate_getViewerLanguage').length === 1);
      for (const line of ['set_voice("giant")', 'set_language("es")', 'speak("Hola")', 'translate("hello", "fr")', 'language()']) assert(dec1.includes(line), line + '\n' + dec1);
      assert(compileErr('@when_flag_clicked\ndef m():\n    set_voice("robot")\n') instanceof CompileError, 'unknown voice rejected');
      compileToScratch('@when_flag_clicked\ndef main():\n    pass\n', c.sprite, c.stage, c.json);
      assert(!c.json.extensions.includes('text2speech') && !c.json.extensions.includes('translate'), 'extensions dropped when unused');
      // Stage scripts may use music / speech blocks as well
      assert(compileErr('@when_flag_clicked\ndef m():\n    play_note(60, 1)\n    speak("x")\n', true) === null);
    }

    // 14.6 Preview runtime
    {
      const sim14 = new StagePreview({ width: 480, height: 360, getContext: () => mockCtx });
      await sim14.runAst(parse(tokenize(`
@when_flag_clicked
def main():
    goto(0, 0)
    wait(0.12)
    goto(239, 0)
    wait(0.12)
    goto(0, 0)
    wait(0.12)
    goto(239, 0)
    wait(0.12)

@when_touching("edge")
def hit():
    hits += 1
`)));
      assert.strictEqual(sim14.vars.hits, 2, 'when_touching fires once per rising edge, got ' + sim14.vars.hits);

      const simMusic = new StagePreview({ width: 480, height: 360, getContext: () => mockCtx });
      const t0 = Date.now();
      await simMusic.runAst(parse(tokenize(`
@when_flag_clicked
def main():
    set_tempo(500)
    set_instrument(4)
    play_note(60, 1)
    play_drum(1, 0.5)
    rest(0.5)
    a = tempo()
    change_tempo(1000)
    b = tempo()
    set_tempo(1)
    c = tempo()
    set_tempo(500)
    heard = translate("hola", "en")
    lang = language()
    set_voice("kitten")
    set_language("de")
    speak("ignored without speech synthesis")
`)));
      const elapsed = Date.now() - t0;
      assert(elapsed >= 150 && elapsed < 1500, 'music waits (1 + 0.5 + 0.5 beats at 500 bpm = 240ms), took ' + elapsed);
      assert.strictEqual(simMusic.vars.a, 500);
      assert.strictEqual(simMusic.vars.b, 500, 'tempo clamps to 500');
      assert.strictEqual(simMusic.vars.c, 20, 'tempo clamps to 20');
      assert.strictEqual(simMusic.vars.heard, 'hola', 'translate returns the text unchanged');
      assert.strictEqual(simMusic.vars.lang, 'en');
      assert.strictEqual(simMusic.sprite.instrument, 4);
      assert.strictEqual(simMusic.ttsVoice, 'KITTEN');
      assert.strictEqual(simMusic.ttsLang, 'de');

      // speechSynthesis is used when present and skipped while muted
      const spoken = [];
      const prevWin = global.window;
      global.window = {
        addEventListener() {},
        speechSynthesis: { speak: (u) => { spoken.push(u.text); setTimeout(() => u.onend && u.onend(), 5); }, cancel() {} },
        SpeechSynthesisUtterance: function (text) { this.text = text; }
      };
      const simTts = new StagePreview({ width: 480, height: 360, getContext: () => mockCtx });
      await simTts.runAst(parse(tokenize('@when_flag_clicked\ndef main():\n    speak("one")\n')));
      simTts.muted = true;
      await simTts.runAst(parse(tokenize('@when_flag_clicked\ndef main():\n    speak("two")\n')));
      global.window = prevWin;
      assert.deepStrictEqual(spoken, ['one'], 'speak uses speechSynthesis and respects mute');
    }
  }

  console.log('--- 15. Testing v1.3.0 UX Safety, Palette Tooltips & Scratch 3.0 Runtime Parity ---');
  {
    // 15.1 Scratch-compatible random(a, b): integer, inverted, equal, float, and 0.0/1.0 literal preservation
    for (let i = 0; i < 40; i++) {
      const iv = StagePreview.scratchRandom(1, 10);
      assert(Number.isInteger(iv) && iv >= 1 && iv <= 10, `integer random out of bounds: ${iv}`);
      const rev = StagePreview.scratchRandom(10, 1);
      assert(Number.isInteger(rev) && rev >= 1 && rev <= 10, `inverted random out of bounds: ${rev}`);
      assert.strictEqual(StagePreview.scratchRandom(5, 5), 5, 'equal integer bounds must return 5');
    }
    let sawFractional = false;
    for (let i = 0; i < 40; i++) {
      const fv = StagePreview.scratchRandom(0.1, 0.9);
      assert(fv >= 0.1 && fv <= 0.9, `float random out of bounds: ${fv}`);
      if (!Number.isInteger(fv)) sawFractional = true;
    }
    assert(sawFractional, 'random(0.1, 0.9) must produce non-integer floats');

    // Compiler preserves raw float literal "0.0" / "1.0" so random(0.0, 1.0) stays float in .sb3 & preview
    const rProj = createDefaultProject();
    const rStage = rProj.projectJson.targets[0];
    const rSprite = rProj.projectJson.targets[1];
    const rCompiled = compileToScratch('@when_flag_clicked\ndef main():\n    r = random(0.0, 1.0)\n', rSprite, rStage, rProj.projectJson);
    const rndBlock = Object.values(rCompiled.blocks).find((b) => b.opcode === 'operator_random');
    assert(rndBlock, 'operator_random block must exist');
    assert.strictEqual(rndBlock.inputs.FROM[1][1], '0.0', 'float literal 0.0 must keep decimal point in .sb3');
    assert.strictEqual(rndBlock.inputs.TO[1][1], '1.0', 'float literal 1.0 must keep decimal point in .sb3');

    let sawZeroOneFloat = false;
    for (let i = 0; i < 40; i++) {
      const v = StagePreview.scratchRandom('0.0', '1.0');
      assert(v >= 0 && v <= 1, `scratchRandom("0.0", "1.0") out of bounds: ${v}`);
      if (v > 0 && v < 1) sawZeroOneFloat = true;
    }
    assert(sawZeroOneFloat, 'scratchRandom("0.0", "1.0") must return fractional values');

    // 15.2 bitmapResolution scaling in getCostumeMetrics & _getActorHalfSize
    const m2 = StagePreview.getCostumeMetrics({ bitmapResolution: 2 }, { naturalWidth: 96, naturalHeight: 64 });
    assert.strictEqual(m2.drawW, 48, 'bitmapResolution=2 must halve rendered width');
    assert.strictEqual(m2.drawH, 32, 'bitmapResolution=2 must halve rendered height');
    const m1 = StagePreview.getCostumeMetrics({ bitmapResolution: 1 }, { naturalWidth: 96, naturalHeight: 64 });
    assert.strictEqual(m1.drawW, 96);
    assert.strictEqual(m1.drawH, 64);

    const simRes = new StagePreview({ width: 480, height: 360, getContext: () => mockCtx });
    simRes.imageCache.set('hi_res.png', { complete: true, naturalWidth: 96, naturalHeight: 64 });
    const half = simRes._getActorHalfSize({
      size: 100,
      currentCostume: 0,
      costumes: [{ md5ext: 'hi_res.png', bitmapResolution: 2 }]
    });
    assert.strictEqual(half.halfW, 24, '_getActorHalfSize must account for bitmapResolution=2');
    assert.strictEqual(half.halfH, 16, '_getActorHalfSize height must account for bitmapResolution=2');

    // 15.3 Scratch 3.0 stage fencing (15px visible margin)
    const fenced = StagePreview.computeFencedPos(1000, -1000, 24, 24);
    assert.strictEqual(fenced.x, 249, 'fencing x for halfW=24 must clamp to 240 + 24 - 15 = 249');
    assert.strictEqual(fenced.y, -189, 'fencing y for halfH=24 must clamp to -(180 + 24 - 15) = -189');
    const tinyFenced = StagePreview.computeFencedPos(1000, 1000, 4, 4);
    assert.strictEqual(tinyFenced.x, 240, 'tiny sprite fencing must not exceed stage edge 240');
    assert.strictEqual(tinyFenced.y, 180, 'tiny sprite fencing must not exceed stage edge 180');

    const simFence = new StagePreview({ width: 480, height: 360, getContext: () => mockCtx });
    await simFence.runAst(parse(tokenize('@when_flag_clicked\ndef main():\n    pen_down()\n    goto(999, 999)\n')));
    assert.strictEqual(simFence.sprite.x, 249, 'runtime goto(999, 999) must fence to x=249');
    assert.strictEqual(simFence.sprite.y, 189, 'runtime goto(999, 999) must fence to y=189');
    simFence.reset();

    // 15.4 On-stage monitor layout & setMonitorValue
    const laid = StagePreview.layoutMonitors([
      { id: 'm1', mode: 'default', x: null, y: null },
      { id: 'm2', mode: 'default', x: null, y: null },
      { id: 'm3', mode: 'list', x: null, y: null }
    ]);
    assert.strictEqual(laid.length, 3);
    const overlaps = (a, b) =>
      a.resolvedX < b.resolvedX + b.resolvedW &&
      a.resolvedX + a.resolvedW > b.resolvedX &&
      a.resolvedY < b.resolvedY + b.resolvedH &&
      a.resolvedY + a.resolvedH > b.resolvedY;
    assert(!overlaps(laid[0], laid[1]), 'auto-placed monitors m1 and m2 must not overlap');
    assert(!overlaps(laid[0], laid[2]) && !overlaps(laid[1], laid[2]), 'auto-placed list monitor m3 must not overlap');
    for (const m of laid) {
      assert(m.resolvedX >= 0 && m.resolvedX + m.resolvedW <= 480, 'monitor must fit horizontally in 480px stage');
      assert(m.resolvedY >= 0 && m.resolvedY + m.resolvedH <= 360, 'monitor must fit vertically in 360px stage');
    }

    const simMon = new StagePreview({ width: 480, height: 360, getContext: () => mockCtx });
    simMon.vars.score = 0;
    simMon.sprite.name = 'Sprite1';
    simMon.sprite.localVars.hp = 10;
    simMon.setMonitorValue('score', null, 42);
    simMon.setMonitorValue('hp', 'Sprite1', 77);
    assert.strictEqual(simMon.vars.score, 42, 'setMonitorValue must update global variable');
    assert.strictEqual(simMon.sprite.localVars.hp, 77, 'setMonitorValue must update sprite-local variable');

    // 15.5 3-locale HTML contract & 100% palette chip tooltip coverage
    const htmlFiles = [
      path.join(__dirname, '..', 'index.html'),
      path.join(__dirname, '..', 'en', 'index.html'),
      path.join(__dirname, '..', 'ru', 'index.html')
    ];
    for (const filePath of htmlFiles) {
      const html = fs.readFileSync(filePath, 'utf8');
      assert(html.includes('id="btn-stage-fullscreen"'), `${filePath} must have #btn-stage-fullscreen`);
      assert(html.includes('id="stage-monitors-layer"'), `${filePath} must have #stage-monitors-layer`);
      for (const teleId of ['tele-x', 'tele-y', 'tele-size', 'tele-dir']) {
        assert(
          new RegExp(`<input[^>]*id="${teleId}"`).test(html),
          `${filePath} must render #${teleId} as an editable <input>`
        );
      }
      const chipMatches = [...html.matchAll(/class="palette-chip"[^>]*data-insert="([^"]+)"/g)];
      assert(chipMatches.length >= 80, `${filePath} must have at least 80 palette chips (found ${chipMatches.length})`);
      for (const match of chipMatches) {
        const ins = match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        for (const lang of ['uk', 'en', 'ru']) {
          const tip = I18n.getPaletteTip(ins, lang);
          assert(tip && tip.length > 3, `Missing ${lang} palette tooltip for data-insert="${ins}"`);
        }
      }
    }
  }

  console.log('ALL 15 TEST SUITES PASSED SUCCESSFULLY!');
}

runAllTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
