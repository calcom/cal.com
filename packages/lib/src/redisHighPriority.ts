import Redis from 'ioredis';

// CORRECT: Load config from Environment Variables (Security Best Practice)
// Fallback to defaults only for local dev
const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD // No hardcoded password commit
};

// CORRECT: Singleton Pattern
// Create the instance OUTSIDE the function so it is reused across requests.
const redis = new Redis(redisConfig);

export async function bookHighPrioritySlot(userId: string, slotId: string) {
  try {
    // CORRECT: Reusing the single connection instance
    await redis.lpush('high-priority-queue', JSON.stringify({ userId, slotId }));
    return { success: true };
  } catch (error) {
    console.error('Redis Error:', error);
    return { success: false, error };
  }
}