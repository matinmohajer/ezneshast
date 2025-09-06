import { NextRequest, NextResponse } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { createServerSupabaseClient } from "@/lib/supabase";
import { getServerUser } from "@/lib/supabase-server";

// Types for ElevenLabs response
interface TranscriptWord {
  text: string;
  start?: number;
  end?: number;
  type?: string;
  speakerId?: string;
  logprob?: number;
}

// Function to format transcript with speaker labels
function formatTranscriptWithSpeakers(words: TranscriptWord[]): string {
  if (!words || words.length === 0) {
    return "No transcript available";
  }

  console.log("[formatTranscriptWithSpeakers] Processing", words.length, "words");
  console.log("[formatTranscriptWithSpeakers] First few words:", words.slice(0, 3));

  let formattedTranscript = "";
  let currentSpeaker = "";
  let currentSentence = "";
  const uniqueSpeakers = new Set<string>();

  for (const word of words) {
    // Track unique speakers
    if (word.speakerId) {
      uniqueSpeakers.add(word.speakerId);
    }
    
    // Check if speaker changed
    if (word.speakerId && word.speakerId !== currentSpeaker) {
      // If we have accumulated text, add it to the transcript
      if (currentSentence.trim()) {
        formattedTranscript += currentSentence.trim() + "\n\n";
      }
      
      // Start new speaker section
      currentSpeaker = word.speakerId;
      const speakerNumber = currentSpeaker.replace("speaker_", "");
      const speakerLabel = `Speaker ${parseInt(speakerNumber) + 1}`;
      
      formattedTranscript += `${speakerLabel}\n`;
      currentSentence = "";
    }
    
    // Add word to current sentence
    if (word.text) {
      currentSentence += word.text + " ";
    }
  }

  // Add the last sentence
  if (currentSentence.trim()) {
    formattedTranscript += currentSentence.trim();
  }

  console.log("[formatTranscriptWithSpeakers] Unique speakers found:", uniqueSpeakers.size);
  console.log("[formatTranscriptWithSpeakers] Formatted transcript preview:", 
    formattedTranscript.slice(0, 200));
  
  return formattedTranscript;
}

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

    // Get authenticated user
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    console.log("[voice-transcribe] User authenticated:", user.email);

    // Check credits before processing
    const supabase = createServerSupabaseClient();
    const transcriptionCost = 10; // Cost in credits for transcription
    const idempotencyKey = `transcription_${user.id}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    console.log("[voice-transcribe] Checking credits for user:", user.id);

    // Use the new API-friendly function
    const { data: creditResult, error: creditError } = await supabase.rpc('api_consume_credits', {
      p_user_id: user.id,
      p_cost: transcriptionCost,
      p_key: idempotencyKey,
      p_reason: 'Voice transcription',
      p_ref: null
    });

    if (creditError) {
      console.error("[voice-transcribe] Credit check error:", creditError);
      return NextResponse.json(
        { error: "Credit system error", details: creditError.message },
        { status: 500 }
      );
    }

    if (!creditResult.success) {
      console.log("[voice-transcribe] Insufficient credits:", creditResult.message);
      return NextResponse.json(
        { 
          error: "Insufficient credits",
          message: creditResult.message,
          required: transcriptionCost,
          balance: creditResult.new_balance
        },
        { status: 402 }
      );
    }

    console.log("[voice-transcribe] Credits consumed successfully. New balance:", creditResult.new_balance);

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
    console.log("[voice-transcribe] Response structure:", JSON.stringify(transcription, null, 2));

    // Process the transcription response for speaker diarization
    let formattedTranscript: string;
    
    if (typeof transcription === "string") {
      // Simple string response
      formattedTranscript = transcription;
    } else if (transcription.words && Array.isArray(transcription.words)) {
      // Structured response with words
      formattedTranscript = formatTranscriptWithSpeakers(transcription.words);
    } else {
      // Fallback for other response types
      formattedTranscript = JSON.stringify(transcription, null, 2);
    }

    console.log("[voice-transcribe] Transcription completed successfully");

    return NextResponse.json({
      transcript: formattedTranscript,
      metadata: {
        language: "fa",
        speakers: transcription.speakers || [],
        audio_events: transcription.audio_events || [],
        word_count: formattedTranscript.split(/\s+/).length,
        job_id: creditResult.job_id
      }
    });

  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    console.error("API error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
