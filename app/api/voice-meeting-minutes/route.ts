import { NextRequest, NextResponse } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import Groq from "groq-sdk";
import { MEETING_PROCESSOR_CONFIG } from "@/lib/config";
import {
  checkTokenLimits,
  truncateForTokenLimit,
  getRecommendedModel,
} from "@/lib/token-management";
import {
  chunkTranscript,
  mergeChunkSummaries,
  getChunkingRecommendations,
  TranscriptChunk,
} from "@/lib/transcript-chunker";

/**
 * Create a fallback summary when LLM summarization fails
 */
function createFallbackSummary(
  transcript: string,
  language: "fa" | "en" = "fa"
): string {
  if (language === "fa") {
    return `### 📌 خلاصه خودکار جلسه

**توجه**: خلاصه‌سازی هوشمند با مشکل مواجه شد. این خلاصه به صورت خودکار تولید شده است.

#### 📊 اطلاعات کلی
- **طول متن**: ${transcript.length} کاراکتر
- **تخمین زمان**: ${Math.round(transcript.length / 200)} دقیقه صحبت

#### 📝 نکات کلیدی
- متن جلسه با موفقیت پیاده‌سازی شده است
- برای خلاصه‌سازی دقیق‌تر، لطفاً دوباره تلاش کنید
- یا فایل صوتی کوتاه‌تری آپلود کنید

---
*این خلاصه به دلیل خطا در پردازش هوشمند، به صورت خودکار تولید شده است.*`;
  } else {
    return `### 📌 Auto-Generated Meeting Summary

**Note**: Smart summarization encountered an issue. This summary was auto-generated.

#### 📊 General Information
- **Text Length**: ${transcript.length} characters
- **Estimated Duration**: ${Math.round(
      transcript.length / 200
    )} minutes of speech

#### 📝 Key Points
- Meeting transcript was successfully processed
- For accurate summarization, please try again
- Or upload a shorter audio file

---
*This summary was auto-generated due to an error in smart processing.*`;
  }
}

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
    console.log(
      "[voice-meeting-minutes] Starting transcription with ElevenLabs..."
    );

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

    // Use the model from config instead of hardcoding
    let model: string = MEETING_PROCESSOR_CONFIG.summarization.model;

    const systemPrompt = `شما یک دستیار هستید که باید از متن پیاده‌سازی شده یک جلسه کاری (به زبان فارسی) صورتجلسه رسمی و بی‌طرف تهیه کنید.

متن پیاده‌سازی ممکن است شامل شوخی، سکوت، صحبت‌های بی‌ربط یا تکراری باشد. 
لطفاً فقط بخش‌های مرتبط با مباحث کاری و اسکرام را استخراج کنید.

وظایف شما:
1. خلاصه‌سازی مباحث مهم جلسه به زبان فارسی رسمی.
2. حذف کامل هرگونه نظر شخصی، شوخی، یا محتوای نامرتبط.
3. دسته‌بندی خروجی در قالب زیر:

### 📌 صورتجلسه
- **تاریخ جلسه:** [اگر ذکر شد بنویسید، در غیر اینصورت خالی بگذارید]  
- **نوع جلسه:** برنامه‌ریزی / گرومینگ / استندآپ / سایر (در صورت تشخیص)  

#### ✅ تصمیمات گرفته‌شده
[تمام تصمیم‌های قطعی که تیم به آن رسید]

#### 📝 وظایف و اقدام‌ها
[کارهای مشخص، شامل:  
- شرح کار  
- مسئول (در صورت ذکر نام)  
- زمان‌بندی یا ضرب‌العجل (اگر گفته شد)  
]

#### ❓ موضوعات باز / نیازمند پیگیری
[موضوعاتی که نتیجه‌گیری نشد و باید در جلسات بعدی بررسی شود]

---

راهنما:
- از تکرار مباحث مشابه خودداری کنید، فقط نتیجه نهایی را ذکر کنید.
- اگر مسئول یا زمان‌بندی ذکر نشد، خالی بگذارید.
- خروجی باید کوتاه، شفاف و ساختاریافته باشد.
- هیچ نظر یا تحلیل شخصی اضافه نکنید.`;

    const userPrompt = `لطفاً رونویسی زیر را به صورت خلاصه جلسه حرفه‌ای ارائه دهید:

${transcriptText}`;

    // Check if we need to chunk the transcript
    const chunkingRecommendations = getChunkingRecommendations(
      transcriptText.length,
      "fa"
    );
    console.log(`[voice-meeting-minutes] Chunking recommendations:`, {
      transcriptLength: transcriptText.length,
      estimatedTokens: chunkingRecommendations.estimatedTokens,
      estimatedChunks: chunkingRecommendations.estimatedChunks,
      maxTokensPerChunk:
        chunkingRecommendations.recommendedStrategy.maxTokensPerChunk,
      willChunk: chunkingRecommendations.estimatedChunks > 1,
    });

    let meetingMinutes: string;
    let summarizationSuccess = false;
    let summarizationError: string | null = null;
    let chunks: TranscriptChunk[] = [];

    try {
      if (chunkingRecommendations.estimatedChunks > 1) {
        // Need to chunk the transcript
        console.log(
          `[voice-meeting-minutes] Chunking transcript into ${chunkingRecommendations.estimatedChunks} parts`
        );

        try {
          chunks = chunkTranscript(
            transcriptText,
            chunkingRecommendations.recommendedStrategy,
            "fa"
          );
          console.log(
            `[voice-meeting-minutes] Created ${chunks.length} chunks:`,
            chunks.map((chunk) => ({
              id: chunk.id,
              tokens: chunk.estimatedTokens,
              length: chunk.content.length,
            }))
          );

          if (chunks.length === 0) {
            console.log(
              "[voice-meeting-minutes] WARNING: No chunks created, falling back to single chunk processing"
            );
            throw new Error("Chunking failed - no chunks created");
          }
        } catch (chunkingError) {
          console.error(
            "[voice-meeting-minutes] Chunking failed, falling back to single chunk processing:",
            chunkingError
          );
          throw chunkingError; // This will be caught by the outer try-catch
        }

        // Process each chunk with the appropriate model
        const chunkSummaries: string[] = [];

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          console.log(
            `[voice-meeting-minutes] Processing chunk ${i + 1}/${
              chunks.length
            } (${chunk.estimatedTokens} tokens)`
          );

          // Select appropriate model for this chunk
          let chunkModel = model;
          if (chunk.estimatedTokens > 12000) {
            chunkModel = "mixtral-8x7b-32768";
          } else if (chunk.estimatedTokens > 8000) {
            chunkModel = "llama-3.3-70b-versatile";
          }

          const chunkUserPrompt = `لطفاً رونویسی زیر را به صورت خلاصه جلسه حرفه‌ای ارائه دهید:

${chunk.content}`;

          try {
            const chunkCompletion = await groq.chat.completions.create({
              messages: [
                {
                  role: "system",
                  content: systemPrompt,
                },
                {
                  role: "user",
                  content: chunkUserPrompt,
                },
              ],
              model: chunkModel,
              temperature: MEETING_PROCESSOR_CONFIG.summarization.temperature,
              max_tokens: 2000,
            });

            const chunkSummary =
              chunkCompletion.choices[0]?.message?.content ||
              "خلاصه‌ای تولید نشد";
            chunkSummaries.push(chunkSummary);

            console.log(
              `[voice-meeting-minutes] Chunk ${
                i + 1
              } processed successfully with model ${chunkModel}`
            );

            // Add small delay between chunks to avoid rate limiting
            if (i < chunks.length - 1) {
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          } catch (error) {
            console.error(
              `[voice-meeting-minutes] Error processing chunk ${i + 1}:`,
              error
            );

            // Try with a different model as fallback
            try {
              console.log(
                `[voice-meeting-minutes] Retrying chunk ${
                  i + 1
                } with fallback model`
              );
              const fallbackModel = "llama-3.1-8b-instant"; // Highest capacity model

              const fallbackCompletion = await groq.chat.completions.create({
                messages: [
                  {
                    role: "system",
                    content: systemPrompt,
                  },
                  {
                    role: "user",
                    content: chunkUserPrompt,
                  },
                ],
                model: fallbackModel,
                temperature: MEETING_PROCESSOR_CONFIG.summarization.temperature,
                max_tokens: 2000,
              });

              const fallbackSummary =
                fallbackCompletion.choices[0]?.message?.content ||
                "خلاصه‌ای تولید نشد";
              chunkSummaries.push(fallbackSummary);
              console.log(
                `[voice-meeting-minutes] Chunk ${
                  i + 1
                } processed with fallback model ${fallbackModel}`
              );
            } catch (fallbackError) {
              console.error(
                `[voice-meeting-minutes] Fallback also failed for chunk ${
                  i + 1
                }:`,
                fallbackError
              );
              chunkSummaries.push(
                `خطا در پردازش بخش ${i + 1}: ${
                  error instanceof Error ? error.message : "Unknown error"
                }`
              );
            }
          }
        }

        // Merge all chunk summaries
        console.log("[voice-meeting-minutes] Merging chunk summaries...");
        meetingMinutes = mergeChunkSummaries(chunkSummaries, "fa");
        console.log(
          `[voice-meeting-minutes] Final merged summary length: ${meetingMinutes.length} characters`
        );
      } else {
        // No chunking needed, process normally
        console.log(
          "[voice-meeting-minutes] No chunking needed, processing normally"
        );

        // Check token limits and get recommended action
        const tokenCheck = checkTokenLimits(
          systemPrompt,
          userPrompt,
          model,
          "fa"
        );
        console.log(`[voice-meeting-minutes] Token check:`, {
          estimatedTokens: tokenCheck.estimatedTokens,
          recommendedAction: tokenCheck.recommendedAction,
          isWithinLimit: tokenCheck.isWithinLimit,
        });

        // Handle token limit issues
        if (tokenCheck.recommendedAction === "error") {
          // Instead of throwing error, try with a different model
          console.log(
            "[voice-meeting-minutes] Token limit exceeded, trying with recommended model"
          );
          const recommendedModel = getRecommendedModel(
            tokenCheck.estimatedTokens
          );
          console.log(
            `[voice-meeting-minutes] Switching to recommended model: ${recommendedModel}`
          );
          model = recommendedModel;
        }

        if (tokenCheck.recommendedAction === "truncate") {
          console.log(
            "[voice-meeting-minutes] Truncating transcript to fit token limits"
          );
          const maxTokensForTranscript = 6000; // Leave room for system prompt
          transcriptText = truncateForTokenLimit(
            transcriptText,
            maxTokensForTranscript,
            "fa"
          );
          console.log(
            `[voice-meeting-minutes] Transcript truncated to ${transcriptText.length} characters`
          );

          // Recreate user prompt with truncated transcript
          const truncatedUserPrompt = `لطفاً رونویسی زیر را به صورت خلاصه جلسه حرفه‌ای ارائه دهید:

${transcriptText}`;

          // Recheck token limits
          const newTokenCheck = checkTokenLimits(
            systemPrompt,
            truncatedUserPrompt,
            model,
            "fa"
          );
          if (!newTokenCheck.isWithinLimit) {
            // Try with a different model
            const recommendedModel = getRecommendedModel(
              newTokenCheck.estimatedTokens
            );
            console.log(
              `[voice-meeting-minutes] Switching to recommended model: ${recommendedModel}`
            );
            model = recommendedModel;
          }
        }

        // Process the transcript
        try {
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
            model: model, // Use config model instead of hardcoded one
            temperature: MEETING_PROCESSOR_CONFIG.summarization.temperature,
            max_tokens: 2000,
          });

          meetingMinutes =
            completion.choices[0]?.message?.content || "خلاصه‌ای تولید نشد";
          summarizationSuccess = true;
        } catch (apiError) {
          console.error(
            "[voice-meeting-minutes] API call failed, trying with fallback model:",
            apiError
          );

          // Try with the highest capacity model as last resort
          try {
            const lastResortModel = "llama-3.1-8b-instant";
            console.log(
              `[voice-meeting-minutes] Trying with last resort model: ${lastResortModel}`
            );

            const fallbackCompletion = await groq.chat.completions.create({
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
              model: lastResortModel,
              temperature: MEETING_PROCESSOR_CONFIG.summarization.temperature,
              max_tokens: 2000,
            });

            meetingMinutes =
              fallbackCompletion.choices[0]?.message?.content ||
              "خلاصه‌ای تولید نشد";
            summarizationSuccess = true;
            model = lastResortModel; // Update the model used
            console.log(
              "[voice-meeting-minutes] Successfully processed with fallback model"
            );
          } catch (finalError) {
            console.error(
              "[voice-meeting-minutes] All models failed:",
              finalError
            );
            throw finalError; // This will be caught by the outer try-catch
          }
        }
      }
    } catch (error) {
      console.error("[voice-meeting-minutes] Summarization failed:", error);
      summarizationError =
        error instanceof Error ? error.message : "Unknown error";

      // Create a fallback summary based on the transcript
      meetingMinutes = createFallbackSummary(transcriptText, "fa");
      console.log(
        "[voice-meeting-minutes] Using fallback summary due to summarization failure"
      );
    }

    console.log("[voice-meeting-minutes] Summarization completed:", {
      success: summarizationSuccess,
      error: summarizationError,
      length: meetingMinutes.length,
      preview: meetingMinutes.slice(0, 100),
    });

    return NextResponse.json({
      transcript: transcriptText,
      meetingMinutes: meetingMinutes,
      summarization: {
        success: summarizationSuccess,
        error: summarizationError,
        model: model, // Use the actual model that was used
      },
      model: {
        transcription: "scribe_v1",
        summarization: model, // Use the actual model that was used
      },
      language: "fa",
    });
  } catch (error) {
    console.error("[voice-meeting-minutes] Error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Processing failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}
