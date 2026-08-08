# WS当日の準備

## 環境設定

各机に以下を配置し電源及びネットワークを確保する。

* Raspberry pi 500
* Raspberry pi monitor
* Raspberry pi mouse
* USB hub
* so101 arms

## キャリブレーション

### Teleoperation用

1. Port 確認

```bash
ls /dev
```

ロボットにつながるUSBを抜き差しし、上記コマンドの結果を比較することで各ロボットのdevポートを確認する。
経験的に以下の組み合わせが多い

/dev/ttyACM0 # follower

/dev/ttyACM1 # leader 

2. USB Port 権限設定(RW付与)

```bash
sudo chmod 666 /dev/ttyACM0
sudo chmod 666 /dev/ttyACM1
```

3. follower キャリブレーション
 
```bash
source .venv/bin/activate
cd lerobot
lerobot-calibrate --robot.type=so101_follower --robot.port=/dev/ttyACM0 --robot.id=follower_arm
```
ttyACM0が上記で確認したポートと合っていることを確認する。

4.  leader キャリブレーション
```bash
lerobot-calibrate --teleop.type=so101_leader --teleop.port=/dev/ttyACM1 --teleop.id=leader_arm
```
ttyACM0が上記で確認したポートと合っていることを確認する。

5. Teleop 確認

```bash
lerobot-teleoperate --robot.type=so101_follower --robot.port=/dev/ttyACM0 --robot.id=follower_arm --teleop.type=so101_leader --teleop.port=/dev/ttyACM1 --teleop.id=leader_arm
```
### Snap 用

Teleoperation用の1, 2を実施

3. Phosphobot起動

```bash
source .venv/bin/activate
phosphobot run
```

4. CORSプロキシ起動

```bash
cd ~/snap_phosphobot
git pull
python3 proxy/cors_proxy.py
```

5. キャリブレーション

ブラウザで[Phosphobot](http://127.0.0.1:8021)にアクセスしCalibrationする。
どちらのロボットかはUSBを抜いてみる or 「Control Robot」で動かしてみればわかる。
（注：USBを抜き差ししたときは2のUSB Port 権限設定をやり直すこと）

6. [Snap](https://snap.berkeley.edu/snap/snap.html)を開く

7. Snapの設定からJavaScript extensions を有効化する

8. Snapの「読み込み」から、このリポジトリの[template/pid_template.xml](~/snap_phosphobot/template/pid_template.xml)を読み込む

