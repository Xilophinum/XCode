# Notifications Overview

XCode supports multiple notification channels to keep your team informed about build status, failures, and important events.

---

## Available Notification Types

### 1. Email (SMTP)

Send email notifications using your SMTP server.

**Best for:**
- Formal notifications
- Compliance/audit requirements
- Detailed reports
- Organizations with existing email infrastructure

**Configuration:**
- Admin → Settings → Notifications
- Configure SMTP server, port, credentials
- Supports HTML emails
- Template system included

**Documentation:** Built-in (see Admin → Settings)

---

### 2. Slack (OAuth App)

Modern Slack integration using Slack Bot Token.

**Best for:**
- Team collaboration
- Dynamic channel routing
- Rich formatted messages (Block Kit)
- Multi-channel notifications

**Configuration:**
- Create Slack App with Bot Token
- Add token to Admin → Settings → Notifications
- Specify channel per notification
- Supports Block Kit rich formatting

**Documentation:** [Slack Integration Guide](./slack-integration-guide.md)

**Quick Start:**
1. Create Slack App at [api.slack.com/apps](https://api.slack.com/apps)
2. Add `chat:write` scope
3. Install to workspace
4. Copy Bot Token (`xoxb-...`)
5. Add to XCode settings

---

### 3. Webhook (Universal)

Generic HTTP webhook support for any service.

**Best for:**
- Discord notifications
- Microsoft Teams
- Slack Incoming Webhooks
- Custom APIs
- Any HTTP endpoint

**Supports:**
- Custom headers
- Custom JSON body
- Context variable substitution
- Multiple HTTP methods (POST, PUT, PATCH, etc.)

**Documentation:**
- [Discord Integration Guide](./discord-integration-guide.md)
- [Slack Webhooks](./slack-integration-guide.md#using-slack-incoming-webhooks)

**Quick Start:**
1. Get webhook URL from your service
2. Add Webhook notification node
3. Configure URL, headers, body
4. Use context variables in body

---

## Comparison Table

| Feature | Email | Slack | Webhook |
|---------|-------|-------|---------|
| **Setup Complexity** | Medium | Medium | Easy |
| **Rich Formatting** | HTML | Block Kit | Service-specific |
| **Real-time** | No | Yes | Yes |
| **Authentication** | SMTP | OAuth Token | URL-based |
| **Multi-channel** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Templates** | ✅ Built-in | ✅ Built-in | ⚠️ Manual |
| **Best Use Case** | Formal reports | Team collab | Quick integrations |

---

## Context Variables

All notification types support these variables:

| Variable | Description |
|----------|-------------|
| `$ProjectName` | Project name |
| `$BuildNumber` | Sequential build number |
| `$JobId` | Unique job identifier |
| `$Status` | Build status (success/failed) |
| `$ExitCode` | Process exit code |
| `$Output` | Build output/logs |
| `$FailedNodeLabel` | Failed node label (if failed) |
| `$Timestamp` | ISO timestamp |
| `$TimestampHuman` | Human-readable time |
| `$CurrentAttempt` | Current retry attempt |
| `$MaxAttempts` | Max retry attempts |

---

## Quick Configuration Guide

### Email Setup

```env
# Environment variables (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_SECURE=false
```

Or configure in: **Admin → Settings → Notifications**

### Slack Setup

```env
# Environment variables (required)
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_DEFAULT_CHANNEL=#general
```

Restart XCode after setting environment variables.

### Discord Webhook Example

```json
{
  "embeds": [{
    "title": "Build #$BuildNumber - $Status",
    "color": 3066993,
    "fields": [
      {"name": "Project", "value": "$ProjectName", "inline": true},
      {"name": "Exit Code", "value": "$ExitCode", "inline": true}
    ]
  }]
}
```

### Slack Webhook Example

```json
{
  "text": "Build #$BuildNumber completed!",
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "Build #$BuildNumber"
      }
    }
  ]
}
```

---

## Templates

XCode includes built-in notification templates:

### Email Templates
- **Email: Build Success** - Success notification
- **Email: Build Failure** - Failure notification with logs

### Slack Templates
- **Slack: Build Success** - Success with Block Kit
- **Slack: Build Failure** - Failure with Block Kit

### Webhook Templates
- **Webhook: Generic** - Generic webhook with all variables

**Custom Templates:**
Create your own in **Admin → Notification Templates**

---

## Common Patterns

### Pattern 1: Notify on Failure Only

1. Add notification node
2. Connect only from failure edge
3. Configure alert channel

### Pattern 2: Different Channels for Success/Failure

**Success Path:**
- Notification → Slack → `#builds-success`

**Failure Path:**
- Notification → Slack → `#build-alerts`

### Pattern 3: Multi-Channel Notifications

1. Add multiple notification nodes
2. Connect in parallel:
   - Email to team@company.com
   - Slack to #builds
   - Discord to #ci-cd

### Pattern 4: Conditional Notifications

Use input sockets or parameters to conditionally send:
- Only notify on main branch
- Only notify on production deployments
- Only notify specific users

---

## Service-Specific Guides

- **[Slack Integration Guide](./slack-integration-guide.md)** - Slack App setup, Block Kit examples
- **[Discord Integration Guide](./discord-integration-guide.md)** - Discord webhook setup, embed examples

---

## Troubleshooting

### Email Not Sending

1. Check SMTP settings in Admin → Settings
2. Verify credentials and port
3. Check server logs for SMTP errors
4. Test with MailHog for local development

### Slack Not Receiving

1. Verify Bot Token is configured
2. Check channel name format (`#general` or `C1234567890`)
3. Ensure bot is invited to private channels
4. Check scopes: `chat:write`, `chat:write.public`

### Discord Not Receiving

1. Verify webhook URL is correct
2. Check webhook still exists in Discord
3. Validate JSON structure
4. Check rate limits (30/min)

### Variables Not Resolving

1. Ensure correct syntax: `$VariableName`
2. Check variable is available in context
3. Test with static values first
4. Check server logs for resolution errors

---

## Security Best Practices

### 1. Protect Credentials

- Never commit tokens/passwords to git
- Use environment variables
- Rotate credentials periodically
- Use admin settings for sensitive data

### 2. Limit Information

- Don't send sensitive data in notifications
- Truncate large outputs
- Use summaries instead of full logs
- Consider channel permissions

### 3. Rate Limits

- Don't spam notification channels
- Use conditional logic
- Batch notifications when possible
- Respect service rate limits

### 4. Webhook Security

- Keep webhook URLs secret
- Regenerate if exposed
- Use separate webhooks for different purposes
- Monitor webhook usage

---

## Advanced Configuration

### Environment Variables

```env
# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=user@gmail.com
SMTP_PASS=password
SMTP_SECURE=false

# Slack OAuth Integration
SLACK_BOT_TOKEN=xoxb-token
SLACK_DEFAULT_CHANNEL=#general

# Discord Webhook (optional - for convenience)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

### Database Settings

All notification settings can be configured in:
- **UI:** Admin → Settings → Notifications
- **Database:** `system_settings` table, category = `notifications`

---

## Getting Help

- Check service-specific guides
- Review server logs for detailed errors
- Test with simple static messages first
- Verify service status pages

---

## Summary

XCode provides flexible notification options:

- **Email** - For formal, detailed reports
- **Slack** - For team collaboration and rich formatting
- **Webhook** - For Discord, Teams, and custom integrations

Choose the right tool for your needs, or use multiple channels for redundancy!

**Happy Building! 🚀**
