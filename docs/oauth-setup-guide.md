# OAuth Setup Guide

FlowForge supports OAuth authentication with GitHub, Google, and Microsoft. Users can sign in with their existing accounts from these providers.

## Features

- **Automatic Account Creation**: New users are created automatically on first OAuth login
- **Account Linking**: Existing users (matched by email) are automatically linked to OAuth providers
- **Session Management**: OAuth logins respect your `session_timeout` system setting
- **Secure**: OAuth tokens are stored in encrypted session cookies

## Supported Providers

### GitHub OAuth

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the details:
   - **Application name**: FlowForge
   - **Homepage URL**: `http://localhost:3000` (or your domain)
   - **Authorization callback URL**: `http://localhost:3000/auth/github`
4. Copy the **Client ID** and generate a **Client Secret**
5. Add to `.env`:
   ```properties
   NUXT_OAUTH_GITHUB_CLIENT_ID=your_client_id
   NUXT_OAUTH_GITHUB_CLIENT_SECRET=your_client_secret
   ```

## You/Your Users Github Email MUST NOT BE PRIVATE to be able to use Github OAuth. Navigate to Settings -> Access -> Emails and validate your email is public. Afterwards, you will need to go to Settings -> Public Profile and select the email. Only publicly accessible emails are allowed to use Github OAuth. 

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project or select an existing one
3. Click "Create Credentials" → "OAuth client ID"
4. Choose "Web application"
5. Add authorized redirect URI: `http://localhost:3000/auth/google`
6. Copy the **Client ID** and **Client Secret**
7. Add to `.env`:
   ```properties
   NUXT_OAUTH_GOOGLE_CLIENT_ID=your_client_id
   NUXT_OAUTH_GOOGLE_CLIENT_SECRET=your_client_secret
   ```

### Microsoft OAuth (Azure AD)

1. Go to [Azure Portal](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)
2. Click "New registration"
3. Fill in the details:
   - **Name**: FlowForge
   - **Supported account types**: Choose based on your needs
   - **Redirect URI**: Web → `http://localhost:3000/auth/microsoft`
4. Go to "Certificates & secrets" → "New client secret"
5. Copy the **Application (client) ID** and **Client secret value**
6. Add to `.env`:
   ```properties
   NUXT_OAUTH_MICROSOFT_CLIENT_ID=your_application_id
   NUXT_OAUTH_MICROSOFT_CLIENT_SECRET=your_client_secret
   NUXT_OAUTH_MICROSOFT_TENANT=common
   ```
   
   **Tenant options**:
   - `common` - Multi-tenant (any Microsoft account)
   - `organizations` - Work/school accounts only
   - `consumers` - Personal Microsoft accounts only
   - `<tenant-id>` - Specific Azure AD tenant

## Testing

1. Add your OAuth credentials to `.env`
2. Restart the server: `pnpm dev`
3. Go to login page
4. You should see "Or continue with" buttons for configured providers
5. Click a provider button to test OAuth login

## How It Works

### User Creation Flow

1. User clicks "Continue with GitHub/Google/Microsoft"
2. User is redirected to OAuth provider for authentication
3. On success, callback endpoint receives user profile data
4. System checks if user exists by OAuth provider ID
5. If not found, checks if user exists by email
6. If user exists with same email, links the OAuth account
7. If user doesn't exist, creates new user with:
   - Name from OAuth profile
   - Email from OAuth profile
   - `userType` set to provider name ('github', 'google', 'microsoft')
   - `externalId` set to provider's user ID
   - No password (OAuth users don't have passwords)
8. User is logged in with session-based authentication

### Database Fields Used

- `userType`: 'github', 'google', 'microsoft', 'local', or 'ldap'
- `externalId`: OAuth provider's unique user ID
- `email`: Email from OAuth provider (used for account linking)
- `passwordHash`: `null` for OAuth users

## Security Notes

- OAuth tokens are stored in encrypted session cookies, not in the database
- The access token is available in `session.oauth.accessToken` if you need to make API calls to the OAuth provider
- OAuth users cannot log in with a password (since they don't have one)
- If an OAuth user wants to switch to password authentication, an admin would need to set a password for them

## Disabling OAuth

To disable an OAuth provider, simply remove or comment out the credentials from `.env`:

```properties
# NUXT_OAUTH_GITHUB_CLIENT_ID=
# NUXT_OAUTH_GITHUB_CLIENT_SECRET=
```

The OAuth button will automatically disappear from the login page.

## Production Setup

For production, update the callback URLs to use your production domain:

```properties
# GitHub: https://yourdomain.com/auth/github
# Google: https://yourdomain.com/auth/google
# Microsoft: https://yourdomain.com/auth/microsoft
```

Make sure to update the OAuth app settings in each provider's console with your production URLs.
