/**
 * Token management utilities to prevent API rate limit issues
 */

export interface TokenEstimate {
  estimatedTokens: number;
  isWithinLimit: boolean;
  recommendedAction: "proceed" | "truncate" | "chunk" | "error";
}

export interface TokenLimits {
  maxTokensPerMinute: number;
  maxTokensPerRequest: number;
  safetyBuffer: number;
}

// Token limits for different Groq models
export const GROQ_TOKEN_LIMITS: Record<string, TokenLimits> = {
  "openai/gpt-oss-120b": {
    maxTokensPerMinute: 8000,
    maxTokensPerRequest: 32000,
    safetyBuffer: 1000,
  },
  "llama-3.3-70b-versatile": {
    maxTokensPerMinute: 15000,
    maxTokensPerRequest: 32000,
    safetyBuffer: 1000,
  },
  "llama-3.1-8b-instant": {
    maxTokensPerMinute: 25000,
    maxTokensPerRequest: 32000,
    safetyBuffer: 1000,
  },
  "mixtral-8x7b-32768": {
    maxTokensPerMinute: 20000,
    maxTokensPerRequest: 32000,
    safetyBuffer: 1000,
  },
};

/**
 * Estimate token count for Persian text
 * Persian text typically uses more tokens than English due to different tokenization
 */
export function estimateTokens(
  text: string,
  language: "fa" | "en" = "fa"
): number {
  if (language === "fa") {
    // Persian text: approximately 1 token per 3-4 characters
    return Math.ceil(text.length / 3.5);
  } else {
    // English text: approximately 1 token per 4 characters
    return Math.ceil(text.length / 4);
  }
}

/**
 * Check if a request is within token limits
 */
export function checkTokenLimits(
  systemPrompt: string,
  userPrompt: string,
  model: string,
  language: "fa" | "en" = "fa"
): TokenEstimate {
  const systemTokens = estimateTokens(systemPrompt, language);
  const userTokens = estimateTokens(userPrompt, language);
  const totalTokens = systemTokens + userTokens;

  const limits =
    GROQ_TOKEN_LIMITS[model] || GROQ_TOKEN_LIMITS["llama-3.3-70b-versatile"];
  const availableTokens = limits.maxTokensPerMinute - limits.safetyBuffer;

  let recommendedAction: TokenEstimate["recommendedAction"] = "proceed";

  if (totalTokens > availableTokens) {
    if (totalTokens > limits.maxTokensPerRequest) {
      recommendedAction = "error";
    } else if (totalTokens > availableTokens * 0.8) {
      recommendedAction = "truncate";
    } else {
      recommendedAction = "chunk";
    }
  }

  return {
    estimatedTokens: totalTokens,
    isWithinLimit: totalTokens <= availableTokens,
    recommendedAction,
  };
}

/**
 * Truncate text to fit within token limits
 */
export function truncateForTokenLimit(
  text: string,
  maxTokens: number,
  language: "fa" | "en" = "fa"
): string {
  const maxChars = maxTokens * (language === "fa" ? 3.5 : 4);

  if (text.length <= maxChars) {
    return text;
  }

  // Try to truncate at sentence boundaries for Persian
  if (language === "fa") {
    const sentences = text.split(/[.!?؟]\s+/);
    let truncated = "";

    for (const sentence of sentences) {
      if (estimateTokens(truncated + sentence, language) <= maxTokens) {
        truncated += (truncated ? ". " : "") + sentence;
      } else {
        break;
      }
    }

    if (truncated) {
      return truncated + "...";
    }
  }

  // Fallback to simple truncation
  return text.slice(0, maxChars) + "...";
}

/**
 * Get recommended model based on token count
 */
export function getRecommendedModel(estimatedTokens: number): string {
  if (estimatedTokens <= 6000) {
    return "openai/gpt-oss-120b";
  } else if (estimatedTokens <= 12000) {
    return "llama-3.3-70b-versatile";
  } else if (estimatedTokens <= 20000) {
    return "mixtral-8x7b-32768";
  } else {
    return "llama-3.1-8b-instant";
  }
}
