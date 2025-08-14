import { NextRequest, NextResponse } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

export async function POST(request: NextRequest) {
  try {
    // Check for required API key
    if (!process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { error: "ELEVENLABS_API_KEY missing" },
        { status: 500 }
      );
    }

    console.log("[voice-transcribe] Received POST request");

    const formData = await request.formData();
    const audioFile = formData.get("audio") as Blob | null;

    if (!audioFile) {
      console.log("[voice-transcribe] No audio file in formData");
      return NextResponse.json(
        { error: "`audio` field required" },
        { status: 400 }
      );
    }

    console.log("[voice-transcribe] Audio file received:", {
      size: audioFile.size,
      type: audioFile.type,
    });

    // Initialize ElevenLabs client
    const elevenlabs = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY,
    });

    // Convert Blob to Buffer for ElevenLabs API
    // const audioBuffer = Buffer.from(await audioFile.arrayBuffer());

    console.log("[voice-transcribe] Sending to ElevenLabs Scribe v1...");

    // Send directly to ElevenLabs Scribe v1
    const transcription = await elevenlabs.speechToText.convert({
      file: audioFile,
      modelId: "scribe_v1",
      tagAudioEvents: true,
      languageCode: "fa", // Persian
      diarize: true,
    });

    console.log("[voice-transcribe] ElevenLabs response received");

    // Handle different response types from ElevenLabs
    let transcriptText: string;

    if (typeof transcription === "string") {
      transcriptText = transcription;
    } else if (transcription && typeof transcription === "object") {
      // Check for text property in various possible locations
      if ("text" in transcription && typeof transcription.text === "string") {
        transcriptText = transcription.text;
      } else if (
        "transcription" in transcription &&
        typeof transcription.transcription === "string"
      ) {
        transcriptText = transcription.transcription;
      } else if (
        "segments" in transcription &&
        Array.isArray(transcription.segments)
      ) {
        // If it's a multichannel response, extract text from segments
        transcriptText = transcription.segments
          .map((segment: { text?: string }) => segment.text || "")
          .join(" ");
      } else {
        transcriptText = JSON.stringify(transcription);
      }
    } else {
      transcriptText = "No transcription result";
    }

    console.log("[voice-transcribe] Transcription completed:", {
      length: transcriptText.length,
      preview: transcriptText.slice(0, 100),
    });

    return NextResponse.json({
      transcript: transcriptText,
      model: "scribe_v1",
      language: "fa",
    });
  } catch (error) {
    console.error("[voice-transcribe] Error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Transcription failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}