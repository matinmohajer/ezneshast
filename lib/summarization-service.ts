import Groq from "groq-sdk";

export interface SummarizationConfig {
  model?: string;
  temperature?: number;
  systemPrompt?: string;
}

export class SummarizationService {
  private groq: Groq;
  private config: Required<SummarizationConfig>;

  constructor(apiKey: string, config: SummarizationConfig = {}) {
    this.groq = new Groq({ apiKey });
    this.config = {
      model: config.model ?? "llama-3.3-70b-versatile",
      temperature: config.temperature ?? 0.1,
      systemPrompt:
        config.systemPrompt ??
        "شما یک دستیار خلاصه‌نویس هستید که رونویسی جلسات را به فارسی و به صورت Markdown خلاصه می‌کند. از افزودن هرگونه اطلاعاتی که در متن جلسه نیامده خودداری کن. خروجی باید شامل بخش‌های مربوط (مثلاً خلاصهٔ کلی، موارد اقدام و ...) باشد و فقط بر اساس متن ارائه‌شده تولید شود.",
    };
  }

  /**
   * Generates a markdown summary from transcript
   */
  async generateSummary(transcript: string): Promise<string> {
    console.log(
      "[SummarizationService] Sending transcript to GPT for summarization"
    );

    const completion = await this.groq.chat.completions.create({
      model: this.config.model,
      temperature: this.config.temperature,
      messages: [
        {
          role: "system",
          content: this.config.systemPrompt,
        },
        {
          role: "user",
          content: `متن جلسه:\n\n${transcript}\n\nلطفاً خلاصهٔ این جلسه را به فارسی و در قالب Markdown تهیه کن.`,
        },
      ],
    });

    const markdown = completion.choices[0].message?.content;
    console.log("[SummarizationService] Markdown summary generated");

    return markdown || "";
  }
}
