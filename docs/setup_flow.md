# Snap! x phosphobot 接続手順

この資料は、Raspberry Pi 5 上で phosphobot を起動し、クライアント PC の Snap! からカスタムブロックで接続確認するまでの流れを整理したものです。

## 全体像


クライアントPCのブラウザ / Snap!
  ↓ http://<Pi5のIPアドレス>:8021
CORSプロキシ
  ↓ http://localhost:8020
phosphobot API
  ↓ USB
SO-100 / SO-101 ロボットアーム


phosphobot 本体は `8020` で動きます。Snap! はブラウザ上で動くため、直接 `8020` にアクセスするとブラウザのセキュリティ制限に当たることがあります。そのため、Snap! からは `8021` の CORS プロキシに接続します。

## Pi5 側の準備

### 1. ロボットアームを接続する

SO-100 / SO-101 を Pi5 に USB 接続します。

接続後、必要に応じて USB デバイスの権限を変更します。

```bash
sudo chmod 666 /dev/ttyLeader /dev/ttyFollower
```

`/dev/ttyLeader`・`/dev/ttyFollower` は [setup_rpi5.md の set udev](setup_rpi5.md) で `setudev` を実行すると作られる固定名です。
未設定の場合は `sudo chmod 666 /dev/ttyACM*` としてください。

### 2. phosphobot を起動する

Pi5 上で phosphobot API サーバーを起動します。phosphobotのインストールがまだの場合は[RPi5の設定](setup_rpi5.md)を先にやってください。

```bash
phosphobot run
```

起動後、別ターミナルから status を確認します。

```bash
curl http://localhost:8020/status
```

`robots` または `robot_status` にロボットが表示されれば、phosphobot からロボットが見えています。

### 3. CORS プロキシを起動する

別ターミナルで、このリポジトリのディレクトリへ移動します。

```bash
git clone  https://github.com/kasekiguchi/snap_phosphobot.git
cd snap_phosphobot
source .venv/bin/activate
uv pip install flask requests
```

```bash
cd ~/snap_phosphobot
python3 proxy/cors_proxy.py
```

プロキシが起動すると、`8021` で待ち受けます。Pi5 上で確認します。

```bash
curl http://localhost:8021/status
```

クライアント PC から確認する場合は、Pi5 の IP アドレスを使います。

```bash
curl http://<Pi5のIPアドレス>:8021/status
```

例:

```bash
curl http://192.168.100.103:8021/status
```

## クライアント PC 側の準備（同一PCでもOK）

### 1. Snap! を開く

ブラウザで Snap! を開きます。

```text
https://snap.berkeley.edu/snap/snap.html
```

### 2. JavaScript extensions を有効化する

Snap! の歯車アイコンから `JavaScript extensions` を有効にします。

この教材のカスタムブロックは、HTTP POST を送るために JavaScript 機能を使います。

### 3. XML を読み込む

Snap! のファイルメニューから `Import...` を選び、次の XML を読み込みます。

```text
template/pid_template.xml
```

ブロック定義だけを読み込む場合は、次のファイルも使えます。

```text
blocks/pid_blocks.xml
```

### 4. 接続先 URL を設定する

最初に次のブロックを実行します。

```text
phosphobot URLを [http://<Pi5のIPアドレス>:8021] にする
```

例:

```text
phosphobot URLを [http://127.0.0.1:8021] にする
```

通常は `8020` ではなく `8021` を指定します。`8021` は CORS プロキシのポートです。

## 接続確認

キャリブレーション前でも使える確認用ブロックは次の2つです。

```text
statusを読む
```

変数に"status"を追加し、ちゃんと接続できるか確認します。
<img width="726" height="266" alt="image" src="https://github.com/user-attachments/assets/e444ef5e-26c1-47ad-9c88-ecf7bb075d16" />

`/status` の JSON 文字列をそのまま返します。

```text
ロボット台数
```

phosphobot が認識しているロボット台数を返します。2台接続されていれば `2` が返ります。

## キャリブレーション後に使うブロック

次のブロックは、phosphobot 側でロボットのキャリブレーションが完了してから使います。

```text
関節角度を読む 関節番号 [1]
全関節角度を読む
目標角度にうごかす 関節 [1] 角度 [0]
PIDで関節 [1] を目標角度 [0] へ一歩うごかす dt秒 [0.1]
ホームに戻る
止まれ
```

キャリブレーション前に関節角度を読むと、phosphobot 側で次のようなエラーになることがあります。

```text
ValueError: Robot configuration is not set. Run the calibration first.
```


```text
ホームに戻る
```
<img width="693" height="210" alt="image" src="https://github.com/user-attachments/assets/7cd7cac5-8218-4575-9011-e364e1c0d34d" />

```text
安全に脱力する
```
<img width="668" height="205" alt="image" src="https://github.com/user-attachments/assets/cbe3bc4a-e134-465e-a87e-8314ed2014c7" />

