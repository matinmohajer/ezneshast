// app/api/openai/route.ts (for App Router) or pages/api/openai.ts

import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

export const POST = async (req: NextRequest) => {
  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  try {
    // 1. Transcribe using OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
      temperature: 0.31,
      language: "fa",

      response_format: "text",
    });

    // 2. Summarize with GPT-4-turbo
    const summary = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are an assistant that summarizes meeting transcripts into structured meeting minutes.",
        },
        {
          role: "user",
          content: `Here is a transcript:\n\n${transcription}\n\nPlease summarize the key points, decisions, action items, and follow-ups in Markdown format.`,
        },
      ],
    });

    return NextResponse.json({
      transcript: transcription,
      markdown: summary.choices[0].message.content,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "OpenAI API failed" }, { status: 500 });
  }
};
