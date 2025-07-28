// app/api/meetings/route.ts
"use server";

import Groq from "groq-sdk";
import { tmpdir } from "os";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import { randomUUID } from "crypto";
import { mkdir } from "fs/promises";
import { readdir } from "fs/promises";
import { File as NodeFile } from "formdata-node";

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

    const buffer = Buffer.from(await file.arrayBuffer());
    const inputPath = path.join(tmpdir(), `${randomUUID()}.webm`);
    await writeFile(inputPath, buffer);
    console.log(`[meetings] File written to temp: ${inputPath}`);

    // --- Preprocessing: denoise, normalize, trim silence, convert to 16kHz mono PCM WAV ---
    const cleanedPath = path.join(tmpdir(), `cleaned-${randomUUID()}.wav`);
    console.log(`[meetings] Starting FFmpeg preprocessing to: ${cleanedPath}`);
    await new Promise((res, rej) => {
      ffmpeg(inputPath)
        .audioChannels(1)
        .audioFrequency(16000)
        .audioCodec("pcm_s16le")
        .outputOptions([
          "-af",
          "highpass=f=200, lowpass=f=3000, dynaudnorm, afftdn, silenceremove=start_periods=1:start_silence=0.5:start_threshold=-50dB",
          "-ar",
          "16000",
        ])
        .on("end", () => {
          console.log("[meetings] FFmpeg preprocessing complete");
          res();
        })
        .on("error", (err) => {
          console.error("[meetings] FFmpeg preprocessing error", err);
          rej(err);
        })
        .save(cleanedPath);
    });

    // --- Chunking: 45s chunks, silence-aware, sorted ---
    const chunkDir = path.join(tmpdir(), `chunks-${randomUUID()}`);
    await mkdir(chunkDir, { recursive: true });
    const chunkDuration = 10; // or 15
    // const overlap = 3; // not used
    const chunkBase = path.join(chunkDir, "chunk_%03d.wav");
    console.log(`[meetings] Starting FFmpeg chunking to: ${chunkBase}`);
    await new Promise((res, rej) => {
      ffmpeg(cleanedPath)
        .audioCodec("pcm_s16le")
        .audioChannels(1)
        .audioFrequency(16000)
        .format("segment")
        .outputOptions([
          "-f",
          "segment",
          `-segment_time ${chunkDuration}`,
          "-reset_timestamps",
          "1",
          "-segment_format",
          "wav",
          "-af",
          "silencedetect=n=-50dB:d=0.3",
        ])
        .on("start", () => {
          console.log("[meetings] Starting audio segmentation...");
        })
        .on("end", () => {
          console.log("[meetings] Audio segmentation complete.");
          res();
        })
        .on("error", (err) => {
          console.error("[meetings] FFmpeg chunking error", err);
          rej(err);
        })
        .save(chunkBase);
    });

    console.log(`[meetings] Reading chunk directory: ${chunkDir}`);
    const chunkFiles = await readdir(chunkDir);
    console.log(`[meetings] Found chunk files:`, chunkFiles);
    const chunkPaths = chunkFiles
      .filter((f) => f.endsWith(".wav"))
      .sort()
      .map((f) => path.join(chunkDir, f));
    console.log(`[meetings] Sorted chunk paths:`, chunkPaths);

    const fs = await import("fs/promises");
    for (const chunkPath of chunkPaths) {
      const stat = await fs.stat(chunkPath);
      console.log(
        `[meetings] Chunk file: ${chunkPath}, size: ${stat.size} bytes`
      );
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    let transcript = "";
    const prompt =
      "موضوع جلسه درباره بهره‌وری بود و سخنران اصلی آقای حسینی بود.";

    // Helper: retry logic
    async function transcribeWithRetry(
      fileForGroq: File,
      retries = 3
    ): Promise<string> {
      let lastErr: unknown;
      for (let i = 0; i < retries; i++) {
        try {
          const result: unknown = await groq.audio.transcriptions.create({
            file: fileForGroq,
            model: "whisper-large-v3",
            language: "fa",
            temperature: 0.41,
            response_format: "text",
            prompt,
          });
          if (typeof result === "string") return result;
          if (
            typeof result === "object" &&
            result !== null &&
            "text" in result &&
            typeof (result as { text: unknown }).text === "string"
          ) {
            return (result as { text: string }).text;
          }
          return JSON.stringify(result);
        } catch (error) {
          lastErr = error;
          console.error(
            `[meetings] Transcription attempt ${i + 1} failed`,
            error
          );
        }
      }
      throw lastErr;
    }

    for (let i = 0; i < chunkPaths.length; i++) {
      const chunkPath = chunkPaths[i];
      console.log(`[meetings] Reading chunk file: ${chunkPath}`);
      const chunkBuf = await (await import("fs/promises")).readFile(chunkPath);
      let chunkText = "";
      const fileForGroq = new NodeFile([chunkBuf], path.basename(chunkPath), {
        type: "audio/wav",
      });
      let response: string;
      try {
        console.log(
          `[meetings] Transcribing chunk ${i + 1}/${
            chunkPaths.length
          }: ${chunkPath}`
        );
        response = await transcribeWithRetry({
          file: chunkBuf, // pass Buffer directly
          filename: path.basename(chunkPath),
          mimetype: "audio/wav",
        });
        console.log(
          `[meetings] Transcription result for chunk ${i + 1}:`,
          response.slice(0, 100)
        );
      } catch (err) {
        response = "[CHUNK FAILED]";
        console.error(
          `[meetings] Transcription failed for chunk ${i + 1}:`,
          err
        );
      }
      chunkText = response;
      transcript += chunkText + "\n\n";
    }

    // --- Optional: segment stitching/realignment placeholder ---
    // (For pro-grade: use NLP to merge partial sentences at chunk boundaries)
    // e.g., with @nlpjs/lang-fa or similar

    console.log("[meetings] Sending transcript to GPT for summarization");
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content:
            "شما یک دستیار خلاصه‌نویس هستید که رونویسی جلسات را به فارسی و به صورت Markdown خلاصه می‌کند. از افزودن هرگونه اطلاعاتی که در متن جلسه نیامده خودداری کن. خروجی باید شامل بخش‌های مربوط (مثلاً خلاصهٔ کلی، موارد اقدام و ...) باشد و فقط بر اساس متن ارائه‌شده تولید شود.",
        },
        {
          role: "user",
          content: `متن جلسه:\n\n${transcript}\n\nلطفاً خلاصهٔ این جلسه را به فارسی و در قالب Markdown تهیه کن.`,
        },
      ],
    });

    const markdown = completion.choices[0].message!.content;
    console.log("[meetings] Markdown summary generated");

    // Cleanup temporary files
    console.log("[meetings] Cleaning up temp files");
    await unlink(inputPath);
    await unlink(cleanedPath);
    await Promise.all(chunkPaths.map((p) => unlink(p)));
    console.log("[meetings] Cleanup complete");

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
