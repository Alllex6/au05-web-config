/**
 * AU05 本地 Agent（极简示例）
 * 只做三件事：健康检查、接收网页下发的配置、回读配置。
 * 真实产品还需要实现 HID 写入、全局热键、开机自启、OTA。
 *
 * 用法：node agent/server.js
 * 依赖：无（Node >= 18）
 */
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const PORT = Number(process.env.AU05_PORT || 17890);
const HOST = "127.0.0.1"; // 只监听回环地址，绝不暴露公网
const STORE = path.join(os.homedir(), ".au05", "config.json");
const ALLOWED_ORIGINS = ["http://127.0.0.1:8787", "http://localhost:8787", "null"];

function ensureStore() {
  fs.mkdirSync(path.dirname(STORE), { recursive: true });
  if (!fs.existsSync(STORE)) {
    fs.writeFileSync(STORE, JSON.stringify({ schema: "au05.web/1", bindings: {} }, null, 2));
  }
}

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(STORE, "utf8"));
  } catch {
    return { schema: "au05.web/1", bindings: {} };
  }
}

function writeConfig(payload) {
  if (!payload || typeof payload !== "object" || !payload.bindings) {
    throw new Error("invalid payload: bindings required");
  }
  const doc = {
    schema: "au05.web/1",
    updatedAt: new Date().toISOString(),
    device: payload.device || { model: "AU05", mode: "auto" },
    bindings: payload.bindings,
  };
  ensureStore();
  fs.writeFileSync(STORE, JSON.stringify(doc, null, 2));
  return { saved: true, path: STORE, bindings: Object.keys(doc.bindings).length };
}

function body(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (c) => {
      raw += c;
      if (raw.length > 1e6) req.destroy();
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function json(res, code, data) {
  const out = JSON.stringify(data);
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Length": Buffer.byteLength(out),
  });
  res.end(out);
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://" + HOST);
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    });
    return res.end();
  }
  if (u.pathname === "/health") {
    return json(res, 200, {
      ok: true,
      name: "au05-agent",
      version: "0.1.0",
      store: STORE,
      features: ["apply", "bindings", "device:stub"],
    });
  }
  if (u.pathname === "/bindings" && req.method === "GET") {
    return json(res, 200, readConfig());
  }
  if (u.pathname === "/apply" && req.method === "POST") {
    try {
      return json(res, 200, writeConfig(await body(req)));
    } catch (e) {
      return json(res, 400, { saved: false, error: e.message });
    }
  }
  if (u.pathname === "/device") {
    // 占位：接真实设备时用 HID 库枚举 AU05，并返回通道、电量、固件版本
    return json(res, 200, {
      connected: false,
      model: "AU05",
      channel: null,
      note: "stub: 接入 node-hid 后返回真实设备信息",
    });
  }
  return json(res, 404, { error: "not found" });
});

server.listen(PORT, HOST, () => {
  ensureStore();
  console.log("AU05 agent listening on http://" + HOST + ":" + PORT);
  console.log("config store:", STORE);
});
