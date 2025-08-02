export const MEETING_PROCESSOR_CONFIG = {
  audioProcessor: {
    chunkDuration: 30, // seconds per chunk
    sampleRate: 16000, // Hz
    channels: 1, // mono
  },
  transcription: {
    model: "whisper-large-v3",
    language: "fa", // Persian
    temperature: 0.41,
    prompt:
      "This is a meeting transcript. Please transcribe it without any additional information. do not make guesses , and keep in mind that the language is persian",
    maxRetries: 3,
  },
  summarization: {
    model: "llama-3.3-70b-versatile",
    temperature: 0.1,
    systemPrompt:
      "شما یک دستیار خلاصه‌نویس هستید که رونویسی جلسات را به فارسی و به صورت Markdown خلاصه می‌کند. از افزودن هرگونه اطلاعاتی که در متن جلسه نیامده خودداری کن. خروجی باید شامل بخش‌های مربوط (مثلاً خلاصهٔ کلی، موارد اقدام و ...) باشد و فقط بر اساس متن ارائه‌شده تولید شود.",
  },
} as const;

export const AUDIO_FILTERS = {
  // High-pass filter to remove low-frequency noise
  highpass: "highpass=f=200",
  // Low-pass filter to remove high-frequency noise
  lowpass: "lowpass=f=3000",
  // Dynamic audio normalization
  dynaudnorm: "dynaudnorm",
  // FFT-based denoising
  afftdn: "afftdn",
  // Silence removal
  silenceremove:
    "silenceremove=start_periods=1:start_silence=0.5:start_threshold=-50dB",
  // Silence detection for chunking
  silencedetect: "silencedetect=n=-50dB:d=0.3",
} as const;
