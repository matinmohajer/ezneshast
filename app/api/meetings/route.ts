// app/api/meetings/route.ts
"use server";

import { MeetingProcessor } from "../../../lib/meeting-processor";
import { MEETING_PROCESSOR_CONFIG } from "../../../lib/config";

export async function POST(req: Request) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return new Response(JSON.stringify({ error: "GROQ_API_KEY missing" }), {
        status: 500,
      });
    }

    console.log("[meetings] Received POST request");

    const formData = await req.formData();
    const file = formData.get("file") as Blob | null;
    if (!file) {
      console.log("[meetings] No file field in formData");
      return new Response(JSON.stringify({ error: "`file` field required" }), {
        status: 400,
      });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Initialize the meeting processor with configuration
    const processor = new MeetingProcessor(
      process.env.GROQ_API_KEY,
      MEETING_PROCESSOR_CONFIG
    );

    // Process the meeting
    const { transcript, markdown } = await processor.processMeeting(fileBuffer);

    return new Response(JSON.stringify({ transcript, markdown }), {
      status: 200,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    console.error("API error:", err);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
