import { NextRequest, NextResponse } from 'next/server';

interface Persona {
    archetype: string;
    pain: string;
    angle: string;
    emotion: string;
}

interface CampaignResult {
    persona: string;
    adCopy: string;
}

export async function POST(req: NextRequest) {
    try {
        const { competitorImage, productDescription, personas } = await req.json();

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'GROQ_API_KEY is not configured' }, { status: 500 });
        }
        if (!personas || personas.length === 0) {
            return NextResponse.json({ error: 'At least one persona must be selected.' }, { status: 400 });
        }

        // ─────────────────────────────────────────────────────────────
        // STEP 1: Grok Vision — Analyze the competitor ad format
        // ─────────────────────────────────────────────────────────────
        let formatSpec = '';

        if (competitorImage) {
            console.log('[Campaign] Step 1: Analyzing competitor ad format...');

            const analysisRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
                    stream: false,
                    temperature: 0.2,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a senior advertising analyst. Extract precise, actionable format data from ad images.'
                        },
                        {
                            role: 'user',
                            content: [
                                { type: 'image_url', image_url: { url: competitorImage } },
                                {
                                    type: 'text',
                                    text: `Analyze this competitor ad. Return a JSON object with these fields ONLY:
- wordCount: total visible words in the ad (integer)
- headlineWords: number of words in the main headline (integer)
- hasBodyCopy: true/false
- bodyWords: word count of body text if present
- tone: one of "bold", "minimalist", "urgent", "aspirational", "playful", "premium"
- visualStyle: detailed description of the art style, lighting, and mood (string)
- colorPalette: dominant colors and their role (string)
- layout: description of where elements are placed (e.g., "product at bottom right, headline top left") (string)
- ctaText: the call-to-action text if visible, else null

Return ONLY valid JSON. No markdown.`
                                }
                            ]
                        }
                    ]
                })
            });

            if (analysisRes.ok) {
                const d = await analysisRes.json();
                const raw = d.choices[0].message.content.replace(/```json|```/g, '').trim();
                try {
                    const spec = JSON.parse(raw);
                    formatSpec = `
COMPETITOR AD FORMAT & STYLE:
- Style: ${spec.visualStyle}
- Colors: ${spec.colorPalette}
- Layout: ${spec.layout}
- Tone: ${spec.tone}
- Word Count: ~${spec.wordCount} words total

STRICT RULE: Your ad copy MUST match this word count. Do NOT exceed ${spec.wordCount} total words.`;
                    console.log('[Campaign] Format spec:', spec);
                } catch {
                    console.warn('[Campaign] Could not parse format spec, using raw:', raw);
                    formatSpec = `COMPETITOR AD FORMAT: ${raw}`;
                }
            } else {
                console.warn('[Campaign] Groq vision analysis failed:', await analysisRes.text());
            }
        }

        // ─────────────────────────────────────────────────────────────────────────
        // STEP 2: Grok — Write ad copy text ONLY for each persona
        // ─────────────────────────────────────────────────────────────────────────
        console.log(`[Campaign] Step 2: Writing ad copy for ${personas.length} persona(s)...`);

        const personasText = personas.map((p: Persona, i: number) =>
            `${i + 1}. ${p.archetype} — Pain: "${p.pain}" | Angle: "${p.angle}" | Emotion: "${p.emotion}"`
        ).join('\n');

        const craftRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
                model: 'meta-llama/llama-4-scout-17b-16e-instruct',
                stream: false,
                temperature: 0.85,
                messages: [
                    {
                        role: 'system',
                        content: `You are a world-class ad copywriter. You write tightly constrained static ad copy.
You write ONLY the text that appears physically on the ad — nothing else. No descriptions, no explanations.
You must respect word count limits strictly.`
                    },
                    {
                        role: 'user',
                        content: `PRODUCT:
${productDescription || 'No description provided — infer from persona context.'}

CUSTOMER PERSONAS (write one ad copy per persona):
${personasText}

${formatSpec || 'Keep ad copy under 15 words total. Be punchy and direct.'}

TASK:
For each persona, write ONLY the ad copy text that will be placed on the static ad image.
This text must:
- Speak directly to that persona's pain and emotional trigger
- Match the word count and structure of the competitor ad format above
- Be ready to be overlaid directly onto an image — no fluff, no explanations

Return a JSON array of objects: [{ "persona": "...", "adCopy": "..." }]
Return ONLY the JSON array. No markdown.`
                    }
                ]
            })
        });

        if (!craftRes.ok) {
            const err = await craftRes.text();
            console.error('[Campaign] Groq copy writing failed:', err);
            return NextResponse.json({ error: `Groq failed: ${craftRes.statusText}` }, { status: craftRes.status });
        }

        const craftData = await craftRes.json();
        const raw = craftData.choices[0].message.content.replace(/```json|```/g, '').trim();

        let results: CampaignResult[] = [];
        try {
            const parsed = JSON.parse(raw);
            results = Array.isArray(parsed) ? parsed : Object.values(parsed).find(v => Array.isArray(v)) as CampaignResult[] || [];
        } catch {
            console.error('[Campaign] Failed to parse Groq copy response:', raw);
            return NextResponse.json({ error: 'Failed to parse ad copy from Groq.' }, { status: 500 });
        }

        console.log(`[Campaign] Ad copy written for ${results.length} persona(s).`);
        return NextResponse.json({ campaigns: results, formatSpec: formatSpec || null });

    } catch (error: any) {
        console.error('[Campaign] Unexpected error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
