import Groq from "groq-sdk";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { createReadStream } from "fs";
import { readFileSync } from "fs";

export interface TranscriptionConfig {
  model?: string;
  language?: string;
  temperature?: number;
  prompt?: string;
  maxRetries?: number;
  provider?: "elevenlabs" | "groq";
}

export class TranscriptionService {
  private groq: Groq;
  private elevenlabs: ElevenLabsClient;
  private config: Required<TranscriptionConfig>;

  constructor(apiKey: string, config: TranscriptionConfig = {}) {
    this.groq = new Groq({ apiKey });
    this.elevenlabs = new ElevenLabsClient();
    this.config = {
      model: config.model ?? "scribe_v1",
      language: config.language ?? "fa",
      temperature: config.temperature ?? 0.41,
      prompt:
        config.prompt ??
        "This is a meeting transcript. Please transcribe it without any additional information. do not make guesses , and keep in mind that the language is persian",
      maxRetries: config.maxRetries ?? 3,
      provider: config.provider ?? "elevenlabs",
    };
  }

  /**
   * Transcribes a single audio chunk with retry logic
   */
  async transcribeChunk(chunkPath: string): Promise<string> {
    return this.transcribeWithRetry(chunkPath, this.config.maxRetries);
  }

  /**
   * Transcribes multiple audio chunks and combines results
   */
  async transcribeChunks(chunkPaths: string[]): Promise<string> {
    let transcript = "";

    for (let i = 0; i < chunkPaths.length; i++) {
      const chunkPath = chunkPaths[i];
      console.log(`[TranscriptionService] Reading chunk file: ${chunkPath}`);

      let response: string;
      try {
        console.log(
          `[TranscriptionService] Transcribing chunk ${i + 1}/${
            chunkPaths.length
          }: ${chunkPath} using ${this.config.provider}`
        );
        response = await this.transcribeChunk(chunkPath);
        console.log(
          `[TranscriptionService] Transcription result for chunk ${i + 1}:`,
          response.slice(0, 100)
        );
      } catch (err) {
        response = "[CHUNK FAILED]";
        console.error(
          `[TranscriptionService] Transcription failed for chunk ${i + 1}:`,
          err
        );
      }
      transcript += response + "\n\n";
    }

    return transcript;
  }

  /**
   * Helper method with retry logic for transcription
   */
  private async transcribeWithRetry(
    chunkPath: string,
    retries: number
  ): Promise<string> {
    let lastErr: unknown;

    for (let i = 0; i < retries; i++) {
      try {
        if (this.config.provider === "elevenlabs") {
          return await this.transcribeWithElevenLabs(chunkPath);
        } else {
          return await this.transcribeWithGroq(chunkPath);
        }
      } catch (error) {
        lastErr = error;
        console.error(
          `[TranscriptionService] Transcription attempt ${i + 1} failed with ${
            this.config.provider
          }`,
          error
        );

        // If ElevenLabs fails and we haven't tried Groq yet, fallback to Groq
        if (this.config.provider === "elevenlabs" && i === retries - 1) {
          console.log("[TranscriptionService] Falling back to Groq...");
          try {
            return await this.transcribeWithGroq(chunkPath);
          } catch (groqError) {
            console.error(
              "[TranscriptionService] Groq fallback also failed:",
              groqError
            );
            throw groqError;
          }
        }
      }
    }
    throw lastErr;
  }

  /**
   * Transcribe using ElevenLabs
   */
  private async transcribeWithElevenLabs(chunkPath: string): Promise<string> {
    const audioBuffer = readFileSync(chunkPath);
    const audioBlob = new Blob([audioBuffer], { type: "audio/wav" });

    const transcription = await this.elevenlabs.speechToText.convert({
      file: audioBlob,
      modelId: "scribe_v1",
      tagAudioEvents: true,
      languageCode: this.config.language === "fa" ? "fa" : "eng", // ElevenLabs uses "per" for Persian
      diarize: true,
    });

    // Handle different response types from ElevenLabs
    if (typeof transcription === "string") {
      return transcription;
    }

    if (transcription && typeof transcription === "object") {
      // Check for text property in various possible locations
      if ("text" in transcription && typeof transcription.text === "string") {
        return transcription.text;
      }
      if (
        "transcription" in transcription &&
        typeof transcription.transcription === "string"
      ) {
        return transcription.transcription;
      }
      // If it's a multichannel response, extract text from segments
      if (
        "segments" in transcription &&
        Array.isArray(transcription.segments)
      ) {
        return transcription.segments
          .map((segment: { text?: string }) => segment.text || "")
          .join(" ");
      }
    }

    return JSON.stringify(transcription);
  }

  /**
   * Transcribe using Groq (fallback method)
   */
  private async transcribeWithGroq(chunkPath: string): Promise<string> {
    const fileStream = createReadStream(chunkPath);
    const result: unknown = await this.groq.audio.transcriptions.create({
      file: fileStream,
      model: "whisper-large-v3",
      language: this.config.language,
      temperature: this.config.temperature,
      response_format: "text",
      prompt: this.config.prompt,
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
  }
}
