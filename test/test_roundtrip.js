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
  loadSb3,
  saveSb3,
  getTargetAssets
} = require('../js/sb3Bridge.js');
const { compileToScratch, CompileError, tokenize, parse } = require('../js/compiler.js');
const { decompileTarget, formatBlockUk } = require('../js/decompiler.js');
const { StagePreview } = require('../js/preview.js');

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

  console.log('ALL 8 TEST SUITES PASSED SUCCESSFULLY!');
}

runAllTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
