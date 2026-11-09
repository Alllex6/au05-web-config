# 网页 ↔ 本地 Agent 协议（v0.1）

网页只负责界面与配置，系统级能力在 Agent。两者通过 **本机回环端口 + 一次性令牌** 通信，不暴露公网。

- 默认地址：`http://127.0.0.1:17890`
- 传输：JSON over HTTP，`Content-Type: application/json`
- 鉴权：上线版本带 `X-AU05-Token`（网页启动时由 Agent 注入到 localStorage，仅同机有效）。当前示例放开 CORS 与鉴权，便于本地调试。

## 接口

### GET /health

```json
{ "ok": true, "name": "au05-agent", "version": "0.1.0", "features": ["apply", "bindings"] }
```

网页每 5 秒探测一次；失败即判定离线，功能降级为“只配置、不执行”。

### GET /bindings

返回当前生效配置，结构同 [`au05-config.json`](../README.md#数据模型)。

### POST /apply

请求：

```json
{
  "schema": "au05.web/1",
  "device": { "model": "AU05", "mode": "auto" },
  "bindings": { "key1.click": { "type": "media", "value": "play" } }
}
```

响应：

```json
{ "saved": true, "path": "/Users/<user>/.au05/config.json", "bindings": 6 }
```

Agent 需要：写入本地配置 → 通过 HID 下发到设备 → 注册全局热键 → 返回结果。任一步失败返回 `saved:false` 与 `error`，网页据此提示，不静默成功。

### GET /device

```json
{ "connected": true, "model": "AU05", "channel": "2.4g", "battery": 82, "firmware": "1.0.7" }
```

`channel` 取值：`bt` / `2.4g` / `usb`。网页顶部状态与电量取自这里。

## 连接模式状态机

```
未检测 → 已发现未连接 → 已连接 → 可配置
   ↑                                 |
   └──────── 所选模式失效，回退自动检测 ┘
```

- `auto`：两个通道都在线时连 `2.4g`（延时最低、最稳）。
- `bt`：只认蓝牙；蓝牙断开 → 回 `auto`。
- `dongle`：只认 2.4G；接收器拔出 → 回 `auto`。

任何失败都必须给出**一个可执行动作**（“重新插拔接收器”“在系统蓝牙里重新配对”），禁止只提示“请重试”。

## HID 报文约定（实验）

`sendFeatureReport(0x02, payload)`，payload = UTF-8 JSON 的前 63 字节，长配置按包分片。设备端应答通过 `inputreport` 返回，网页只做展示，不解析语义。

> 该约定未经固件确认，仅用于把真机联调跑通；正式协议由固件团队定义。
