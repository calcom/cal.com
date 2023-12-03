export const config = {
  runtime: "edge",
};

export default async function GET(request: Request) {
  const searchParams = new URLSearchParams(request.url.split("?")[1]);

  const api_key = searchParams.get("api_key");
  const voice_id = searchParams.get("voice_id");
  const model_id = searchParams.get("model_id") ?? "eleven_monolingual_v1";
  const text = searchParams.get("text");

  const myHeaders = new Headers();
  myHeaders.append("xi-api-key", api_key);
  myHeaders.append("Content-Type", "application/json");

  const raw = JSON.stringify({
    text: text,
    model_id: model_id,
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.5,
    },
  });

  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  } as RequestInit;

  const arrayBuffer = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`, requestOptions);

  return arrayBuffer;
}
