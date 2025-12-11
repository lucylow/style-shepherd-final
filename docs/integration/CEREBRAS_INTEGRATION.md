# Cerebras Integration for Style Shepherd

This document describes the integration of Cerebras AI models into Style Shepherd's backend.

## Overview

Cerebras has been integrated as a primary LLM provider for Style Shepherd, offering high-performance inference through their OpenAI-compatible API. The integration uses the provider abstraction layer, allowing seamless switching between Cerebras and OpenAI.

## Features

- **OpenAI-Compatible API**: Uses Cerebras's OpenAI-compatible endpoint for easy integration
- **Provider Registry**: Integrated into the provider abstraction system with automatic failover
- **Priority-Based Selection**: Cerebras is configured with higher priority (lower number) than OpenAI, making it the preferred provider when available
- **Streaming Support**: Full support for streaming responses
- **Fallback Support**: Automatically falls back to OpenAI if Cerebras is unavailable

## Configuration

### Environment Variables

Add the following environment variables to your `.env` file:

```bash
# Cerebras API Configuration
CEREBRAS_API_KEY=your_cerebras_api_key_here
CEREBRAS_BASE_URL=https://api.cerebras.ai/v1  # Optional, defaults to Cerebras API
CEREBRAS_MODEL=llama-3.3-70b  # Optional, defaults to llama-3.3-70b
```

### Available Models

Cerebras supports various models. Common options include:
- `llama-3.3-70b` (default)
- `llama-3.1-8b`
- `llama-3.1-70b`
- And other models available through Cerebras API

Check the [Cerebras Inference API Documentation](https://inference-docs.cerebras.ai/) for the latest available models.

## Architecture

### Provider Abstraction Layer

The integration uses the existing provider abstraction system:

```
LLMService
  ├── Provider Registry (Priority-based selection)
  │   ├── CerebrasAdapter (Priority: 5) ← Preferred
  │   └── OpenAIAdapter (Priority: 10) ← Fallback
  └── Direct OpenAI Client (Legacy fallback)
```

### Components

1. **CerebrasAdapter** (`server/src/lib/llm/cerebrasAdapter.ts`)
   - Implements `LLMAdapter` interface
   - Handles chat completions and streaming
   - OpenAI-compatible API calls

2. **LLMService** (`server/src/services/LLMService.ts`)
   - Updated to use provider registry
   - Automatically selects Cerebras when available
   - Falls back to OpenAI if Cerebras fails

3. **Provider Initialization** (`server/src/lib/initProviders.ts`)
   - Registers Cerebras adapter on server startup
   - Configures priority and model settings

## Usage

### Automatic Usage

Once configured, Cerebras will be automatically used for all LLM operations:

- Intent extraction
- Response generation
- Conversation summarization
- Sentiment analysis
- Streaming responses

### Manual Provider Selection

You can also manually select providers through the admin API:

```bash
# Register Cerebras provider via admin API
curl -X POST http://localhost:3001/api/admin/providers \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: your_admin_token" \
  -d '{
    "type": "cerebras-llm",
    "config": {
      "apiKey": "your_cerebras_api_key",
      "model": "llama-3.3-70b",
      "baseUrl": "https://api.cerebras.ai/v1"
    },
    "priority": 5
  }'
```

### Checking Provider Status

```bash
# List all registered providers
curl http://localhost:3001/api/admin/providers \
  -H "X-Admin-Token: your_admin_token"
```

## API Compatibility

Cerebras uses an OpenAI-compatible API, so the integration is seamless:

- Same message format (`system`, `user`, `assistant` roles)
- Same parameters (`temperature`, `max_tokens`, `stream`)
- Same response format

## Benefits

1. **Performance**: Cerebras provides fast inference with optimized hardware
2. **Cost**: Potentially lower costs compared to OpenAI
3. **Flexibility**: Easy switching between providers
4. **Reliability**: Automatic failover ensures service continuity

## Troubleshooting

### Cerebras Not Being Used

1. Check that `CEREBRAS_API_KEY` is set in your environment
2. Verify the API key is valid
3. Check server logs for initialization messages:
   ```
   ✅ Registered Cerebras LLM provider
   ✅ LLM Service using provider registry: Cerebras
   ```

### API Errors

If you encounter API errors:

1. Verify your API key is correct
2. Check that the model name is valid
3. Ensure your account has sufficient credits/quota
4. Check Cerebras API status

### Fallback Behavior

If Cerebras fails, the system will automatically:
1. Try OpenAI via provider registry (if configured)
2. Fall back to direct OpenAI client (if API key available)
3. Use keyword-based fallback methods

## Testing

To test the Cerebras integration:

```bash
# Test intent extraction
curl -X POST http://localhost:3001/api/assistant/chat \
  -H "Content-Type: application/json" \
  -d '{
    "query": "I need a red dress for a wedding",
    "userId": "test_user"
  }'
```

Check the response to verify it's using Cerebras (check logs or provider metrics).

## Migration from OpenAI

If you're currently using OpenAI and want to switch to Cerebras:

1. Add `CEREBRAS_API_KEY` to your environment
2. Restart the server
3. Cerebras will automatically be used (higher priority)
4. OpenAI will remain as fallback

To make OpenAI primary again, either:
- Remove `CEREBRAS_API_KEY`
- Or set Cerebras priority higher than OpenAI (e.g., 15)

## References

- [Cerebras Inference API Documentation](https://inference-docs.cerebras.ai/)
- [Cerebras Quick Start Guide](https://cerebras-inference.mintlify.app/quickstart)
- [Provider Abstraction README](./PROVIDER_ABSTRACTION_README.md)
