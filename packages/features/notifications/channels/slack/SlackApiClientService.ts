import type { SlackMessage } from "./SlackMessageFormatterService";

interface ILogger {
  info(msg: string, ...args: unknown[]): void;
  error(msg: string, ...args: unknown[]): void;
  debug(msg: string, ...args: unknown[]): void;
  getSubLogger(options: { prefix: string[] }): ILogger;
}

export interface SlackPostMessageParams {
  botToken: string;
  channel: string;
  message: SlackMessage;
}

export interface SlackPostMessageResult {
  ok: boolean;
  ts?: string;
  error?: string;
}

export interface ISlackApiClientDeps {
  logger: ILogger;
}

export class SlackApiClientService {
  private readonly log: ILogger;

  constructor(private readonly deps: ISlackApiClientDeps) {
    this.log = deps.logger.getSubLogger({ prefix: ["[SlackApiClientService]"] });
  }

  async postMessage(params: SlackPostMessageParams): Promise<SlackPostMessageResult> {
    const { botToken, channel, message } = params;

    try {
      const response = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: `Bearer ${botToken}`,
        },
        body: JSON.stringify({
          channel,
          text: message.text,
          blocks: message.blocks,
        }),
      });

      const data = (await response.json()) as { ok: boolean; ts?: string; error?: string };

      if (!data.ok) {
        this.log.error(`Slack API error: ${data.error}`);
        return { ok: false, error: data.error };
      }

      return { ok: true, ts: data.ts };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log.error(`Failed to post Slack message: ${errorMessage}`);
      return { ok: false, error: errorMessage };
    }
  }
}
