import Redis from "ioredis";

const redisPort = Number(process.env.REDIS_PORT) || 6379;
const redisHost = process.env.REDIS_HOST || "127.0.0.1";

export const redis = new Redis(redisPort, redisHost);

let errorOccurred = false;
redis.on("error", (error) => {
  if (!errorOccurred) {
    console.error(`❌ Failed to connect to Redis server: ${error.message}`);
    errorOccurred = true;
  }
});

redis.on("connect", () => {
  console.log("✅ Redis Connected Successfully");
});
