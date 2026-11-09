# 插件清单（plugin.json）

```json
{
  "id": "my-action-pack",
  "name": "我的动作包",
  "version": "1.0.0",
  "author": "alex",
  "homepage": "https://github.com/alex/my-action-pack",
  "permissions": ["input", "clipboard"],
  "platforms": ["macos"],
  "firmware": ">=1.0.0",
  "actions": [
    { "id": "ai.prompt", "name": "发 Prompt", "params": ["text"] }
  ]
}
```

## 校验规则

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `id` | 是 | 小写字母/数字/连字符，全局唯一 |
| `name` | 是 | 展示名 |
| `version` | 是 | 语义化版本，同名同 ID 覆盖需用户确认 |
| `permissions` | 是 | 数组，只允许 `input` / `clipboard` / `network` / `filesystem` |
| `author` | 否 | 缺省显示“未署名” |
| `platforms` | 否 | `macos` / `windows` / `linux`，缺省视为全平台 |
| `actions` | 否 | 供改键引用的动作列表，每项需 `id` |

## 权限语义

- `input`：监听按键与旋钮事件。**必须**在安装弹窗里单独列出。
- `clipboard`：读写剪贴板，默认拒绝，用到时再申请。
- `network`：访问网络（同步、更新、AI 调用）。
- `filesystem`：读写本地文件。

未声明的权限不得使用；运行时越权由 Agent 直接拒绝，不做降级。

## 两级插件

- **L1 声明式动作包**：只有 JSON，动作由 Agent 内置执行器执行。V1 只支持这一级。
- **L2 可执行插件**：JS + 受限沙箱 + 权限白名单。V2 评估，需要签名与审核。

现有 UlanziDeckPlugin-SDK 的插件不能一键搬过来：复用其 manifest 与动作定义格式，但宿主运行时不同。官方需先产出 5~8 个 L1 动作包作为迁移样例。
