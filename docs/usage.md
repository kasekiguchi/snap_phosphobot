# Snap! phosphobot PID blocks

## Import

1. Open <https://snap.berkeley.edu/snap/snap.html>.
2. Enable JavaScript extensions in Snap! settings.
3. Import `template/pid_template.xml` or `blocks/pid_blocks.xml`.
4. Run `phosphobot URLを [http://127.0.0.1:8021] にする`.

The default URL in the blocks is `http://127.0.0.1:8021` (browser running on the Pi5 itself, via `proxy/cors_proxy.py`). From another PC, replace `127.0.0.1` with the Pi5 address, e.g. `http://192.168.100.103:8021`.

## Blocks

- `関節角度を読む 関節番号 [1]`: returns the selected joint angle in degrees.
- `全関節角度を読む`: returns a JSON array string of all joint angles in degrees.
- `statusを読む`: returns the raw `/status` JSON string.
- `ロボット台数`: returns the number of robots reported by `/status`.
- `目標角度にうごかす 関節 [1] 角度 [0]`: writes one joint target angle in degrees.
- `ゲインを設定する P [1] I [0] D [0]`: stores PID gains in Snap!/browser variables.
- `PID出力を計算する 目標 [0] 現在 [0] dt秒 [0.1]`: returns one PID control output and updates `pid_error`, `pid_integral`, `pid_derivative`.
- `PIDで関節 [1] を目標角度 [0] へ一歩うごかす dt秒 [0.1]`: reads the joint, computes one PID step, and writes the next target.
- `ホームに戻る`: calls `/move/init`.
- `止まれ`: reads current joints and writes those same angles back. This is a hold-position stop, not a hardware emergency stop.
- `脱力の安全角度を設定する ロボット [2] 角度 [-0.8, -103.5, 87.8, -106.4, -0.3, 1.7]`: stores the per-robot safe pose (6 joint angles in degrees) used by `安全に脱力する`. Accepts a Snap! list, a JSON array string (e.g. the output of `全関節角度を読む`), or comma-separated numbers. An empty input clears the setting and restores the built-in default. The value is kept per robot in `localStorage`, so it survives a page reload.
- `安全に脱力する ロボット [2]`: moves to that robot's safe pose, waits, then turns the torque off. Uses the pose set by `脱力の安全角度を設定する`; if none is set, robot 2 uses the built-in default pose and other robots fall back to `/move/absolute`.

## Variables Updated

- `phosphobot_url`
- `current_angle`
- `target_angle`
- `pid_p`, `pid_i`, `pid_d`
- `pid_error`, `pid_integral`, `pid_derivative`
- `safe_pose`
- `last_response`
