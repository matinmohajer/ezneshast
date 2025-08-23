/**
 * Intelligent transcript chunking for long audio files
 * Splits transcripts into manageable chunks while preserving context
 */

export interface TranscriptChunk {
  id: number;
  content: string;
  startIndex: number;
  endIndex: number;
  estimatedTokens: number;
}

export interface ChunkingStrategy {
  maxTokensPerChunk: number;
  overlapTokens: number;
  preserveSentences: boolean;
  preserveParagraphs: boolean;
}

export const DEFAULT_CHUNKING_STRATEGY: ChunkingStrategy = {
  maxTokensPerChunk: 8000, // Safe limit for most models
  overlapTokens: 500, // Overlap to maintain context between chunks
  preserveSentences: true, // Don't break mid-sentence
  preserveParagraphs: true, // Try to keep paragraphs together
};

/**
 * Split transcript into chunks based on token limits
 */
export function chunkTranscript(
  transcript: string,
  strategy: ChunkingStrategy = DEFAULT_CHUNKING_STRATEGY,
  language: "fa" | "en" = "fa"
): TranscriptChunk[] {
  console.log(`[chunkTranscript] Starting chunking:`, {
    transcriptLength: transcript.length,
    strategy: strategy,
    language: language,
  });

  const chunks: TranscriptChunk[] = [];
  let currentChunk = "";
  let currentStartIndex = 0;
  let chunkId = 0;

  // Split into sentences first (for Persian, use Persian punctuation)
  const sentenceDelimiters = language === "fa" ? /[.!?؟]\s+/ : /[.!?]\s+/;

  // Split and filter out empty sentences
  const sentences = transcript
    .split(sentenceDelimiters)
    .filter((sentence) => sentence.trim().length > 0);
  console.log(
    `[chunkTranscript] Split into ${sentences.length} non-empty sentences`
  );

  // If no sentences found, treat the entire transcript as one chunk
  if (sentences.length === 0) {
    console.log(
      `[chunkTranscript] No sentences found, treating as single chunk`
    );
    const estimatedTokens = Math.ceil(
      transcript.length / (language === "fa" ? 3.5 : 4)
    );
    return [
      {
        id: 0,
        content: transcript,
        startIndex: 0,
        endIndex: transcript.length,
        estimatedTokens: estimatedTokens,
      },
    ];
  }

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const sentenceWithDelimiter =
      i < sentences.length - 1 ? sentence + ". " : sentence;

    // Estimate tokens for current chunk + new sentence
    const potentialChunk = currentChunk + sentenceWithDelimiter;
    const estimatedTokens = estimateTokens(potentialChunk, language);

    if (
      estimatedTokens > strategy.maxTokensPerChunk &&
      currentChunk.length > 0
    ) {
      // Current chunk is full, save it
      chunks.push({
        id: chunkId++,
        content: currentChunk.trim(),
        startIndex: currentStartIndex,
        endIndex: currentStartIndex + currentChunk.length,
        estimatedTokens: estimateTokens(currentChunk, language),
      });

      // Start new chunk with overlap from previous chunk
      if (strategy.overlapTokens > 0) {
        const overlapText = getOverlapText(
          currentChunk,
          strategy.overlapTokens,
          language
        );
        currentChunk = overlapText + sentenceWithDelimiter;
        currentStartIndex =
          currentStartIndex + currentChunk.length - overlapText.length;
      } else {
        currentChunk = sentenceWithDelimiter;
        currentStartIndex = currentStartIndex + currentChunk.length;
      }
    } else {
      // Add sentence to current chunk
      currentChunk += sentenceWithDelimiter;
    }
  }

  // Add the last chunk if it has content
  if (currentChunk.trim().length > 0) {
    chunks.push({
      id: chunkId,
      content: currentChunk.trim(),
      startIndex: currentStartIndex,
      endIndex: currentStartIndex + currentChunk.length,
      estimatedTokens: estimateTokens(currentChunk, language),
    });
  }

  console.log(
    `[chunkTranscript] Created ${chunks.length} chunks:`,
    chunks.map((chunk) => ({
      id: chunk.id,
      tokens: chunk.estimatedTokens,
      length: chunk.content.length,
      preview: chunk.content.slice(0, 100) + "...",
    }))
  );

  return chunks;
}

/**
 * Get overlap text from the end of a chunk
 */
