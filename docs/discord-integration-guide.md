# Discord Integration Guide

## Overview

XCode integrates with Discord using **Discord Webhooks**. This allows you to send build notifications, alerts, and status updates directly to your Discord channels.

Discord webhooks are simple, require no bot setup, and work perfectly with XCode's **Webhook** notification type.

---

## Quick Start

### Step 1: Create Discord Webhook

1. Open Discord and go to the channel you want notifications in
2. Click the **gear icon** (Edit Channel) next to the channel name
3. Go to **Integrations** → **Webhooks**
4. Click **New Webhook** or **Create Webhook**
5. Customize the webhook:
   - **Name**: `XCode Notifications` (or your preference)
   - **Channel**: Select your desired channel
   - **Avatar**: Upload an icon (optional)
6. Click **Copy Webhook URL**
7. Click **Save**

Your webhook URL will look like:
```
https://discord.com/api/webhooks/123456789/abcdefghijklmnopqrstuvwxyz
```

### Step 2: Create Webhook Notification in XCode

1. Add a **Notification** node to your workflow
2. Select **"Webhook"** as the notification type
3. Configure the webhook:

**Webhook URL:**
```
https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
```

**Method:**
```
POST
```

**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Body (Simple Message):**
```json
{
  "content": ":white_check_mark: **Build #$BuildNumber** completed successfully!\n\n**Project:** $ProjectName\n**Status:** $Status\n**Exit Code:** $ExitCode\n**Time:** $TimestampHuman"
}
```

---

## Message Formats

Discord supports rich message formatting through embeds. Here are examples for different use cases:

### Simple Text Message

```json
{
  "content": ":white_check_mark: Build #$BuildNumber completed successfully!"
}
```

### Rich Embed (Recommended)

```json
{
  "embeds": [{
    "title": "Build #$BuildNumber Succeeded",
    "color": 3066993,
    "fields": [
      {
        "name": "Project",
        "value": "$ProjectName",
        "inline": true
      },
      {
        "name": "Status",
        "value": "$Status",
        "inline": true
      },
      {
        "name": "Exit Code",
        "value": "$ExitCode",
        "inline": true
      },
      {
        "name": "Time",
        "value": "$TimestampHuman",
        "inline": true
      }
    ],
    "footer": {
      "text": "Job ID: $JobId"
    },
    "timestamp": "$Timestamp"
  }]
}
```

### Success Notification (Green)

```json
{
  "username": "XCode CI/CD",
  "avatar_url": "https://your-domain.com/success-icon.png",
  "embeds": [{
    "title": "✅ Build #$BuildNumber Succeeded",
    "description": "Build completed successfully without errors",
    "color": 3066993,
    "fields": [
      {
        "name": "📦 Project",
        "value": "$ProjectName",
        "inline": true
      },
      {
        "name": "⚡ Status",
        "value": "$Status",
        "inline": true
      },
      {
        "name": "🔢 Exit Code",
        "value": "$ExitCode",
        "inline": true
      },
      {
        "name": "🕒 Time",
        "value": "$TimestampHuman",
        "inline": true
      }
    ],
    "footer": {
      "text": "XCode Build System"
    },
    "timestamp": "$Timestamp"
  }]
}
```

### Failure Notification (Red)

```json
{
  "username": "XCode CI/CD",
  "avatar_url": "https://your-domain.com/error-icon.png",
  "embeds": [{
    "title": "❌ Build #$BuildNumber Failed",
    "description": "Build failed at node: **$FailedNodeLabel**",
    "color": 15158332,
    "fields": [
      {
        "name": "📦 Project",
        "value": "$ProjectName",
        "inline": true
      },
      {
        "name": "💥 Failed Node",
        "value": "$FailedNodeLabel",
        "inline": true
      },
      {
        "name": "🔢 Exit Code",
        "value": "$ExitCode",
        "inline": true
      },
      {
        "name": "🕒 Time",
        "value": "$TimestampHuman",
        "inline": true
      },
      {
        "name": "📋 Output",
        "value": "```\n$Output\n```"
      }
    ],
    "footer": {
      "text": "Job ID: $JobId"
    },
    "timestamp": "$Timestamp"
  }]
}
```

