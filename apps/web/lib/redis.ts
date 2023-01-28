import { createClient } from "redis";

class Redis {
  private client: any;

  async getInstance() {
    if (!this.client) {
      this.client = createClient({
        url: process.env.REDIS_URL,
      });
      this.client.on("error", (err: Error) => console.log("Redis Client Error", err));
      await this.client.connect();
    }
    return this.client;
  }
}

export default new Redis();
