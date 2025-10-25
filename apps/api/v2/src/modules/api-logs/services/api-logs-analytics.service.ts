import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

interface AnalyticsEvent {
  timestamp: Date;
  method: string;
  endpoint: string;
  statusCode: number;
  responseTime: number;
  isError: boolean;
  userId?: number;
  organizationId?: number;
}

@Injectable()
export class ApiLogsAnalyticsService {
  private readonly logger = new Logger(ApiLogsAnalyticsService.name);
  private readonly webhookUrl: string;
  private readonly enabled: boolean;

  constructor(private configService: ConfigService) {
    this.webhookUrl = this.configService.get<string>("API_LOGS_ANALYTICS_WEBHOOK_URL") || "";
    this.enabled = this.configService.get<string>("API_LOGS_ANALYTICS_ENABLED") === "true";
  }

  async sendToAnalytics(event: AnalyticsEvent): Promise<void> {
    if (!this.enabled || !this.webhookUrl) return;

    try {
      const payload = {
        event: "api_call",
        timestamp: event.timestamp.toISOString(),
        properties: {
          method: event.method,
          endpoint: event.endpoint,
          status_code: event.statusCode,
          response_time_ms: event.responseTime,
          is_error: event.isError,
          user_id: event.userId,
          organization_id: event.organizationId,
        },
      };

      await fetch(this.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      this.logger.error(`Failed to send analytics: ${error.message}`);
    }
  }

  async sendBatchToAnalytics(events: AnalyticsEvent[]): Promise<void> {
    if (!this.enabled || !this.webhookUrl) return;

    try {
      const payload = {
        batch: events.map((event) => ({
          event: "api_call",
          timestamp: event.timestamp.toISOString(),
          properties: {
            method: event.method,
            endpoint: event.endpoint,
            status_code: event.statusCode,
            response_time_ms: event.responseTime,
            is_error: event.isError,
            user_id: event.userId,
            organization_id: event.organizationId,
          },
        })),
      };

      await fetch(this.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      this.logger.error(`Failed to send batch analytics: ${error.message}`);
    }
  }
}
