// template/test0.xml のカスタムブロックを、phosphobot（シミュレーション）に対してそのまま実行する。
const { load, vars } = require("./snaprun.js");

const BASE = process.env.PB_URL || "http://127.0.0.1:8021";
const ROBOT = Number(process.env.PB_ROBOT || 1);
const api = load(process.argv[2] || "./blocks_test0.json", BASE);

const B = {
  status: api["statusを読む"],
  count: api["ロボット台数"],
  readJoint: api["関節角度を読む ロボット %'robot' 関節番号 %'joint'"],
  readAll: api["全関節角度を読む ロボット %'robot'"],
  writeAngle: api["目標角度にうごかす ロボット %'robot' 関節 %'joint' 角度 %'angle'"],
  setDir: api["関節 %'joint' の回転方向を %'dir' にする"],
  moveSec: api["ロボット %'robot' の関節 %'joint' を %'seconds' 秒動かす"],
  home: api["ホームに戻る ロボット %'robot'"],
  stop: api["止まれ ロボット %'robot'"],
  setSafe: api["脱力の安全角度を設定する ロボット %'robot' 角度 %'angles'"],
  relax: api["安全に脱力する ロボット %'robot'"],
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
check("statusを読む", () => JSON.parse(B.status()).status || "(no status field)");
check("ロボット台数", () => B.count());

console.log("\n[2] 読み取り");
check("全関節角度を読む", () => B.readAll());
check("関節角度を読む 関節1", () => f1(B.readJoint(ROBOT, 1)));

console.log("\n[3] 目標角度にうごかす（関節1を 20 度へ）");
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

console.log("\n[6] 脱力まわり");
check("安全角度を設定（現在姿勢）", () => { B.setSafe(ROBOT, B.readAll(ROBOT)); return vars.safe_pose; });
check("安全に脱力する", () => { B.relax(ROBOT); return "ok"; });

console.log("\n[7] PID ブロック（比較用）");
check("ゲイン設定 P=0.5", () => { B.setGains(0.5, 0, 0); return "ok"; });
check("PID 1ステップ", () => {
  const a0 = Number(B.readJoint(ROBOT, 1));
  B.pidStep(ROBOT, 1, 0, 0.1);
  return `${a0.toFixed(2)} -> ${Number(B.readJoint(ROBOT, 1)).toFixed(2)}`;
});

console.log(`\n=== pass=${pass} fail=${fail}`);
process.exit(fail ? 1 : 0);
