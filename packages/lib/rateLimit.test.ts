import {default as rateLimit, checkRateLimitAndThrowError } from './rateLimit';
import { describe, expect, it,vi } from "vitest";



describe('checkRateLimitAndThrowError', () => {
  it('should throw an error if rate limit is exceeded', async () => {
    process.env.UPSTASH_REDIS_REST_URL="mockUrl"
    process.env.UPSTASH_REDIS_REST_TOKEN="mockToken"
    const rateLimiterMock = vi.fn().mockImplementation(rateLimit);

    const identifier = 'test-identifier';
    const rateLimitingType = 'core';

    await expect(
      checkRateLimitAndThrowError({ rateLimitingType, identifier })
    ).rejects.toThrowErrorMatchingSnapshot();
  });

  it('should not throw an error if rate limit is not exceeded', async () => {
    const rateLimiterMock = vi.fn().mockReturnValue({
      remaining: 1,
      reset: Date.now() + 10000,
    });

    const identifier = 'test-identifier';
    const rateLimitingType = 'core';

    await expect(
      checkRateLimitAndThrowError({ rateLimitingType, identifier })
    ).resolves.not.toThrow();
  });
});