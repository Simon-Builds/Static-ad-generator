import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
    try {
        // ── Rate limiting ──
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
        try {
            const rl = await checkRateLimit(ip);
            if (!rl.success) {
                return NextResponse.json(
                    { error: `Daily limit reached (${rl.limit} images/day). Come back tomorrow!`, remaining: 0, limit: rl.limit },
                    { status: 429 }
                );
            }
            console.log(`[RateLimit] IP ${ip}: ${rl.remaining}/${rl.limit} remaining`);
        } catch (rlError) {
            // Fail open — if Redis is down, allow the request
            console.warn('[RateLimit] Redis unavailable, allowing request:', rlError);
        }

        const { prompt, image, competitorImage, aspect_ratio } = await req.json();

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        const replicate = new Replicate({
            auth: process.env.REPLICATE_API_TOKEN,
        });

        const input: any = {
            prompt: prompt,
            aspect_ratio: aspect_ratio || "1:1",
            resolution: "2K",
            safety_filter_level: "block_only_high",
            allow_fallback_model: true
        };

        // Nano Banana Pro supports up to 14 reference images in an array
        const imageInputs: string[] = [];
        if (competitorImage) imageInputs.push(competitorImage);
        if (image) imageInputs.push(image);
        if (imageInputs.length > 0) {
            input.image_input = imageInputs;
        }

        console.log(`[Generate] Prompt: "${prompt.slice(0, 80)}..." | Images: ${imageInputs.length} | Ratio: ${aspect_ratio || '1:1'}`);

        const prediction = await replicate.predictions.create({
            model: "google/nano-banana-pro",
            input: input,
        });

        console.log('[Generate] Prediction created:', prediction.id);

        const result = await replicate.wait(prediction);

        console.log('[Generate] Status:', result.status, '| Output:', result.output);

        if (result.status === "failed") {
            throw new Error(`Prediction failed: ${result.error}`);
        }

        return NextResponse.json({ output: result.output });
    } catch (error: any) {
        console.error('[Generate] Error:', error);
        if (error.response) {
            try {
                const errorData = await error.response.json();
                console.error('[Generate] Replicate detail:', errorData);
            } catch (e) { /* ignore */ }
        }
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