function getOverlapText(
  text: string,
  maxOverlapTokens: number,
  language: "fa" | "en" = "fa"
): string {
  const maxOverlapChars = maxOverlapTokens * (language === "fa" ? 3.5 : 4);

  if (text.length <= maxOverlapChars) {
    return text;
  }

  // Find the last sentence boundary within the overlap limit
  const sentenceDelimiters = language === "fa" ? /[.!?؟]\s+/ : /[.!?]\s+/;

  const sentences = text.split(sentenceDelimiters);
  let overlapText = "";

  // Start from the end and work backwards
  for (let i = sentences.length - 1; i >= 0; i--) {
    const sentence = sentences[i];
    const sentenceWithDelimiter =
      i < sentences.length - 1 ? sentence + ". " : sentence;

    if (
      estimateTokens(overlapText + sentenceWithDelimiter, language) <=
      maxOverlapTokens
    ) {
      overlapText = sentenceWithDelimiter + overlapText;
    } else {
      break;
    }
  }

  return overlapText || text.slice(-maxOverlapChars);
}

/**
 * Estimate tokens for text (copied from token-management.ts)
 */
function estimateTokens(text: string, language: "fa" | "en" = "fa"): number {
  if (language === "fa") {
    // Persian text: approximately 1 token per 3-4 characters
    return Math.ceil(text.length / 3.5);
  } else {
    // English text: approximately 1 token per 4 characters
    return Math.ceil(text.length / 4);
  }
}

/**
 * Merge chunk summaries into a coherent final summary
 */
export function mergeChunkSummaries(
  chunkSummaries: string[],
  language: "fa" | "en" = "fa"
): string {
  if (chunkSummaries.length === 1) {
    return chunkSummaries[0];
  }

  // For Persian, create a structured merge
  if (language === "fa") {
    return mergePersianSummaries(chunkSummaries);
  } else {
    return mergeEnglishSummaries(chunkSummaries);
  }
}

/**
 * Merge Persian summaries with proper structure
 */
function mergePersianSummaries(summaries: string[]): string {
  const merged = {
    decisions: new Set<string>(),
    actions: new Set<string>(),
    followUps: new Set<string>(),
    generalInfo: new Set<string>(),
  };

  // Extract information from each summary
  summaries.forEach((summary) => {
    // Extract decisions (تصمیمات)
    const decisionMatches = summary.match(/تصمیمات[^\n]*\n([\s\S]*?)(?=\n|$)/g);
    if (decisionMatches) {
      decisionMatches.forEach((match) => {
        const decisions = match
          .replace(/تصمیمات[^\n]*\n/, "")
          .split("\n")
          .filter((line) => line.trim());
        decisions.forEach((decision) => merged.decisions.add(decision.trim()));
      });
    }

    // Extract actions (اقدامات)
    const actionMatches = summary.match(/اقدامات[^\n]*\n([\s\S]*?)(?=\n|$)/g);
    if (actionMatches) {
      actionMatches.forEach((match) => {
        const actions = match
          .replace(/اقدامات[^\n]*\n/, "")
          .split("\n")
          .filter((line) => line.trim());
        actions.forEach((action) => merged.actions.add(action.trim()));
      });
    }

    // Extract follow-ups (پیگیری)
    const followUpMatches = summary.match(/پیگیری[^\n]*\n([\s\S]*?)(?=\n|$)/g);
    if (followUpMatches) {
      followUpMatches.forEach((match) => {
        const followUps = match
          .replace(/پیگیری[^\n]*\n/, "")
          .split("\n")
          .filter((line) => line.trim());
        followUps.forEach((followUp) => merged.followUps.add(followUp.trim()));
      });
    }
  });

  // Build final merged summary
  let finalSummary = "### 📌 صورتجلسه ادغام شده\n\n";

  if (merged.decisions.size > 0) {
    finalSummary += "#### ✅ تصمیمات گرفته‌شده\n";
    merged.decisions.forEach((decision) => {
      finalSummary += `- ${decision}\n`;
    });
    finalSummary += "\n";
  }

  if (merged.actions.size > 0) {
    finalSummary += "#### 📝 وظایف و اقدام‌ها\n";
    merged.actions.forEach((action) => {
      finalSummary += `- ${action}\n`;
    });
    finalSummary += "\n";
  }

  if (merged.followUps.size > 0) {
    finalSummary += "#### ❓ موضوعات باز / نیازمند پیگیری\n";
    merged.followUps.forEach((followUp) => {
      finalSummary += `- ${followUp}\n`;
    });
    finalSummary += "\n";
  }

  finalSummary += `\n---\n*این خلاصه از ${summaries.length} بخش مختلف جلسه ادغام شده است.*`;

  return finalSummary;
}

