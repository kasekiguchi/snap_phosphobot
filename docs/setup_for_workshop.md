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

`setudev` で固定名を割り当て済みなので、`ttyACM*` の番号を調べる必要はない。

```bash
ls -l /dev/ttyLeader /dev/ttyFollower
```

* `/dev/ttyLeader` … leader（操作する側）
* `/dev/ttyFollower` … follower（追従する側）

どちらも `ttyACM*` へのシンボリックリンクとして表示されればOK。
表示されない場合はUSBの挿し直しか、[setup_rpi5.md の set udev](setup_rpi5.md) をやり直す。

2. USB Port 権限設定(RW付与)

```bash
sudo chmod 666 /dev/ttyLeader
sudo chmod 666 /dev/ttyFollower
```

3. follower キャリブレーション
 
```bash
source ~/.venv/bin/activate
cd lerobot
lerobot-calibrate --robot.type=so101_follower --robot.port=/dev/ttyFollower --robot.id=follower_arm
```

4.  leader キャリブレーション
```bash
lerobot-calibrate --teleop.type=so101_leader --teleop.port=/dev/ttyLeader --teleop.id=leader_arm
```

5. Teleop 確認

```bash
lerobot-teleoperate --robot.type=so101_follower --robot.port=/dev/ttyFollower --robot.id=follower_arm --teleop.type=so101_leader --teleop.port=/dev/ttyLeader --teleop.id=leader_arm
```
### Snap 用

Teleoperation用の1, 2を実施

3. Phosphobot起動

```bash
source ~/.venv/bin/activate
phosphobot run
```

4. CORSプロキシ起動

```bash
source ~/.venv/bin/activate
cd ~/snap_phosphobot
git pull
python3 proxy/cors_proxy.py
```

5. キャリブレーション

ブラウザで[Phosphobot](http://127.0.0.1:8020)にアクセスしCalibrationする。
どちらのロボットかはUSBを抜いてみる or 「Control Robot」で動かしてみればわかる。
（注：USBを抜き差ししたときは2のUSB Port 権限設定をやり直すこと）

6. [Snap](https://snap.berkeley.edu/snap/snap.html)を開く

7. Snapの設定からJavaScript extensions を有効化する

8. Snapの「読み込み」から、~/Downloads/ws.xml を読み込む。

<img width="628" height="362" alt="image" src="https://github.com/user-attachments/assets/ab66a34d-599b-4a8d-a5e5-37bd2c1bc295" />

### 8でws.xmlが存在しない場合は以下をする。

8b. Snapの「読み込み」から、このリポジトリの[template/GiC_template.xml](~/snap_phosphobot/template/GiC_template.xml)を読み込む

9b. 7 の画像状態を作り、「名前を付けて保存」　

以下の設定をして保存

名前：ws 
場所：Computer

10b. ブラウザをリロードして、9bで保存したファイルを読み込み元の状態に戻ることを確認する。
