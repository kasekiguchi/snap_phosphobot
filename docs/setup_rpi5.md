# ラズベリーパイ5の環境構築

## Raspbian 64bit をセットアップ（省略）
[imager](https://www.raspberrypi.com/software/)を使ってセットアップしておく。

## so101 アーム用環境構築
```bash
sudo apt update && sudo apt upgrade -y
```

uv install
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
exec $SHELL
```

lerobot
```bash
git clone https://github.com/Seeed-Projects/lerobot.git ~/lerobot
```

仮想環境構築 
```bash
uv python install 3.13
mkdir -p ~/lerobot && cd ~/lerobot
uv venv --python 3.13
source .venv/bin/activate
uv pip install torch torchvision --torch-backend=cpu
uv pip install "lerobot[feetech]"
```

２回目以降ログインしたときは以下を実行する
```bash
cd ~/lerobot
source .venv/bin/activate
```

## LeRobot

[こちら](https://huggingface.co/docs/lerobot/so101)や[こちら](https://wiki.seeedstudio.com/lerobot_so100m/)を参考に組み立てる。

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

## Phosphobot

### install

```bash
cd 
curl -fsSL https://raw.githubusercontent.com/phospho-app/phosphobot/main/install.sh | sudo bash
```

[Next setup](setup_flow.md)
