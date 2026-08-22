#!/usr/bin/env python3
"""phosphobot（シミュレーション）の関節角度をポーリングして PyBullet の窓に 3D 表示する。

phosphobot 本体の `--simulation gui` は PyPI 版では起動しない
（開発リポジトリ用の simulation/pybullet/main.py を探しに行くため）。
そこで表示だけを別プロセスで行う。Snap! からブロックを実行すると、この窓のアームが同じように動く。

  $HOME/pbsim/bin/python sim/viewer.py                 # 3D ウィンドウ（WSLg 必要）
  $HOME/pbsim/bin/python sim/viewer.py --shot out      # 窓なしで out_000.png … を連番保存
"""
import argparse
import json
import math
import os
import sys
import time
import urllib.request

import pybullet as p
import pybullet_data

# phosphobot が同梱している SO-100 の URDF（site-packages/resources/urdf/...）
URDF = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(pybullet_data.__file__))),
    "resources", "urdf", "so-100", "urdf", "so-100.urdf",
)


def count_robots(url, timeout=5.0):
    """/status から接続台数を得る。取れなければ 1 台として扱う。"""
    try:
        with urllib.request.urlopen(f"{url}/status", timeout=timeout) as r:
            d = json.loads(r.read().decode() or "{}")
        return max(1, len(d.get("robot_status") or d.get("robots") or []))
    except Exception as e:
        print("status error:", e, "-> 1台として表示します", file=sys.stderr)
        return 1


def read_angles(url, robot_id, timeout=5.0):
    req = urllib.request.Request(
        f"{url}/joints/read?robot_id={robot_id}",
        data=json.dumps({"source": "robot", "unit": "motor_units"}).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode() or "{}").get("angles") or []


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://127.0.0.1:8020", help="phosphobot のURL")
    ap.add_argument("--robots", type=int, default=0,
                    help="表示する台数。0 なら /status の台数に合わせる")
    ap.add_argument("--hz", type=float, default=20.0)
    ap.add_argument("--seconds", type=float, default=0.0, help="0 ならずっと")
    ap.add_argument("--shot", default="", help="指定すると窓を出さずPNGを連番保存")
    ap.add_argument("--shot-every", type=float, default=1.0)
    args = ap.parse_args()

    if not os.path.exists(URDF):
        print(f"URDF が見つかりません: {URDF}", file=sys.stderr)
        sys.exit(1)

    n = args.robots or count_robots(args.url)
    p.connect(p.DIRECT if args.shot else p.GUI)
    p.setAdditionalSearchPath(pybullet_data.getDataPath())
    p.loadURDF("plane.urdf")

    # phosphobot は AxisRobot のグリッド（y方向に1mずつ）へ並べるので、こちらも同じ位置に置く
    robots = [p.loadURDF(URDF, [0, i, 0], useFixedBase=True) for i in range(n)]
    center = [0, (n - 1) / 2.0, 0.1]
    p.resetDebugVisualizerCamera(cameraDistance=0.6 + 0.5 * (n - 1), cameraYaw=50,
                                 cameraPitch=-30, cameraTargetPosition=center)

    movable = [j for j in range(p.getNumJoints(robots[0]))
               if p.getJointInfo(robots[0], j)[2] != p.JOINT_FIXED]
    print(f"robots: {n}  movable joints:",
          [(j, p.getJointInfo(robots[0], j)[1].decode()) for j in movable], flush=True)

    t0, next_shot, shot_i = time.time(), 0.0, 0
    while True:
        try:
            for rid, robot in enumerate(robots):
                mu = read_angles(args.url, rid)
                for k, j in enumerate(movable):
                    if k < len(mu) and mu[k] is not None:
                        deg = (float(mu[k]) - 2048.0) * 360.0 / 4096.0
                        p.resetJointState(robot, j, math.radians(deg))
        except Exception as e:
            print("read error:", e, flush=True)
            time.sleep(0.5)
            continue

        el = time.time() - t0
        if args.shot and el >= next_shot:
            w, h, rgb, _, _ = p.getCameraImage(
                640, 480,
                viewMatrix=p.computeViewMatrixFromYawPitchRoll(
                    center, 0.6 + 0.5 * (n - 1), 50, -30, 0, 2),
                projectionMatrix=p.computeProjectionMatrixFOV(60, 640 / 480, 0.01, 5),
                renderer=p.ER_TINY_RENDERER,
            )
            try:
                from PIL import Image
                Image.frombytes("RGBA", (w, h), bytes(rgb)).convert("RGB").save(
                    f"{args.shot}_{shot_i:03d}.png")
            except Exception as e:
                print("shot failed:", e, flush=True)
            shot_i += 1
            next_shot = el + args.shot_every

        if args.seconds and el > args.seconds:
            break
        time.sleep(1.0 / args.hz)


if __name__ == "__main__":
    main()
