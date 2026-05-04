# Snap! phosphobot PID blocks

## Import

1. Open <https://snap.berkeley.edu/snap/snap.html>.
2. Enable JavaScript extensions in Snap! settings.
3. Import `template/pid_template.xml` or `blocks/pid_blocks.xml`.
4. Run `phosphobot URLを [http://192.168.100.103:8020] にする`.

If Snap! reports a CORS error, run `proxy/cors_proxy.py` on the Pi5 and set the URL to `http://192.168.100.103:8021`.

## Blocks

- `関節角度を読む 関節番号 [1]`: returns the selected joint angle in degrees.
- `全関節角度を読む`: returns a JSON array string of all joint angles in degrees.
- `目標角度にうごかす 関節 [1] 角度 [0]`: writes one joint target angle in degrees.
- `ゲインを設定する P [1] I [0] D [0]`: stores PID gains in Snap!/browser variables.
- `PID出力を計算する 目標 [0] 現在 [0] dt秒 [0.1]`: returns one PID control output and updates `pid_error`, `pid_integral`, `pid_derivative`.
- `PIDで関節 [1] を目標角度 [0] へ一歩うごかす dt秒 [0.1]`: reads the joint, computes one PID step, and writes the next target.
- `ホームに戻る`: calls `/move/init`.
- `止まれ`: reads current joints and writes those same angles back. This is a hold-position stop, not a hardware emergency stop.

## Variables Updated

- `phosphobot_url`
- `current_angle`
- `target_angle`
- `pid_p`, `pid_i`, `pid_d`
- `pid_error`, `pid_integral`, `pid_derivative`
- `last_response`
