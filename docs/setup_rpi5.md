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

snap_phosphobot
```bash
git clone  https://github.com/kasekiguchi/snap_phosphobot.git
```

仮想環境構築 
```bash
uv python install 3.13
uv venv --python 3.13
source .venv/bin/activate
uv pip install torch torchvision --torch-backend=cpu
uv pip install "lerobot[feetech]"
```

２回目以降ログインしたときは以下を実行する
```bash
source .venv/bin/activate
```

## LeRobot

[こちら](https://huggingface.co/docs/lerobot/so101)や[こちら](https://wiki.seeedstudio.com/lerobot_so100m/)を参考に組み立てる。

### set udev

`/dev/ttyACM*` の番号は挿す順番やタイミングで入れ替わるので、シリアル番号に固定名を割り当てておく。
設定後は Leader が `/dev/ttyLeader`、Follower が `/dev/ttyFollower` で常に参照できる。

#### １．シリアル番号を調べる

アームに対して順番に次をおこなう。USB接続して、次を実行する。

```bash
udevadm info -a -n /dev/ttyACM1* | grep -m1 'ATTRS{serial}'
```

ttyACM* の番号は /devに見えているものを指定する。
上記で表示される値"SAE***"をLeader,Follower毎にメモっておく。

#### ２．setudev で固定名を割り当てる

このリポジトリの [`setudev`](../setudev) を Pi5 に置いてインストールする。

```bash
curl -fsSL https://raw.githubusercontent.com/kasekiguchi/snap_phosphobot/main/setudev -o setudev
sudo install -m 755 setudev /usr/local/bin/setudev
```

メモしたシリアル番号を **Leader、Follower の順** に渡して実行する。

```bash
cd ~/snap_phosphobot
sudo setudev <SAE70xxxx1> <SAE70xxxx2>
```
<SAE70xxxx1> <SAE70xxxx2>の部分をシリアル番号に置き換える。

- 1つ目の引数のシリアル → `/dev/ttyLeader`
- 2つ目の引数のシリアル → `/dev/ttyFollower`

`/etc/udev/rules.d/99-fixed-usb-serial.rules` を書き出し、udev ルールの再読み込みまで自動で行う。
指定したシリアルが接続されていないときは警告が出るので、打ち間違いに気づける。

#### ３．確認

```bash
ls -l /dev/ttyLeader /dev/ttyFollower
```

`/dev/ttyLeader -> ttyACM1` のように、実体の `ttyACM*` へのシンボリックリンクが表示されればOK。
USBを挿し直して番号が入れ替わっても、名前の方は追従する。

> **メモ**: `setudev` は VID:PID が `1a86:55d3` の機器を対象にしている。
> 別のUSBシリアル変換チップを使っている場合は、`udevadm info -a -n /dev/ttyACM0 | grep -m1 idVendor` などで確認し、
> スクリプト冒頭の `VID` / `PID` を書き換える。

### Calibration

以降は `/dev/ttyACM0`、`/dev/ttyACM1` の代わりに `/dev/ttyFollower`、`/dev/ttyLeader` を使う。

USBポート確認
```bash
cd ~/lerobot
lerobot-find-port
```

USBポート権限設定
```bash
sudo chmod 666 /dev/ttyFollower
sudo chmod 666 /dev/ttyLeader
```

キャリブレーション
```bash
lerobot-calibrate --robot.type=so101_follower --robot.port=/dev/ttyFollower --robot.id=follower_arm
```
```bash
lerobot-calibrate --teleop.type=so101_leader --teleop.port=/dev/ttyLeader --teleop.id=leader_arm
```

### Teleop

USBポート権限設定
```bash
sudo chmod 666 /dev/ttyFollower
sudo chmod 666 /dev/ttyLeader
```

```bash
lerobot-teleoperate --robot.type=so101_follower --robot.port=/dev/ttyFollower --robot.id=follower_arm --teleop.type=so101_leader --teleop.port=/dev/ttyLeader --teleop.id=leader_arm
```

## Phosphobot

### install

```bash
cd 
curl -fsSL https://raw.githubusercontent.com/phospho-app/phosphobot/main/install.sh | sudo bash
```

[Next setup](setup_flow.md)