### Warning Notification (Yellow)

```json
{
  "embeds": [{
    "title": "⚠️ Build #$BuildNumber - Warning",
    "description": "Build completed with warnings",
    "color": 16776960,
    "fields": [
      {
        "name": "Project",
        "value": "$ProjectName",
        "inline": true
      },
      {
        "name": "Status",
        "value": "$Status",
        "inline": true
      }
    ],
    "timestamp": "$Timestamp"
  }]
}
```

---

## Discord Embed Colors

Use these decimal color codes for different notification types:

| Type | Color Name | Decimal Code | Hex |
|------|------------|--------------|-----|
| Success | Green | `3066993` | `#2ECC71` |
| Error | Red | `15158332` | `#E74C3C` |
| Warning | Yellow | `16776960` | `#FFFF00` |
| Info | Blue | `3447003` | `#3498DB` |
| Default | Gray | `9807270` | `#95A5A6` |

---

## Available Context Variables

Use these variables in your Discord webhook bodies:

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

## Environment Variables (Optional)

For convenience, you can set a default Discord webhook URL using an environment variable:

Add to your `.env` file:
```env
# Discord Webhook (optional - provides a default webhook URL)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/123456789/abcdefghijklmnopqrstuvwxyz
```

**Usage:**
- If set, this ENV variable can be referenced in notification nodes for convenience
- You can still specify different webhook URLs directly in each notification node for different channels/scenarios
- Using ENV variables is more secure and easier to rotate if a webhook is compromised

**Restart XCode** after adding environment variables.

---

## Advanced Examples

### Mention Users on Failure

```json
{
  "content": "<@USER_ID> Build failed! Please check.",
  "embeds": [{
    "title": "❌ Build #$BuildNumber Failed",
    "color": 15158332,
    "fields": [
      {
        "name": "Project",
        "value": "$ProjectName"
      }
    ]
  }]
}
```

To get a user ID:
1. Enable Developer Mode in Discord (Settings → Advanced → Developer Mode)
2. Right-click a user → Copy ID

### Mention Roles

```json
{
  "content": "<@&ROLE_ID> Build completed!",
  "embeds": [...]
}
```

### Add Thumbnail Image

```json
{
  "embeds": [{
    "title": "Build #$BuildNumber",
    "color": 3066993,
    "thumbnail": {
      "url": "https://your-domain.com/build-icon.png"
    },
    "fields": [...]
  }]
}
```

### Add Clickable Buttons (Not Supported)

Note: Discord webhooks **do not support** interactive components (buttons, select menus). For interactive messages, you need a Discord Bot application.

---

## Multiple Discord Channels

To send notifications to different channels, create separate webhook nodes:

### Example: Success vs Failure Channels

**Success Notification Node:**
- Webhook URL: `https://discord.com/api/webhooks/123/abc` (success channel)
- Triggered on: Build success

**Failure Notification Node:**
- Webhook URL: `https://discord.com/api/webhooks/456/def` (alerts channel)
- Triggered on: Build failure

---

## Rate Limits

Discord webhook rate limits:
- **30 requests per minute** per webhook
- **5 requests per second** globally

If you exceed limits:
- Discord returns HTTP 429 (Too Many Requests)
- Wait and retry

**Best Practice:** Don't spam webhooks. Use conditional notifications for important events only.

---

## Troubleshooting

### Webhook Returns 404

**Cause:** Webhook URL is invalid or webhook was deleted

**Solution:**
- Verify webhook still exists in Discord channel settings
- Create a new webhook if needed
- Update URL in XCode notification node

### Message Not Appearing

**Cause:** Content or embeds are empty

**Solution:**
- Ensure you have either `content` or `embeds` in your JSON
- Check that context variables are resolving correctly
- Test with static text first

### Embed Not Rendering

**Cause:** Invalid JSON structure

