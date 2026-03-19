---
name: n8n-manager
description: n8n 工作流自动化平台管理工具。通过 n8n Public API 管理 self-hosted n8n 实例的工作流、执行记录、用户、标签、凭证、变量、项目等资源。当用户需要查看/创建/更新/删除工作流、查询执行状态、管理 n8n 用户和项目、操作标签和变量、执行安全审计、拉取源码控制时使用此技能。触发关键词：n8n、workflow、工作流、执行记录、execution、n8n 用户管理、n8n 标签、n8n 凭证、n8n 变量、n8n 项目、n8n 审计、source control。
---

# n8n Manager — n8n 自动化平台管理技能

## 概述

通过 `n8n-open-cli` 命令行工具管理 self-hosted n8n 实例。该 CLI 默认 AI 友好模式，所有输出为确定性 JSON envelope：

```jsonc
// 成功
{"ok": true, "data": ..., "nextCursor": "..."}
// 失败
{"ok": false, "error": "...", "code": 401}
```

## 前置条件

### 安装方式

```bash
npm install -g n8n-open-cli
```

安装后会提供全局命令 `n8n-open-cli`。为简洁起见，下文继续使用 `n8n-cli` 作为该命令的别名。

### 配置认证

每次执行前需要确保已配置。有两种方式：

**方式一：环境变量（推荐，每条命令内联）**

```bash
N8N_BASE_URL=https://capcut-n8n.bytedance.net N8N_API_KEY=<key> n8n-cli <command>
```

**方式二：持久化配置**

```bash
n8n-cli config set --base-url https://capcut-n8n.bytedance.net --api-key <key>
```

如果用户未提供 API Key，请引导用户：
1. 登录 n8n 实例 → 右上角头像 → Settings → API
2. 点击 Create an API key
3. 将 key 提供给你进行配置

## 输出解析规则

**必须**对每条命令的 stdout 做 `JSON.parse()`，然后检查顶层 `ok` 字段：

- `ok === true` → 操作成功，数据在 `data` 字段。向用户呈现 `data` 的关键信息。
- `ok === false` → 操作失败，错误信息在 `error` 字段，HTTP 状态码在 `code` 字段。向用户说明失败原因。

**`--fields` 参数**：列表/查询命令支持 `--fields id,name,active` 来只返回指定字段，减少输出量。优先使用此参数，只获取回答用户所需的字段。

## Dry-Run 模式（重要：写操作前必须先执行）

> **⚠️ 核心原则：所有写操作执行前，必须先使用 `--dry-run` 进行预览，将变更内容展示给用户进行人工 review，获得用户确认后再执行实际操作。严禁跳过 dry-run 直接执行写操作。**

所有**写操作**（create / update / delete / activate / deactivate / transfer / set-role / set-tags / add-user / remove-user）都支持 `--dry-run` 参数。

### 行为

加上 `--dry-run` 后，CLI **不会执行实际写操作**，而是：

1. 通过 GET API 获取资源当前状态
2. 计算本次操作将产生的变更 diff
3. 输出 diff 预览并退出

### AI 模式输出格式

```jsonc
{
  "ok": true,
  "dryRun": true,
  "resource": "workflow",
  "id": "123",
  "action": "update",     // create | update | delete | activate | deactivate | transfer | ...
  "changes": [
    {"field": "active", "before": false, "after": true},
    {"field": "name", "before": "Old Name", "after": "New Name"}
  ]
}
```

- `action: "create"` → `changes` 中 `before` 全为 `null`
- `action: "delete"` → `changes` 中 `after` 全为 `null`
- `action: "update"` → 仅包含被修改的字段

### Human 模式输出

带颜色的 diff 视图（红色 `-` 表示删除/旧值，绿色 `+` 表示新增/新值），末尾有 `⚠ DRY-RUN` 警告提示。

### 使用策略

- **推荐流程**：对所有写操作先执行 `--dry-run` 查看预览，确认无误后去掉 `--dry-run` 执行
- **向用户展示**：解析 `changes` 数组，以表格或列表形式向用户展示即将发生的变更
- **确认后执行**：用户确认后，执行不带 `--dry-run` 的相同命令

