// template/test0.xml のカスタムブロックを、phosphobot（シミュレーション）に対してそのまま実行する。
const { load, vars } = require("./snaprun.js");

const BASE = process.env.PB_URL || "http://127.0.0.1:8021";
const ROBOT = Number(process.env.PB_ROBOT || 1);
const api = load(process.argv[2] || "./blocks_test0.json", BASE);

const B = {
  status: api["phosphobotの状態を読む"],
  count: api["ロボット台数"],
  readJoint: api["関節角度を読む ロボット %'robot' 関節番号 %'joint'"],
  readAll: api["全関節角度を読む ロボット %'robot'"],
  writeAngle: api["ロボット %'robot' の関節 %'joint' を %'angle' 度にする"],
  writeAll: api["ロボット %'robot' の全関節を 角度 %'angles' にする"],
  writePairs: api["ロボット %'robot' の関節をまとめて動かす 指定 %'pairs'"],
  setDir: api["関節 %'joint' の回転方向を %'dir' にする"],
  moveSec: api["ロボット %'robot' の関節 %'joint' を %'seconds' 秒動かす"],
  home: api["ホームに戻る ロボット %'robot'"],
  stop: api["ロボット %'robot' をその場で止める"],
  setSafe: api["ロボット %'robot' の力を抜く前の姿勢を覚える 角度 %'angles'"],
  relax: api["ロボット %'robot' の力をゆっくり抜く"],
  setGains: api["ゲインを設定する P %'p' I %'i' D %'d'"],
  pidStep: api["PIDで ロボット %'robot' 関節 %'joint' を目標角度 %'target' へ一歩うごかす dt秒 %'dt'"],
};

let pass = 0, fail = 0;
function check(name, fn) {
  try {
    const r = fn();
    console.log(`  OK   ${name}${r === undefined ? "" : "  -> " + r}`);
    pass++;
  } catch (e) {
    console.log(`  FAIL ${name}  -> ${e.message}`);
    fail++;
  }
}
const f1 = (x) => (x === null || x === undefined ? String(x) : Number(x).toFixed(2));

console.log(`base=${BASE} robot=${ROBOT}\n`);

console.log("[1] 接続確認");
check("phosphobotの状態を読む", () => JSON.parse(B.status()).status || "(no status field)");
check("ロボット台数", () => B.count());

console.log("\n[2] 読み取り");
check("全関節角度を読む", () => B.readAll());
check("関節角度を読む 関節1", () => f1(B.readJoint(ROBOT, 1)));

console.log("\n[3] 関節を指定した角度にする（関節1を 20 度へ）");
check("write 20deg", () => { B.writeAngle(ROBOT, 1, 20); return "sent"; });
check("読み戻し", () => f1(B.readJoint(ROBOT, 1)));

console.log("\n[4] 回転方向 + / - と『秒動かす』");
check("方向 +", () => { B.setDir(1, "+"); return "ok"; });
check("+ 1.0秒", () => {
  const a0 = Number(B.readJoint(ROBOT, 1));
  B.moveSec(ROBOT, 1, 1);
  const a1 = Number(B.readJoint(ROBOT, 1));
  return `${a0.toFixed(2)} -> ${a1.toFixed(2)} (Δ=${(a1 - a0).toFixed(2)}deg, 期待 +30 前後)`;
});
check("方向 -", () => { B.setDir(1, "-"); return "ok"; });
check("- 0.5秒", () => {
  const a0 = Number(B.readJoint(ROBOT, 1));
  B.moveSec(ROBOT, 1, 0.5);
  const a1 = Number(B.readJoint(ROBOT, 1));
  return `${a0.toFixed(2)} -> ${a1.toFixed(2)} (Δ=${(a1 - a0).toFixed(2)}deg, 期待 -15 前後)`;
});
check("不正な方向はエラー", () => {
  try { B.setDir(1, "up"); } catch (e) { return "throws: " + e.message.slice(0, 30) + "..."; }
  throw new Error("エラーにならなかった");
});

