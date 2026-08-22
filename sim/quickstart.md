# 実機なしで試す（クイックスタート）

WSL2 + Ubuntu のシミュレーションで、Snap! のブロックを実際に動かして 3D で見るまでの手順です。
所要時間は初回の環境構築が10〜20分、2回目以降は1分ほど。

環境構築の詳しい説明とシミュレーション特有の注意点は [README.md](README.md) にあります。

---

## 1. 環境構築（初回のみ）

WSL の Ubuntu で:

```bash
git clone https://github.com/kasekiguchi/snap_phosphobot.git
cd snap_phosphobot
bash sim/setup.sh
```

pybullet をソースからビルドするので、初回だけ10〜20分かかります。

## 2. シミュレータを起動

```bash
cd ~/snap_phosphobot
bash sim/run.sh
```

`{"status":"ok", ... "robots":["so-100"] ...}` と出れば成功です。
（phosphobot が 8020、CORS プロキシが 8021 で動いている状態）

## 3. 3D のウィンドウを出す

```bash
bash sim/view.sh
```

WSLg のウィンドウが開き、仮想の SO-100 が表示されます。
マウスの左ドラッグで視点回転、右ドラッグ（またはホイール）で拡大縮小。

- 閉じる: `bash sim/view.sh stop`
- ウィンドウが出ないとき: `ls /mnt/wslg` が通るか確認（WSLg 未対応の環境では `bash sim/view.sh` の代わりに
  `$HOME/pbsim/bin/python sim/viewer.py --shot /tmp/shot` で PNG 連番として保存できます）

## 4. Snap! をつなぐ

1. ブラウザで <https://snap.berkeley.edu/snap/snap.html> を開く
2. 歯車アイコン → `JavaScript extensions` を有効化
3. ファイルメニュー → `Import...` で [`template/test0.xml`](../template/test0.xml) を読み込む
   （ブロックだけ欲しいときは [`template/GiC_template.xml`](../template/GiC_template.xml)）
4. 次のブロックを実行して接続先を決める

   ```text
   phosphobot URLを [http://127.0.0.1:8021] にする
   ```

Windows 側のブラウザからでも、WSL2 のポートは `127.0.0.1` で見えます。

> 仮想アームは実機と同じ **2台**（ロボット 1 = leader、ロボット 2 = follower）が立ち上がります。
> 台数を変えたいときは `SIM_ROBOTS=3 bash sim/run.sh` のように指定してください。

## 5. 動かしてみる

まず単発で。3D のウィンドウでアームが回るのが見えます。

```text
statusを読む                          … 接続確認
ホームに戻る ロボット [1]
関節 [1] の回転方向を [+] にする
ロボット [1] の関節 [1] を [3] 秒動かす   … 30度/秒 × 3秒 = 約90度まわる
関節 [1] の回転方向を [-] にする
ロボット [1] の関節 [1] を [3] 秒動かす   … 戻ってくる
```

次に `test0.xml` に入っている ON-OFF 制御を緑の旗で実行します。

```text
緑の旗が押されたとき
  [leader] を [1] にする
  [follower] を [2] にする
  [目標角度] を [0] にする
  ずっと
    [関節1] を (ロボット (follower) の関節 [1] の角度) にする
    もし <(関節1) < (目標角度)> なら
      関節 [1] の回転方向を [+] にする
      ロボット (follower) の関節 [1] を [0.4] 秒動かす
    でなければ もし <(関節1) > (目標角度)> なら
      関節 [1] の回転方向を [-] にする
      ロボット (follower) の関節 [1] を [0.4] 秒動かす
```

ロボット番号は `leader` / `follower` の変数で持っているので、入れ替えるときは
`にする` の値を直すだけで済みます。

シミュレーションも2台構成なので、`follower` は **2** のままで実機と同じように動きます。
3D のウィンドウには2台並んで表示され、動かしたほうだけが動きます。

目標角度から離れたところ（例: `ロボット [1] の関節 [1] を [-30] 度にする`）から始めると、
目標に近づいたあと **振動し続けて止まらない** のが見えます。
これが「フィードバック制御失敗」の体験部分です。

秒数を変えると挙動が変わります。次の値はこのシミュレーションで測ったものです
（関節1を -30度 から目標 0度 へ。実機では多少変わります）。

| `秒動かす` の値 | 目標に届くまで | 定常の振れ幅 | 見えること |
|---|---|---|---|
| `0.1` | 1.70秒 | ±1.6度 | ほとんど止まって見えるが、近づくのが遅い |
| `0.2` | 1.54秒 | ±3.2度 | 小さく振動し続ける |
| `0.4`（初期値） | 1.35秒 | ±6.2度 | 振動しているのがはっきり見える |
| `0.6` | 1.35秒 | ±9.2度 | 大きく行き過ぎて激しく振動する |

速く近づけようとすると振動が大きくなり、振動を抑えようとすると遅くなる、という
トレードオフがそのまま出ます。

## 6. Snap! を開かずにブロックを回帰テストする

XML からブロックの JavaScript を取り出して Node で実行します（ブラウザ不要）。

```bash
cd ~/snap_phosphobot/sim/harness
python3 extract_blocks.py ../../template/test0.xml ./blocks.json
PB_URL=http://127.0.0.1:8021 node test_blocks.js ./blocks.json
```

接続確認・読み取り・`関節を指定した角度にする`・`回転方向`＋`秒動かす`・ON-OFF ループ・脱力・PID を順に流し、
`=== pass=16 fail=0` のように結果が出ます。ブロックを直したあとの確認に使えます。

## 片付け

```bash
bash sim/view.sh stop   # 3D ウィンドウ
bash sim/run.sh stop    # phosphobot と CORS プロキシ
```

## うまくいかないとき

| 症状 | 確認すること |
|---|---|
| Snap! が NetworkError | `curl http://127.0.0.1:8021/status` が返るか。返らなければ `bash sim/run.sh` |
| ロボット台数が 0 | `~/pbsim_logs/phosphobot.log` の末尾。`--only-simulation` で起動しているか |
| 3D ウィンドウが出ない | `ls /mnt/wslg`。だめなら `viewer.py --shot` で画像保存に切り替え |
| 角度が思った値にならない | シミュレータは重力で関節がたれます（[README.md](README.md) の表を参照） |
