# snap_phosphobot

Snap! のカスタムブロックから phosphobot API を呼び出し、SO-100 / SO-101 ロボットアームを操作するための教材用リポジトリです。

## まず読む資料
- [docs/setup_rpi5.md](docs/setup_rpi5.md): RPi5の環境構築
- [docs/setup_flow.md](docs/setup_flow.md): Pi5 側の起動手順、Snap! 側の読み込み手順、`8020` と `8021` の構成説明
- [docs/usage.md](docs/usage.md): Snap! カスタムブロックの一覧と使い方
- [sim/README.md](sim/README.md): 実機がないときに WSL2 + Ubuntu のシミュレーションで動かす手順

## 主なファイル

- [template/pid_template.xml](template/pid_template.xml): Snap! に読み込むテンプレート XML
- [blocks/pid_blocks.xml](blocks/pid_blocks.xml): Snap! カスタムブロック定義
- [proxy/cors_proxy.py](proxy/cors_proxy.py): Snap! から phosphobot に接続するための CORS プロキシ

基本の流れは、Pi5 上で `phosphobot run` と `python3 proxy/cors_proxy.py` を起動し、クライアント PC の Snap! で XML を読み込んで `http://<Pi5のIPアドレス>:8021` に接続します。
