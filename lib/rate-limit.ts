import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// 2 image generations per 24-hour window per IP
const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(15, '24 h'),
    prefix: 'ratelimit:generate',
    analytics: true,
});

export async function checkRateLimit(ip: string) {
    const result = await ratelimit.limit(ip);
    return {
        success: result.success,
        remaining: result.remaining,
        limit: result.limit,
        reset: result.reset,
    };
}

export async function getRateLimitStatus(ip: string) {
    const result = await ratelimit.getRemaining(ip);
    // getRemaining returns either a number or an object with { remaining, reset, limit }
    const remaining = typeof result === 'number' ? result : (result as any).remaining ?? 2;
    return {
        remaining,
        limit: 15,
    };
}
