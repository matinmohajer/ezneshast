import Groq from "groq-sdk";
import { createReadStream } from "fs";

export interface TranscriptionConfig {
  model?: string;
  language?: string;
  temperature?: number;
  prompt?: string;
  maxRetries?: number;
}

export class TranscriptionService {
  private groq: Groq;
  private config: Required<TranscriptionConfig>;

  constructor(apiKey: string, config: TranscriptionConfig = {}) {
    this.groq = new Groq({ apiKey });
    this.config = {
      model: config.model ?? "whisper-large-v3",
      language: config.language ?? "fa",
      temperature: config.temperature ?? 0.41,
      prompt:
        config.prompt ??
        "This is a meeting transcript. Please transcribe it without any additional information. do not make guesses , and keep in mind that the language is persian",
      maxRetries: config.maxRetries ?? 3,
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
          }: ${chunkPath}`
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
        const fileStream = createReadStream(chunkPath);
        const result: unknown = await this.groq.audio.transcriptions.create({
          file: fileStream,
          model: this.config.model,
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
      } catch (error) {
        lastErr = error;
        console.error(
          `[TranscriptionService] Transcription attempt ${i + 1} failed`,
          error
        );
      }
    }
    throw lastErr;
  }
}
