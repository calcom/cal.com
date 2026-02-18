import { WEBAPP_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";

const log = logger.getSubLogger({ prefix: ["abuse-scoring"] });

export interface AlertPayload {
  type: "user_flagged" | "user_suspicious" | "user_locked";
  userId: number;
  score: number;
  signals: Array<{ type: string; weight: number; context: string }>;
  reason: string;
}

/** DI interface — swap impl in module to switch from Slack to CF Worker */
export interface AbuseAlerter {
  send(payload: AlertPayload): Promise<void>;
}

export class SlackAbuseAlerter implements AbuseAlerter {
  constructor(private readonly webhookUrl: string | undefined) {}

  async send(payload: AlertPayload): Promise<void> {
    if (!this.webhookUrl) {
      log.info("Slack webhook not configured, logging alert", payload);
      return;
    }

    const emoji = payload.type === "user_locked" ? ":locked:" : ":warning:";
    const color = payload.type === "user_locked" ? "#dc2626" : "#f59e0b";
    const adminUrl = `${WEBAPP_URL}/settings/admin/users/${payload.userId}/edit`;

    try {
      await fetch(this.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attachments: [
            {
              color,
              blocks: [
                {
                  type: "header",
                  text: { type: "plain_text", text: `${emoji} Abuse Alert: ${payload.type}` },
                },
                {
                  type: "section",
                  fields: [
                    { type: "mrkdwn", text: `*User ID:*\n<${adminUrl}|${payload.userId}>` },
                    { type: "mrkdwn", text: `*Score:*\n${payload.score}/100` },
                    { type: "mrkdwn", text: `*Trigger:*\n${payload.reason}` },
                  ],
                },
                {
                  type: "section",
                  text: {
                    type: "mrkdwn",
                    text: `*Signals:*\n${payload.signals.map((s) => `- ${s.type} (+${s.weight}): ${s.context}`).join("\n")}`,
                  },
                },
              ],
            },
          ],
        }),
      });
    } catch (error) {
      log.error("Failed to send Slack alert", { error, payload });
    }
  }
}
