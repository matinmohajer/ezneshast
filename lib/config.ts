export const MEETING_PROCESSOR_CONFIG = {
  audioProcessor: {
    chunkDuration: 50, // seconds per chunk
    sampleRate: 16000, // Hz
    channels: 1, // mono
  },
  transcription: {
    model: "scribe_v1", // Use Scribe v1 by default
    language: "fa", // Persian
    temperature: 0.0,
    prompt: "جلسه رسمی",
    maxRetries: 2,
  },
  summarization: {
    model: "openai/gpt-oss-120b",
    temperature: 0.1,
    systemPrompt:
      "شما یک دستیار خلاصه‌نویس هستید که رونویسی جلسات را به فارسی و به صورت Markdown خلاصه می‌کند. از افزودن هرگونه اطلاعاتی که در متن جلسه نیامده خودداری کن. خروجی باید شامل بخش‌های مربوط (مثلاً خلاصهٔ کلی، موارد اقدام و ...) باشد و فقط بر اساس متن ارائه‌شده تولید شود.",
  },
} as const;

export const AUDIO_FILTERS = {
  // High-pass filter to remove low-frequency noise
  highpass: "highpass=f=100",
  // Low-pass filter to remove high-frequency noise
  lowpass: "lowpass=f=3800",
  // Dynamic audio normalization
  dynaudnorm: "dynaudnorm=p=0.9:s=12",
  // FFT-based denoising
  afftdn: "afftdn=nt=w",
  compand: "compand=attacks=0:points=-80/-80|-40/-20|-20/-10|0/-5|20/-3",
  // Silence removal
  silenceremove:
    "silenceremove=start_periods=1:start_silence=0.5:start_threshold=-50dB",
  // Silence detection for chunking
  silencedetect: "silencedetect=n=-50dB:d=0.3",
} as const;
