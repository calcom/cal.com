import OpenAI from "openai";

const PREFIXES = [
  "get",
  "meet",
  "real",
  "hello",
  "join",
  "call",
  "ask",
  "try",
  "use",
  "go",
  "my",
  "the",
  "hey",
  "iam",
];
const SUFFIXES = [
  "hq",
  "app",
  "site",
  "xyz",
  "io",
  "co",
  "pro",
  "dev",
  "art",
  "design",
  "blog",
  "space",
  "cloud",
  "tech",
  "id",
  "one",
  "page",
  "net",
  "org",
  "live",
  "me",
  "now",
];
const MAX_SUGGESTIONS = 8;

function getFallbackSuggestions(base: string): string[] {
  const cleanBase = base.replace(/[^a-z0-9]/gi, "").toLowerCase() || "name";
  const withPrefixes = PREFIXES.map((p) => p + cleanBase);
  const withSuffixes = SUFFIXES.map((s) => cleanBase + s);
  const half = Math.floor(MAX_SUGGESTIONS / 2);
  return [...withPrefixes.slice(0, half), ...withSuffixes.slice(0, half)];
}

export async function getUsernameSuggestions(base: string): Promise<string[]> {
  const cleanBase = base.replace(/[^a-z0-9]/gi, "").toLowerCase() || "name";
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || apiKey.trim() === "") {
    return getFallbackSuggestions(cleanBase);
  }

  try {
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a username suggestion assistant. Generate creative, memorable username alternatives.
                    Rules:
                      - Output only valid usernames: lowercase letters, numbers, hyphens. No spaces or special characters.
                      - Each suggestion must be 3-20 characters.
                      - Return exactly ${MAX_SUGGESTIONS} suggestions, one per line, no numbering or bullets.
                      - Suggestions should be variations of the base (prefixes, suffixes, creative combinations).
                      - Do not include any explanation or extra text.`,
        },
        {
          role: "user",
          content: `The username "${cleanBase}" is taken. Suggest ${MAX_SUGGESTIONS} alternative usernames:`,
        },
      ],
      max_tokens: 150,
      temperature: 0.8,
    });

    const text = completion.choices[0]?.message?.content?.trim();
    if (!text) return getFallbackSuggestions(cleanBase);

    const suggestions = text
      .split("\n")
      .map((line: string) =>
        line
          .replace(/^[\d.-]+\.?\s*/, "")
          .trim()
          .toLowerCase()
      )
      .filter((line: string) => /^[a-z0-9-]{3,20}$/.test(line))
      .slice(0, MAX_SUGGESTIONS);

    if (suggestions.length === 0) return getFallbackSuggestions(cleanBase);
    return suggestions;
  } catch {
    return getFallbackSuggestions(cleanBase);
  }
}
