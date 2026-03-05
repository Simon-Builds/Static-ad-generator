"use client";

import { useState, useEffect } from "react";
import { Loader2, Send, ArrowLeft, Plus, X, Trash2, AlertCircle } from "lucide-react";
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
    const [personaToDelete, setPersonaToDelete] = useState<number | null>(null);

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

    const deletePersona = (index: number) => {
        const newProfiles = profiles.filter((_, i) => i !== index);
        setProfiles(newProfiles);
        localStorage.setItem('active_personas', JSON.stringify(newProfiles));
        setPersonaToDelete(null);
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
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, transition: { duration: 0.15 } }}
                                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                                    className="profile-card"
                                    style={{ position: 'relative' }}
                                >
                                    <button
                                        className="persona-delete-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setPersonaToDelete(i);
                                        }}
                                        title="Delete Persona"
                                    >
                                        <Trash2 size={14} />
                                    </button>
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

                <AnimatePresence>
                    {personaToDelete !== null && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="delete-modal-overlay"
                            style={{
                                position: 'fixed',
                                inset: 0,
                                background: 'rgba(0, 0, 0, 0.5)',
                                backdropFilter: 'blur(4px)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 10000
                            }}
                            onClick={() => setPersonaToDelete(null)}
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                className="delete-modal-content"
                                style={{
                                    background: 'white',
                                    width: '90%',
                                    maxWidth: '360px',
                                    borderRadius: '12px',
                                    padding: '24px',
                                    boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                                    display: 'block'
                                }}
                                onClick={e => e.stopPropagation()}
                            >
                                <h3 style={{ margin: '0 0 12px 0', fontSize: '1.2rem', color: '#111', fontWeight: 700 }}>Delete Persona</h3>
                                <p style={{ margin: '0 0 24px 0', color: '#555', fontSize: '0.95rem' }}>Are you sure you want to delete this persona?</p>
                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                    <button
                                        className="modal-secondary-btn"
                                        onClick={() => setPersonaToDelete(null)}
                                        style={{ padding: '8px 20px', border: 'none', background: '#f0f0f0', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, color: '#333', fontSize: '0.9rem' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="modal-primary-btn"
                                        onClick={() => deletePersona(personaToDelete)}
                                        style={{ padding: '8px 20px', border: 'none', background: '#ff3b30', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </section>

            <style jsx>{`
                :global(.add-custom-btn) {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    padding: 10px 24px;
                    background: #fff;
                    color: #111;
                    border: 1.5px solid #eee;
                    border-radius: 999px;
                    font-weight: 600;
                    font-size: 0.9rem;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                    white-space: nowrap;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.04);
                    height: 48px;
                }
                :global(.add-custom-btn:hover) {
                    border-color: #5e5ce6;
                    color: #5e5ce6;
                    background: #fdfdfd;
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(94, 92, 230, 0.12);
                }
                :global(.add-custom-btn:active) {
                    transform: translateY(0);
                }
                
                .persona-delete-btn {
                    position: absolute;
                    top: 15px;
                    right: 15px;
                    background: white;
                    border: 1px solid rgba(0,0,0,0.08);
                    color: #ff3b30;
                    width: 34px;
                    height: 34px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    opacity: 0;
                    transform: scale(0.9) translate(5px, -5px);
                    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    z-index: 20;
                }
                :global(.profile-card:hover) .persona-delete-btn {
                    opacity: 1;
                    transform: scale(1) translate(0, 0);
                }
                .persona-delete-btn:hover {
                    background: #ff3b30;
                    color: white;
                    transform: scale(1.1) !important;
                    box-shadow: 0 6px 16px rgba(255, 59, 48, 0.4);
                }

                .delete-modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.5);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                    padding: 20px;
                }
                .delete-modal-content {
                    background: white;
                    width: 100%;
                    max-width: 360px;
                    border-radius: 12px;
                    padding: 24px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.15);
                }
                .modal-secondary-btn:hover {
                    background: #e8e8e8 !important;
                }
                .modal-primary-btn:hover {
                    background: #e6352b !important;
                    box-shadow: 0 4px 12px rgba(255, 59, 48, 0.2);
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
