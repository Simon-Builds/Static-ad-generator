"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, Loader2, Sparkles, Image as ImageIcon, X, LayoutTemplate, ChevronDown, ChevronUp, Layers, Target, CheckCircle2, Circle, AlertCircle, Heart, Download, Trash2 } from "lucide-react";
import Link from "next/link";

interface Persona {
    archetype: string;
    pain: string;
    angle: string;
    emotion: string;
}

interface CampaignCard {
    persona: string;
    adCopy: string;
    imageUrl: string | null;
    status: 'pending' | 'generating' | 'done' | 'error';
    isFavorite?: boolean;
    errorMsg?: string;
}

type GenStep = 'idle' | 'generating' | 'done';

export default function SeedreamSandbox() {
    // Image inputs
    const [competitorImage, setCompetitorImage] = useState<string | null>(() => {
        if (typeof window !== 'undefined') return localStorage.getItem('competitor_image');
        return null;
    });
    const [productImage, setProductImage] = useState<string | null>(() => {
        if (typeof window !== 'undefined') return localStorage.getItem('product_image');
        return null;
    });
    const competitorInputRef = useRef<HTMLInputElement>(null);
    const productInputRef = useRef<HTMLInputElement>(null);

    // Accordion
    const [expandedSection, setExpandedSection] = useState<string | null>("product");

    // Personas
    const [personas, setPersonas] = useState<Persona[]>([]);
    const [selectedPersonas, setSelectedPersonas] = useState<Set<string>>(new Set());

    // Output settings
    const [aspectRatio, setAspectRatio] = useState<string>("1:1");
    const [volume, setVolume] = useState<number>(1);
    const [adherence, setAdherence] = useState<'High' | 'Medium' | 'Low'>('High');

    // Generation state
    const [genStep, setGenStep] = useState<GenStep>('idle');
    const [stepMessage, setStepMessage] = useState('');
    const [campaignCards, setCampaignCards] = useState<CampaignCard[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('campaign_cards');
            return saved ? JSON.parse(saved) : [];
        }
        return [];
    });
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("active_personas");
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    setPersonas(parsed);
                    // Only set selected if not already set or if fresh load
                    setSelectedPersonas(new Set(parsed.map((p: Persona) => p.archetype)));
                } catch (e) {
                    console.error("Failed to parse personas", e);
                }
            }
        }
    }, []);

    // Persist images
    useEffect(() => {
        if (typeof window !== 'undefined') {
            if (competitorImage) localStorage.setItem('competitor_image', competitorImage);
            else localStorage.removeItem('competitor_image');
        }
    }, [competitorImage]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            if (productImage) localStorage.setItem('product_image', productImage);
            else localStorage.removeItem('product_image');
        }
    }, [productImage]);

    // Persist campaign results
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('campaign_cards', JSON.stringify(campaignCards));
        }
    }, [campaignCards]);

    const togglePersona = (archetype: string) => {
        setSelectedPersonas(prev => {
            const next = new Set(prev);
            if (next.has(archetype)) next.delete(archetype);
            else next.add(archetype);
            return next;
        });
    };

    const toggleAllPersonas = () => {
        setSelectedPersonas(
            selectedPersonas.size === personas.length
                ? new Set()
                : new Set(personas.map(p => p.archetype))
        );
    };

    const handleFileChange = (setter: (v: string | null) => void) =>
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > 10 * 1024 * 1024) { setError("Image size exceeds 10MB limit."); return; }
            const reader = new FileReader();
            reader.onloadend = () => { setter(reader.result as string); setError(null); };
            reader.readAsDataURL(file);
        };

    const removeImage = (setter: (v: string | null) => void, ref: React.RefObject<HTMLInputElement | null>) =>
        (e: React.MouseEvent) => {
            e.stopPropagation();
            setter(null);
            if (ref.current) ref.current.value = "";
        };

    // Build the Seedream prompt from the ad copy — no Grok involvement here.
    // Build the prompt for Nano Banana Pro — bypassing Llama entirely 
    const generateSingleImage = async (persona: Persona, productDesc: string, productImg: string | null, competitorImg: string | null) => {
        let blendInstruction = '';
        if (competitorImg && productImg) {
            if (adherence === 'High') {
                blendInstruction = 'Blend the two reference images: strictly follow the exact layout, composition, and visual style of the first image when placing the product from the second image.';
            } else if (adherence === 'Medium') {
                blendInstruction = 'Blend the two reference images: use the first image as a loose stylistic reference, but feel free to adapt the layout creatively to better feature the product from the second image.';
            } else {
                blendInstruction = 'Create an entirely new and highly creative advertisement featuring the product from the second image. Only take very loose thematic inspiration from the first image; completely rethink the layout.';
            }
        }

        const adPrompt = [
            'Create a professional static advertisement.',
            blendInstruction,
            `Product description: "${productDesc}".`,
            `Target audience: ${persona.archetype}. Pain: "${persona.pain}". Angle: "${persona.angle}". Emotion: "${persona.emotion}".`,
            `Analyze the product and persona. Write short, punchy ad copy tailored exactly to their core pain and emotion.`,
            `Render that ad copy prominently and legibly onto the ad design.`,
            'Ensure perfect spelling, sharp typography, and photorealistic 2K rendering.',
        ].filter(Boolean).join(' ');

        const res = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                prompt: adPrompt,
                image: productImg,
                competitorImage: competitorImg,
                aspect_ratio: aspectRatio,
            }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Replicate generation failed");

        if (Array.isArray(data.output) && data.output.length > 0) {
            const url = typeof data.output[0] === 'string' ? data.output[0] : data.output[0]?.url;
            if (url) return url as string;
        }
        if (typeof data.output === 'string' && data.output.startsWith('http')) return data.output;
        throw new Error("Unexpected output format from Replicate");
    };

    const runCampaign = async () => {
        if (!competitorImage && !productImage) {
            setError("Please upload at least one image in Product Input.");
            return;
        }
        if (selectedPersonas.size === 0) {
            setError("Please select at least one persona in Campaign Brief.");
            return;
        }

        const productDescription = typeof window !== 'undefined' ? localStorage.getItem('brand_kit_prompt') || '' : '';
        const selectedPersonaObjects = personas.filter(p => selectedPersonas.has(p.archetype));

        setError(null);

        // Initialize new cards in pending state
        const initialCards: CampaignCard[] = selectedPersonaObjects.map((p) => ({
            persona: p.archetype,
            adCopy: "AI generating copy natively...",
            imageUrl: null,
            status: 'pending' as const,
        }));

        // Prepend new cards to the existing list so they appear at the top
        setCampaignCards(prev => [...initialCards, ...prev]);
        setGenStep('generating');

        // ── Step 1: Generate images one by one directly using Nano Banana ──────
        for (let i = 0; i < selectedPersonaObjects.length; i++) {
            const p = selectedPersonaObjects[i];
            setStepMessage(`Generating image ${i + 1} of ${selectedPersonaObjects.length} — ${p.archetype}...`);

            setCampaignCards(prev => prev.map((card, idx) =>
                idx === i ? { ...card, status: 'generating' } : card
            ));

            try {
                const imageUrl = await generateSingleImage(p, productDescription, productImage, competitorImage);
                setCampaignCards(prev => prev.map((card, idx) =>
                    idx === i ? { ...card, imageUrl, status: 'done' } : card
                ));
            } catch (err: any) {
                setCampaignCards(prev => prev.map((card, idx) =>
                    idx === i ? { ...card, status: 'error', errorMsg: err.message } : card
                ));
            }
        }

        setGenStep('done');
        setStepMessage('');
    };

    const toggleFavorite = (index: number) => {
        setCampaignCards(prev => prev.map((card, idx) =>
            idx === index ? { ...card, isFavorite: !card.isFavorite } : card
        ));
    };

    const downloadImage = async (url: string, filename: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (e) {
            console.error("Download failed", e);
        }
    };

    const downloadAll = () => {
        campaignCards.filter(c => c.imageUrl && c.status === 'done').forEach((c, i) => {
            if (c.imageUrl) downloadImage(c.imageUrl, `ad-${c.persona.toLowerCase().replace(/\s+/g, '-')}-${i}.jpg`);
        });
    };

    const downloadFavorites = () => {
        campaignCards.filter(c => c.imageUrl && c.status === 'done' && c.isFavorite).forEach((c, i) => {
            if (c.imageUrl) downloadImage(c.imageUrl, `ad-fav-${c.persona.toLowerCase().replace(/\s+/g, '-')}-${i}.jpg`);
        });
    };

    const toggleSection = (s: string) => setExpandedSection(expandedSection === s ? null : s);
    const isRunning = genStep !== 'idle' && genStep !== 'done';

    const stepLabels: Record<GenStep, string> = {
        idle: '',
        generating: '1 of 1 — Generating images',
        done: 'Complete',
    };

    return (
        <main>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ textAlign: 'left' }}>
                    <span className="badge">Nano Banana Pro (Omni)</span>
                    <h1>Campaign Builder</h1>
                    <p className="subtitle">AI-powered ad generation, persona by persona</p>
                </div>
                <div className="download-group">
                    {campaignCards.length > 0 && (
                        <>
                            <button className="btn-action" onClick={downloadAll}>
                                <Download size={16} />
                                Download All
                            </button>
                            <button
                                className="btn-action"
                                onClick={downloadFavorites}
                                disabled={!campaignCards.some(c => c.isFavorite)}
                            >
                                <Heart size={16} fill={campaignCards.some(c => c.isFavorite) ? "#ff2d55" : "none"} color={campaignCards.some(c => c.isFavorite) ? "#ff2d55" : "currentColor"} />
                                Download Favourites
                            </button>
                        </>
                    )}
                    <Link href="/brand-kit" className="nav-button">
                        <LayoutTemplate size={18} />
                        Brand Kit
                    </Link>
                </div>
            </header>

            <div className="campaign-layout">
                {/* ── Left: Controls ── */}
                <div className="controls-column">

                    {/* 1. Product Input */}
                    <div className={`accordion-item ${expandedSection === 'product' ? 'active' : ''}`}>
                        <div className="accordion-header" onClick={() => toggleSection('product')}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <ImageIcon size={20} />
                                <span>Product Input</span>
                            </div>
                            {expandedSection === 'product' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                        {expandedSection === 'product' && (
                            <div className="accordion-content">
                                <div className="form-group">
                                    <label>Competitor's Ad</label>
                                    <div className="upload-area" onClick={() => !isRunning && competitorInputRef.current?.click()} style={{ aspectRatio: '16/9', minHeight: '140px' }}>
                                        {competitorImage ? (
                                            <>
                                                <img src={competitorImage} alt="Competitor Ad" style={{ objectFit: 'contain' }} />
                                                <button className="remove-btn" onClick={removeImage(setCompetitorImage, competitorInputRef)}><X size={16} /></button>
                                            </>
                                        ) : (
                                            <div className="upload-placeholder">
                                                <Upload size={22} style={{ marginBottom: '8px' }} />
                                                <p style={{ fontSize: '0.8rem' }}>Upload competitor's ad</p>
                                            </div>
                                        )}
                                        <input type="file" ref={competitorInputRef} onChange={handleFileChange(setCompetitorImage)} accept="image/*" hidden />
                                    </div>
                                </div>
                                <div className="form-group" style={{ marginTop: '14px' }}>
                                    <label>My Product</label>
                                    <div className="upload-area" onClick={() => !isRunning && productInputRef.current?.click()} style={{ aspectRatio: '16/9', minHeight: '140px' }}>
                                        {productImage ? (
                                            <>
                                                <img src={productImage} alt="My Product" style={{ objectFit: 'contain' }} />
                                                <button className="remove-btn" onClick={removeImage(setProductImage, productInputRef)}><X size={16} /></button>
                                            </>
                                        ) : (
                                            <div className="upload-placeholder">
                                                <Upload size={22} style={{ marginBottom: '8px' }} />
                                                <p style={{ fontSize: '0.8rem' }}>Upload your product photo</p>
                                            </div>
                                        )}
                                        <input type="file" ref={productInputRef} onChange={handleFileChange(setProductImage)} accept="image/*" hidden />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 2. Campaign Brief */}
                    <div className={`accordion-item ${expandedSection === 'campaign' ? 'active' : ''}`}>
                        <div className="accordion-header" onClick={() => toggleSection('campaign')}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Target size={20} />
                                <span>Campaign Brief</span>
                                {selectedPersonas.size > 0 && (
                                    <span className="badge" style={{ background: '#000', color: '#fff' }}>{selectedPersonas.size}</span>
                                )}
                            </div>
                            {expandedSection === 'campaign' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                        {expandedSection === 'campaign' && (
                            <div className="accordion-content">
                                <div className="form-group">
                                    <label>Target Personas</label>
                                    {personas.length === 0 ? (
                                        <p style={{ fontSize: '0.8rem', color: '#ff9500', marginTop: '8px' }}>
                                            No personas found. Generate them in Brand Kit first.
                                        </p>
                                    ) : (
                                        <div className="persona-checklist">
                                            <label className="persona-check-row select-all-row">
                                                <input type="checkbox" checked={selectedPersonas.size === personas.length} onChange={toggleAllPersonas} />
                                                <span>All Personas ({personas.length})</span>
                                            </label>
                                            {personas.map((p, i) => (
                                                <label key={i} className="persona-check-row">
                                                    <input type="checkbox" checked={selectedPersonas.has(p.archetype)} onChange={() => togglePersona(p.archetype)} />
                                                    <span>{p.archetype}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 3. Output & Volume */}
                    <div className={`accordion-item ${expandedSection === 'output' ? 'active' : ''}`}>
                        <div className="accordion-header" onClick={() => toggleSection('output')}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Layers size={20} />
                                <span>Output & Volume</span>
                            </div>
                            {expandedSection === 'output' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                        {expandedSection === 'output' && (
                            <div className="accordion-content">
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                    <div className="form-group">
                                        <label>Volume</label>
                                        <input
                                            type="number"
                                            className="select-input"
                                            min="1"
                                            max="10"
                                            value={volume}
                                            onChange={(e) => setVolume(Number(e.target.value))}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Aspect Ratio</label>
                                        <select className="select-input" value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}>
                                            <option value="1:1">1:1 (Square)</option>
                                            <option value="4:5">4:5 (Portrait)</option>
                                            <option value="9:16">9:16 (Story)</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group" style={{ marginTop: '14px' }}>
                                    <label>Adherence to Competitor Ad</label>
                                    <div className="segmented-control">
                                        {['High', 'Medium', 'Low'].map((level) => (
                                            <button
                                                key={level}
                                                className={`segment ${adherence === level ? 'active' : ''}`}
                                                onClick={() => setAdherence(level as any)}
                                            >
                                                {level}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <p style={{ fontSize: '0.75rem', color: '#aaa', marginTop: '14px' }}>
                                    One image is generated per selected persona.
                                    {selectedPersonas.size > 0 && ` ${selectedPersonas.size} image${selectedPersonas.size > 1 ? 's' : ''} will be generated.`}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Generate button */}
                    <button
                        className="primary"
                        onClick={runCampaign}
                        disabled={isRunning}
                        style={{ marginTop: '12px', padding: '20px', fontSize: '1.05rem' }}
                    >
                        {isRunning ? (
                            <><Loader2 className="loader" size={22} style={{ marginRight: '10px', display: 'inline' }} /> {stepMessage || 'Running…'}</>
                        ) : (
                            <><Sparkles size={22} style={{ marginRight: '10px', display: 'inline' }} /> Generate Campaign</>
                        )}
                    </button>

                    {/* Step progress indicator */}
                    {(isRunning || genStep === 'done') && (
                        <div className="step-progress">
                            {(['generating', 'done'] as GenStep[]).map((s, i) => {
                                const stepOrder = ['generating', 'done'];
                                const currentIdx = stepOrder.indexOf(genStep);
                                const thisIdx = stepOrder.indexOf(s);
                                const isDone = currentIdx > thisIdx || genStep === 'done';
                                const isActive = genStep === s;
                                return (
                                    <div key={s} className={`step-item ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}>
                                        {isDone ? <CheckCircle2 size={16} /> : isActive ? <Loader2 size={16} className="loader" /> : <Circle size={16} />}
                                        <span>{s === 'generating' ? 'Generate images' : 'Done'}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {error && <div className="error-message">{error}</div>}
                </div>

                {/* ── Right: Results Grid ── */}
                <div className="results-column">
                    {campaignCards.length === 0 && genStep === 'idle' && (
                        <div className="results-empty">
                            <ImageIcon size={64} style={{ marginBottom: '20px', color: '#e0e0e0' }} />
                            <p style={{ color: '#bbb', fontSize: '1rem' }}>Your campaign ads will appear here</p>
                            <p style={{ color: '#ddd', fontSize: '0.85rem', marginTop: '8px' }}>
                                Configure inputs and click Generate Campaign
                            </p>
                        </div>
                    )}

                    {campaignCards.length > 0 && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                                <button
                                    className="btn-action"
                                    style={{ color: '#ff3b30', borderColor: '#ffd6d6', background: '#fff9f9' }}
                                    onClick={() => { setCampaignCards([]); setGenStep('idle'); setStepMessage(''); }}
                                >
                                    <Trash2 size={16} />
                                    Clear All
                                </button>
                            </div>
                            <div className="ad-grid">
                                {campaignCards.map((card, i) => (
                                    <div key={i} className={`ad-card ${card.status}`}>
                                        {/* Image area */}
                                        <div className="ad-image-area">
                                            {card.status === 'generating' && (
                                                <div className="ad-generating">
                                                    <Loader2 size={32} className="loader" style={{ color: '#ccc' }} />
                                                    <p style={{ marginTop: '12px', color: '#aaa', fontSize: '0.8rem' }}>Generating…</p>
                                                </div>
                                            )}
                                            {card.status === 'pending' && (
                                                <div className="ad-generating">
                                                    <Circle size={28} style={{ color: '#ddd' }} />
                                                    <p style={{ marginTop: '12px', color: '#ccc', fontSize: '0.8rem' }}>Queued</p>
                                                </div>
                                            )}
                                            {card.status === 'error' && (
                                                <div className="ad-generating">
                                                    <AlertCircle size={28} style={{ color: '#ff3b30' }} />
                                                    <p style={{ marginTop: '12px', color: '#ff3b30', fontSize: '0.8rem' }}>{card.errorMsg}</p>
                                                </div>
                                            )}
                                            {card.status === 'done' && card.imageUrl && (
                                                <img src={card.imageUrl} alt={card.persona} />
                                            )}
                                        </div>

                                        {/* Card metadata */}
                                        <div className="ad-meta">
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                <span className="ad-persona-badge">{card.persona}</span>
                                                {card.status === 'done' && (
                                                    <button
                                                        onClick={() => toggleFavorite(i)}
                                                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                    >
                                                        <Heart
                                                            size={20}
                                                            fill={card.isFavorite ? "#ff2d55" : "none"}
                                                            color={card.isFavorite ? "#ff2d55" : "#ccc"}
                                                            style={{ transition: 'all 0.2s ease' }}
                                                        />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style jsx>{`
        .campaign-layout {
          display: grid;
          grid-template-columns: 360px 1fr;
          gap: 32px;
          align-items: start;
        }
        @media (max-width: 900px) {
          .campaign-layout { grid-template-columns: 1fr; }
        }
        .controls-column {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .results-column {
          min-height: 500px;
        }
        .results-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 500px;
          border: 2px dashed #eee;
          border-radius: 16px;
          background: #fafafa;
        }
        .ad-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }
        .ad-card {
          background: #fff;
          border: 1px solid #eee;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 2px 12px rgba(0,0,0,0.04);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .ad-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.09);
        }
        .ad-card.done { border-color: #e8f5e9; }
        .ad-card.error { border-color: #ffe5e5; }
        .ad-image-area {
          width: 100%;
          aspect-ratio: 1/1;
          background: #f7f7f8;
          overflow: hidden;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .ad-image-area img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .ad-generating {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .ad-meta {
          padding: 16px;
        }
        .ad-persona-badge {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          background: #f1f1f1;
          color: #555;
          padding: 3px 10px;
          border-radius: 20px;
        }
        .ad-copy-text {
          font-size: 0.95rem;
          line-height: 1.5;
          color: #222;
          font-style: italic;
          margin-top: 6px;
        }
        .step-progress {
          background: #fafafa;
          border: 1px solid #eee;
          border-radius: 10px;
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 4px;
        }
        .step-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8rem;
          color: #bbb;
        }
        .step-item.active { color: #000; font-weight: 600; }
        .step-item.done { color: #30d158; }
        .accordion-item {
          background: #fff;
          border: 1px solid #eee;
          border-radius: 12px;
          overflow: hidden;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-shadow: 0 2px 8px rgba(0,0,0,0.02);
        }
        .accordion-item.active {
          border-color: #000;
          box-shadow: 0 4px 20px rgba(0,0,0,0.06);
        }
        .accordion-header {
          padding: 18px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          font-weight: 600;
          user-select: none;
        }
        .accordion-header:hover { background: #fafafa; }
        .accordion-content {
          padding: 0 20px 20px;
          border-top: 1px solid #f5f5f5;
          animation: slideDown 0.25s ease-out;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .select-input {
          width: 100%;
          padding: 11px 12px;
          border-radius: 8px;
          border: 1px solid #eee;
          background: #fcfcfd;
          font-size: 0.9rem;
          margin-top: 8px;
          outline: none;
        }
        .select-input:focus { border-color: #000; }
        .persona-checklist {
          margin-top: 8px;
          border: 1px solid #eee;
          border-radius: 8px;
          overflow: hidden;
          max-height: 280px;
          overflow-y: auto;
        }
        .persona-check-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 14px;
          border-bottom: 1px solid #f5f5f5;
          cursor: pointer;
          font-size: 0.875rem;
          transition: background 0.12s;
        }
        .persona-check-row:last-child { border-bottom: none; }
        .persona-check-row:hover { background: #fafafa; }
        .persona-check-row input[type="checkbox"] {
          width: 15px;
          height: 15px;
          cursor: pointer;
          accent-color: #000;
          flex-shrink: 0;
        }
        .select-all-row {
          background: #f9f9f9;
          font-weight: 600;
          border-bottom: 1px solid #eee !important;
          position: sticky;
          top: 0;
        }
        .remove-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          background: rgba(255,255,255,0.92);
          border: none;
          padding: 5px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(0,0,0,0.12);
          z-index: 10;
        }
        .segmented-control {
          display: flex;
          background: #f1f1f1;
          border-radius: 80px;
          padding: 4px;
          margin-top: 8px;
        }
        .segment {
          flex: 1;
          background: transparent;
          border: none;
          padding: 8px 12px;
          font-size: 0.85rem;
          font-weight: 600;
          color: #777;
          border-radius: 80px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .segment.active {
          background: #fff;
          color: #000;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .download-group {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .btn-action {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #fff;
          border: 1px solid #e5e5e5;
          padding: 8px 16px;
          border-radius: 100px;
          font-size: 0.85rem;
          font-weight: 500;
          color: #333;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .btn-action:hover:not(:disabled) {
          background: #fdfdfd;
          border-color: #d1d1d1;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }
        .btn-action:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .btn-action:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background: #fafafa;
        }
      `}</style>
        </main>
    );
}
