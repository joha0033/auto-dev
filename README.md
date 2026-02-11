# auto-dev

Automated development workflow integration between Jira and Cursor Cloud Agents.

## Overview

`auto-dev` is a Fastify-based webhook server that listens for Jira status transitions and automatically launches Cursor Cloud Agents to work on tasks. When a Jira issue is moved from "To Do" to "In Progress", the system automatically:

1. Detects the status change via Jira webhook
2. Extracts the issue summary and description
3. Launches a Cursor Cloud Agent with the task details
4. Creates a feature branch (`{ISSUE_KEY}/cursor`)
5. Optionally creates a PR when the agent completes the work

## Features

- **Webhook Security**: Verifies Jira webhook signatures using HMAC-SHA256
- **Deduplication**: Prevents duplicate webhook processing using `X-Atlassian-Webhook-Identifier`
- **Fire-and-Forget Agent Launch**: Non-blocking agent creation for fast webhook responses
- **Custom Repository Support**: Configure repo per-ticket via Jira custom field or globally
- **Automatic Branch Creation**: Creates feature branches based on Jira issue keys

## Prerequisites

- Node.js (v18 or higher recommended)
- pnpm package manager
- Jira Cloud account with webhook configuration
- Cursor Cloud Agents API access

## Installation

```bash
pnpm install
```

## Configuration

Create a `.env` file in the project root with the following variables:

```bash
# Required
CURSOR_API_KEY=your_cursor_api_key_here
CURSOR_REPO=https://github.com/username/repo.git

# Optional
JIRA_WEBHOOK_SECRET=your_jira_webhook_secret
JIRA_BASE_URL=https://yourcompany.atlassian.net
JIRA_GH_REPO_FIELD=gh_repo
CURSOR_REF=main
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CURSOR_API_KEY` | Yes | API key for Cursor Cloud Agents |
| `CURSOR_REPO` | Yes* | Default repository URL (can be overridden by Jira custom field) |
| `JIRA_WEBHOOK_SECRET` | No | Secret for verifying Jira webhook signatures (recommended for production) |
| `JIRA_BASE_URL` | No | Your Jira instance base URL |
| `JIRA_GH_REPO_FIELD` | No | Custom field name for per-ticket repository (default: `gh_repo`) |
| `CURSOR_REF` | No | Git reference/branch to use as base (default: `main`) |

*Required unless specified per-ticket via Jira custom field

## Usage

### Development Mode

```bash
pnpm run dev
```

This runs the server with Node.js watch mode, automatically restarting on file changes.

### Production Mode

```bash
pnpm start
```

The server listens on `http://0.0.0.0:3000` by default.

### Endpoints

- `GET /` - Health check endpoint (returns `{"hello": "world"}`)
- `POST /webhooks/jira` - Main Jira webhook endpoint
- `POST /webooks/jira` - Alternative endpoint (typo tolerance)

## Jira Webhook Setup

1. Navigate to **Settings** → **System** → **WebHooks** in your Jira instance
2. Click **Create a WebHook**
3. Configure:
   - **Name**: Auto-Dev Webhook
   - **Status**: Enabled
   - **URL**: `https://your-domain.com/webhooks/jira`
   - **Events**: Issue → Updated
   - **Exclude body**: Unchecked
   - **Secret** (optional): Set and add to `.env` as `JIRA_WEBHOOK_SECRET`

## How It Works

1. Jira sends a webhook when an issue status changes
2. The server verifies the signature (if `JIRA_WEBHOOK_SECRET` is configured)
3. Deduplication check prevents processing the same webhook multiple times
4. If the status changed from "To Do" → "In Progress", trigger agent launch
5. Extract issue summary, description, and repository from the Jira payload
6. Launch a Cursor Cloud Agent with:
   - Branch name: `{ISSUE_KEY}/cursor`
   - Prompt: Issue summary and description
   - Auto-create PR enabled

## Project Structure

```
.
├── src/
│   ├── index.js                      # Main Fastify server
│   ├── routes/
│   │   └── webhooks/
│   │       └── jira.js               # Jira webhook handler
│   └── lib/
│       ├── cursor-agent.js           # Cursor Cloud Agent launcher
│       ├── jira-webhook.js           # Webhook event detection
│       ├── jira-prompt.js            # Prompt generation from Jira data
│       ├── verify-jira-signature.js  # Signature verification
│       └── dedupe-store.js           # In-memory deduplication
├── package.json
├── pnpm-lock.yaml
└── README.md
```

## Security Considerations

- **Always use HTTPS** in production for webhook endpoints
- **Set `JIRA_WEBHOOK_SECRET`** to verify webhook authenticity
- **Protect your `.env` file** - never commit it to version control
- **Restrict API keys** to minimum required permissions
- Consider implementing rate limiting for production deployments

## Troubleshooting

### Webhook not triggering

- Verify the webhook URL is accessible from Jira
- Check Jira webhook delivery logs
- Ensure the status transition is from "To Do" to "In Progress"

### Agent not launching

- Verify `CURSOR_API_KEY` is valid
- Check repository URL is accessible
- Review server logs for error messages
- Ensure issue has both summary and description

### Signature verification failures

- Confirm `JIRA_WEBHOOK_SECRET` matches Jira configuration
- Check that raw body parsing is working correctly

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.
