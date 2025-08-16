"use client";

import { useState, useRef, useTransition, ComponentProps } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ProcessingResult {
  transcript: string;
  meetingMinutes: string;
  processingTime: number;
}

export default function VoiceMeetingMinutesPage() {
  /* ─────────── UI & recording state ─────────── */
  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  // Custom components for ReactMarkdown
  const markdownComponents = {
    table: ({ children, ...props }: ComponentProps<"table">) => (
      <table className="markdown-table" {...props}>
        {children}
      </table>
    ),
    th: ({ children, ...props }: ComponentProps<"th">) => (
      <th {...props}>{children}</th>
    ),
    td: ({ children, ...props }: ComponentProps<"td">) => (
      <td {...props}>{children}</td>
    ),
  };

  /* ─────────── handlers ─────────── */
  const startRecording = async () => {
    if (recording) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const recorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        chunksRef.current = [];
        setAudioURL(URL.createObjectURL(blob));

        // Process with transcription and summarization
        startTransition(async () => {
          try {
            const result = await processVoiceToMeetingMinutes(blob);
            setResult(result);
          } catch (err) {
            console.error(err);
            alert("Processing failed – check console for details.");
          }
        });
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Failed to start recording. Please check microphone permissions.");
    }
  };

  const stopRecording = () => {
    if (!recording || !mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    setRecording(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAudioURL(URL.createObjectURL(file));

    startTransition(async () => {
      try {
        const result = await processVoiceToMeetingMinutes(file);
        setResult(result);
      } catch (err) {
        console.error(err);
        alert("Processing failed – check console for details.");
      }
    });
  };

  const processVoiceToMeetingMinutes = async (
    audioBlob: Blob
  ): Promise<ProcessingResult> => {
    const startTime = Date.now();

    const formData = new FormData();
    formData.append("audio", audioBlob);

    const response = await fetch("/api/voice-meeting-minutes", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Processing failed");
    }

    const data = await response.json();
    const processingTime = Date.now() - startTime;

    return {
      transcript: data.transcript,
      meetingMinutes: data.meetingMinutes,
      processingTime,
    };
  };

  const downloadMeetingMinutes = () => {
    if (!result) return;
    const content = `# Meeting Minutes\n\n## Transcript\n${result.transcript}\n\n## Summary\n${result.meetingMinutes}`;
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: "meeting-minutes.md",
    });
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyMeetingMinutes = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.meetingMinutes);
      alert("Meeting minutes copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  };

  const copyTranscript = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.transcript);
      alert("Transcript copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  };

  /* ─────────── UI ─────────── */
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center p-4 space-y-6 pt-20"
      dir="rtl"
    >
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">خلاصه جلسه صوتی</h1>
        <p className="text-gray-600">
          ضبط صدا → رونویسی ElevenLabs → خلاصه‌سازی Groq
        </p>
      </div>

      <div className="flex flex-col items-center space-y-4">
        <button
          onClick={recording ? stopRecording : startRecording}
          className={`rounded-full w-20 h-20 flex items-center justify-center text-black font-semibold transition-all duration-200 ${
            recording
              ? "bg-red-500 hover:bg-red-600 animate-pulse"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
          disabled={isPending}
        >
          {recording ? (
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <rect x="6" y="4" width="8" height="12" rx="1" ry="1" />
            </svg>
          ) : (
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="8" />
            </svg>
          )}
        </button>

        <p className="text-sm text-gray-500">
          {recording
            ? "در حال ضبط... کلیک کنید تا متوقف شود"
            : "کلیک کنید تا ضبط شروع شود"}
        </p>
      </div>

      <div className="flex flex-col items-center space-y-2">
        <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 px-6 py-3 rounded-lg transition-colors">
          <span className="text-gray-700">📁 آپلود فایل صوتی</span>
          <input
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
        <p className="text-xs text-gray-500">
          پشتیبانی از: MP3, WAV, M4A, WebM
        </p>
      </div>

      {audioURL && (
        <section className="w-full max-w-md text-center space-y-2">
          <h2 className="text-lg font-semibold">پیش‌نمایش صدا</h2>
          <audio controls src={audioURL} className="w-full" />
        </section>
      )}

      {isPending && (
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <p className="text-sm text-gray-500">
            در حال پردازش با ElevenLabs + Groq...
          </p>
        </div>
      )}

      {result && (
        <div className="w-full max-w-6xl space-y-6">
          {/* Processing Info */}
          <div className="text-center text-sm text-gray-500">
            پردازش در {result.processingTime} میلی‌ثانیه تکمیل شد
          </div>

          {/* Meeting Minutes */}
          <section className="space-y-4" dir="rtl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">📝 خلاصه جلسه</h2>
              <div className="flex space-x-2">
                <button
                  onClick={copyMeetingMinutes}
                  className="px-4 py-2 bg-green-100 hover:bg-green-200 rounded-lg text-sm transition-colors"
                >
                  📋 کپی خلاصه
                </button>
                <button
                  onClick={downloadMeetingMinutes}
                  className="px-4 py-2 bg-blue-100 hover:bg-blue-200 rounded-lg text-sm transition-colors"
                >
                  💾 دانلود همه
                </button>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-6 border border-green-200">
              <div className="prose prose-sm max-w-none text-gray-900">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                >
                  {result.meetingMinutes}
                </ReactMarkdown>
              </div>
            </div>
          </section>

          {/* Transcript */}
          <section className="space-y-4" dir="rtl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">🎤 متن اصلی</h2>
              <button
                onClick={copyTranscript}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
              >
                📋 کپی متن
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 border">
              <pre className="whitespace-pre-wrap text-sm leading-relaxed text-gray-900">
                {result.transcript}
              </pre>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
