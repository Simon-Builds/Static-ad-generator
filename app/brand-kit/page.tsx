"use client";

import { useState, useEffect } from "react";
import { Loader2, Send, ArrowLeft, Plus, X } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

interface CustomerProfile {
    archetype: string;
    pain: string;
    angle: string;
    emotion: string;
}

export default function BrandKit() {
    const [customerPrompt, setCustomerPrompt] = useState('');
    const [profiles, setProfiles] = useState<CustomerProfile[]>([]);
    const [isProfiling, setIsProfiling] = useState(false);
    const [profileError, setProfileError] = useState<string | null>(null);
    const [isAddingCustom, setIsAddingCustom] = useState(false);
    const [customPersona, setCustomPersona] = useState<CustomerProfile>({
        archetype: '',
        pain: '',
        angle: '',
        emotion: ''
    });

    useEffect(() => {
        setCustomerPrompt(localStorage.getItem('brand_kit_prompt') || '');
        const savedProfiles = localStorage.getItem('active_personas');
        if (savedProfiles) {
            try {
                setProfiles(JSON.parse(savedProfiles));
            } catch (e) { }
        }
    }, []);

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
        <motion.main
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
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
                    <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
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
                        <motion.button
                            whileTap={{ scale: 0.97 }}
                            className="add-custom-btn"
                            onClick={() => setIsAddingCustom(!isAddingCustom)}
                            disabled={isProfiling}
                        >
                            {isAddingCustom
                                ? <><X size={18} style={{ marginRight: '8px', display: 'inline' }} /> Cancel</>
                                : <><Plus size={18} style={{ marginRight: '8px', display: 'inline' }} /> Add Custom</>}
                        </motion.button>
                    </div>
                    {profileError && <div className="error-message">{profileError}</div>}
                </div>

                <AnimatePresence>
                    {isAddingCustom && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginBottom: '32px' }}
                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                            style={{ overflow: 'hidden' }}
                        >
                            <div className="card custom-persona-card">
                                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '4px' }}>✏️ Add Custom Persona</h3>
                                <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '8px' }}>Fill in all four fields to define a unique audience segment.</p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
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
                                            placeholder="e.g. Time-saving convenience"
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
                        </motion.div>
                    )}
                </AnimatePresence>

                {profiles.length > 0 && (
                    <div className="profile-grid">
                        <AnimatePresence>
                            {profiles.map((p, i) => (
                                <motion.div
                                    key={p.archetype + i}
                                    layout
                                    initial={{ opacity: 0, scale: 0.92, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 28, delay: i * 0.04 }}
                                    className="profile-card"
                                >
                                    <div className="name">{p.archetype}</div>
                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                                        <span className="persona-tag pain-tag">Pain</span>
                                        <span className="persona-tag angle-tag">Angle</span>
                                        <span className="persona-tag emotion-tag">Emotion</span>
                                    </div>
                                    <div className="detail" style={{ marginBottom: '12px' }}>
                                        <strong>Pain:</strong> {p.pain}
                                    </div>
                                    <div className="detail" style={{ marginBottom: '12px' }}>
                                        <strong>Angle:</strong> {p.angle}
                                    </div>
                                    <div className="motivation">
                                        <span style={{ fontWeight: 700 }}>Emotion:</span> {p.emotion}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </section>

            <style jsx>{`
                .add-custom-btn {
                    display: flex;
                    align-items: center;
                    padding: 0 22px;
                    background: #f0f0f2;
                    color: #333;
                    border: 1px solid rgba(0,0,0,0.08);
                    border-radius: 12px;
                    font-weight: 600;
                    font-size: 0.95rem;
                    cursor: pointer;
                    transition: background 0.2s;
                    white-space: nowrap;
                }
                .add-custom-btn:hover {
                    background: #e5e5e8;
                }
                .custom-persona-card {
                    background: rgba(94, 92, 230, 0.03);
                    border: 1.5px dashed rgba(94, 92, 230, 0.25) !important;
                }
                .select-input {
                    width: 100%;
                    padding: 14px 16px;
                    border-radius: 12px;
                    border: 1px solid rgba(0,0,0,0.1);
                    background: rgba(255,255,255,0.9);
                    font-size: 0.95rem;
                    margin-top: 8px;
                    outline: none;
                    transition: border-color 0.2s, box-shadow 0.2s;
                    font-family: inherit;
                }
                .select-input:focus {
                    border-color: #5e5ce6;
                    box-shadow: 0 0 0 4px rgba(94, 92, 230, 0.12);
                }
                .persona-tag {
                    display: inline-block;
                    padding: 3px 10px;
                    border-radius: 20px;
                    font-size: 0.72rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                }
                .pain-tag { background: rgba(255, 59, 48, 0.07); color: #c0392b; }
                .angle-tag { background: rgba(0, 122, 255, 0.07); color: #2471a3; }
                .emotion-tag { background: rgba(94, 92, 230, 0.07); color: #5e5ce6; }
            `}</style>
        </motion.main>
    );
}
