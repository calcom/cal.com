import logger from "@calcom/lib/logger";

const log = logger.getSubLogger({ prefix: ["recallAi"] });

interface CreateBotRequest {
  meeting_url: string;
  bot_name: string;
  join_at?: string;
  recording_mode?: "speaker_view" | "gallery_view" | "shared_screen_only";
  transcription_options?: {
    provider: "assembly_ai" | "rev" | "aws_transcribe";
  };
}

interface CreateBotResponse {
  id: string;
  meeting_url: string;
  bot_name: string;
  status: string;
}

export async function createRecallBot(params: {
  meetingUrl: string;
  botName: string;
  joinAt?: Date;
}): Promise<CreateBotResponse | null> {
  const apiKey = process.env.RECALL_AI_API_KEY;

  if (!apiKey) {
    log.warn("RECALL_AI_API_KEY not configured, skipping bot creation");
    return null;
  }

  try {
    const requestBody: CreateBotRequest = {
      meeting_url: params.meetingUrl,
      bot_name: params.botName,
      recording_mode: "speaker_view",
      transcription_options: {
        provider: "assembly_ai",
      },
    };

    if (params.joinAt) {
      requestBody.join_at = params.joinAt.toISOString();
    }

    const response = await fetch("https://api.recall.ai/api/v1/bot", {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error("Failed to create Recall.ai bot", { status: response.status, error: errorText });
      return null;
    }

    const result = (await response.json()) as CreateBotResponse;
    log.info("Successfully created Recall.ai bot", { botId: result.id, meetingUrl: params.meetingUrl });
    return result;
  } catch (error) {
    log.error("Error creating Recall.ai bot", error);
    return null;
  }
}
