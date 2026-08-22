# Snap! phosphobot PID blocks

## Import

1. Open <https://snap.berkeley.edu/snap/snap.html>.
2. Enable JavaScript extensions in Snap! settings.
3. Import `template/GiC_template.xml` or `blocks/pid_blocks.xml`.
4. Run `ロボットの接続先を [http://127.0.0.1:8021] にする`.

The default URL in the blocks is `http://127.0.0.1:8021` (browser running on the Pi5 itself, via `proxy/cors_proxy.py`). From another PC, replace `127.0.0.1` with the Pi5 address, e.g. `http://192.168.100.103:8021`.

## Blocks

- `ロボット [1] の関節 [1] の角度`: returns the selected joint angle in degrees.
- `ロボット (n) の全関節の角度`: returns a JSON array string of all joint angles in degrees.
- `statusを読む`: returns the raw `/status` JSON string.
- `ロボット台数`: returns the number of robots reported by `/status`.
- `ロボット [1] の関節 [1] を [0] 度にする`: writes one joint target angle in degrees.
- `ロボット [1] の全関節を 角度 [0, -90, 90, -90, 0, 0] にする`: sets up to six joints in one call. Accepts the `ロボット (n) の全関節の角度` reporter dropped in, a Snap! list, or comma-separated numbers. A blank cell (or `-`, or `null` coming from a partial read) leaves that joint where it is, so `30, , , , , 30` moves joints 1 and 6 only. Errors on more than six values or on a non-numeric entry.
- `ロボット [1] の関節をまとめて動かす 指定 [2:-90, 3:90]`: same thing addressed the other way round — list only the joints you want as `関節番号,角度` pairs, separated by spaces or commas. Joints you leave out keep their angle. Errors if the numbers do not pair up or a joint number is outside 1-6.
- `ゲインを設定する P [1] I [0] D [0]`: stores PID gains in Snap!/browser variables.
- `PID出力を計算する 目標 [0] 現在 [0] dt秒 [0.1]`: returns one PID control output and updates `pid_error`, `pid_integral`, `pid_derivative`.
- `PIDで関節 [1] を目標角度 [0] へ一歩うごかす dt秒 [0.1]`: reads the joint, computes one PID step, and writes the next target.
- `関節 [1] の回転方向を [+] にする`: stores the direction (`+` / `-`, also `+1` / `-1`) used by the block below for that joint. Per joint, shared by both robots, kept in `localStorage`. Default `+`.
- `ロボット [1] の関節 [1] を [0.4] 秒動かす`: moves that joint at a constant 30 deg/s in the stored direction for the given time. Reads the joints once, then writes an interpolated target every 50 ms, so 0.1 s ≈ 3°, 1 s ≈ 30°. Clamped to 5 s per call and ±175°. Blocks the browser for the duration (synchronous XHR, like the other blocks).
- `ホームに戻る`: calls `/move/init`.
- `ロボット [1] をその場で止める`: reads current joints and writes those same angles back. This is a hold-position stop, not a hardware emergency stop.
- `ロボット [2] の脱力する前の姿勢を覚える 角度 [-0.8, -103.5, 87.8, -106.4, -0.3, 1.7]`: stores the per-robot safe pose (6 joint angles in degrees) used by `安全に脱力する`. The `角度` slot takes any of: the `ロボット (n) の全関節の角度` reporter dropped straight into it, a Snap! list, a JSON array string, or comma-separated numbers. An empty input clears the setting and restores the built-in default. A wrong count, or a `null` joint from an uncalibrated robot, raises a Japanese error naming the joint. The value is kept per robot in `localStorage`, so it survives a page reload.
- `安全に脱力する ロボット [1]`: writes that robot's safe pose via `/joints/write`, waits 2 s, then turns the torque off via `/torque/toggle`. Uses the pose set by `脱力する前の姿勢を覚える` for that robot, or a shared built-in default if none is set. Same path for every robot.
- `手先の位置を読む ロボット [1]`: returns the end-effector pose as JSON (`x`, `y`, `z` in cm, `rx`, `ry`, `rz` in rad, `open`). phosphobot computes it with **forward kinematics** in its PyBullet model, not from a sensor. The block sends `sync: true`, so phosphobot reads the servos first and syncs the model before solving — without it you get the pose of the last commanded state.
- `手先を絶対位置へ動かす ロボット [1] x y z` / `手先を相対移動する ロボット [1] dx dy dz`: phosphobot solves **inverse kinematics** (PyBullet `calculateInverseKinematics`) against the same model and writes the resulting joint angles. Unreachable targets come back as whatever the numeric solver converged to, so check the arm rather than trusting the request succeeded.

## Variables Updated

- `phosphobot_url`
- `current_angle`
- `target_angle`
- `pid_p`, `pid_i`, `pid_d`
- `pid_error`, `pid_integral`, `pid_derivative`
- `joint_dir`
- `safe_pose`
- `last_response`
