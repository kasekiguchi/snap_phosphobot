// Snap! のカスタムブロック（JS 本体）を Node 上でそのまま実行するための最小ランタイム。
// 同期 XHR は curl の spawnSync で代用する（ブロック側のコードは一切変えない）。
const { spawnSync } = require("child_process");

const store = {};
const vars = {};

function XHR() {
  this._headers = [];
}
XHR.prototype.open = function (method, url) {
  this._method = method;
  this._url = url;
};
XHR.prototype.setRequestHeader = function (k, v) {
  this._headers.push(k + ": " + v);
};
XHR.prototype.send = function (body) {
  const args = ["-s", "-m", "20", "-w", "\n%{http_code}", "-X", this._method, this._url];
  for (const h of this._headers) args.push("-H", h);
  if (body !== undefined && body !== null) args.push("--data-binary", String(body));
  const r = spawnSync("curl", args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  const out = r.stdout || "";
  const i = out.lastIndexOf("\n");
  this.responseText = i >= 0 ? out.slice(0, i) : out;
  this.status = parseInt(i >= 0 ? out.slice(i + 1) : "0", 10) || 0;
  if (this.status === 0) {
    this.responseText = "curl failed: " + (r.stderr || r.error || "").toString();
  }
};

global.window = {};
global.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};
global.XMLHttpRequest = XHR;

const ctx = {
  variables: {
    getVar: (k) => (k in vars ? vars[k] : null),
    setVar: (k, v) => { vars[k] = v; },
  },
};

function load(defsPath, baseUrl) {
  const defs = require(defsPath);
  vars.phosphobot_url = baseUrl;
  const api = {};
  for (const [spec, d] of Object.entries(defs)) {
    const fn = new Function(...d.args, d.code);
    api[spec] = (...a) => fn.apply(ctx, a);
  }
  return api;
}

module.exports = { load, ctx, vars, store };
