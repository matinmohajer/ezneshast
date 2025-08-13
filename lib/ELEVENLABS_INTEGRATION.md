# ElevenLabs Integration Guide

This document explains how ElevenLabs speech-to-text is integrated into the Ezneshast application.

## Overview

The application now uses ElevenLabs Scribe v1 model as the primary transcription provider, with automatic fallback to Groq if needed. This provides higher quality transcription with features like:

- Speaker diarization (identifying who is speaking)
- Audio event tagging (laughter, applause, etc.)
- Better accuracy for Persian language
- Automatic language detection

## Setup

### 1. Get ElevenLabs API Key

1. Visit [ElevenLabs Dashboard](https://elevenlabs.io/)
2. Create an account or sign in
3. Navigate to your profile settings
4. Generate a new API key
5. Copy the API key

### 2. Environment Configuration

Add your ElevenLabs API key to your `.env.local` file:

```bash
ELEVENLABS_API_KEY=your_api_key_here
GROQ_API_KEY=your_groq_api_key_here
```

### 3. Test the Integration

Run the test script to verify everything is working:

```bash
npm run test:elevenlabs
```

## Configuration

### Provider Selection

You can configure which transcription provider to use in `lib/config.ts`:

```typescript
transcription: {
  provider: "elevenlabs", // or "groq"
  model: "scribe_v1",
  language: "fa",
  // ... other options
}
```

### Language Support

ElevenLabs supports multiple languages. For Persian, use:

- `languageCode: "per"` (ElevenLabs format)
- The service automatically maps `"fa"` to `"per"`

### Model Options

Currently, ElevenLabs only supports the `"scribe_v1"` model for speech-to-text.

## Features

### Speaker Diarization

ElevenLabs can identify different speakers in the audio:

```typescript
const transcription = await elevenlabs.speechToText.convert({
  file: audioBlob,
  modelId: "scribe_v1",
  diarize: true, // Enable speaker identification
  // ... other options
});
```

### Audio Event Tagging

The service can detect and tag audio events:

```typescript
const transcription = await elevenlabs.speechToText.convert({
  file: audioBlob,
  modelId: "scribe_v1",
  tagAudioEvents: true, // Tag laughter, applause, etc.
  // ... other options
});
```

### Automatic Fallback

If ElevenLabs fails, the system automatically falls back to Groq:

1. ElevenLabs is tried first
2. If it fails after retries, Groq is used as backup
3. This ensures reliability even if one service is down

## Response Handling

The integration handles different response formats from ElevenLabs:

```typescript
// Handle different response types
if (typeof transcription === "string") {
  return transcription;
}

if (transcription && typeof transcription === "object") {
  // Check for text property
  if ("text" in transcription && typeof transcription.text === "string") {
    return transcription.text;
  }

  // Check for transcription property
  if (
    "transcription" in transcription &&
    typeof transcription.transcription === "string"
  ) {
    return transcription.transcription;
  }

  // Handle multichannel responses with segments
  if ("segments" in transcription && Array.isArray(transcription.segments)) {
    return transcription.segments
      .map((segment: { text?: string }) => segment.text || "")
      .join(" ");
  }
}
```

## Error Handling

The service includes comprehensive error handling:

- API key validation
- Network error retry logic
- Automatic fallback to Groq
- Detailed error logging

## Performance Considerations

- ElevenLabs has rate limits based on your plan
- Large audio files are automatically chunked
- The service processes chunks sequentially to avoid overwhelming the API

## Troubleshooting

### Common Issues

1. **API Key Error**: Ensure `ELEVENLABS_API_KEY` is set in your environment
2. **Rate Limiting**: Check your ElevenLabs usage limits
3. **Audio Format**: Ensure audio is in a supported format (WAV, MP3, etc.)

### Debug Mode

Enable detailed logging by setting the log level in your configuration.

## Migration from Groq

If you're migrating from Groq-only to ElevenLabs:

1. The existing code will continue to work
2. ElevenLabs will be used as the primary provider
3. Groq remains as a fallback option
4. No changes to your existing API calls are needed

## API Reference

For detailed API documentation, visit:

- [ElevenLabs Speech-to-Text API](https://docs.elevenlabs.io/api-reference/speech-to-text)
- [ElevenLabs JavaScript SDK](https://github.com/elevenlabs/elevenlabs-js)
