// lib/api.ts (or api.ts in the client folder)
export async function createMeetingDoc(blob: Blob) {
  const form = new FormData();
  form.append("file", blob, "meeting.webm"); // Prepare the file to send as FormData

  const res = await fetch("/api/meetings", { method: "POST", body: form }); // API call to the /api/meetings route
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return (await res.json()) as { markdown: string; transcript: string }; // Returns the result
}

// lib/api.ts
export async function createMeetingDocOpenAI(
  file: Blob
): Promise<{ transcript: string; markdown: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/openai", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error("OpenAI API request failed");
  return await res.json();
}
