"use client";

import { useState, useEffect } from "react";
import { Loader2, Users, Send, ArrowLeft, Plus, X } from "lucide-react";
import Link from "next/link";

interface CustomerProfile {
    archetype: string;
    pain: string;
    angle: string;
    emotion: string;
}

export default function BrandKit() {
    const [customerPrompt, setCustomerPrompt] = useState('');
    const [profiles, setProfiles] = useState<CustomerProfile[]>([]);

    useEffect(() => {
        setCustomerPrompt(localStorage.getItem('brand_kit_prompt') || '');
        const savedProfiles = localStorage.getItem('active_personas');
        if (savedProfiles) {
            try {
                setProfiles(JSON.parse(savedProfiles));
            } catch (e) { }
        }
    }, []);
    const [isProfiling, setIsProfiling] = useState(false);
    const [profileError, setProfileError] = useState<string | null>(null);

    const [isAddingCustom, setIsAddingCustom] = useState(false);
    const [customPersona, setCustomPersona] = useState<CustomerProfile>({
        archetype: '',
        pain: '',
        angle: '',
        emotion: ''
    });

    const addCustomPersona = () => {
        if (!customPersona.archetype.trim() || !customPersona.pain.trim() || !customPersona.angle.trim() || !customPersona.emotion.trim()) {
            setProfileError("Please fill out all fields for the custom persona.");
            return;
        }
        setProfileError(null);
        const newProfiles = [customPersona, ...profiles];
        setProfiles(newProfiles);
        localStorage.setItem('active_personas', JSON.stringify(newProfiles));
        setCustomPersona({ archetype: '', pain: '', angle: '', emotion: '' });
        setIsAddingCustom(false);
    };

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
                    <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                        <button
                            className="primary"
                            onClick={generateProfiles}
                            disabled={isProfiling}
                            style={{ flex: 1 }}
                        >
                            {isProfiling ? (
                                <><Loader2 className="loader" size={20} style={{ marginRight: '8px', display: 'inline' }} /> Analyzing Audience...</>
                            ) : (
                                <><Send size={18} style={{ marginRight: '8px', display: 'inline' }} /> Generate 10 Profiles</>
                            )}
                        </button>
                        <button
                            className="secondary"
                            onClick={() => setIsAddingCustom(!isAddingCustom)}
                            disabled={isProfiling}
                            style={{ padding: '0 20px' }}
                        >
                            {isAddingCustom ? <><X size={18} style={{ marginRight: '8px', display: 'inline' }} /> Cancel</> : <><Plus size={18} style={{ marginRight: '8px', display: 'inline' }} /> Add Custom Persona</>}
                        </button>
                    </div>
                    {profileError && <div className="error-message">{profileError}</div>}
                </div>

                {isAddingCustom && (
                    <div className="card" style={{ marginBottom: '32px', background: '#fafafa', border: '1px dashed #ccc' }}>
                        <h3 style={{ marginBottom: '16px', fontSize: '1.2rem' }}>Add Custom Persona</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            <div className="form-group">
                                <label>Archetype (Name)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. The Busy Professional"
                                    className="select-input"
                                    value={customPersona.archetype}
                                    onChange={(e) => setCustomPersona({ ...customPersona, archetype: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Core Emotion</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Overwhelmed but aspiring"
                                    className="select-input"
                                    value={customPersona.emotion}
                                    onChange={(e) => setCustomPersona({ ...customPersona, emotion: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Pain Point</label>
                                <input
                                    type="text"
                                    placeholder="e.g. No time to cook healthy meals"
                                    className="select-input"
                                    value={customPersona.pain}
                                    onChange={(e) => setCustomPersona({ ...customPersona, pain: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Marketing Angle</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Time-saving convenience without compromise"
                                    className="select-input"
                                    value={customPersona.angle}
                                    onChange={(e) => setCustomPersona({ ...customPersona, angle: e.target.value })}
                                />
                            </div>
                        </div>
                        <button className="primary" onClick={addCustomPersona}>
                            Add Persona
                        </button>
                    </div>
                )}

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

            <style jsx>{`
                .select-input {
                  width: 100%;
                  padding: 11px 12px;
                  border-radius: 8px;
                  border: 1px solid #eee;
                  background: #fff;
                  font-size: 0.9rem;
                  margin-top: 8px;
                  outline: none;
                }
                .select-input:focus { border-color: #000; }
            `}</style>
        </main>
    );
}
