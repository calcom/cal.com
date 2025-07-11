import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class QueueMockService {
  private readonly logger = new Logger("QueueMockService");

  async add(jobName: string, data: any, options?: any): Promise<any> {
    this.logger.warn(`Queue operation mocked in serverless: ${jobName}`, { data, options });
    return { id: `mock-${Date.now()}` };
  }

  async getJob(jobId: string): Promise<any> {
    this.logger.warn(`Queue getJob mocked in serverless: ${jobId}`);
    return null;
  }

  async close(): Promise<void> {
    this.logger.warn("Queue close mocked in serverless");
  }
}