**示例：**

```bash
# 1. 先预览激活操作的影响
n8n-cli workflow activate 123 --dry-run
# 输出: {"ok":true,"dryRun":true,"resource":"workflow","id":"123","action":"activate","changes":[{"field":"active","before":false,"after":true}]}

# 2. 用户确认后执行
n8n-cli workflow activate 123
```

## 命令参考

### workflow — 工作流管理

| 命令 | 说明 | 关键选项 | 支持 dry-run |
|------|------|----------|:------------:|
| `workflow list` | 列出所有工作流 | `--active true/false` `--tags <tags>` `--name <name>` `--project-id <id>` `--limit <n>` `--cursor <c>` `--fields <f>` | — |
| `workflow get <id>` | 获取单个工作流详情 | `--fields <f>` | — |
| `workflow create -f <file>` | 从 JSON 文件创建工作流 | `-f` 必须指向本地 JSON 文件 | ✅ |
| `workflow update <id> -f <file>` | 更新工作流 | `-f` 必须指向本地 JSON 文件 | ✅ |
| `workflow delete <id>` | 删除工作流 | | ✅ |
| `workflow activate <id>` | 激活工作流 | | ✅ |
| `workflow deactivate <id>` | 停用工作流 | | ✅ |
| `workflow transfer <id>` | 转移工作流到另一个项目 | `--destination-project-id <pid>` | ✅ |
| `workflow get-tags <id>` | 获取工作流的标签 | | — |
| `workflow set-tags <id>` | 设置工作流标签 | `--tag-ids <id1,id2>` | ✅ |

**常用场景示例：**

```bash
# 列出所有活跃的工作流，只返回 id 和 name
n8n-cli workflow list --active true --fields id,name

# 获取工作流详情
n8n-cli workflow get 123 --fields id,name,active,nodes

# 预览激活操作
n8n-cli workflow activate 123 --dry-run

# 确认后执行激活
n8n-cli workflow activate 123
```

### execution — 执行记录管理

| 命令 | 说明 | 关键选项 | 支持 dry-run |
|------|------|----------|:------------:|
| `execution list` | 列出执行记录 | `--workflow-id <id>` `--status error/success/waiting` `--limit <n>` `--cursor <c>` `--fields <f>` | — |
| `execution get <id>` | 获取执行详情 | `--include-data` `--fields <f>` | — |
| `execution delete <id>` | 删除执行记录 | | ✅ |

### user — 用户管理

| 命令 | 说明 | 关键选项 | 支持 dry-run |
|------|------|----------|:------------:|
| `user list` | 列出所有用户 | `--include-role true` `--limit <n>` `--fields <f>` | — |
| `user get <id>` | 按 ID 或邮箱获取用户 | `--fields <f>` | — |
| `user create -f <file>` | 批量创建/邀请用户 | `-f` JSON 文件 | ✅ |
| `user delete <id>` | 删除用户 | | ✅ |
| `user set-role <id>` | 修改用户全局角色 | `--role global:admin/global:member` | ✅ |

### tag — 标签管理

| 命令 | 说明 | 关键选项 | 支持 dry-run |
|------|------|----------|:------------:|
| `tag list` | 列出所有标签 | `--limit <n>` | — |
| `tag get <id>` | 获取单个标签 | | — |
| `tag create` | 创建标签 | `--name <name>` | ✅ |
| `tag update <id>` | 更新标签名 | `--name <name>` | ✅ |
| `tag delete <id>` | 删除标签 | | ✅ |

### credential — 凭证管理

| 命令 | 说明 | 关键选项 | 支持 dry-run |
|------|------|----------|:------------:|
| `credential create -f <file>` | 创建凭证 | `-f` JSON 文件 | ✅ |
| `credential delete <id>` | 删除凭证 | | ✅ |
| `credential transfer <id>` | 转移凭证 | `--destination-project-id <pid>` | ✅ |
| `credential schema <typeName>` | 查看凭证类型 schema | 如 `slackApi` | — |

### variable — 变量管理

