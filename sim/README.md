# 実機なしで動かす（WSL2 + Ubuntu のシミュレーション）

アームが手元にないときに、phosphobot 内蔵のシミュレーション（PyBullet）で
Snap! のカスタムブロックを動かして確認するための一式です。
**Snap! 側の設定は実機とまったく同じ**（`http://127.0.0.1:8021` に接続）で、
つなぐ先が実機か仮想アームかだけが違います。

Windows 11 + WSL2 + Ubuntu 24.04 で確認しています。

## 1. 環境構築（初回のみ）

WSL の Ubuntu で:

```bash
git clone https://github.com/kasekiguchi/snap_phosphobot.git
cd snap_phosphobot
bash sim/setup.sh
```

`~/pbsim` に venv を作り、phosphobot と CORS プロキシ用の flask/requests を入れます。
**pybullet をソースからビルドするので初回は10〜20分**かかります（16コアで約12分）。

## 2. 起動

```bash
bash sim/run.sh
```

- `phosphobot run --only-simulation` を 8020 で起動（USBを一切見ないので実機不要）
- `proxy/cors_proxy.py` を 8021 で起動

`{"status":"ok", ... "robots":["so-100"] ...}` が表示されれば成功です。止めるときは `bash sim/run.sh stop`。

## 3. Snap! からつなぐ

ブラウザで Snap! を開き、いつもどおり `template/pid_template.xml` を読み込んで:

```text
phosphobot URLを [http://127.0.0.1:8021] にする
```

Windows 側のブラウザからでも、WSL2 のポートは `127.0.0.1` で見えます。
シミュレーションのロボットは **1台だけ**なので、ブロックの `ロボット` は必ず **1**（`robot_id=0`）にしてください。

## 4. 3D で見る

```bash
$HOME/pbsim/bin/python sim/viewer.py
```

WSLg の窓が開き、Snap! から動かした通りにアームが動きます（20Hz で関節角度を読んで反映）。
窓を出さずに画像で残すには:

```bash
$HOME/pbsim/bin/python sim/viewer.py --shot /tmp/shot --shot-every 1.0 --seconds 60
```

> phosphobot 本体の `--simulation gui` は PyPI 版だと起動しません
> （開発リポジトリにしかない `simulation/pybullet/main.py` を探しに行くため）。
> そのため表示は別プロセスの `viewer.py` で行っています。

## 5. ブロックを自動テストする（Snap! を開かずに）

`sim/harness/` は、Snap! の XML からカスタムブロックの JavaScript をそのまま取り出して
Node で実行するための小さなランタイムです。ブロックのコードは一切変更せず、
同期 XHR だけを curl で代用しています。

```bash
cd sim/harness
python3 extract_blocks.py ../../template/pid_template.xml ./blocks.json
PB_URL=http://127.0.0.1:8021 node test_blocks.js ./blocks.json
```

接続確認・読み取り・`目標角度にうごかす`・`回転方向`＋`秒動かす`・ON-OFF制御ループ・
脱力・PID の順に実行し、`pass=16 fail=0` のように結果が出ます。

## シミュレーションと実機の違い（確認済み）

| 項目 | シミュレーション | 備考 |
|---|---|---|
| ロボット台数 | 1台（`robot_id=0` = ブロックの「ロボット 1」） | leader/follower の2台構成は再現できない |
| `目標角度にうごかす` | 単独関節なら誤差 0.12度以内 | 実機同様に使える |
| `ロボット1の関節1を1秒動かす` | +29.9度（設計値 30度/秒） | 実機でも同じ計算式 |
| 姿勢を変えたあとの精度 | **重力で最大14度たれる** | 下記参照 |
| 関節6（グリッパー） | -30度を書いても -12度で止まる | 可動域の上限 |
| キャリブレーション | 不要（`joints/read` がすぐ通る） | 実機は要キャリブレーション |

重力の影響の例: 関節2 を +60度にした状態で関節3 に 0度を書いても、読み戻すと -13.5度になります
（シミュレータの位置制御が重力に負けて垂れる）。**ホーム姿勢から1関節だけ動かす分には 0.1度以内**なので、
ブロックの動作確認には支障ありません。角度の絶対値を厳密に見たいときは実機で確認してください。
