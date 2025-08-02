import { tmpdir } from "os";
import { writeFile, unlink, mkdir, readdir } from "fs/promises";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import { randomUUID } from "crypto";
import { AUDIO_FILTERS } from "./config";

export interface AudioProcessorConfig {
  chunkDuration?: number;
  sampleRate?: number;
  channels?: number;
}

export class AudioProcessor {
  private config: Required<AudioProcessorConfig>;

  constructor(config: AudioProcessorConfig = {}) {
    this.config = {
      chunkDuration: config.chunkDuration ?? 30,
      sampleRate: config.sampleRate ?? 16000,
      channels: config.channels ?? 1,
    };
  }

  /**
   * Preprocesses audio file: denoise, normalize, trim silence, convert to WAV
   */
  async preprocessAudio(inputPath: string): Promise<string> {
    const cleanedPath = path.join(tmpdir(), `cleaned-${randomUUID()}.wav`);

    try {
      // Get volume information and apply volume boosting if needed
      let meanVolume: number;
      try {
        meanVolume = await this.getMeanVolume(inputPath);
        console.log(`[AudioProcessor] mean_volume: ${meanVolume} dB`);
      } catch (volumeError) {
        console.warn(
          "[AudioProcessor] Volume detection failed, using default:",
          volumeError
        );
        meanVolume = -30; // Default fallback
      }

      // Apply volume boost if audio is too quiet
      const shouldBoost = meanVolume < -30;
      const volumeFilter = shouldBoost
        ? `volume=${Math.min(10, Math.round((-30 - meanVolume) / 2))}dB`
        : null;

      const filters = [
        AUDIO_FILTERS.highpass,
        AUDIO_FILTERS.lowpass,
        AUDIO_FILTERS.dynaudnorm,
        AUDIO_FILTERS.afftdn,
        AUDIO_FILTERS.silenceremove,
        ...(volumeFilter ? [volumeFilter] : []),
      ];

      const filterString = filters.join(",");
      console.log(`[AudioProcessor] Using filters: ${filterString}`);
      console.log(`[AudioProcessor] Input path: ${inputPath}`);
      console.log(`[AudioProcessor] Output path: ${cleanedPath}`);
      console.log(
        `[AudioProcessor] Starting FFmpeg preprocessing to: ${cleanedPath}`
      );

      await new Promise<void>((res, rej) => {
        const ffmpegCommand = ffmpeg(inputPath)
          .audioChannels(this.config.channels)
          .audioFrequency(this.config.sampleRate)
          .audioCodec("pcm_s16le")
          .outputOptions([
            "-af",
            filterString,
            "-ar",
            this.config.sampleRate.toString(),
          ])
          .on("end", () => {
            console.log("[AudioProcessor] FFmpeg preprocessing complete");
            res();
          })
          .on("error", (err) => {
            console.error("[AudioProcessor] FFmpeg preprocessing error", err);
            rej(err);
          });

        ffmpegCommand.save(cleanedPath);
      });

      return cleanedPath;
    } catch (error) {
      console.error("[AudioProcessor] Error in preprocessAudio:", error);
      throw error;
    }
  }

  /**
   * Chunks audio file into smaller segments
   */
  async chunkAudio(audioPath: string): Promise<string[]> {
    const chunkDir = path.join(tmpdir(), `chunks-${randomUUID()}`);
    await mkdir(chunkDir, { recursive: true });

    const chunkBase = path.join(chunkDir, "chunk_%03d.wav");
    console.log(`[AudioProcessor] Starting FFmpeg chunking to: ${chunkBase}`);

    await new Promise<void>((res, rej) => {
      ffmpeg(audioPath)
        .audioCodec("pcm_s16le")
        .audioChannels(this.config.channels)
        .audioFrequency(this.config.sampleRate)
        .format("segment")
        .outputOptions([
          "-f",
          "segment",
          `-segment_time ${this.config.chunkDuration}`,
          "-reset_timestamps",
          "1",
          "-segment_format",
          "wav",
          "-af",
          AUDIO_FILTERS.silencedetect,
        ])
        .on("start", () => {
          console.log("[AudioProcessor] Starting audio segmentation...");
        })
        .on("end", () => {
          console.log("[AudioProcessor] Audio segmentation complete.");
          res();
        })
        .on("error", (err) => {
          console.error("[AudioProcessor] FFmpeg chunking error", err);
          rej(err);
        })
        .save(chunkBase);
    });

    console.log(`[AudioProcessor] Reading chunk directory: ${chunkDir}`);
    const chunkFiles = await readdir(chunkDir);
    console.log(`[AudioProcessor] Found chunk files:`, chunkFiles);

    const chunkPaths = chunkFiles
      .filter((f) => f.endsWith(".wav"))
      .sort()
      .map((f) => path.join(chunkDir, f));

    console.log(`[AudioProcessor] Sorted chunk paths:`, chunkPaths);
    return chunkPaths;
  }

  /**
   * Saves uploaded file to temporary location
   */
  async saveUploadedFile(fileBuffer: Buffer): Promise<string> {
    const inputPath = path.join(tmpdir(), `${randomUUID()}.webm`);
    await writeFile(inputPath, fileBuffer);
    console.log(`[AudioProcessor] File written to temp: ${inputPath}`);
    return inputPath;
  }

  /**
   * Cleans up temporary files
   */
  async cleanupFiles(filePaths: string[]): Promise<void> {
    console.log("[AudioProcessor] Cleaning up temp files");
    await Promise.all(filePaths.map((p) => unlink(p)));
    console.log("[AudioProcessor] Cleanup complete");
  }

  /**
   * Detects the mean volume of an audio file using FFmpeg
   */
  async getMeanVolume(filePath: string): Promise<number> {
    return new Promise((resolve) => {
      let output = "";
      ffmpeg(filePath)
        .audioFilters("volumedetect")
        .format("null")
        .on("stderr", (line) => {
          output += line + "\n";
        })
        .on("end", () => {
          const match = output.match(/mean_volume:\s*(-?\d+(\.\d+)?) dB/);
          if (match) {
            resolve(parseFloat(match[1]));
          } else {
            console.warn(
              "[AudioProcessor] Could not detect mean volume, using default"
            );
            resolve(-30); // fallback to a reasonable default
          }
        })
        .on("error", (err) => {
          console.warn(
            "[AudioProcessor] Error detecting volume, using default:",
            err
          );
          resolve(-30); // fallback to a reasonable default
        })
        .save("-");
    });
  }
}
