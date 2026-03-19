# n8n-open-cli

AI-friendly CLI for managing n8n self-hosted instances via the [n8n Public API](https://docs.n8n.io/api/).

Built with **Node.js + TypeScript**.

## Design Philosophy

**AI-first, Human-optional.**

| | AI Mode (default) | Human Mode (`--human`) |
|---|---|---|
| **Output** | Single-line JSON `{"ok":true,"data":...}` | Colored tables, icons, friendly messages |
| **Colors** | None (no ANSI escape codes) | Full chalk coloring |
| **Errors** | `{"ok":false,"error":"...","code":401}` | `✘ Unauthorized` |
| **Ideal for** | LLM agents, MCP tools, scripts, CI/CD | Terminal users |

Every command outputs a **deterministic JSON envelope** by default:

```jsonc
// Success
{"ok":true,"data":[...],"nextCursor":"..."}

// Success (action)
{"ok":true,"data":null}

// Error
{"ok":false,"error":"HTTP 401 Unauthorized","code":401}
```

## Features

| Resource         | Commands                                                       |
| ---------------- | -------------------------------------------------------------- |
| **workflow**     | list, get, create, update, delete, activate, deactivate, transfer, get-tags, set-tags |
| **execution**    | list, get, delete                                              |
| **user**         | list, get, create, delete, set-role                            |
| **tag**          | list, get, create, update, delete                              |
| **credential**   | create, delete, transfer, schema                               |
| **variable**     | list, create, update, delete                                   |
| **project**      | list, create, update, delete, add-user, remove-user, set-user-role |
| **audit**        | generate                                                       |
| **source-control**| pull                                                          |

## Installation

### From npm (recommended)

```bash
# Global install
npm install -g n8n-open-cli

# Or use npx directly
npx n8n-open-cli workflow list
```

This installs the CLI binary as `n8n-open-cli`, so all examples below keep using the `n8n-open-cli` command name.

### From source

```bash
git clone <repo-url>
cd n8n-open-cli
npm install
npm run build
npm link    # install globally
```

## Configuration

### Option 1: CLI Config (persistent)

```bash
n8n-open-cli config set \
  --base-url https://your-n8n.example.com \
  --api-key your-api-key-here

n8n-open-cli config show
```

### Option 2: Environment Variables

```bash
export N8N_BASE_URL=https://your-n8n.example.com
export N8N_API_KEY=your-api-key-here
```

Environment variables take precedence over stored config.

## Usage

### AI Mode (default) — structured JSON output

```bash
# Every command returns {"ok":true/false, "data":..., "error":...}
n8n-open-cli workflow list
# {"ok":true,"data":[{"id":"1","name":"My Workflow","active":true,...}],"nextCursor":"..."}

n8n-open-cli workflow get 123
# {"ok":true,"data":{"id":"123","name":"My Workflow",...}}

n8n-open-cli workflow activate 123
# {"ok":true,"data":{"id":"123","active":true,...}}

n8n-open-cli workflow delete 123
# {"ok":true,"data":null}
```

### Field Filtering (reduce token usage)

```bash
# Only return specific fields — saves tokens for AI agents
n8n-open-cli workflow list --fields id,name,active
# {"ok":true,"data":[{"id":"1","name":"My Workflow","active":true},...]}}

n8n-open-cli execution list --fields id,status,workflowId
```

### Human Mode — tables, colors, icons

```bash
# Add --human at the top level (before subcommand)
n8n-open-cli --human workflow list
n8n-open-cli --human execution list --status error
n8n-open-cli --human tag create --name production
```

### Dry-Run Mode (Recommended before any write operation)

All **write operations** (create / update / delete / activate / deactivate / transfer / set-role / set-tags / add-user / remove-user) support `--dry-run`.

> **Best Practice:** Always run `--dry-run` first to preview changes, review the diff, and only execute the actual command after manual confirmation. This prevents accidental data loss or unintended modifications.

When `--dry-run` is used, the CLI will **not** execute the actual operation. Instead, it fetches the current state, computes the diff, and outputs a preview:

```bash
# Step 1: Preview the change
n8n-open-cli workflow activate 123 --dry-run
# {"ok":true,"dryRun":true,"resource":"workflow","id":"123","action":"activate",
#  "changes":[{"field":"active","before":false,"after":true}]}

# Step 2: Review the output, then execute
n8n-open-cli workflow activate 123

# Another example: preview before deleting
n8n-open-cli workflow delete 456 --dry-run
# Review what will be deleted, then confirm:
n8n-open-cli workflow delete 456
```

With `--human` mode, dry-run shows a colored diff view (red for removed/old values, green for added/new values) with a `DRY-RUN` warning banner.

### Workflow Management

```bash
n8n-open-cli workflow list                           # list all
n8n-open-cli workflow list --active true              # filter active
n8n-open-cli workflow list --tags "prod,critical"     # filter by tags
n8n-open-cli workflow list --limit 10 --cursor abc    # pagination
n8n-open-cli workflow get <id>                        # get by ID
n8n-open-cli workflow get <id> --fields id,name,nodes # partial fields
n8n-open-cli workflow create -f workflow.json         # create from file
n8n-open-cli workflow update <id> -f workflow.json    # update
n8n-open-cli workflow delete <id>                     # delete
n8n-open-cli workflow activate <id>                   # activate
n8n-open-cli workflow deactivate <id>                 # deactivate
n8n-open-cli workflow transfer <id> --destination-project-id <pid>
n8n-open-cli workflow get-tags <id>
n8n-open-cli workflow set-tags <id> --tag-ids "t1,t2"
```

> **Tip:** For any write command above, add `--dry-run` to preview changes before executing.

### Execution Management

```bash
n8n-open-cli execution list
n8n-open-cli execution list --workflow-id <id>
n8n-open-cli execution list --status error
n8n-open-cli execution get <id>
n8n-open-cli execution get <id> --include-data
n8n-open-cli execution delete <id>
```

### User Management

```bash
n8n-open-cli user list
n8n-open-cli user get <id-or-email>
n8n-open-cli user create -f users.json
n8n-open-cli user delete <id>
n8n-open-cli user set-role <id> --role global:admin
```

### Tag Management

```bash
n8n-open-cli tag list
n8n-open-cli tag get <id>
n8n-open-cli tag create --name "production"
n8n-open-cli tag update <id> --name "staging"
n8n-open-cli tag delete <id>
```

### Credential Management

```bash
n8n-open-cli credential create -f credential.json
n8n-open-cli credential delete <id>
n8n-open-cli credential transfer <id> --destination-project-id <pid>
n8n-open-cli credential schema slackApi
```

### Variable Management

```bash
n8n-open-cli variable list
n8n-open-cli variable create --key MY_VAR --value "hello"
n8n-open-cli variable update <id> --value "world"
n8n-open-cli variable delete <id>
```

### Project Management

```bash
n8n-open-cli project list
n8n-open-cli project create --name "My Project"
n8n-open-cli project update <id> --name "Renamed"
n8n-open-cli project delete <id>
n8n-open-cli project add-user <pid> -f users.json
n8n-open-cli project remove-user <pid> <uid>
n8n-open-cli project set-user-role <pid> <uid> --role editor
```

### Audit & Source Control

```bash
n8n-open-cli audit generate
n8n-open-cli audit generate --categories credentials,database
n8n-open-cli source-control pull
n8n-open-cli source-control pull --force
```

## Integration with AI Agents

### As a shell tool for LLM agents

```python
import subprocess, json

result = subprocess.run(
    ["n8n-open-cli", "workflow", "list", "--fields", "id,name,active"],
    capture_output=True, text=True
)
response = json.loads(result.stdout)
if response["ok"]:
    workflows = response["data"]
```

### As an MCP Tool

The deterministic JSON envelope makes it trivial to wrap as an MCP tool:

```typescript
const { stdout } = await exec(`n8n-open-cli workflow list --fields id,name,active`);
const result = JSON.parse(stdout);  // always { ok, data?, error?, code? }
```

### Error handling for agents

```bash
# Errors are always structured — no need to parse stderr
n8n-open-cli workflow get nonexistent
# {"ok":false,"error":"Not Found","code":404}

n8n-open-cli workflow list
# (with bad API key) {"ok":false,"error":"unauthorized","code":401}
```

## Development

```bash
npm install
npm run dev -- workflow list           # dev mode
npm run build                          # compile
node dist/index.js workflow list       # run built
node dist/index.js --human workflow ls # human mode
```

## License

MIT
