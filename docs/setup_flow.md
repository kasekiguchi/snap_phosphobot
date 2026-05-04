# Snap! x phosphobot 接続手順

この資料は、Raspberry Pi 5 上で phosphobot を起動し、クライアント PC の Snap! からカスタムブロックで接続確認するまでの流れを整理したものです。

## 全体像

```text
クライアントPCのブラウザ / Snap!
  ↓ http://<Pi5のIPアドレス>:8021
CORSプロキシ
  ↓ http://localhost:8020
phosphobot API
  ↓ USB
SO-100 / SO-101 ロボットアーム
```

phosphobot 本体は `8020` で動きます。Snap! はブラウザ上で動くため、直接 `8020` にアクセスするとブラウザのセキュリティ制限に当たることがあります。そのため、Snap! からは `8021` の CORS プロキシに接続します。

## Pi5 側の準備

### 1. ロボットアームを接続する

SO-100 / SO-101 を Pi5 に USB 接続します。

接続後、必要に応じて USB デバイスの権限を変更します。

```bash
sudo chmod 666 /dev/ttyACM*
```

### 2. phosphobot を起動する

Pi5 上で phosphobot API サーバーを起動します。

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
cd snap_phosphobot
python3 proxy/cors_proxy.py
```

必要な Python パッケージがない場合は、先にインストールします。

```bash
python3 -m pip install flask requests
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

## クライアント PC 側の準備

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
phosphobot URLを [http://192.168.100.103:8021] にする
```

通常は `8020` ではなく `8021` を指定します。`8021` は CORS プロキシのポートです。

## 接続確認

キャリブレーション前でも使える確認用ブロックは次の2つです。

```text
statusを読む
```

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

### ロボットが 0 台と表示される

USB 接続、`/dev/ttyACM*` の権限、phosphobot の起動状態を確認してください。

```bash
sudo chmod 666 /dev/ttyACM*
curl http://localhost:8020/status
```
