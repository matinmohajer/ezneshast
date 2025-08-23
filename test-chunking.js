// Test script for transcript chunking system
const {
  chunkTranscript,
  mergeChunkSummaries,
  getChunkingRecommendations,
} = require("./lib/transcript-chunker");

// Simulate a long Persian transcript
const longTranscript = `
این جلسه برنامه‌ریزی اسپرینت جدید است. ما باید تصمیم بگیریم که چه ویژگی‌هایی را در این اسپرینت پیاده‌سازی کنیم. 
تیم توسعه پیشنهاد کرده که سیستم احراز هویت را بهبود دهیم. همچنین نیاز به بهینه‌سازی عملکرد داریم.
مدیر پروژه گفته که باید تا پایان ماه تمام کنیم. تیم تست هم باید تست‌های جدیدی بنویسد.
ما تصمیم گرفتیم که اولویت با ویژگی‌های امنیتی باشد. همچنین باید مستندات را به‌روزرسانی کنیم.
تیم عملیات گفته که باید زیرساخت را ارتقا دهیم. این کار زمان‌بر خواهد بود.
ما باید ریسک‌ها را ارزیابی کنیم و برنامه پشتیبان داشته باشیم. تیم پشتیبانی هم باید آماده باشد.
`.repeat(50); // Make it very long

console.log("Original transcript length:", longTranscript.length, "characters");

// Get chunking recommendations
const recommendations = getChunkingRecommendations(longTranscript.length, "fa");
console.log("\nChunking recommendations:", recommendations);

// Chunk the transcript
const chunks = chunkTranscript(
  longTranscript,
  recommendations.recommendedStrategy,
  "fa"
);
console.log("\nCreated chunks:", chunks.length);
chunks.forEach((chunk, index) => {
  console.log(
    `Chunk ${index + 1}: ${chunk.estimatedTokens} tokens, ${
      chunk.content.length
    } characters`
  );
});

// Simulate chunk summaries (in real app, these come from LLM)
const mockSummaries = chunks.map(
  (chunk, index) => `خلاصه بخش ${index + 1}: ${chunk.content.slice(0, 100)}...`
);

// Merge summaries
const finalSummary = mergeChunkSummaries(mockSummaries, "fa");
console.log("\nFinal merged summary:", finalSummary.slice(0, 200) + "...");
