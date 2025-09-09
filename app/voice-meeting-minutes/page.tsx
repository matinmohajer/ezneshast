"use client";

import { useState, useRef, useTransition, ComponentProps } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import AudioPlayer from "@/app/components/media/AudioPlayer";
import TranscriptLine from "@/app/components/transcript/TranscriptLine";
import { Skeleton } from "@/app/components/ui/Skeleton";
import type { AudioPlayerHandle } from "@/app/components/media/AudioPlayer";
import { Button } from "@/app/components/ui/Button";
import useDebounce from "@/app/hooks/useDebounce";

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
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 200);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const playerRef = useRef<AudioPlayerHandle | null>(null);

  // Custom components for ReactMarkdown
  const markdownComponents = {
    table: ({ children, ...props }: ComponentProps<"table">) => (
      <table className="markdown-table" {...props}>
        {children}
      </table>
    ),
    th: ({ children, ...props }: ComponentProps<"th">) => (
      <th className=" " {...props}>
        {children}
      </th>
    ),
    td: ({ children, ...props }: ComponentProps<"td">) => (
      <td className="" {...props}>
        {children}
      </td>
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
      className="flex min-h-screen flex-col items-center justify-start p-4 space-y-6 pt-24"
      dir="rtl"
    >
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          خلاصه جلسه صوتی
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          ضبط صدا → رونویسی → خلاصه‌سازی توسط Ezneshast
        </p>
      </div>

      <div className="flex flex-col items-center space-y-4">
        <button
          onClick={recording ? stopRecording : startRecording}
          className={`rounded-full w-20 h-20 flex items-center justify-center text-white font-semibold transition-all duration-200 shadow-sm ${
            recording
              ? "bg-red-500 hover:bg-red-600 animate-pulse"
              : "bg-primary-600 hover:bg-primary-700"
          }`}
          disabled={isPending}
          aria-pressed={recording}
          aria-label={recording ? "توقف ضبط" : "شروع ضبط"}
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

        <p className="text-sm text-gray-500 dark:text-gray-400">
          {recording
            ? "در حال ضبط... کلیک کنید تا متوقف شود"
            : "کلیک کنید تا ضبط شروع شود"}
        </p>
      </div>

      <div className="flex flex-col items-center space-y-2">
        <label className="cursor-pointer bg-white/70 dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 px-6 py-3 rounded-xl transition-colors border border-gray-200 dark:border-white/10 shadow-sm">
          <span className="text-gray-700 dark:text-gray-200">
            📁 آپلود فایل صوتی
          </span>
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
        <section className="w-full max-w-4xl space-y-3">
          <h2 className="text-lg font-semibold text-center text-gray-900 dark:text-white">
            پیش‌نمایش صدا
          </h2>
          <AudioPlayer
            ref={playerRef}
            src={audioURL}
            onTimeChange={() => {
              // future: derive activeIndex from timestamps
            }}
          />
        </section>
      )}

      {isPending && (
        <div className="w-full max-w-6xl space-y-6">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
            <p className="text-sm text-gray-500">
              در حال پردازش توسط Ezneshast...
            </p>
          </div>
          <section className="space-y-4" dir="rtl">
            <div className="flex items-center justify-between">
              <Skeleton width={160} height={24} />
              <div className="flex gap-2">
                <Skeleton width={90} height={32} />
                <Skeleton width={100} height={32} />
              </div>
            </div>
            <div className="bg-green-50 rounded-xl p-6 border border-green-200 space-y-2">
              <Skeleton height={18} />
              <Skeleton height={18} />
              <Skeleton height={18} width="80%" />
            </div>
          </section>
          <section className="space-y-4" dir="rtl">
            <div className="flex items-center justify-between">
              <Skeleton width={140} height={24} />
              <Skeleton width={90} height={32} />
            </div>
            <div className="bg-gray-50 rounded-xl p-2 border space-y-1">
              <Skeleton height={36} />
              <Skeleton height={36} />
              <Skeleton height={36} />
            </div>
          </section>
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
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                📝 خلاصه جلسه
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyMeetingMinutes}
                  className="h-9 px-4 rounded-xl bg-green-100 hover:bg-green-200 text-green-900 text-sm"
                >
                  📋 کپی خلاصه
                </button>
                <button
                  onClick={downloadMeetingMinutes}
                  className="h-9 px-4 rounded-xl bg-primary-100 hover:bg-primary-200 text-primary-900 text-sm"
                >
                  💾 دانلود همه
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-green-200 bg-grey-50 dark:bg-grey-900 p-6">
              <div className="prose prose-sm max-w-none text-gray-900 dark:text-gray-100">
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
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                🎤 متن اصلی
              </h2>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="جستجو در متن..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-9 w-56 rounded-xl border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 text-sm text-gray-900 dark:text-white shadow-sm"
                />
                <Button
                  variant="secondary"
                  onClick={copyTranscript}
                  className="h-9"
                >
                  📋 کپی متن
                </Button>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-2 border border-gray-200 dark:border-white/10 space-y-1">
              {(result.transcript || "")
                .split("\n")
                .filter(Boolean)
                .map((line, idx) => {
                  const match = debouncedQuery.trim()
                    ? line.toLowerCase().includes(debouncedQuery.toLowerCase())
                    : true;
                  if (!match) return null;
                  return (
                    <TranscriptLine
                      key={idx}
                      text={line}
                      active={activeIndex === idx}
                      onActivate={() => {
                        setActiveIndex(idx);
                        // playerRef.current?.seek(timestamp) // future when timestamps available
                      }}
                    />
                  );
                })}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
