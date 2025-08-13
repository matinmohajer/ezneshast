// Test script for ElevenLabs integration
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function testElevenLabs() {
  try {
    if (!process.env.ELEVENLABS_API_KEY) {
      console.error("ELEVENLABS_API_KEY not found in environment variables");
      return;
    }

    console.log("Testing ElevenLabs integration...");

    const elevenlabs = new ElevenLabsClient();

    // Test with a sample audio file (you can replace this with your own test file)
    const response = await fetch(
      "https://storage.googleapis.com/eleven-public-cdn/audio/marketing/nicole.mp3"
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch test audio: ${response.statusText}`);
    }

    const audioBlob = new Blob([await response.arrayBuffer()], {
      type: "audio/mp3",
    });

    console.log("Transcribing audio with ElevenLabs...");
    const transcription = await elevenlabs.speechToText.convert({
      file: audioBlob,
      modelId: "scribe_v1",
      tagAudioEvents: true,
      languageCode: "eng",
      diarize: true,
    });

    console.log("Transcription result:", transcription);
    console.log("✅ ElevenLabs integration test successful!");
  } catch (error) {
    console.error("❌ ElevenLabs integration test failed:", error);
  }
}

testElevenLabs();
