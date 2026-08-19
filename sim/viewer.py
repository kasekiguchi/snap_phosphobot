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
    ap.add_argument("--robot-id", type=int, default=0, help="ブロックの『ロボット1』は 0")
    ap.add_argument("--hz", type=float, default=20.0)
    ap.add_argument("--seconds", type=float, default=0.0, help="0 ならずっと")
    ap.add_argument("--shot", default="", help="指定すると窓を出さずPNGを連番保存")
    ap.add_argument("--shot-every", type=float, default=1.0)
    args = ap.parse_args()

    if not os.path.exists(URDF):
        print(f"URDF が見つかりません: {URDF}", file=sys.stderr)
        sys.exit(1)

    p.connect(p.DIRECT if args.shot else p.GUI)
    p.setAdditionalSearchPath(pybullet_data.getDataPath())
    p.loadURDF("plane.urdf")
    robot = p.loadURDF(URDF, [0, 0, 0], useFixedBase=True)
    p.resetDebugVisualizerCamera(cameraDistance=0.6, cameraYaw=50, cameraPitch=-30,
                                 cameraTargetPosition=[0, 0, 0.1])

    movable = [j for j in range(p.getNumJoints(robot))
               if p.getJointInfo(robot, j)[2] != p.JOINT_FIXED]
    print("movable joints:",
          [(j, p.getJointInfo(robot, j)[1].decode()) for j in movable], flush=True)

    t0, next_shot, shot_i = time.time(), 0.0, 0
    while True:
        try:
            mu = read_angles(args.url, args.robot_id)
        except Exception as e:
            print("read error:", e, flush=True)
            time.sleep(0.5)
            continue
        for k, j in enumerate(movable):
            if k < len(mu) and mu[k] is not None:
                deg = (float(mu[k]) - 2048.0) * 360.0 / 4096.0
                p.resetJointState(robot, j, math.radians(deg))

        el = time.time() - t0
        if args.shot and el >= next_shot:
            w, h, rgb, _, _ = p.getCameraImage(
                640, 480,
                viewMatrix=p.computeViewMatrixFromYawPitchRoll([0, 0, 0.1], 0.6, 50, -30, 0, 2),
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
