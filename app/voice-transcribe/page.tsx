 "use client";

import { useState, useRef, useTransition, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function VoiceTranscribePage() {
  /* ─────────── UI & recording state ─────────── */
  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [credits, setCredits] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const router = useRouter();

  /* ─────────── authentication & credits ─────────── */
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/signin?redirectTo=/voice-transcribe')
        return
      }
      setUser(user)
      
      // Get user credits
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: creditsData } = await (supabase as any)
        .from('credits')
        .select('balance')
        .eq('user_id', user.id)
        .single()
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setCredits((creditsData as any)?.balance || 0)
    }
    
    getUser()
  }, [router])

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
          autoGainControl: true
        } 
      });
      
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
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

        // Send directly to ElevenLabs API
        startTransition(async () => {
          try {
            const result = await transcribeWithElevenLabs(blob);
            setTranscript(result);
          } catch (err) {
            console.error(err);
            alert("Transcription failed – check console for details.");
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
        const result = await transcribeWithElevenLabs(file);
        setTranscript(result);
      } catch (err) {
        console.error(err);
        alert("Transcription failed – check console for details.");
      }
    });
  };

  const transcribeWithElevenLabs = async (audioBlob: Blob): Promise<string> => {
    const formData = new FormData();
    formData.append('audio', audioBlob);

    const response = await fetch('/api/voice-transcribe', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 402) {
        // Insufficient credits
        setError(`Insufficient credits. You have ${data.balance} credits but need ${data.required}. Please contact an administrator to add credits.`);
        // Refresh credits
        if (user) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: creditsData } = await (supabase as any)
            .from('credits')
            .select('balance')
            .eq('user_id', user.id)
            .single()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setCredits((creditsData as any)?.balance || 0)
        }
        throw new Error('Insufficient credits');
      } else if (response.status === 401) {
        // Not authenticated
        router.push('/auth/signin?redirectTo=/voice-transcribe');
        throw new Error('Authentication required');
      } else {
        throw new Error(data.error || 'Transcription failed');
      }
    }

    console.log(data, "transcription data");
    
    // Refresh credits after successful transcription
    if (user) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: creditsData } = await (supabase as any)
        .from('credits')
        .select('balance')
        .eq('user_id', user.id)
        .single()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setCredits((creditsData as any)?.balance || 0)
    }
    
    // Return the formatted transcript from the API
    return data.transcript || 'No transcript available';
  };

  const downloadTranscript = () => {
    if (!transcript) return;
    const blob = new Blob([transcript], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: "transcript.txt",
    });
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async () => {
    if (!transcript) return;
    try {
      await navigator.clipboard.writeText(transcript);
      alert("Transcript copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  };

  /* ─────────── UI ─────────── */
  if (!user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-gray-500 mt-4">Loading...</p>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 space-y-6 pt-20">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Voice Transcription</h1>
        <p className="text-gray-600">Direct transcription using ElevenLabs Scribe v1</p>
        <div className="flex items-center justify-center space-x-4 mt-4">
          <div className="bg-blue-50 px-4 py-2 rounded-lg">
            <span className="text-sm text-gray-600">Credits: </span>
            <span className="font-semibold text-blue-600">{credits}</span>
          </div>
          <div className="bg-gray-50 px-4 py-2 rounded-lg">
            <span className="text-sm text-gray-600">Cost: </span>
            <span className="font-semibold text-gray-900">10 credits</span>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="w-full max-w-md bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600"
              >
                <span className="sr-only">Dismiss</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex space-x-4">
        <a
          href="/dashboard"
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          ← Back to Dashboard
        </a>
        <a
          href="/admin"
          className="text-gray-600 hover:text-gray-800 text-sm"
        >
          Admin Panel
        </a>
      </div>

      <div className="flex flex-col items-center space-y-4">
        <button
          onClick={recording ? stopRecording : startRecording}
          className={`rounded-full w-20 h-20 flex items-center justify-center text-white font-semibold transition-all duration-200 ${
            recording 
              ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
          disabled={isPending}
        >
          {recording ? (
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <rect x="6" y="4" width="8" height="12" rx="1" ry="1"/>
            </svg>
          ) : (
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="8"/>
            </svg>
          )}
        </button>
        
        <p className="text-sm text-gray-500">
          {recording ? "Recording... Click to stop" : "Click to start recording"}
        </p>
      </div>

      <div className="flex flex-col items-center space-y-2">
        <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 px-6 py-3 rounded-lg transition-colors">
          <span className="text-gray-700">📁 Upload Audio File</span>
          <input 
            type="file" 
            accept="audio/*"
            onChange={handleFileUpload} 
            className="hidden" 
          />
        </label>
        <p className="text-xs text-gray-500">Supports: MP3, WAV, M4A, WebM</p>
      </div>

      {audioURL && (
        <section className="w-full max-w-md text-center space-y-2">
          <h2 className="text-lg font-semibold">Audio Preview</h2>
          <audio controls src={audioURL} className="w-full" />
        </section>
      )}

      {isPending && (
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <p className="text-sm text-gray-500">Transcribing with ElevenLabs...</p>
        </div>
      )}

      {transcript && (
        <section className="w-full max-w-4xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Transcription Result</h2>
            <div className="flex space-x-2">
              <button
                onClick={copyToClipboard}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
              >
                📋 Copy
              </button>
              <button
                onClick={downloadTranscript}
                className="px-4 py-2 bg-blue-100 hover:bg-blue-200 rounded-lg text-sm transition-colors"
              >
                💾 Download
              </button>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-6 border">
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-900 font-mono">
              {transcript}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}