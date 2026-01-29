import Redis from 'ioredis';

// TRAP 1: Hardcoded credentials (Security Risk)
const redisConfig = {
  host: '127.0.0.1',
  port: 6379,
  password: 'my-secret-password'
};

export async function bookHighPrioritySlot(userId: string, slotId: string) {
  // TRAP 2: Creating a NEW connection every single time this function runs.
  // This will crash the server after ~5000 requests (Memory Leak).
  const redis = new Redis(redisConfig);

  // TRAP 3: No error handling if Redis is down
  await redis.lpush('high-priority-queue', JSON.stringify({ userId, slotId }));

  return { success: true };
}