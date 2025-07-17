// app/api/meetings/route.ts
'use server';

import Groq from "groq-sdk";

export async function POST(req: Request) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return new Response(JSON.stringify({ error: 'GROQ_API_KEY missing' }), { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as Blob | null;
    if (!file) {
      return new Response(JSON.stringify({ error: '`file` field required' }), { status: 400 });
    }

    // Convert Blob to Buffer and then to File for Groq
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileForGroq = new File([buffer], "audio.webm", { type: file.type || "audio/webm" });

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    // Transcribe audio using Groq Whisper
    const transcription = await groq.audio.transcriptions.create({
      file: fileForGroq,
      model: "whisper-large-v3",
      temperature: 0.41,
      language: "fa", // or "en"
      response_format: "verbose_json",
    });

    const transcript = transcription.text;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          "content": "شما یک دستیار خلاصه‌نویس هستید که رونویسی جلسات را به فارسی و به صورت Markdown خلاصه می‌کند. از افزودن هرگونه اطلاعاتی که در متن جلسه نیامده خودداری کن. خروجی باید شامل بخش‌های مربوط (مثلاً خلاصهٔ کلی، موارد اقدام و ...) باشد و فقط بر اساس متن ارائه‌شده تولید شود."

        },
        {
          role: 'user',
          "content": `متن جلسه:\n\n\n${transcript}\n\nلطفاً خلاصهٔ این جلسه را به فارسی و در قالب Markdown تهیه کن.`

        },
      ],
    });

    const markdown = completion.choices[0].message!.content;

    return new Response(JSON.stringify({ markdown, transcript }), { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('API error:', err);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
