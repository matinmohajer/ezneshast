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
      temperature: 0.1,
      language: "fa", // or "en"
      response_format: "verbose_json",
    });

    const transcript = transcription.text;

    // Summarize with Groq LLM
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile", // Using a powerful model
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content: `
            You are an assistant that writes **concise, actionable meeting minutes**. You need to:
            - Write in **Persian**.
            - Structure the summary with **clear headings** in **GitHub-flavored markdown**.
            - Provide a **concise bullet summary** of the meeting with **key points**, **decisions**, and **takeaways**.
            - Extract **action items** (if mentioned) in a **checklist** format with **assigned roles**.
            - **Generate relevant tables** if data is mentioned (e.g., meeting schedule, attendance).
            - **Include charts** if numerical or structured data is mentioned (e.g., budgets, timelines).
            - If **discussions** are mentioned, provide context and important insights.
            - Summarize the **outcomes** and suggest **next steps**.
            - If the meeting involves a **project update**, include a **timeline table** and highlight important deadlines.
            - Format all your output in **markdown** with the required structure.
    
            Keep the tone **professional** and make the summary easy to read and understand.
          `,
        },
        {
          role: 'user',
          content: `
            TRANSCRIPT:
            \n\n${transcript}
            \n\nPlease write:
            • A **concise bullet summary** (key points, decisions, and takeaways)
            • A **checklist of action items** with assignees if mentioned
            • **Tables** if any data (e.g., schedules, timelines, budgets) is discussed
            • **Charts** (if numerical data like percentages, growth, or budgets are mentioned)
            • **Clear headings** for each section (Summary, Action Items, Data, etc.)
            Format the output in **GitHub-flavored Markdown**.
          `,
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
