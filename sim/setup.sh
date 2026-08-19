#!/usr/bin/env bash
# 実機なしで動作確認するための環境構築（WSL2 / Ubuntu 22.04 or 24.04 で確認済み）
#
#   bash sim/setup.sh
#
# phosphobot を ~/pbsim の venv に入れる。pybullet をソースからビルドするため
# 初回は 10〜20 分かかることがある（CPU 16 コアで約 12 分）。
set -uo pipefail

VENV="${VENV:-$HOME/pbsim}"

echo "=== python"
python3 --version || { echo "python3 が必要です"; exit 1; }

if ! command -v uv >/dev/null 2>&1; then
  echo "=== installing uv"
  curl -LsSf https://astral.sh/uv/install.sh | sh >/dev/null 2>&1
fi
export PATH="$HOME/.local/bin:$PATH"
uv --version || { echo "uv のインストールに失敗しました"; exit 1; }

if [ ! -d "$VENV" ]; then
  echo "=== creating venv $VENV"
  uv venv --python 3.12 "$VENV" || exit 1
fi

echo "=== installing phosphobot (時間がかかります)"
VIRTUAL_ENV="$VENV" uv pip install phosphobot || exit 1

echo "=== installing CORS proxy deps"
VIRTUAL_ENV="$VENV" uv pip install flask requests || exit 1

echo "=== done"
"$VENV/bin/python" -c "import phosphobot, pybullet, sys; print('phosphobot', phosphobot.__version__ if hasattr(phosphobot,'__version__') else '?'); print('python', sys.version.split()[0])"
echo
echo "次: bash sim/run.sh"
