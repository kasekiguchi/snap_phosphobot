# Snap! × phosphobot カスタムブロック教材

## プロジェクト概要

Raspberry Pi 5上で動くphosphobot（REST API）をSnap!のカスタムブロックから操作し、
SO-101ロボットアームを中学生向け体験教室で使えるようにする教材を構築する。
最初のテーマはPID制御の考え方を体験的に理解するための教材。

## 現在の状態

- ✅ Pi5 + phosphobot 稼働済み
- ✅ SO-100アーム2台接続済み・動作確認済み
- ✅ phosphobot APIのエンドポイント一覧確認
- ✅ Snap!カスタムブロック定義
- ✅ Snap!テンプレートプロジェクトファイル（.xml）
- ✅ CORSプロキシ（ポート8021）

## 接続情報

- Pi5ホスト: 環境変数 `PI5_HOST`（例: `export PI5_HOST=192.168.1.xx`）
- phosphobotポート: 8020（API直接）/ 8021（CORSプロキシ経由、Snap!はこちらを使う）
- ベースURL: `http://$PI5_HOST:8021`（Snap!から）
  - ブロックのデフォルトは `http://127.0.0.1:8021`（Pi5上のブラウザでSnap!を開く前提）。
    別PCから使う場合は `phosphobot URLを ... にする` でPi5のアドレスに変える
- USBシリアル: `/dev/ttyLeader`（ロボット1）/ `/dev/ttyFollower`（ロボット2）
  — `setudev <leader_serial> <follower_serial>` で固定名を割り当て済み
- APIドキュメント: `http://$PI5_HOST:8020/docs`（Swagger UI）

## ロボット構成

2台のSO-100アームが接続されている。

| ブロック上の番号 | robot_id | 名前 | 役割 |
|---|---|---|---|
| ロボット 1 | 0 | so-100 | **leader** — teleopの操作側。`/dev/ttyLeader` |
| ロボット 2 | 1 | so-100 | **follower** — 主な制御対象。`/dev/ttyFollower` |

- **読み書きとも、どちらのロボットでも可能**（`joints/write` は leader でも通る）
- `関節角度を読む`、`全関節角度を読む`、`手先の位置を読む` → 両方
- `目標角度にうごかす`（joints/write）、`PIDで...一歩うごかす`、`止まれ`、`安全に脱力する` → 両方
- `手先を絶対位置へ動かす`、`手先を相対移動する`、`グリッパー` → 両方（move/absolute, move/relative）
- `ホームに戻る` → ロボット番号に関わらず**両方のアームが同時にホームに戻る**
- `joints/read` が `null` を返すときは、そのロボットのキャリブレーションが済んでいない可能性が高い

## phosphobot API の注意点

- `servo_ids` は `[1,2,3,4,5,6]`（1始まり）
- `/joints/write` で `unit: "degrees"` や `unit: "rad"` を指定するとバウンドチェックで弾かれる（API側のバグ）
  → `unit: "motor_units"` を使い、度数から変換する: `motor_units = degrees × 4096/360 + 2048`
- `/joints/write` で `joints_ids` を指定すると500エラーになる（API側のバグ）
  → 全関節をmotor_unitsで読み取り、対象の1関節だけ差し替えて、全関節を書き戻す

## 対象

中学生メイン（技術・理科との連携を意識）

## 教材テーマ

PID制御の考え方を体験的に理解する教材。
**教材の内容設計はスコープ外。** ここではそれを実現するための
Snap!カスタムブロックとXMLテンプレートの実装に集中する。

PID教材に必要なブロック機能の要件:

- アームの**現在の関節角度・位置を読み取れる**（フィードバック値）
- アームに**目標値を指定して動かせる**（制御入力）
- **P・I・Dゲインを変数として渡せる**（パラメータ調整体験）
- 動作の結果（誤差、応答）を**Snap!側の変数として受け取れる**

## 作業手順

### Step 1: phosphobot APIの全エンドポイント確認

```bash
curl http://$PI5_HOST:8020/openapi.json | python3 -m json.tool > docs/api_spec.json
```

以下を特定すること:

- 関節角度の読み取りエンドポイント（フィードバック値）
- 目標角度・位置の指定方法（制御入力）
- レスポンスのJSONキー名

### Step 2: CORSの確認と対処

Snap!はブラウザから動作するため、phosphobotがCORSを許可している必要がある。

```bash
curl -I -X OPTIONS http://$PI5_HOST:8020/status \
  -H "Origin: https://snap.berkeley.edu"
```

