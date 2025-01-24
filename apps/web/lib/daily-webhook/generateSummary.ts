// Generates summary and action items from a meeting transcript download link (.vtt file)
export const generateSummary = async (transcriptUrl: string) => {
  try {
    const transcriptResponse = await fetch(transcriptUrl);
    const vttContent = await transcriptResponse.text();

    // Clean up VTT content by removing timestamps and metadata
    const cleanTranscript = vttContent
      .split("\n")
      .filter((line) => !line.match(/^\d{2}:|^WEBVTT|^\s*$/))
      .join(" ")
      .replace(/<[^>]*>/g, "");

    const prompt = `Please analyze this meeting transcript and create a well-structured summary with the following format:

1. First, provide a brief overview of the meeting (2-3 sentences)
2. Then, create relevant section headlines and summarize key points under each
3. Finally, under a section called "Action Items", list all action items, tasks, and follow-ups mentioned in the meeting

Meeting Transcript:
${cleanTranscript}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a professional meeting summarizer. Create clear, concise summaries with well-organized sections and actionable items.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.5,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      throw new Error("OpenAI API request failed");
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Error generating summary:", error);
    throw new Error("Failed to generate meeting summary");
  }
};