/**
 * Merge English summaries
 */
function mergeEnglishSummaries(summaries: string[]): string {
  const merged = {
    decisions: new Set<string>(),
    actions: new Set<string>(),
    followUps: new Set<string>(),
    generalInfo: new Set<string>(),
  };

  // Extract information from each summary
  summaries.forEach((summary) => {
    // Extract decisions
    const decisionMatches = summary.match(
      /decisions?[^\n]*\n([\s\S]*?)(?=\n|$)/gi
    );
    if (decisionMatches) {
      decisionMatches.forEach((match) => {
        const decisions = match
          .replace(/decisions?[^\n]*\n/i, "")
          .split("\n")
          .filter((line) => line.trim());
        decisions.forEach((decision) => merged.decisions.add(decision.trim()));
      });
    }

    // Extract actions
    const actionMatches = summary.match(/actions?[^\n]*\n([\s\S]*?)(?=\n|$)/gi);
    if (actionMatches) {
      actionMatches.forEach((match) => {
        const actions = match
          .replace(/actions?[^\n]*\n/i, "")
          .split("\n")
          .filter((line) => line.trim());
        actions.forEach((action) => merged.actions.add(action.trim()));
      });
    }

    // Extract follow-ups
    const followUpMatches = summary.match(
      /follow.?up[^\n]*\n([\s\S]*?)(?=\n|$)/gi
    );
    if (followUpMatches) {
      followUpMatches.forEach((match) => {
        const followUps = match
          .replace(/follow.?up[^\n]*\n/i, "")
          .split("\n")
          .filter((line) => line.trim());
        followUps.forEach((followUp) => merged.followUps.add(followUp.trim()));
      });
    }
  });

  // Build final merged summary
  let finalSummary = "### 📌 Merged Meeting Minutes\n\n";

  if (merged.decisions.size > 0) {
    finalSummary += "#### ✅ Decisions Made\n";
    merged.decisions.forEach((decision) => {
      finalSummary += `- ${decision}\n`;
    });
    finalSummary += "\n";
  }

  if (merged.actions.size > 0) {
    finalSummary += "#### 📝 Action Items\n";
    merged.actions.forEach((action) => {
      finalSummary += `- ${action}\n`;
    });
    finalSummary += "\n";
  }

  if (merged.followUps.size > 0) {
    finalSummary += "#### ❓ Open Issues / Follow-ups\n";
    merged.followUps.forEach((followUp) => {
      finalSummary += `- ${followUp}\n`;
    });
    finalSummary += "\n";
  }

  finalSummary += `\n---\n*This summary was merged from ${summaries.length} different meeting sections.*`;

  return finalSummary;
}

/**
 * Get chunking recommendations based on transcript length
 */
export function getChunkingRecommendations(
  transcriptLength: number,
  language: "fa" | "en" = "fa"
): {
  recommendedStrategy: ChunkingStrategy;
  estimatedChunks: number;
  estimatedTokens: number;
} {
  // Calculate estimated tokens based on character length
  const estimatedTokens = Math.ceil(
    transcriptLength / (language === "fa" ? 3.5 : 4)
  );

  let recommendedStrategy: ChunkingStrategy;
  let estimatedChunks: number;

  if (estimatedTokens <= 8000) {
    // No chunking needed
    recommendedStrategy = {
      ...DEFAULT_CHUNKING_STRATEGY,
      maxTokensPerChunk: estimatedTokens,
    };
    estimatedChunks = 1;
  } else if (estimatedTokens <= 15000) {
    // Use llama-3.3-70b-versatile with slight chunking
    recommendedStrategy = {
      ...DEFAULT_CHUNKING_STRATEGY,
      maxTokensPerChunk: 12000,
    };
    estimatedChunks = Math.ceil(estimatedTokens / 12000);
  } else if (estimatedTokens <= 25000) {
    // Use mixtral-8x7b-32768 with moderate chunking
    recommendedStrategy = {
      ...DEFAULT_CHUNKING_STRATEGY,
      maxTokensPerChunk: 15000,
    };
    estimatedChunks = Math.ceil(estimatedTokens / 15000);
  } else {
    // Use llama-3.1-8b-instant with aggressive chunking
    recommendedStrategy = {
      ...DEFAULT_CHUNKING_STRATEGY,
      maxTokensPerChunk: 20000,
    };
    estimatedChunks = Math.ceil(estimatedTokens / 20000);
  }

  return {
    recommendedStrategy,
    estimatedChunks,
    estimatedTokens,
  };
}
