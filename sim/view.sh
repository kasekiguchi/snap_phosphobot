#!/usr/bin/env bash
# 3D ビューアの窓を出す（WSLg）。
#
#   bash sim/view.sh          # 窓を出す（バックグラウンド）
#   bash sim/view.sh fg       # 窓を出す（このターミナルに残る。Ctrl-C で終了）
#   bash sim/view.sh stop     # 窓を閉じる
set -uo pipefail

VENV="${VENV:-$HOME/pbsim}"
REPO="$(cd "$(dirname "$0")/.." && pwd)"
LOG="${LOG:-$HOME/pbsim_logs}"
mkdir -p "$LOG"

stop() { pgrep -f 'bin/python .*viewer\.py' | xargs -r kill 2>/dev/null; }

case "${1:-bg}" in
  stop)
    stop; echo "viewer stopped"; exit 0 ;;
  fg)
    stop; sleep 1
    exec env DISPLAY="${DISPLAY:-:0}" "$VENV/bin/python" "$REPO/sim/viewer.py" ;;
esac

stop; sleep 1
DISPLAY="${DISPLAY:-:0}" nohup "$VENV/bin/python" "$REPO/sim/viewer.py" > "$LOG/viewer.log" 2>&1 &
echo "viewer pid $!  log $LOG/viewer.log"
sleep 5
tail -4 "$LOG/viewer.log"
echo
echo "窓が出ない場合: WSLg が有効か（ls /mnt/wslg）と、bash sim/run.sh でシミュレータが起動しているかを確認"
echo "閉じる: bash sim/view.sh stop"
