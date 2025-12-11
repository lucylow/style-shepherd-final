# Integration Toolkit

This toolkit provides safe wrappers for Vultr, ElevenLabs, and Raindrop integrations with automatic mock fallbacks when API keys are missing.

## Files Added

### Core Library Files (`server/src/lib/`)

1. **`keysValidator.ts`** - Centralized key validation
   - Checks for API keys with multiple name variations
   - Validates key format (length, characters)
   - Provides unified validation report

2. **`vultrClient.ts`** - Vultr Serverless Inference wrapper
   - Calls Vultr API when key is present
   - Returns deterministic mock responses when key is missing
   - Includes retry logic with exponential backoff

3. **`elevenlabsClient.ts`** - ElevenLabs TTS wrapper
   - Generates TTS audio when key is present
   - Caches audio files to avoid repeated API calls
   - Falls back to mock audio file when key is missing

4. **`raindropClient.ts`** - Raindrop Memory Platform wrapper
   - Uses SDK when key is present and SDK is installed
   - Falls back to local JSON file (`data/raindrop-mock.json`) when key is missing
   - Auto-initializes on server startup

### API Routes (`server/src/routes/`)

5. **`integrations.ts`** - Status and test endpoints
   - `GET /api/integrations/status` - Reports integration configuration status
   - `POST /api/integrations/vultr/infer` - Test Vultr inference
   - `POST /api/integrations/elevenlabs/tts` - Test ElevenLabs TTS

## Environment Variables

The toolkit supports multiple environment variable names for each service:

### Vultr
- `VULTR_SERVERLESS_INFERENCE_API_KEY` (primary)
- `VULTR_API_KEY` (alternative)
- `VULTR_KEY` (alternative)

### ElevenLabs
- `ELEVENLABS_API_KEY` (primary)
- `ELEVEN_KEY` (alternative)
- `ELEVEN_LABS_API_KEY` (legacy)

### Raindrop
- `RAINDROP_API_KEY` (primary)
- `RAINDROP_KEY` (alternative)

## Usage

### 1. Check Integration Status

```bash
curl http://localhost:3000/api/integrations/status
```

Response when no keys are set:
```json
{
  "ok": true,
  "report": {
    "vultr": {"present": false, "envName": null, "ok": false},
    "eleven": {"present": false, "envName": null, "ok": false},
    "raindrop": {"present": false, "envName": null, "ok": false},
    "summary": {
      "readyForLiveDemo": false,
      "reasons": [
        "Vultr key not set (mock mode)",
        "ElevenLabs key not set (mock mode)",
        "Raindrop key not set (mock mode)"
      ]
    }
  },
  "pingResults": {}
}
```

### 2. Test Vultr Inference

```bash
curl -X POST http://localhost:3000/api/integrations/vultr/infer \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Recommend size for a midi dress"}]
  }'
```

### 3. Test ElevenLabs TTS

```bash
curl -X POST http://localhost:3000/api/integrations/elevenlabs/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello demo"}'
```

## Integration with Existing Code

The toolkit is automatically initialized when the server starts:
- Raindrop client initializes on server startup (see `server/src/index.ts`)
- All wrappers check for keys and fall back to mocks automatically
- No changes needed to existing code - wrappers can be imported and used directly

## Mock Mode

When API keys are missing:
- **Vultr**: Returns deterministic mock responses with fashion recommendations
- **ElevenLabs**: Returns path to `/mock/demo_voice.mp3` (you should add this file)
- **Raindrop**: Stores memories in `data/raindrop-mock.json`

## Security Notes

- Keys are never logged or exposed to the client
- Status endpoint is safe for judges/operators (no billable calls)
- All wrappers validate keys before use
- Mock fallbacks ensure the server never crashes due to missing keys

## Lovable Deployment

The `lovable.yml` file has been updated to map secrets. In the Lovable dashboard:
1. Create secrets with names matching the environment variables
2. The toolkit will automatically detect and use them
3. If keys are missing, the app runs in mock mode (perfect for demos)

## Testing

1. Start the server: `npm run dev` (or `npm run build && npm start`)
2. Check status: `curl http://localhost:3000/api/integrations/status`
3. Test endpoints with the curl commands above
4. Verify mock mode works when keys are missing
5. Add keys to `.env.local` and verify live mode works

