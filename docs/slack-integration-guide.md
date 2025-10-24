# Slack Integration Guide

## Overview

XCode provides **Slack App integration** using OAuth and the `chat.postMessage` API. This modern approach allows you to:

- Send notifications to any channel dynamically
- Use rich Block Kit formatting
- Manage messages programmatically
- Post to multiple channels from one configuration

**Looking for Incoming Webhooks?** If you prefer simple Slack webhooks, use the **Webhook** notification type instead and see the [Webhook Guide](#using-slack-incoming-webhooks) below.

---

## Common Issues

**Getting "missing_scope" error?**
- ✅ Added `chat:write` and `chat:write.public` scopes
- ⚠️ **Did you reinstall the app after adding scopes?** (Most common issue!)
- ⚠️ **Did you copy the NEW token after reinstalling?**
- ⚠️ **Did you restart XCode after updating the token?**

See [Troubleshooting](#troubleshooting) for detailed solutions.

---

## Quick Start: Slack App (OAuth)

### Step 1: Create Slack App

1. Go to [Slack Apps](https://api.slack.com/apps)
2. Click **"Create New App"** → **"From scratch"**
3. Name your app (e.g., "XCode CI/CD Bot")
4. Select your Slack workspace
5. Click **"Create App"**

### Step 2: Configure OAuth & Permissions

1. In the sidebar, navigate to **"OAuth & Permissions"**
2. Scroll down to **"Scopes"** section
3. Under **"Bot Token Scopes"**, click **"Add an OAuth Scope"**
4. Add the following scopes (REQUIRED):
   - `chat:write` - **Required:** Send messages as the bot
   - `chat:write.public` - **Required:** Send messages to public channels without joining
   - `chat:write.customize` - Optional: Customize message username and icon

⚠️ **Important:** If your app is already installed, you'll see a yellow banner saying "Please reinstall your app". You MUST reinstall to get the new scopes.

### Step 3: Install (or Reinstall) App to Workspace

1. Scroll back up on the **"OAuth & Permissions"** page
2. Click **"Install to Workspace"** (or **"Reinstall to Workspace"** if already installed)
3. Review permissions and click **"Allow"**
4. Copy the **"Bot User OAuth Token"** (starts with `xoxb-`)
5. ⚠️ **Replace your old token** with this new one in your environment variables

### Step 4: Configure Environment Variables

Add to your `.env` file or environment:

```env
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_DEFAULT_CHANNEL=#general
```

- `SLACK_BOT_TOKEN` - Your Slack Bot User OAuth Token (required)
- `SLACK_DEFAULT_CHANNEL` - Default channel if not specified in notification (optional)

**Restart XCode** after adding environment variables.

### Step 5: Create Slack Notification

1. Add a **Notification** node to your workflow
2. Select **"Slack"** as the notification type
3. Specify the channel (e.g., `#builds`, `@username`, or channel ID)
4. Choose message mode:
   - **Simple** - Plain text with markdown
   - **Block Kit** - Rich formatted messages
5. Write your message (supports context variables like `$BuildNumber`)
6. Done!

---

## Environment Variables

### Required

```env
SLACK_BOT_TOKEN=xoxb-<token>
```

Your Slack Bot User OAuth Token from the OAuth & Permissions page.

### Optional

```env
SLACK_DEFAULT_CHANNEL=#general
```

Default channel to use if not specified in the notification node. Can be:
- Channel name: `#general`, `#builds`
- User DM: `@username`
- Channel ID: `C1234567890`

---

## Using Slack Incoming Webhooks

If you prefer the simplicity of Incoming Webhooks (single-channel, no token management), use the **Webhook** notification type:

### Setup

1. Go to [Slack Apps](https://api.slack.com/apps)
2. Click **"Create New App"** → **"From scratch"**
3. Name your app and select your workspace
4. Go to **"Incoming Webhooks"** in the sidebar
5. Toggle **"Activate Incoming Webhooks"** to ON
6. Click **"Add New Webhook to Workspace"**
7. Select the channel you want notifications sent to
8. Copy the webhook URL

### Usage in XCode

1. Add a **Notification** node to your workflow
2. Select **"Webhook"** as the notification type
3. Set **Webhook URL** to your Slack webhook URL
4. Set **Method** to `POST`
5. Set **Headers** to:
   ```json
   {"Content-Type": "application/json"}
   ```
6. Set **Body** to:
   ```json
   {
     "text": ":white_check_mark: Build #$BuildNumber completed successfully!",
     "blocks": [
       {
         "type": "header",
         "text": {
           "type": "plain_text",
           "text": "Build #$BuildNumber Succeeded"
         }
       },
       {
         "type": "section",
         "fields": [
           {"type": "mrkdwn", "text": "*Project:*\n$ProjectName"},
           {"type": "mrkdwn", "text": "*Status:*\n$Status"}
         ]
       }
     ]
   }
   ```

**Webhook vs Slack App:**
- **Webhook**: Simple, single-channel, no environment variables
- **Slack App**: Multi-channel, dynamic routing, requires env vars

---

## Using Block Kit (Rich Formatting)

Block Kit allows you to create rich, visually appealing Slack messages.

### Example: Build Success Notification

```json
[
  {
    "type": "header",
    "text": {
      "type": "plain_text",
      "text": "✅ Build #$BuildNumber Succeeded"
    }
  },
  {
    "type": "section",
    "fields": [
      {"type": "mrkdwn", "text": "*Project:*\n$ProjectName"},
      {"type": "mrkdwn", "text": "*Exit Code:*\n$ExitCode"},
      {"type": "mrkdwn", "text": "*Time:*\n$TimestampHuman"},
      {"type": "mrkdwn", "text": "*Status:*\n$Status"}
    ]
  },
  {
    "type": "context",
    "elements": [
      {"type": "mrkdwn", "text": "Job ID: `$JobId`"}
    ]
  }
]
```

### Example: Build Failure Notification

```json
[
  {
    "type": "header",
    "text": {
      "type": "plain_text",
      "text": "❌ Build #$BuildNumber Failed"
    }
  },
  {
    "type": "section",
    "fields": [
      {"type": "mrkdwn", "text": "*Project:*\n$ProjectName"},
      {"type": "mrkdwn", "text": "*Exit Code:*\n$ExitCode"},
      {"type": "mrkdwn", "text": "*Time:*\n$TimestampHuman"},
      {"type": "mrkdwn", "text": "*Failed Node:*\n$FailedNodeLabel"}
    ]
  },
  {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": "```$Output```"
    }
  }
]
```

### Block Kit Builder

Use [Slack Block Kit Builder](https://app.slack.com/block-kit-builder) to visually design messages:

1. Open the Block Kit Builder
2. Design your message layout
3. Copy the JSON
4. Paste into XCode's "Slack Blocks" field
5. Replace hardcoded values with context variables (e.g., `$BuildNumber`)

---

## Available Context Variables

Use these variables in messages and blocks:

| Variable | Description | Example |
|----------|-------------|---------|
| `$ProjectName` | Project name | `MyApp CI/CD` |
| `$ProjectId` | Project UUID | `proj_abc123...` |
| `$BuildNumber` | Sequential build number | `42` |
| `$JobId` | Unique job identifier | `job_xyz789...` |
| `$Status` | Build status | `success`, `failed` |
| `$ExitCode` | Process exit code | `0`, `1` |
| `$Output` | Build output/logs | `Build completed...` |
| `$FailedNodeLabel` | Label of failed node | `Compile Step` |
| `$Timestamp` | ISO timestamp | `2025-10-24T...` |
| `$TimestampHuman` | Human-readable time | `Oct 24, 2025 3:45 PM` |
| `$CurrentAttempt` | Current retry attempt | `1`, `2` |
| `$MaxAttempts` | Max retry attempts | `3` |
| `$IsRetrying` | Is this a retry? | `true`, `false` |
| `$WillRetry` | Will retry after this? | `true`, `false` |

---

## Troubleshooting

### "Slack API error: missing_scope"

**Cause:** Your bot token doesn't have the required scopes, or you added scopes but didn't reinstall the app.

**Solution:**
1. Go to your Slack App → **OAuth & Permissions**
2. Verify these scopes are listed under **Bot Token Scopes**:
   - `chat:write`
   - `chat:write.public`
3. If there's a yellow banner saying "Please reinstall your app", click it
4. Click **"Reinstall to Workspace"** or **"Reinstall App"**
5. Copy the **new** Bot User OAuth Token
6. Update your `SLACK_BOT_TOKEN` environment variable with the new token
7. **Restart XCode**

⚠️ **Common mistake:** Adding scopes but not reinstalling the app. The old token won't have the new scopes!

### "Slack Bot Token not configured"

**Solution:** Set the `SLACK_BOT_TOKEN` environment variable and restart XCode:

```env
SLACK_BOT_TOKEN=xoxb-your-token-here
```

### "Channel is required for Slack OAuth mode"

**Solution:** Either specify a channel in the notification node, or set a default:

```env
SLACK_DEFAULT_CHANNEL=#general
```

### "Slack API error: not_in_channel"

**Cause:** The bot hasn't joined the private channel

**Solution:**
1. Invite the bot to the channel: `/invite @YourBotName`
2. Or use the `chat:write.public` scope to post without joining public channels

### "Slack API error: channel_not_found"

**Cause:** Invalid channel name or ID

**Solution:**
- Use `#channel-name` for public channels
- Use `@username` for DMs
- Or use the channel ID (e.g., `C1234567890`)

### Blocks Not Rendering

**Cause:** Invalid JSON in Slack Blocks field

**Solution:**
1. Validate JSON at [JSONLint](https://jsonlint.com/)
2. Test blocks in [Block Kit Builder](https://app.slack.com/block-kit-builder)
3. Ensure context variables are properly placed

---

## Security Best Practices

### Protect Your Tokens

1. **Never commit tokens to git** - Use `.env` files and add to `.gitignore`
2. **Rotate tokens periodically** - Regenerate every 90 days
3. **Use minimal scopes** - Only add required scopes (`chat:write`, `chat:write.public`)
4. **Monitor usage** - Check Slack App dashboard for suspicious activity

### Environment Variables Best Practices

```env
# .env file (add to .gitignore!)
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_DEFAULT_CHANNEL=#general
```

**Docker/Container:**
```bash
docker run -e SLACK_BOT_TOKEN=xoxb-... xcode-app
```

**System Service:**
```ini
[Service]
Environment="SLACK_BOT_TOKEN=xoxb-..."
Environment="SLACK_DEFAULT_CHANNEL=#general"
```

---

## Advanced Use Cases

### Conditional Channels

Route notifications based on status:

**Success:** Channel = `#build-success`
**Failure:** Channel = `#build-alerts`

### Multiple Workspaces

For multiple Slack workspaces:
- Use webhook notifications (each workspace has its own webhook URL)
- Or run multiple XCode instances with different `SLACK_BOT_TOKEN` values

### Rich Error Reports

Use Block Kit to display detailed error information with code blocks and contextual data.

---

## Additional Resources

- [Slack API Documentation](https://api.slack.com/)
- [Block Kit Builder](https://app.slack.com/block-kit-builder)
- [Block Kit Reference](https://api.slack.com/block-kit)
- [Slack API Scopes](https://api.slack.com/scopes)
- [Rate Limits](https://api.slack.com/docs/rate-limits)

---

**Happy Building! 🚀**