上記を実行することで、リーダーが動けばOK！

### 安全に脱力する角度をロボットごとに変える

「安全に脱力する」で移動する角度は、アームの個体やキャリブレーションによって適切な値が違います。
その値は次のブロックでロボットごとに設定できます（単位は度・6関節ぶん）。

```text
脱力の安全角度を設定する ロボット [2] 角度 [-0.8, -103.5, 87.8, -106.4, -0.3, 1.7]
```

決め方の手順（`全関節角度を読む` をはめ込む方法・おすすめ）:

1. `安全に脱力する` でトルクをOFFにするか、手でアームを安全な姿勢（机に置いても倒れない低い姿勢）に動かす
2. `全関節角度を読む ロボット [1]` ブロックを、`脱力の安全角度を設定する` の **`角度` の入力欄にそのままドラッグしてはめ込む**

   ```text
   脱力の安全角度を設定する ロボット [1] 角度 (全関節角度を読む ロボット [1])
   ```

3. その姿勢のまま、はめ込んだブロックを実行する（今の姿勢が安全角度として保存される）
4. 以降、`安全に脱力する` はその角度を使う

`角度` の欄は数値を直接カンマ区切りで書いてもよく、Snap! の `list` ブロックや
`全関節角度を読む` の出力（JSON配列文字列）もそのまま受け付けます。
6個ない場合や、キャリブレーション前で `null` が混ざっている場合は、どの関節が読めなかったかを示すエラーになります。

設定した値はブラウザの localStorage にロボットごとに保存されるので、ページを開き直しても残ります。
`角度` を空にして実行すると設定が消え、元の初期値に戻ります。

`安全に脱力する` は、そのロボットに設定された角度（未設定なら共通の初期値）を `/joints/write` で書き込み、
2秒待ってから `/torque/toggle` でトルクをOFFにします。ロボット1・ロボット2のどちらでも同じ動作です。
アームごとに適切な姿勢は違うので、**ロボット1とロボット2それぞれで一度ずつ設定しておく**のがおすすめです。

```text
脱力の安全角度を設定する ロボット [1] 角度 (全関節角度を読む ロボット [1])
脱力の安全角度を設定する ロボット [2] 角度 (全関節角度を読む ロボット [2])
```

## 手動操作とフィードバック制御を体験するブロック

次の2つは、キーボードでの手動操作と、簡易的なフィードバック制御を体験するためのブロックです。

```text
関節 [1] の回転方向を [+] にする
ロボット [1] の関節 [1] を [0.2] 秒動かす
```

- `関節 (n) の回転方向を (+/-) にする` … その関節をどちら向きに回すかを決める。`+` は角度が増える向き、`-` は減る向き（`+1` / `-1` でもよい）。関節ごとに記憶され、次に変えるまで有効。初期値は `+`
- `ロボット (n) の関節 (n) を (t) 秒動かす` … 決めた向きへ **一定速度 30度/秒** で t 秒動かす。`0.1` 秒なら約3度、`1` 秒なら約30度。1回あたり5秒まで

### (1) 手動操作

「キーが押されたとき」の下に上の2つを並べたものを、**関節6つ × 向き2つ = 12セット**作ると、キーボードでアームを操作できます。

```text
[q] キーが押されたとき
  関節 [1] の回転方向を [+] にする
  ロボット [1] の関節 [1] を [0.2] 秒動かす

[a] キーが押されたとき
  関節 [1] の回転方向を [-] にする
  ロボット [1] の関節 [1] を [0.2] 秒動かす
```

ねらいは「手動でも操作はできるが、狙った通りに動かすのは難しい・面倒だ」と体験してもらうことです。
1回の秒数を大きくすると大ざっぱに、小さくすると細かいが時間がかかる、という違いも試してもらえます。

### (2) フィードバック制御（ON-OFF制御）

同じブロックを `ずっと` の中で使うと、目標角度に近づける簡単なフィードバック制御になります。

```text
緑の旗が押されたとき
  [目標角度] を [0] にする
  ずっと
    [関節角] を (関節角度を読む ロボット [1] 関節番号 [1]) にする
    もし <(関節角) < (目標角度)> なら
      関節 [1] の回転方向を [+] にする
      ロボット [1] の関節 [1] を [0.2] 秒動かす
    でなければ もし <(関節角) > (目標角度)> なら
      関節 [1] の回転方向を [-] にする
      ロボット [1] の関節 [1] を [0.2] 秒動かす
```

ねらいは、**わざと振動させる／わざと遅くする**ことで比例制御の必要性に気づいてもらうことです。

- 秒数を大きく（例 `0.5`）→ 目標を行き過ぎて振動する
- 秒数を小さく（例 `0.02`）→ 振動はしないが目標に届くまでがとても遅い

「誤差が大きいときは大きく、小さいときは小さく動かせばよいのでは？」という発想が出たら、
`ゲインを設定する` と `PIDで … 一歩うごかす` のブロックへ進みます。

