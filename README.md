# Ezneshast - Meeting Transcription and Summarization

This is a [Next.js](https://nextjs.org) application that provides meeting transcription and summarization services using ElevenLabs and Groq APIs.

## Features

- **Audio Processing**: Chunks and preprocesses audio files for optimal transcription
- **Speech-to-Text**: Uses ElevenLabs Scribe v1 model for high-quality transcription with fallback to Groq
- **Meeting Summarization**: Generates structured summaries in Persian using Groq's Llama model
- **Voice Recording**: Direct voice recording and transcription without file upload
- **Meeting Minutes Generation**: Complete workflow from voice to structured meeting minutes
- **Modern UI**: Clean, responsive interface for uploading and processing meeting recordings

## Pages

### 1. Meeting Processor (`/`)
- Upload audio files for transcription and summarization
- Uses FFmpeg for audio preprocessing and chunking
- Best for pre-recorded meeting files

### 2. Voice Transcribe (`/voice-transcribe`)
- Direct voice recording and transcription
- Uses ElevenLabs Scribe v1 for transcription
- No audio preprocessing - direct API calls
- Best for quick voice-to-text conversion

### 3. Voice Meeting Minutes (`/voice-meeting-minutes`)
- Complete voice-to-meeting-minutes workflow
- Records voice → ElevenLabs transcription → Groq summarization
- Generates structured meeting minutes in Persian
- Best for live meeting capture and documentation

## Getting Started

### Prerequisites

1. **ElevenLabs API Key**: Get your API key from [ElevenLabs Dashboard](https://elevenlabs.io/)
2. **Groq API Key**: Get your API key from [Groq Console](https://console.groq.com/)

### Environment Setup

Create a `.env.local` file in the root directory with your API keys:

```bash
# Required API Keys
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
GROQ_API_KEY=your_groq_api_key_here

# Optional: Override default configuration
# TRANSCRIPTION_PROVIDER=elevenlabs
# TRANSCRIPTION_LANGUAGE=fa
```

### Installation

Install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

### Development

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Configuration

The application uses ElevenLabs as the primary transcription provider with automatic fallback to Groq if needed. You can configure the transcription settings in `lib/config.ts`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
