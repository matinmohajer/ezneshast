import { NextRequest, NextResponse } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import Groq from "groq-sdk";

export async function POST(request: NextRequest) {
  try {
    // Check for required API keys
    if (!process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { error: "ELEVENLABS_API_KEY missing" },
        { status: 500 }
      );
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "GROQ_API_KEY missing" },
        { status: 500 }
      );
    }

    console.log("[voice-meeting-minutes] Received POST request");

    const formData = await request.formData();
    const audioFile = formData.get("audio") as Blob | null;

    if (!audioFile) {
      console.log("[voice-meeting-minutes] No audio file in formData");
      return NextResponse.json(
        { error: "`audio` field required" },
        { status: 400 }
      );
    }

    console.log("[voice-meeting-minutes] Audio file received:", {
      size: audioFile.size,
      type: audioFile.type,
    });

    // Step 1: Transcribe with ElevenLabs Scribe v1
    console.log("[voice-meeting-minutes] Starting transcription with ElevenLabs...");
    
    const elevenlabs = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY,
    });

    const transcription = await elevenlabs.speechToText.convert({
      file: audioFile,
      modelId: "scribe_v1",
      tagAudioEvents: true,
      languageCode: "fa", // Persian
      diarize: true,
    });

    console.log("[voice-meeting-minutes] ElevenLabs transcription completed");

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

    console.log("[voice-meeting-minutes] Transcript extracted:", {
      length: transcriptText.length,
      preview: transcriptText.slice(0, 100),
    });

    // Step 2: Summarize with Groq
    console.log("[voice-meeting-minutes] Starting summarization with Groq...");
    
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    const systemPrompt = `شما یک دستیار خلاصه‌نویس حرفه‌ای هستید که رونویسی جلسات را به فارسی و به صورت Markdown خلاصه می‌کند. 

لطفاً خلاصه‌ای ساختارمند و حرفه‌ای از جلسه ارائه دهید که شامل موارد زیر باشد:

## خلاصه جلسه
- خلاصه کلی از مباحث مطرح شده

## نکات کلیدی
- نکات مهم و تصمیمات گرفته شده

## اقدامات مورد نیاز
- کارهایی که باید انجام شود
- مسئولیت‌ها و مهلت‌ها

## تصمیمات
- تصمیمات مهم گرفته شده در جلسه

## پیگیری‌ها
- مواردی که نیاز به پیگیری دارند

لطفاً فقط بر اساس محتوای ارائه شده در رونویسی خلاصه کنید و اطلاعات اضافی اضافه نکنید.`;

    const userPrompt = `لطفاً رونویسی زیر را به صورت خلاصه جلسه حرفه‌ای ارائه دهید:

${transcriptText}`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      max_tokens: 2000,
    });

    const meetingMinutes = completion.choices[0]?.message?.content || "خلاصه‌ای تولید نشد";

    console.log("[voice-meeting-minutes] Groq summarization completed:", {
      length: meetingMinutes.length,
      preview: meetingMinutes.slice(0, 100),
    });

    return NextResponse.json({
      transcript: transcriptText,
      meetingMinutes: meetingMinutes,
      model: {
        transcription: "scribe_v1",
        summarization: "llama-3.3-70b-versatile",
      },
      language: "fa",
    });
  } catch (error) {
    console.error("[voice-meeting-minutes] Error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Processing failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}