import Redis from 'ioredis';

// BAD: Hardcoded credentials (Security Risk)
const redisConfig = {
  host: '127.0.0.1',
  port: 6379,
  password: 'my-secret-password'
};

export async function bookHighPrioritySlot(userId: string, slotId: string) {
  // BAD: Creating a NEW connection every single time function runs (Memory Leak)
  const redis = new Redis(redisConfig);

  // BAD: No error handling if Redis is down
  await redis.lpush('high-priority-queue', JSON.stringify({ userId, slotId }));

  return { success: true };
}