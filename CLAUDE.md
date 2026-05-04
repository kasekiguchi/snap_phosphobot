# Snap! × phosphobot カスタムブロック教材

## プロジェクト概要

Raspberry Pi 5上で動くphosphobot（REST API）をSnap!のカスタムブロックから操作し、
SO-101ロボットアームを中学生向け体験教室で使えるようにする教材を構築する。
最初のテーマはPID制御の考え方を体験的に理解するための教材。

## 現在の状態

- ✅ Pi5 + phosphobot 稼働済み
- ✅ SO-101アーム接続済み・動作確認済み
- 🔲 phosphobot APIのエンドポイント一覧確認
- 🔲 Snap!カスタムブロック定義（これから作る）
- 🔲 Snap!テンプレートプロジェクトファイル（.xml）

## 接続情報

- Pi5ホスト: 環境変数 `PI5_HOST`（例: `export PI5_HOST=192.168.1.xx`）
- phosphobotポート: 8020
- ベースURL: `http://$PI5_HOST:8020`
- APIドキュメント: `http://$PI5_HOST:8020/docs`（Swagger UI）

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

| ブロック | 役割 | HTTPメソッド |
|---|---|---|
| `関節角度を読む（関節番号）` | 現在値取得（フィードバック） | GET |
| `目標角度にうごかす（関節, 角度）` | 制御入力 | POST |
| `ゲインを設定する（P, I, D）` | パラメータ渡し | POST |
| `止まれ` | 緊急停止 | POST |
| `ホームに戻る` | リセット | POST |

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
