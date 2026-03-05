import { NextRequest, NextResponse } from 'next/server';
import { getRateLimitStatus } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
    try {
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
        const status = await getRateLimitStatus(ip);
        return NextResponse.json(status);
    } catch (error: any) {
        console.error('[RateLimit] Error checking status:', error);
        // If Redis is unavailable, allow generation (fail open)
        return NextResponse.json({ remaining: 2, limit: 2 });
    }
}
