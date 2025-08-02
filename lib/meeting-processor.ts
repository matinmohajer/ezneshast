import { AudioProcessor } from "./audio-processor";
import { TranscriptionService } from "./transcription-service";
import { SummarizationService } from "./summarization-service";

export interface MeetingProcessorConfig {
  audioProcessor?: {
    chunkDuration?: number;
    sampleRate?: number;
    channels?: number;
  };
  transcription?: {
    model?: string;
    language?: string;
    temperature?: number;
    prompt?: string;
    maxRetries?: number;
  };
  summarization?: {
    model?: string;
    temperature?: number;
    systemPrompt?: string;
  };
}

export interface ProcessingResult {
  transcript: string;
  markdown: string;
}

export class MeetingProcessor {
  private audioProcessor: AudioProcessor;
  private transcriptionService: TranscriptionService;
  private summarizationService: SummarizationService;

  constructor(apiKey: string, config: MeetingProcessorConfig = {}) {
    this.audioProcessor = new AudioProcessor(config.audioProcessor);
    this.transcriptionService = new TranscriptionService(
      apiKey,
      config.transcription
    );
    this.summarizationService = new SummarizationService(
      apiKey,
      config.summarization
    );
  }

  /**
   * Main method to process a meeting audio file
   */
  async processMeeting(fileBuffer: Buffer): Promise<ProcessingResult> {
    const tempFiles: string[] = [];

    try {
      // Step 1: Save uploaded file
      const inputPath = await this.audioProcessor.saveUploadedFile(fileBuffer);
      tempFiles.push(inputPath);

      // Step 2: Preprocess audio
      const cleanedPath = await this.audioProcessor.preprocessAudio(inputPath);
      tempFiles.push(cleanedPath);

      // Step 3: Chunk audio
      const chunkPaths = await this.audioProcessor.chunkAudio(cleanedPath);
      tempFiles.push(...chunkPaths);

      // Step 4: Transcribe chunks
      const transcript = await this.transcriptionService.transcribeChunks(
        chunkPaths
      );

      // Step 5: Generate summary
      const markdown = await this.summarizationService.generateSummary(
        transcript
      );

      return { transcript, markdown };
    } finally {
      // Cleanup temporary files
      await this.audioProcessor.cleanupFiles(tempFiles);
    }
  }
}
