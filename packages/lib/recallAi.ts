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

interface UpdateBotRequest {
  meeting_url?: string;
  bot_name?: string;
  join_at?: string;
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

export async function updateRecallBot(params: {
  botId: string;
  meetingUrl?: string;
  botName?: string;
  joinAt?: Date;
}): Promise<CreateBotResponse | null> {
  const apiKey = process.env.RECALL_AI_API_KEY;

  if (!apiKey) {
    log.warn("RECALL_AI_API_KEY not configured, skipping bot update");
    return null;
  }

  try {
    const requestBody: UpdateBotRequest = {};

    if (params.meetingUrl) {
      requestBody.meeting_url = params.meetingUrl;
    }
    if (params.botName) {
      requestBody.bot_name = params.botName;
    }
    if (params.joinAt) {
      requestBody.join_at = params.joinAt.toISOString();
    }

    const response = await fetch(`https://api.recall.ai/api/v1/bot/${params.botId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error("Failed to update Recall.ai bot", {
        status: response.status,
        error: errorText,
        botId: params.botId,
      });
      return null;
    }

    const result = (await response.json()) as CreateBotResponse;
    log.info("Successfully updated Recall.ai bot", { botId: result.id, meetingUrl: params.meetingUrl });
    return result;
  } catch (error) {
    log.error("Error updating Recall.ai bot", error);
    return null;
  }
}

export async function deleteRecallBot(botId: string): Promise<boolean> {
  const apiKey = process.env.RECALL_AI_API_KEY;

  if (!apiKey) {
    log.warn("RECALL_AI_API_KEY not configured, skipping bot deletion");
    return false;
  }

  try {
    const response = await fetch(`https://api.recall.ai/api/v1/bot/${botId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Token ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error("Failed to delete Recall.ai bot", { status: response.status, error: errorText, botId });
      return false;
    }

    log.info("Successfully deleted Recall.ai bot", { botId });
    return true;
  } catch (error) {
    log.error("Error deleting Recall.ai bot", error);
    return false;
  }
}
