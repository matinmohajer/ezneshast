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

  console.log(
    "[formatTranscriptWithSpeakers] Processing",
    words.length,
    "words"
  );
  console.log(
    "[formatTranscriptWithSpeakers] First few words:",
    words.slice(0, 3)
  );

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

  console.log(
    "[formatTranscriptWithSpeakers] Unique speakers found:",
    uniqueSpeakers.size
  );
  console.log(
    "[formatTranscriptWithSpeakers] Formatted transcript preview:",
    formattedTranscript.slice(0, 200)
  );

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

    // We'll compute cost from ElevenLabs timing info, then charge
    const supabase = createServerSupabaseClient();

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
    console.log(
      "[voice-transcribe] Response structure:",
      JSON.stringify(transcription, null, 2)
    );

    // Process the transcription response and compute duration-based cost
    let formattedTranscript: string;
    // Derive duration from provider response (words/audio_events/duration)
    const extractDurationSeconds = (resp: unknown): number => {
      try {
        // TODO(types): Replace loose structure with official ElevenLabs response type when available
        const r = resp as unknown as {
          words?: Array<{ start?: unknown; end?: unknown }>;
          audio_events?: Array<{ start?: unknown; end?: unknown }>;
          duration?: unknown;
        } | null;
        const starts: number[] = [];
        const ends: number[] = [];
        if (r && Array.isArray(r?.words)) {
          for (const w of r.words as Array<{ start?: unknown; end?: unknown }> ) {
            if (Number.isFinite(w?.start)) starts.push(Number(w.start));
            if (Number.isFinite(w?.end)) ends.push(Number(w.end));
          }
        }
        if (r && Array.isArray(r?.audio_events)) {
          for (const e of r.audio_events as Array<{ start?: unknown; end?: unknown }> ) {
            if (Number.isFinite(e?.start)) starts.push(Number(e.start));
            if (Number.isFinite(e?.end)) ends.push(Number(e.end));
          }
        }
        // Fallback explicit duration if present
        if (
          (starts.length === 0 || ends.length === 0) &&
          Number.isFinite((r as { duration?: unknown } | null)?.duration)
        ) {
          return Math.max(0, Number((r as { duration?: unknown }).duration));
        }
        if (starts.length === 0 || ends.length === 0) return 0;
        const minStart = Math.min(...starts);
        const maxEnd = Math.max(...ends);
        const dur = Math.max(0, maxEnd - minStart);
        // Clamp to a sensible max (e.g., 2 hours)
        return Math.min(dur, 2 * 3600);
      } catch {
        return 0;
      }
    };

    // TODO(types): Replace with official ElevenLabs transcription type once available
    const respObj = transcription as unknown as {
      words?: TranscriptWord[];
      speakers?: unknown;
      audio_events?: unknown;
    } | string | null;
    if (typeof transcription === "string") {
      // Simple string response
      formattedTranscript = transcription;
    } else if (respObj && typeof respObj === 'object' && Array.isArray((respObj as { words?: unknown }).words)) {
      // Structured response with words
      formattedTranscript = formatTranscriptWithSpeakers(
        (respObj as { words: TranscriptWord[] }).words
      );
    } else {
      // Fallback for other response types
      formattedTranscript = JSON.stringify(transcription, null, 2);
    }

    console.log("[voice-transcribe] Transcription completed successfully");

    // Compute cost from duration and charge now
    const durationSeconds = extractDurationSeconds(transcription as unknown);
    const hourlyRate = 10; // credits per hour
    const costCredits = Math.max(
      1,
      Math.ceil((durationSeconds / 3600) * hourlyRate)
    );

    const idempotencyKey = `transcription_${
      user.id
    }_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const { data: chargeResult, error: chargeError } = await supabase.rpc(
      "api_consume_credits",
      {
        p_user_id: user.id,
        p_cost: costCredits,
        p_key: idempotencyKey,
        p_reason: "Voice transcription (duration-based)",
        p_ref: null,
      }
    );

    if (chargeError) {
      console.error("[voice-transcribe] Credit charge error:", chargeError);
      return NextResponse.json(
        { error: "Credit system error", details: chargeError.message },
        { status: 500 }
      );
    }

    if (!chargeResult.success) {
      console.log(
        "[voice-transcribe] Insufficient credits after transcription:",
        chargeResult.message
      );
      return NextResponse.json(
        {
          error: "Insufficient credits",
          message: chargeResult.message,
          required: costCredits,
          balance: chargeResult.new_balance,
        },
        { status: 402 }
      );
    }

    return NextResponse.json({
      transcript: formattedTranscript,
      metadata: {
        language: "fa",
        // TODO(types): refine once server response is stabilized
        speakers: (respObj && typeof respObj === 'object' && 'speakers' in respObj ? (respObj as { speakers?: unknown }).speakers : []) || [],
        audio_events: (respObj && typeof respObj === 'object' && 'audio_events' in respObj ? (respObj as { audio_events?: unknown }).audio_events : []) || [],
        word_count: formattedTranscript.split(/\s+/).length,
        job_id: chargeResult.job_id,
        duration_seconds: durationSeconds,
        computed_cost: costCredits,
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    console.error("API error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
