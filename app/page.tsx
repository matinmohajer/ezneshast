// app/page.tsx
'use client';

import { useState, useRef, useTransition } from 'react';
import { createMeetingDoc } from '@/lib/api';
import ReactMarkdown from 'react-markdown';

export default function HomePage() {
  /* ─────────── UI & recording state ─────────── */
  const [recording, setRecording]         = useState(false);
  const [audioURL,  setAudioURL]          = useState<string | null>(null);
  const [summaryMd, setSummaryMd]         = useState<string | null>(null);
  const [transcript, setTranscript]       = useState<string | null>(null);
  const mediaRecorderRef                  = useRef<MediaRecorder | null>(null);
  const chunksRef                         = useRef<BlobPart[]>([]);
  const [isPending, startTransition]      = useTransition();

  /* ─────────── handlers ─────────── */
  const startRecording = async () => {
    if (recording) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);

    recorder.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      chunksRef.current = [];
      setAudioURL(URL.createObjectURL(blob));

      // ⬇︎ upload ➜ Whisper ➜ Groq
      startTransition(async () => {
        try {
          const { markdown, transcript } = await createMeetingDoc(blob);
          setSummaryMd(markdown);
          setTranscript(transcript);
        } catch (err) {
          console.error(err);
          alert('Upload or AI processing failed – check console.');
        }
      });
    };

    recorder.start();
    mediaRecorderRef.current = recorder;
    setRecording(true);
  };

  const stopRecording = () => {
    if (!recording || !mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    setRecording(false);
  };

  const downloadMd = () => {
    if (!summaryMd) return;
    const blob = new Blob([summaryMd], { type: 'text/markdown' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), {
      href: url,
      download: 'meeting-summary.md',
    });
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioURL(URL.createObjectURL(file)); // Optional: preview uploaded audio

    startTransition(async () => {
      try {
        const { markdown, transcript } = await createMeetingDoc(file);
        setSummaryMd(markdown);
        setTranscript(transcript);
      } catch (err) {
        console.error(err);
        alert('Upload or AI processing failed – check console.');
      }
    });
  };

  /* ─────────── UI ─────────── */
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 space-y-6">
      <h1 className="text-2xl font-bold">Voice Agent — Record Meeting</h1>

      <button
        onClick={recording ? stopRecording : startRecording}
        className="rounded-xl bg-blue-600 px-6 py-3 text-white shadow transition hover:bg-blue-700 disabled:opacity-50"
        disabled={isPending}
      >
        {recording ? 'Stop Recording' : 'Start Recording'}
      </button>

      <label className="cursor-pointer  px-4 py-2 rounded ">
        Upload Audio File
        <input
          type="file"
          accept="audio/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </label>

      {audioURL && (
        <section className="w-full max-w-md text-center space-y-2">
          <h2 className="text-lg font-semibold">Preview</h2>
          <audio controls src={audioURL} className="w-full" />
        </section>
      )}

      {isPending && <p className="text-sm text-gray-500">Processing…</p>}

      {summaryMd && (
        <section className="w-full max-w-2xl space-y-4" dir="rtl">
          <h2 className="text-lg font-semibold" >Summary (Markdown)</h2>
          <ReactMarkdown >{summaryMd}</ReactMarkdown>

          <h2 className="text-lg font-semibold">Full Transcript</h2>
          <pre className="whitespace-pre-wrap text-xs max-h-96 overflow-y-auto border p-4 rounded ">
            {transcript}
          </pre>

          <button
            onClick={downloadMd}
            className="rounded border px-4 py-2 hover:bg-gray-100"
          >
            Download .md
          </button>
        </section>
      )}
    </main>
  );
}
