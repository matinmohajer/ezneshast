// Test script to verify chunking system works correctly
const {
  chunkTranscript,
  getChunkingRecommendations,
} = require("./lib/transcript-chunker");

// Test with different transcript lengths
function testChunking() {
  console.log("🧪 Testing Chunking System...\n");

  // Test 1: Short transcript (should not chunk)
  console.log("📝 Test 1: Short transcript (should not chunk)");
  const shortTranscript =
    "این یک جلسه کوتاه است. ما تصمیم گرفتیم که پروژه را ادامه دهیم.";
  const shortRecommendations = getChunkingRecommendations(
    shortTranscript.length,
    "fa"
  );
  console.log("Short transcript:", {
    length: shortTranscript.length,
    estimatedTokens: shortRecommendations.estimatedTokens,
    estimatedChunks: shortRecommendations.estimatedChunks,
    willChunk: shortRecommendations.estimatedChunks > 1,
  });

  if (shortRecommendations.estimatedChunks > 1) {
    console.log("❌ ERROR: Short transcript should not be chunked!");
  } else {
    console.log(
      "✅ PASS: Short transcript correctly identified as no chunking needed"
    );
  }
  console.log("");

  // Test 2: Medium transcript (should chunk into 2 parts)
  console.log("📝 Test 2: Medium transcript (should chunk into 2 parts)");
  const mediumTranscript = `
    این جلسه برنامه‌ریزی اسپرینت جدید است. ما باید تصمیم بگیریم که چه ویژگی‌هایی را در این اسپرینت پیاده‌سازی کنیم. 
    تیم توسعه پیشنهاد کرده که سیستم احراز هویت را بهبود دهیم. همچنین نیاز به بهینه‌سازی عملکرد داریم.
    مدیر پروژه گفته که باید تا پایان ماه تمام کنیم. تیم تست هم باید تست‌های جدیدی بنویسد.
    ما تصمیم گرفتیم که اولویت با ویژگی‌های امنیتی باشد. همچنین باید مستندات را به‌روزرسانی کنیم.
    تیم عملیات گفته که باید زیرساخت را ارتقا دهیم. این کار زمان‌بر خواهد بود.
    ما باید ریسک‌ها را ارزیابی کنیم و برنامه پشتیبان داشته باشیم. تیم پشتیبانی هم باید آماده باشد.
  `.repeat(10); // Make it longer

  const mediumRecommendations = getChunkingRecommendations(
    mediumTranscript.length,
    "fa"
  );
  console.log("Medium transcript:", {
    length: mediumTranscript.length,
    estimatedTokens: mediumRecommendations.estimatedTokens,
    estimatedChunks: mediumRecommendations.estimatedChunks,
    willChunk: mediumRecommendations.estimatedChunks > 1,
  });

  if (mediumRecommendations.estimatedChunks > 1) {
    console.log("✅ PASS: Medium transcript correctly identified for chunking");

    // Test actual chunking
    const chunks = chunkTranscript(
      mediumTranscript,
      mediumRecommendations.recommendedStrategy,
      "fa"
    );
    console.log(
      `Created ${chunks.length} chunks:`,
      chunks.map((chunk) => ({
        id: chunk.id,
        tokens: chunk.estimatedTokens,
        length: chunk.content.length,
      }))
    );
  } else {
    console.log("❌ ERROR: Medium transcript should be chunked!");
  }
  console.log("");

  // Test 3: Very long transcript (should chunk into 3+ parts)
  console.log("📝 Test 3: Very long transcript (should chunk into 3+ parts)");
  const longTranscript = `
    این جلسه برنامه‌ریزی اسپرینت جدید است. ما باید تصمیم بگیریم که چه ویژگی‌هایی را در این اسپرینت پیاده‌سازی کنیم. 
    تیم توسعه پیشنهاد کرده که سیستم احراز هویت را بهبود دهیم. همچنین نیاز به بهینه‌سازی عملکرد داریم.
    مدیر پروژه گفته که باید تا پایان ماه تمام کنیم. تیم تست هم باید تست‌های جدیدی بنویسد.
    ما تصمیم گرفتیم که اولویت با ویژگی‌های امنیتی باشد. همچنین باید مستندات را به‌روزرسانی کنیم.
    تیم عملیات گفته که باید زیرساخت را ارتقا دهیم. این کار زمان‌بر خواهد بود.
    ما باید ریسک‌ها را ارزیابی کنیم و برنامه پشتیبان داشته باشیم. تیم پشتیبانی هم باید آماده باشد.
  `.repeat(50); // Make it very long

  const longRecommendations = getChunkingRecommendations(
    longTranscript.length,
    "fa"
  );
  console.log("Long transcript:", {
    length: longTranscript.length,
    estimatedTokens: longRecommendations.estimatedTokens,
    estimatedChunks: longRecommendations.estimatedChunks,
    willChunk: longRecommendations.estimatedChunks > 1,
  });

  if (longRecommendations.estimatedChunks >= 3) {
    console.log(
      "✅ PASS: Long transcript correctly identified for aggressive chunking"
    );

    // Test actual chunking
    const chunks = chunkTranscript(
      longTranscript,
      longRecommendations.recommendedStrategy,
      "fa"
    );
    console.log(
      `Created ${chunks.length} chunks:`,
      chunks.map((chunk) => ({
        id: chunk.id,
        tokens: chunk.estimatedTokens,
        length: chunk.content.length,
      }))
    );
  } else {
    console.log("❌ ERROR: Long transcript should be aggressively chunked!");
  }
  console.log("");

  // Test 4: Edge case - transcript with no sentence endings
  console.log("📝 Test 4: Edge case - transcript with no sentence endings");
  const noEndingsTranscript =
    "این یک متن بدون نقطه و علامت سوال است که باید به عنوان یک چانک کامل پردازش شود";
  const noEndingsRecommendations = getChunkingRecommendations(
    noEndingsTranscript.length,
    "fa"
  );
  console.log("No endings transcript:", {
    length: noEndingsTranscript.length,
    estimatedTokens: noEndingsRecommendations.estimatedTokens,
    estimatedChunks: noEndingsRecommendations.estimatedChunks,
  });

  const chunks = chunkTranscript(
    noEndingsTranscript,
    noEndingsRecommendations.recommendedStrategy,
    "fa"
  );
  console.log(`Created ${chunks.length} chunks for edge case`);
  console.log("");

  console.log("🎯 Chunking Test Summary:");
  console.log(
    `- Short transcript: ${shortRecommendations.estimatedChunks} chunks`
  );
  console.log(
    `- Medium transcript: ${mediumRecommendations.estimatedChunks} chunks`
  );
  console.log(
    `- Long transcript: ${longRecommendations.estimatedChunks} chunks`
  );
  console.log(`- Edge case: ${chunks.length} chunks`);
}

// Run the test
testChunking();
