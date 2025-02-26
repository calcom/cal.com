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

    const prompt = `Please create a factual summary of this meeting transcript using bullet points. Only include information that was explicitly mentioned in the transcript - do not make assumptions or add implied next steps. Always include a "Next Steps" section, but if no explicit next steps were mentioned, state "No specific next steps were mentioned in the transcript."

If discussed, organize the content under these possible sections:
- Key Discussion Points
- Current Situation
- Challenges
- Solutions Discussed
- Decisions Made

Format each section with bullet points. Use sub-bullets for related details.

For the given transcript, only include sections where there is explicit content to summarize. The "Next Steps" section is mandatory.

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
