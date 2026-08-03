# ラズベリーパイ5の環境構築

## Raspbian 64bit をセットアップ（省略）
[imager](https://www.raspberrypi.com/software/)を使ってセットアップしておく。

## so101 アーム用環境構築
```bash
sudo apt update && sudo apt upgrade -y
```

仮想環境構築
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
source ~/.bashrc
```

lerobot 
```bash
mkdir -p ~/lerobot-ws && cd ~/lerobot-ws
uv venv --python 3.13
source .venv/bin/activate
```

torch
```bash
sudo apt install -y libopenblas-dev ffmpeg
uv pip install torch torchvision --torch-backend=cpu
uv pip install lerobot
```

feetech
```bash
uv pip install "lerobot[feetech]"
```

２回目以降ログインしたときは以下を実行する
```bash
cd ~/lerobot-ws
source .venv/bin/activate
```

## LeRobot

### Calibration

USBポート確認
```bash
lerobot-find-port
```

USBポート権限設定
```bash
sudo chmod 666 /dev/ttyACM0
sudo chmod 666 /dev/ttyACM1
```

キャリブレーション
```bash
lerobot-calibrate --robot.type=so101_follower --robot.port=/dev/ttyACM1 --robot.id=follower_arm
lerobot-calibrate --teleop.type=so101_leader --teleop.port=/dev/ttyACM0 --teleop.id=leader_arm
```

### Teleop

USBポート権限設定
```bash
sudo chmod 666 /dev/ttyACM0
sudo chmod 666 /dev/ttyACM1
```

```bash
lerobot-teleoperate     --robot.type=so101_follower     --robot.port=/dev/ttyACM1     --robot.id=follower_arm     --teleop.type=so101_leader     --teleop.port=/dev/ttyACM0     --teleop.id=leader_arm
```
