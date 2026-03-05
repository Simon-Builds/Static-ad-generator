import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { prompt } = await req.json();

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'GROQ_API_KEY is not configured' }, { status: 500 });
        }

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                messages: [
                    {
                        role: "system",
                        content: "You are a professional marketing researcher. Generate 10 distinct psychological buyer archetypes (e.g., 'Skeptical Buyer', 'Busy Professional', 'Price Shopper', 'Social Proof Seeker') based on the product or target audience description provided. For each archetype, identify their Core Pain, Marketing Angle, and Primary Emotion. Format the output as a valid JSON array of objects with keys: archetype, pain, angle, emotion. RETURN ONLY THE JSON ARRAY."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                model: "meta-llama/llama-4-scout-17b-16e-instruct",
                stream: false,
                temperature: 0.7,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Groq API error:', errorText);
            return NextResponse.json({ error: `Groq API error: ${response.statusText}` }, { status: response.status });
        }

        const data = await response.json();
        const content = data.choices[0].message.content;

        // Parse the JSON content from Grok
        let profiles = [];
        try {
            // Groq sometimes returns markdown code blocks, although response_format: { type: "json_object" } should prevent this
            const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanContent);

            if (Array.isArray(parsed)) {
                profiles = parsed;
            } else if (parsed.profiles && Array.isArray(parsed.profiles)) {
                profiles = parsed.profiles;
            } else if (parsed.customers && Array.isArray(parsed.customers)) {
                profiles = parsed.customers;
            } else {
                // Look for any array in the object
                const arrays = Object.values(parsed).filter(val => Array.isArray(val));
                if (arrays.length > 0) {
                    profiles = arrays[0] as any[];
                } else {
                    // If it's a single object, wrap it
                    profiles = [parsed];
                }
            }
        } catch (e) {
            console.error('Failed to parse Grok JSON:', content);
            return NextResponse.json({ error: 'Failed to parse profiles. AI returned invalid JSON.' }, { status: 500 });
        }

        // Ensure we only return up to 10 and they are objects
        const finalProfiles = Array.isArray(profiles) ? profiles.slice(0, 10) : [];

        return NextResponse.json({ profiles: finalProfiles });
    } catch (error: any) {
        console.error('Profiling error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
