#!/usr/bin/env bash
# phosphobot をシミュレーション専用で起動し、CORS プロキシ(8021)も上げる。
#
#   bash sim/run.sh          # 起動
#   bash sim/run.sh stop     # 停止
#
# 起動後、Snap! からは http://127.0.0.1:8021 に接続する（実機と同じ）。
set -uo pipefail

VENV="${VENV:-$HOME/pbsim}"
REPO="$(cd "$(dirname "$0")/.." && pwd)"
LOG="${LOG:-$HOME/pbsim_logs}"
mkdir -p "$LOG"

stop() {
  pkill -f "phosphobot run" 2>/dev/null
  pkill -f "cors_proxy\.py" 2>/dev/null
  sleep 1
}

if [ "${1:-}" = "stop" ]; then
  stop
  echo "stopped"
  exit 0
fi

stop

echo "=== phosphobot (simulation only)"
nohup "$VENV/bin/phosphobot" run \
  --only-simulation --simulation headless \
  --port 8020 --no-realsense --no-can --no-telemetry \
  > "$LOG/phosphobot.log" 2>&1 &
echo "  pid $!  log $LOG/phosphobot.log"

echo "=== cors proxy (8021)"
nohup "$VENV/bin/python" "$REPO/proxy/cors_proxy.py" > "$LOG/proxy.log" 2>&1 &
echo "  pid $!  log $LOG/proxy.log"

echo "=== waiting for /status"
for i in $(seq 1 90); do
  curl -sf -m 2 http://localhost:8020/status >/dev/null 2>&1 && { echo "  up after ${i}s"; break; }
  sleep 1
  if [ "$i" = "90" ]; then
    echo "!!! phosphobot が 8020 で応答しません"
    tail -40 "$LOG/phosphobot.log"
    exit 1
  fi
done

echo "--- 8021 /status (Snap! はここに繋ぐ) ---"
curl -s -m 5 http://localhost:8021/status; echo
echo
echo "3D で見る:  \$HOME/pbsim/bin/python sim/viewer.py"
echo "止める:     bash sim/run.sh stop"