console.log("\n[5] test0.xml の ON-OFF 制御ループ（目標角度=0, 0.4秒ずつ）");
const SEC = Number(process.env.ONOFF_SEC || 0.4);
const N = Number(process.env.ONOFF_N || 25);
try {
  B.writeAngle(ROBOT, 1, -25); // わざと目標から離しておく
  const t0 = Date.now();
  const trace = [];
  const target = 0;
  for (let i = 0; i < N; i++) {
    const a = Number(B.readJoint(ROBOT, 1));
    trace.push([(Date.now() - t0) / 1000, a]);
    if (a < target) { B.setDir(1, "+"); B.moveSec(ROBOT, 1, SEC); }
    else if (a > target) { B.setDir(1, "-"); B.moveSec(ROBOT, 1, SEC); }
  }
  console.log("   t[s]  angle[deg]");
  for (const [t, a] of trace) {
    const col = Math.round(Math.max(-40, Math.min(40, a)) / 2) + 20;
    console.log(`   ${t.toFixed(2).padStart(5)} ${a.toFixed(2).padStart(8)}  ` +
      " ".repeat(Math.min(col, 20)) + (a < 0 ? "#".repeat(Math.max(0, 20 - col)) : "") +
      (a >= 0 ? "#".repeat(Math.max(0, col - 20)) : ""));
  }
  const last = trace.slice(-8).map((x) => x[1]);
  const swings = last.slice(1).filter((v, i) => Math.sign(v) !== Math.sign(last[i])).length;
  console.log(`   -> 最後の8点で符号反転 ${swings} 回 / 振れ幅 ${(Math.max(...last) - Math.min(...last)).toFixed(2)} 度`);
  pass++;
} catch (e) {
  console.log("  FAIL ON-OFF ループ -> " + e.message);
  fail++;
}

console.log("\n[5b] 複数の角度をまとめて設定する");
check("全関節を 0,-90,90,-90,0,0 に", () => {
  B.writeAll(ROBOT, "0, -90, 90, -90, 0, 0");
  return B.readAll(ROBOT);
});
check("空欄の関節はそのまま（関節1と6だけ 30 に）", () => {
  const before = JSON.parse(B.readAll(ROBOT));
  B.writeAll(ROBOT, "30, , , , , 30");
  const after = JSON.parse(B.readAll(ROBOT));
  const kept = [1, 2, 3, 4].every((i) => Math.abs(after[i] - before[i]) < 1.5);
  if (!kept) { throw new Error("空欄の関節が動いてしまった: " + JSON.stringify(after)); }
  return `関節1=${after[0].toFixed(1)} 関節6=${after[5].toFixed(1)} / 関節2-5は保持`;
});
check("読んだ姿勢をそのまま書き戻せる", () => {
  B.writeAll(ROBOT, B.readAll(ROBOT));
  return "ok";
});
check("ペア指定 2,-45  3,45", () => {
  B.writePairs(ROBOT, "2,-45  3,45");
  const a = JSON.parse(B.readAll(ROBOT));
  return `関節2=${a[1].toFixed(1)} 関節3=${a[2].toFixed(1)}`;
});
check("ペアの数が合わないとエラー", () => {
  try { B.writePairs(ROBOT, "1,30 3"); } catch (e) { return "throws: " + e.message.slice(0, 22) + "..."; }
  throw new Error("エラーにならなかった");
});
check("関節番号が範囲外だとエラー", () => {
  try { B.writePairs(ROBOT, "7,30"); } catch (e) { return "throws: " + e.message.slice(0, 22) + "..."; }
  throw new Error("エラーにならなかった");
});

console.log("[6] 力を抜くまわり");
check("力を抜く前の姿勢を覚える（現在姿勢）", () => { B.setSafe(ROBOT, B.readAll(ROBOT)); return vars.safe_pose; });
check("力をゆっくり抜く", () => { B.relax(ROBOT); return "ok"; });

console.log("\n[7] PID ブロック（比較用）");
check("ゲイン設定 P=0.5", () => { B.setGains(0.5, 0, 0); return "ok"; });
check("PID 1ステップ", () => {
  const a0 = Number(B.readJoint(ROBOT, 1));
  B.pidStep(ROBOT, 1, 0, 0.1);
  return `${a0.toFixed(2)} -> ${Number(B.readJoint(ROBOT, 1)).toFixed(2)}`;
});

console.log(`\n=== pass=${pass} fail=${fail}`);
process.exit(fail ? 1 : 0);
