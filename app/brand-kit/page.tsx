"use client";

import { useState } from "react";
import { Loader2, Users, Send, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface CustomerProfile {
    archetype: string;
    pain: string;
    angle: string;
    emotion: string;
}

export default function BrandKit() {
    const [customerPrompt, setCustomerPrompt] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('brand_kit_prompt') || '';
        }
        return '';
    });
    const [profiles, setProfiles] = useState<CustomerProfile[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('active_personas');
            return saved ? JSON.parse(saved) : [];
        }
        return [];
    });
    const [isProfiling, setIsProfiling] = useState(false);
    const [profileError, setProfileError] = useState<string | null>(null);

    const generateProfiles = async () => {
        if (!customerPrompt.trim()) {
            setProfileError("Please describe your customer or target audience.");
            return;
        }

        setIsProfiling(true);
        setProfileError(null);
        setProfiles([]);

        try {
            const response = await fetch("/api/profiles", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: customerPrompt }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Failed to generate profiles.");
            }

            if (data.profiles && Array.isArray(data.profiles)) {
                setProfiles(data.profiles);
                localStorage.setItem('active_personas', JSON.stringify(data.profiles));
            } else {
                setProfiles([]);
            }
        } catch (err: any) {
            setProfileError(err.message || "An unexpected error occurred during profiling.");
        } finally {
            setIsProfiling(false);
        }
    };

    return (
        <main>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
                <div style={{ textAlign: 'left' }}>
                    <span className="badge">Groq Llama 4 Scout</span>
                    <h1>Brand Kit</h1>
                    <p className="subtitle">Identify and analyze psychological buyer personas</p>
                </div>
                <Link href="/" className="nav-button">
                    <ArrowLeft size={18} />
                    Back to Generator
                </Link>
            </header>

            <section>
                <div className="card" style={{ marginBottom: '32px' }}>
                    <div className="form-group">
                        <label htmlFor="customerPrompt">Audience Description</label>
                        <textarea
                            id="customerPrompt"
                            placeholder="Describe your product, service, or target market..."
                            value={customerPrompt}
                            onChange={(e) => {
                                setCustomerPrompt(e.target.value);
                                localStorage.setItem('brand_kit_prompt', e.target.value);
                            }}
                            disabled={isProfiling}
                            style={{ minHeight: '150px' }}
                        />
                    </div>
                    <button
                        className="primary"
                        onClick={generateProfiles}
                        disabled={isProfiling}
                    >
                        {isProfiling ? (
                            <><Loader2 className="loader" size={20} style={{ marginRight: '8px', display: 'inline' }} /> Analyzing Audience...</>
                        ) : (
                            <><Send size={18} style={{ marginRight: '8px', display: 'inline' }} /> Generate 10 Profiles</>
                        )}
                    </button>
                    {profileError && <div className="error-message">{profileError}</div>}
                </div>

                {profiles.length > 0 && (
                    <div className="profile-grid">
                        {profiles.map((p, i) => (
                            <div key={i} className="profile-card">
                                <div className="name">{p.archetype}</div>
                                <div className="meta" style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                    <span className="badge" style={{ background: '#fff0f0' }}>Pain</span>
                                    <span className="badge" style={{ background: '#f0faff' }}>Angle</span>
                                </div>
                                <div className="detail" style={{ marginBottom: '12px' }}>
                                    <strong>Pain:</strong> {p.pain}
                                </div>
                                <div className="detail" style={{ marginBottom: '12px' }}>
                                    <strong>Angle:</strong> {p.angle}
                                </div>
                                <div className="motivation" style={{ borderTop: 'none', fontStyle: 'normal', color: '#666' }}>
                                    <span style={{ fontWeight: '600', color: 'var(--foreground)' }}>Emotion:</span> {p.emotion}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

        </main>
    );
}
