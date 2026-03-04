# auto-dev

A webhook bridge that connects **Jira Cloud** to **Cursor Cloud Agents**. When a Jira task is moved from "To Do" to "In Progress", auto-dev automatically launches a Cursor agent to implement the work in your GitHub repo.

## Overview

```chart
┌─────────────┐     webhook      ┌──────────┐     API      ┌─────────────────────┐
│  Jira Cloud │ ───────────────► │ auto-dev │ ───────────► │ Cursor Cloud Agents │
│  (To Do →   │                  │          │              │ (creates branch,     │
│  In Progress)                  │          │              │  PR with changes)    │
└─────────────┘                  └──────────┘              └─────────────────────┘
                                       │                              │
                                       │    webhook (completion)      │
                                       ◄─────────────────────────────┘
```

### Flow

1. **Jira**: You move a ticket from "To Do" to "In Progress".
2. **auto-dev** receives the Jira webhook, verifies the signature, and deduplicates retries.
3. **auto-dev** extracts the ticket summary, description, and GitHub repo from the Jira issue.
4. **auto-dev** calls the Cursor Cloud Agents API with a prompt built from the ticket.
5. **Cursor** creates a branch (`<ISSUE-KEY>/cursor`), implements the work, and opens a PR.
6. **Cursor** optionally sends a completion webhook back to auto-dev (for logging/audit).

## Prerequisites