**Solution:**
- Validate JSON at [JSONLint](https://jsonlint.com/)
- Check Discord embed documentation
- Ensure color is a decimal number, not hex string

### Rate Limited (429 Error)

**Cause:** Sending too many messages too quickly

**Solution:**
- Reduce notification frequency
- Use conditional logic to only send important notifications
- Wait before retrying

---

## Security Best Practices

### Protect Your Webhook URLs

1. **Never commit webhooks to git** - Use environment variables
2. **Regenerate if exposed** - Delete and create new webhook
3. **Limit permissions** - Only share with trusted team members
4. **Use separate webhooks** - Different webhooks for different purposes

### Webhook URL Security

Discord webhook URLs contain:
- Webhook ID (public)
- Webhook Token (secret)

If someone has your webhook URL, they can send messages to your channel. Keep it secret!

### Regenerate Webhook

If compromised:
1. Go to Discord channel → Integrations → Webhooks
2. Delete the compromised webhook
3. Create a new webhook
4. Update XCode configuration

---

## Testing Your Webhook

### Test with cURL

```bash
curl -X POST "https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Test message from XCode"}'
```

### Test in XCode

1. Create a simple workflow with just a notification node
2. Trigger the workflow manually
3. Check your Discord channel for the message

---

## Discord Markdown Support

Discord supports markdown formatting in the `content` field and embed descriptions:

| Format | Syntax | Result |
|--------|--------|--------|
| Bold | `**text**` | **text** |
| Italic | `*text*` or `_text_` | *text* |
| Underline | `__text__` | <u>text</u> |
| Strikethrough | `~~text~~` | ~~text~~ |
| Code | `` `code` `` | `code` |
| Code Block | ` ```code``` ` | ```code``` |
| Quote | `> text` | > text |
| Link | `[text](url)` | [text](url) |

---

## Example: Complete Workflow Setup

### Build Success Notification

```json
{
  "username": "XCode Build Bot",
  "embeds": [{
    "title": "✅ Build Successful",
    "description": "Build #$BuildNumber of **$ProjectName** completed successfully",
    "color": 3066993,
    "fields": [
      {
        "name": "Status",
        "value": "✅ $Status",
        "inline": true
      },
      {
        "name": "Exit Code",
        "value": "$ExitCode",
        "inline": true
      },
      {
        "name": "Duration",
        "value": "Completed at $TimestampHuman",
        "inline": false
      }
    ],
    "footer": {
      "text": "Job ID: $JobId"
    },
    "timestamp": "$Timestamp"
  }]
}
```

### Build Failure with Retry Info

```json
{
  "username": "XCode Build Bot",
  "embeds": [{
    "title": "❌ Build Failed",
    "description": "Build #$BuildNumber of **$ProjectName** failed",
    "color": 15158332,
    "fields": [
      {
        "name": "Failed Node",
        "value": "$FailedNodeLabel",
        "inline": true
      },
      {
        "name": "Exit Code",
        "value": "$ExitCode",
        "inline": true
      },
      {
        "name": "Retry Status",
        "value": "Attempt $CurrentAttempt of $MaxAttempts\n$WillRetry",
        "inline": false
      },
      {
        "name": "Error Output",
        "value": "```\n$Output\n```"
      }
    ],
    "footer": {
      "text": "Job ID: $JobId"
    },
    "timestamp": "$Timestamp"
  }]
}
```

---

## Additional Resources

- [Discord Webhook Documentation](https://discord.com/developers/docs/resources/webhook)
- [Discord Embed Visualizer](https://leovoel.github.io/embed-visualizer/) - Test your embeds
- [Discord Markdown Guide](https://support.discord.com/hc/en-us/articles/210298617)
- [Discord Developer Portal](https://discord.com/developers/applications)

---

## Comparison: Discord vs Slack

| Feature | Discord Webhooks | Slack Incoming Webhooks |
|---------|------------------|-------------------------|
| Setup | Very easy | Very easy |
| Rich formatting | Embeds | Blocks |
| Mentions | User/Role IDs | Channel names |
| Avatars | Supported | Supported |
| Interactive components | ❌ No | ❌ No |
| Rate limits | 30/min | 1/sec |
| Best for | Gaming communities | Professional teams |

---

**Happy Building! 🚀**
