# Supabase Edge Functions Secrets Setup

This guide explains how to configure secrets for Supabase edge functions, specifically the `LOVABLE_API_KEY` required for AI-powered features.

## Required Secret

- **`LOVABLE_API_KEY`**: Your Lovable AI Gateway API key for accessing AI services

## Functions That Require LOVABLE_API_KEY

The following edge functions require this secret:
- `voice-to-text` - Processes voice input and converts to text with AI assistance
- `fashion-assistant` - Provides AI-powered fashion recommendations
- `style-recommendations` - Generates personalized style recommendations

## Setting Secrets

### Method 1: Using Supabase CLI (Recommended)

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link your project** (if not already linked):
   ```bash
   supabase link --project-ref zxuyvgmouylbibyrkizy
   ```

4. **Set the secret**:
   ```bash
   supabase secrets set LOVABLE_API_KEY=your_lovable_api_key_here
   ```

5. **Verify the secret is set**:
   ```bash
   supabase secrets list
   ```

### Method 2: Using Supabase Dashboard

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project (project ID: `zxuyvgmouylbibyrkizy`)
3. Navigate to **Settings** → **Edge Functions** → **Secrets**
4. Click **Add Secret**
5. Enter:
   - **Name**: `LOVABLE_API_KEY`
   - **Value**: Your Lovable API key
6. Click **Save**

### Method 3: Using Supabase CLI with Environment File

1. Create a `.env` file in your project root (if it doesn't exist)
2. Add your secret:
   ```bash
   LOVABLE_API_KEY=your_lovable_api_key_here
   ```
3. Set the secret from the file:
   ```bash
   supabase secrets set --env-file .env
   ```

## Getting Your Lovable API Key

1. Log into your [Lovable account](https://lovable.dev)
2. Navigate to **Project Settings** → **AI Gateway**
3. Copy your API key (starts with `lv_` or similar)
4. Use this key when setting the secret

## Verifying Configuration

After setting the secret, test one of the edge functions:

```bash
# Test voice-to-text function
curl -X POST https://zxuyvgmouylbibyrkizy.supabase.co/functions/v1/voice-to-text \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, I need fashion advice"}'
```

If configured correctly, you should receive a successful response. If you get a 500 error with "LOVABLE_API_KEY is not configured", the secret hasn't been set properly.

## Local Development

For local development with Supabase CLI:

1. **Start Supabase locally**:
   ```bash
   supabase start
   ```

2. **Set secrets locally**:
   ```bash
   supabase secrets set LOVABLE_API_KEY=your_key_here --local
   ```

3. **Serve functions locally**:
   ```bash
   supabase functions serve voice-to-text
   ```

## Troubleshooting

### Error: "LOVABLE_API_KEY is not configured"

**Solution**: The secret hasn't been set. Follow the steps above to set it.

### Error: "AI Gateway error: 401"

**Solution**: Your API key is invalid or expired. Get a new key from Lovable and update the secret.

### Error: "AI Gateway error: 402"

**Solution**: Your Lovable AI credits have been depleted. Add credits in your Lovable project settings.

### Error: "AI Gateway error: 429"

**Solution**: Rate limit exceeded. Wait a moment and try again.

### Secret Not Available in Function

**Possible causes**:
1. Secret was set but function hasn't been redeployed
2. Secret name has a typo (must be exactly `LOVABLE_API_KEY`)
3. Wrong project is linked

**Solution**:
1. Redeploy the function: `supabase functions deploy voice-to-text`
2. Double-check the secret name
3. Verify project link: `supabase projects list`

## Security Best Practices

⚠️ **IMPORTANT**:
- Never commit API keys to version control
- Never expose secrets in client-side code
- Use Supabase secrets management for all sensitive values
- Rotate keys if accidentally exposed
- Use different keys for development and production if possible

## Additional Resources

- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [Supabase Secrets Management](https://supabase.com/docs/guides/functions/secrets)
- [Lovable AI Gateway Documentation](https://docs.lovable.dev)