- **Node.js** 18+ (ES modules)
- **pnpm** (package manager)
- **Jira Cloud** with webhooks enabled
- **Cursor** account with [Cloud Agents API](https://cursor.com/settings) access
- **ngrok** or similar (for local webhook development for https)

## Quick Start

### 1. Clone and install

```bash
cd auto-dev
pnpm install
```

### 2. Configure environment

Copy the example env and fill in your values:

```bash
cp .env.example .env
```

See [Environment variables](#environment-variables) for all options.

### 3. Run locally

```bash
pnpm start
# or with hot reload:
pnpm dev
```

Server runs at `http://localhost:3000` (or `PORT` from env).

### 4. Expose locally for webhooks

For Jira and Cursor to reach your dev server, expose it with ngrok:

```bash
ngrok http 3000
```

Set `SERVER_HTTPS_ADDRESS` to your ngrok URL (e.g. `https://abc123.ngrok.io`).

## Environment Variables

| Variable | Required | Description |
| ---------- | ---------- | ------------- |
| `CURSOR_API_KEY` | Yes* | API key from [Cursor Settings](https://cursor.com/settings). Required to launch agents. |
| `CURSOR_WEBHOOK_SECRET` | Yes* | Shared secret for Cursor completion webhooks. At least 32 characters. |
| `SERVER_HTTPS_ADDRESS` | Yes* | Public HTTPS URL of this service (e.g. ngrok URL or production domain). Used as the Cursor webhook callback. |
| `JIRA_WEBHOOK_SECRET` | No | When set, verifies `X-Hub-Signature` on Jira webhooks. Use the same value as the Jira webhook "Secret". |
| `JIRA_BASE_URL` | No | Base URL for Jira (e.g. `https://yourcompany.atlassian.net`). When set, the prompt instructs the agent to add a Jira ticket link in the PR description. |
| `NO_CURSOR_CALL` | No | Set to `1` or `true` to skip calling the Cursor API. Useful for debugging Jira webhook payloads. |
| `PORT` | No | Server port (default: `3000`). |
| `LOG_LEVEL` | No | Log level: `debug`, `info`, `warn`, `error` (default: `info`). |
| `ENVIRONMENT` | No | Set to `qa` for JSON logs; any other value enables pretty-printing (colorized). |

\*Required for the full flow. For Jira-only debugging, you can omit Cursor vars and set `NO_CURSOR_CALL=1`.

## Jira Setup

### 1. Create a webhook

1. Go to **Jira Settings** → **System** → **WebHooks**.
2. Create a new webhook:
   - **Name**: e.g. "auto-dev"
   - **URL**: `https://your-auto-dev-server.com/webhooks/jira`
   - **Secret**: Optional but recommended. Set the same value as `JIRA_WEBHOOK_SECRET`.
3. Under **Events**, choose **Issue related events** → **Issue updated**.

### 2. Jira ticket requirements

For auto-dev to launch an agent:

- The issue must move from a **To Do**-style status (To Do, Open, Backlog, etc.) to an **In Progress**-style status (In Progress, In Development, etc.).
- The issue must have a **GitHub repo** in a custom field. Jira send their custom fields in webhook as "customfield_[custom_field_id]". Currently, hardcoded as below.

#### GitHub repo field

The repo is read from a custom field. The default field key is `customfield_10654`. If your Jira uses a different custom field for the GitHub repo:

- **Format**: Full URL (`https://github.com/org/repo`), `org/repo`, or Jira smart-link format.
- **Field ID**: Update the `ghRepoField` constant in `src/routes/webhooks/jira.js` to match your Jira custom field ID.

## Cursor Setup

1. Get your **API key** from [Cursor Settings](https://cursor.com/settings).
2. Set `CURSOR_API_KEY`, `CURSOR_WEBHOOK_SECRET`, and `SERVER_HTTPS_ADDRESS` in `.env`.
3. The agent uses branch name `{ISSUE_KEY}/cursor` and enables `autoCreatePr` by default.
4. Completion webhooks from Cursor are verified via `X-Webhook-Signature` when `CURSOR_WEBHOOK_SECRET` is set.

## API Endpoints

| Method | Path | Description |
| -------- | ------ | ------------- |
| `GET` | `/` | Simple health check (`{ hello: "world" }`). |
| `GET` | `/health` | Health status (`{ status: "ok" }`). |
| `POST` | `/webhooks/jira` | Jira webhook receiver. Triggers agent on To Do → In Progress. |
| `POST` | `/webhooks/cursor` | Cursor completion webhook receiver. Logs and returns 200. |

## Project Structure

```files
auto-dev/
├── src/
│   ├── index.js              # Fastify app, routes
│   ├── lib/
│   │   ├── cursor-agent.js   # Cursor Cloud Agents API client
│   │   ├── dedupe-store.js   # In-memory webhook deduplication
│   │   ├── jira-prompt.js    # Build prompt from Jira payload (ADF support)
│   │   ├── jira-webhook.js   # To Do → In Progress transition detection
│   │   ├── logger.js         # Pino logger
│   │   ├── verify-cursor-signature.js
│   │   └── verify-jira-signature.js
│   └── routes/
│       └── webhooks/
│           ├── cursor.js     # Cursor webhook handler
│           └── jira.js       # Jira webhook handler
├── .env.example
├── Dockerfile
└── package.json
```

## Docker

Build and run:

```bash
docker build -t auto-dev .
docker run -p 3000:3000 --env-file .env auto-dev
```

> **Note**: The Dockerfile uses `npm install` and `npm start`. For pnpm, you may need to adjust the Dockerfile to use pnpm.

## Scripts

| Command | Description |
| --------- | ------------- |
| `pnpm start` | Start the server. |
| `pnpm dev` | Start with nodemon (watches `src/index.js`). |
| `pnpm test` | Placeholder (no tests yet). |

## Security

- **Jira**: When `JIRA_WEBHOOK_SECRET` is set, incoming requests must include a valid `X-Hub-Signature` (HMAC-SHA256 of the raw body). Invalid signatures receive `401 Unauthorized`.
- **Cursor**: When `CURSOR_WEBHOOK_SECRET` is set, Cursor webhooks are verified via `X-Webhook-Signature`.
- **Deduplication**: Jira retries are deduplicated by `X-Atlassian-Webhook-Identifier`. Duplicates receive `200` without re-processing.
- **Raw body**: `fastify-raw-body` is enabled for `/webhooks/jira` and `/webhooks/cursor` so signatures can be verified on the unmodified body.

## Troubleshooting

| Issue | Suggestion |
| ------- | ------------ |
| Agent not launching | Ensure `gh_repo` (or your custom field) is set on the Jira ticket. Check logs for `jiraWebhook repo field empty, skipping agent`. |
| Want to test Jira payload without Cursor | Set `NO_CURSOR_CALL=1`. Webhook will still run; Cursor API is skipped. |
| Signature verification failing | Confirm the secret in `.env` matches the secret configured in Jira/Cursor. Raw body must be unmodified. |
| Duplicate processing | Deduplication uses `X-Atlassian-Webhook-Identifier`. In-memory store holds ~10k IDs; restarts clear it. |
| Status not detected | Status names are normalized. Supported "To Do": `To Do`, `TODO`, `Open`, `Backlog`. "In Progress": `In Progress`, `In Development`. |

## License

ISC
