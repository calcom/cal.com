interface TranscriptEntry {
  speaker: string;
  text: string;
  time: string;
}

export async function parseVTT(url: string): Promise<TranscriptEntry[]> {
  const response = await fetch(url);
  const vttContent = await response.text();

  const lines = vttContent.split("\n").slice(2); // Remove WEBVTT header
  const transcript: TranscriptEntry[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith("transcript:")) {
      continue; // Skip the "transcript:X" lines
    }

    const timecodeMatch = lines[i]?.match(/(\d{2}:\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}:\d{2}\.\d{3})/);
    if (timecodeMatch) {
      const time = `${timecodeMatch[1]} --> ${timecodeMatch[2]}`;
      const speakerMatch = lines[i + 1]?.match(/<v>(.*?):<\/v>/);
      const speaker = speakerMatch ? speakerMatch[1] : "Unknown";
      const text = lines[i + 1]?.replace(/<v>.*?:<\/v>/, "").trim();

      if (text) {
        transcript.push({
          speaker,
          text,
          time,
        });
      }
      i++;
    }
  }

  return transcript;
}