CORSエラーが出る場合はPi5上に軽量なCORSプロキシを立てる（下記参照）。

### Step 3: Snap!カスタムブロックの設計と実装

Step 1の結果に基づいてブロックを定義する。
PID教材に最低限必要なブロック:

| ブロック | 役割 | エンドポイント |
|---|---|---|
| `phosphobot URLを (url) にする` | 接続先設定 | — |
| `statusを読む` | サーバー状態確認 | GET /status |
| `ロボット台数` | 接続台数取得 | GET /status |
| `関節角度を読む ロボット (n) 関節番号 (n)` | 現在値取得（フィードバック） | POST /joints/read |
| `全関節角度を読む ロボット (n)` | 全関節の現在値 | POST /joints/read |
| `目標角度にうごかす ロボット (n) 関節 (n) 角度 (n)` | 制御入力（度数指定） | POST /joints/write |
| `ゲインを設定する P (n) I (n) D (n)` | PIDパラメータ設定 | — (変数のみ) |
| `PID出力を計算する 目標 (n) 現在 (n) dt秒 (n)` | PID計算 | — (変数のみ) |
| `PIDで ロボット (n) 関節 (n) を目標角度 (n) へ一歩うごかす dt秒 (n)` | PID制御1ステップ | POST /joints/read + /joints/write |
| `止まれ ロボット (n)` | 保持停止（現在角度書き戻し） | POST /joints/read + /joints/write |
| `ホームに戻る ロボット (n)` | 初期位置へ（両アーム同時） | POST /move/init |
| `手先の位置を読む ロボット (n)` | エンドエフェクター位置取得 | POST /end-effector/read |
| `手先を絶対位置へ動かす ロボット (n) x y z` | 絶対位置指定（cm） | POST /move/absolute |
| `手先を相対移動する ロボット (n) dx dy dz` | 差分移動（cm） | POST /move/relative |
| `グリッパー ロボット (n) 開閉 (0-1)` | グリッパー開閉 | POST /move/relative |
| `脱力の安全角度を設定する ロボット (n) 角度 (…)` | 脱力前の安全姿勢をロボットごとに保存（度・6関節） | — (localStorage) |
| `安全に脱力する ロボット (n)` | 安全姿勢へ移動してトルクOFF | POST /joints/write + /torque/toggle |

Snap!のHTTP実装方針:

- GET: `url of []`ブロックで可能
- POST: `run JS function`ブロック（Snap!の設定でJS有効化が必要）
- またはCORSプロキシ経由でGETに統一するほうがシンプル

### Step 4: Snap!テンプレートXMLの生成

- カスタムブロック定義を含むSnap!プロジェクト（.xml）を生成
- `template/pid_template.xml`として保存
- 配布方法: snap.berkeley.eduを開いて「Import」でXMLを読み込む

### Step 5: 動作確認

```bash
# Pi5とブラウザが同一ネットワーク上にあることを確認
curl http://$PI5_HOST:8020/status
# → Snap!から同じリクエストが通るか確認
```

## CORSプロキシ（必要な場合）

```python
# proxy/cors_proxy.py — Pi5上で実行（ポート8021）
from flask import Flask, request, jsonify
import requests

app = Flask(__name__)

@app.after_request
def add_cors(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response

@app.route("/<path:path>", methods=["GET","POST","OPTIONS"])
def proxy(path):
    url = f"http://localhost:8020/{path}"
    if request.method == "OPTIONS":
        return jsonify({}), 200
    r = requests.request(request.method, url,
                         json=request.get_json(silent=True),
                         params=request.args)
    return (r.content, r.status_code, {"Content-Type": "application/json"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8021)
```

→ Snap!からは `http://$PI5_HOST:8021/...` を叩く

## 成果物

```
snap_phosphobot/
├── CLAUDE.md
├── setudev                    # ttyLeader/ttyFollower を固定するudevルール生成（Pi5上でsudo実行）
├── docs/
│   └── api_spec.json          # phosphobot APIエンドポイント一覧（自動生成）
├── blocks/
│   └── pid_blocks.xml         # Snap!カスタムブロック定義
├── template/
│   └── pid_template.xml       # 授業で配布するSnap!プロジェクト
└── proxy/
    └── cors_proxy.py          # CORSプロキシ（必要な場合）
```

## 参考

- phosphobot APIドキュメント: <https://docs.phospho.ai>
- Snap!公式: <https://snap.berkeley.edu>
- Snap!マニュアル: <https://snap.berkeley.edu/snapsource/help/SnapManual.pdf>
