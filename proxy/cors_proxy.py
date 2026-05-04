from flask import Flask, jsonify, request
import requests

app = Flask(__name__)


@app.after_request
def add_cors(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Private-Network"] = "true"
    return response


@app.route("/status", methods=["GET", "OPTIONS"])
def status():
    if request.method == "OPTIONS":
        return jsonify({}), 200

    response = requests.get("http://localhost:8020/status", timeout=10)
    return (
        response.content,
        response.status_code,
        {"Content-Type": response.headers.get("Content-Type", "application/json")},
    )


@app.route("/<path:path>", methods=["GET", "POST", "OPTIONS"])
def proxy(path):
    if request.method == "OPTIONS":
        return jsonify({}), 200

    response = requests.request(
        request.method,
        f"http://localhost:8020/{path}",
        json=request.get_json(silent=True),
        params=request.args,
        timeout=10,
    )
    return (
        response.content,
        response.status_code,
        {"Content-Type": response.headers.get("Content-Type", "application/json")},
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8021)