| 命令 | 说明 | 关键选项 | 支持 dry-run |
|------|------|----------|:------------:|
| `variable list` | 列出所有变量 | `--fields <f>` | — |
| `variable create` | 创建变量 | `--key <k>` `--value <v>` `--type string` | ✅ |
| `variable update <id>` | 更新变量 | `--key <k>` `--value <v>` | ✅ |
| `variable delete <id>` | 删除变量 | | ✅ |

### project — 项目管理

| 命令 | 说明 | 关键选项 | 支持 dry-run |
|------|------|----------|:------------:|
| `project list` | 列出所有项目 | | — |
| `project create` | 创建项目 | `--name <name>` | ✅ |
| `project update <pid>` | 更新项目 | `--name <name>` | ✅ |
| `project delete <pid>` | 删除项目 | | ✅ |
| `project add-user <pid> -f <file>` | 添加用户到项目 | `-f` JSON `[{userId, role}]` | ✅ |
| `project remove-user <pid> <uid>` | 从项目移除用户 | | ✅ |
| `project set-user-role <pid> <uid>` | 修改项目内用户角色 | `--role <role>` | ✅ |

### audit — 安全审计

```bash
# 生成完整审计报告
n8n-cli audit generate

# 指定审计类别
n8n-cli audit generate --categories credentials,database,nodes

# 指定废弃工作流天数
n8n-cli audit generate --days-abandoned-workflows 90
```

> 只读操作，不支持 dry-run。

### source-control — 源码控制

```bash
# 拉取远程变更
n8n-cli source-control pull

# 强制拉取（覆盖本地）
n8n-cli source-control pull --force
```

> 幂等操作，不支持 dry-run。

### config — 配置管理

```bash
n8n-cli config set --base-url <url> --api-key <key>
n8n-cli config show
n8n-cli config clear
```

## 执行策略

### 1. Token 效率

- **必须**使用 `--fields` 参数只获取需要的字段，避免返回完整对象（workflow 的 nodes 数组可能非常大）
- 列表查询时默认用 `--fields id,name,active` 或根据用户问题选择最小字段集
- 仅当用户明确需要完整数据时才省略 `--fields`

### 2. 分页处理

- 列表命令返回的 `nextCursor` 字段用于下一页查询
- 如果结果有 `nextCursor`，告知用户还有更多数据，询问是否继续获取
- 使用 `--limit` 控制每次返回数量

### 3. 写操作确认（Dry-Run 强制前置）

> **⚠️ 这是最重要的执行策略：任何写操作都不得跳过 dry-run 直接执行。**

- **所有写操作**执行前，**必须先使用 `--dry-run`** 预览变更，不得跳过
- 将 dry-run 输出的 `changes` 数组以可读格式展示给用户，等待用户人工 review
- **只有用户明确确认后**，才能去掉 `--dry-run` 执行实际操作
- 批量操作（如批量删除）必须逐一 dry-run 或得到明确的批量授权
- 即使用户直接要求执行写操作，也应先 dry-run 预览并展示给用户确认

### 4. 错误处理

| 错误码 | 含义 | 处理方式 |
|--------|------|----------|
| 401 | 未授权 | 提示用户检查 API Key 是否正确或过期 |
| 403 | 权限不足 | 提示用户当前角色无权执行此操作 |
| 404 | 资源不存在 | 提示用户检查 ID 是否正确 |
| 429 | 限流 | 等待后重试 |

### 5. 文件操作

- `workflow create/update`、`credential create`、`user create`、`project add-user` 需要 JSON 文件
- 先将用户提供的数据写入临时文件，再传给 CLI 的 `-f` 参数
- 文件路径使用 workspace 下的临时路径

## 触发条件

当用户提到以下内容时自动启用：
- 查看、管理、创建、更新、删除 n8n 工作流
- 查询 n8n 执行记录或执行状态
- 管理 n8n 用户、角色
- 操作 n8n 标签、凭证、变量
- 管理 n8n 项目及项目成员
- 执行 n8n 安全审计
- n8n 源码控制操作
- 任何涉及 n8n API 或 n8n 自动化平台管理的需求