## よくある確認ポイント

### Snap! で NetworkError が出る

Snap! から `8020` に直接つないでいる可能性があります。接続先を `8021` にしてください。

```text
phosphobot URLを [http://<Pi5のIPアドレス>:8021] にする
```

### `curl http://<Pi5のIPアドレス>:8021/status` が返らない

CORS プロキシが起動していない可能性があります。Pi5 上で次を実行してください。

```bash
cd snap_phosphobot
python3 proxy/cors_proxy.py
```

### `/joints/read` が 500 になる

CORS の問題ではなく、phosphobot 側の実機読み取りエラーです。キャリブレーションが完了しているか、phosphobot を起動しているターミナルのエラーログを確認してください。

### 角度を「読む」は成功するのに「動かす」と 500 になる

phosphobot のログに次が出ている場合、そのアームが**未キャリブレーション**です。

```text
ValueError: Robot configuration is not set. Run the calibration first.
```

読み取り（生の motor_units）は変換不要なので成功しますが、書き込みは `motor_units → ラジアン` 変換にキャリブレーション情報を使うため、未校正だと必ず 500 になります。Snap! 側ではなく phosphobot 側で一度校正が必要です。

1. どのアームが未校正か確認（`config` が `null` なら未校正）:

   ```bash
   curl -s -X POST "http://localhost:8020/robot/config?robot_id=1"
   ```

2. ダッシュボード `http://<Pi5のIP>:8020/` を開き、対象アームの Calibration ウィザードを実行（または `POST /calibrate?robot_id=1` の対話式）。
3. 再度 `robot/config` で `config` が入っていれば OK。Snap! の「目標角度にうごかす ロボット 2」を再実行する。

書き込み（`/joints/write`）は leader（ロボット 1）・follower（ロボット 2）のどちらでも可能です。
うまくいかない場合は、そのロボットのキャリブレーションが済んでいるかを先に確認してください。

### ロボットが 0 台と表示される

USB 接続、`/dev/ttyLeader`・`/dev/ttyFollower`（未設定なら `/dev/ttyACM*`）の権限、phosphobot の起動状態を確認してください。




## 講師向け: 8020 と 8021 の役割

授業中に意識するサーバーは2つあります。

```text
8020: phosphobot 本体
8021: Snap! からアクセスするための中継サーバー
```

### 8020: phosphobot 本体

`phosphobot run` で起動する API サーバーです。ロボットアームと直接通信します。

主な役割:

- ロボットの接続状態を返す
- 関節角度を読む
- 関節角度を書き込んで動かす
- キャリブレーションや初期姿勢移動を実行する

確認例:

```bash
curl http://localhost:8020/status
```

Pi5 上で `8020` の status が返らない場合、phosphobot 本体が起動していません。この場合、Snap! 側を直しても動きません。

### 8021: CORS プロキシ

`python3 proxy/cors_proxy.py` で起動する、この教材用の中継サーバーです。

Snap! はブラウザ上で動きます。ブラウザには、別の機器や別ポートの API に勝手にアクセスできないようにする制限があります。この制限により、phosphobot 本体の `8020` に直接つなぐと `NetworkError` になることがあります。

そこで、Snap! は `8021` にアクセスします。`8021` のプロキシは、同じ Pi5 上の `localhost:8020` にリクエストを転送し、ブラウザが必要とする許可ヘッダーを付けて返します。

確認例:

```bash
curl http://localhost:8021/status
curl http://<Pi5のIPアドレス>:8021/status
```

### キャリブレーション

ブラウザで[Phosphobot](http://127.0.0.1:8021)にアクセスしキャリブレーションする。
ACM0が一つ目のロボットであることが多い。

### 授業中の接続先

Snap! のカスタムブロックでは、基本的に `8021` を指定します。

```text
phosphobot URLを [http://<Pi5のIPアドレス>:8021] にする
```

`8020` は phosphobot 本体のポートですが、Snap! から直接指定しない運用にしておくとトラブルを減らせます。

### エラーの切り分け

```text
Snap! で NetworkError
  → 8021 プロキシが起動していない、または Snap! の接続先が 8020 になっている可能性

curl http://<Pi5のIPアドレス>:8021/status が返らない
  → 8021 プロキシが起動していない、またはネットワーク到達性の問題

curl http://localhost:8020/status が返らない
  → phosphobot 本体が起動していない

/joints/read が 500
  → CORS ではなく phosphobot 側の実機読み取りエラー
  → キャリブレーション未完了、ロボット設定未作成、USB接続などを確認
```

特に、`OPTIONS /joints/read 200` の後に `POST /joints/read 500` と表示される場合、CORS プロキシは動いています。残っている問題は phosphobot 本体側です。


```bash
sudo chmod 666 /dev/ttyLeader /dev/ttyFollower
curl http://localhost:8020/status
```
