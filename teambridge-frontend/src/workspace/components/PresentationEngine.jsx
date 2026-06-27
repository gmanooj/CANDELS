import React, { useState, useEffect, useRef } from 'react';
import './PresentationEngine.css';

// Pure JS Markdown to styled HTML formatter
const renderMarkdownToHTML = (text) => {
    if (!text) return { __html: "" };
    let html = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    
    // Headers
    html = html.replace(/^# (.*)$/gm, '<h1>$1</h1>');
    html = html.replace(/^## (.*)$/gm, '<h2>$1</h2>');
    html = html.replace(/^### (.*)$/gm, '<h3>$1</h3>');
    
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Lists (nested conversion)
    html = html.replace(/^[ \t]*-[ \t]+(.*)$/gm, '<li>$1</li>');
    
    // Blockquotes
    html = html.replace(/^&gt;[ \t]+(.*)$/gm, '<blockquote>$1</blockquote>');
    
    // Paragraph paragraphs
    html = html.split('\n').map(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('<h') || trimmed.startsWith('<li') || trimmed.startsWith('<blockquote') || trimmed === '') {
            return line;
        }
        return `<p>${line}</p>`;
    }).join('\n');
    
    return { __html: html };
};

export default function PresentationEngine({
    teamCode,
    permissions = {},
    isCompact = false
}) {
    const [presentations, setPresentations] = useState([]);
    const [selectedPresName, setSelectedPresName] = useState("");
    const [markdownContent, setMarkdownContent] = useState("# Welcome to Candles Slides\n---\n## Slides-as-Code\n- Write markdown text on the left panel\n- See interactive previews render on the right panel\n---\n## Features\n- Use `---` on a new line to separate slides\n- Zero third-party dependencies\n- Full database sync support");
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [newPresName, setNewPresName] = useState("");
    const [saveStatus, setSaveStatus] = useState("");

    const session = JSON.parse(sessionStorage.getItem("user_session") || "{}");
    const email = session.email || "student@teambridge.edu";

    // Split markdown into individual slides
    const slides = markdownContent
        .split(/^[ \t]*---[ \t]*$/m)
        .map(s => s.trim())
        .filter(s => s.length > 0);

    // Ensure slide index stays in bounds
    useEffect(() => {
        if (currentSlideIndex >= slides.length) {
            setCurrentSlideIndex(Math.max(0, slides.length - 1));
        }
    }, [slides.length, currentSlideIndex]);

    // Fetch saved presentations
    const fetchPresentations = async () => {
        try {
            const res = await fetch(`${__BACKEND_URL__}/api/workspace/presentations?team_code=${teamCode}`);
            if (res.ok) {
                const data = await res.json();
                if (data.presentations) {
                    setPresentations(data.presentations);
                    if (data.presentations.length > 0 && !selectedPresName) {
                        setSelectedPresName(data.presentations[0].presentation_name);
                        setMarkdownContent(data.presentations[0].markdown_content);
                    }
                }
            }
        } catch (err) {
            console.error("Failed to load presentations:", err);
        }
    };

    useEffect(() => {
        fetchPresentations();
    }, [teamCode]);

    // Save current presentation
    const handleSave = async () => {
        const nameToSave = selectedPresName || "Default Deck";
        setSaveStatus("Saving...");
        try {
            const res = await fetch(`${__BACKEND_URL__}/api/workspace/presentations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    team_code: teamCode,
                    presentation_name: nameToSave,
                    markdown_content: markdownContent,
                    email: email
                })
            });
            if (res.ok) {
                setSaveStatus("Saved successfully!");
                fetchPresentations();
                setTimeout(() => setSaveStatus(""), 2500);
            } else {
                setSaveStatus("Failed to save.");
            }
        } catch (err) {
            setSaveStatus("Error saving.");
            console.error(err);
        }
    };

    // Create a new presentation
    const handleCreateNew = async (e) => {
        e.preventDefault();
        const cleanName = newPresName.trim();
        if (!cleanName) return;

        try {
            const res = await fetch(`${__BACKEND_URL__}/api/workspace/presentations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    team_code: teamCode,
                    presentation_name: cleanName,
                    markdown_content: `# ${cleanName}\n---\n## Slide 2\n- Add content here`,
                    email: email
                })
            });
            if (res.ok) {
                setNewPresName("");
                setSelectedPresName(cleanName);
                setMarkdownContent(`# ${cleanName}\n---\n## Slide 2\n- Add content here`);
                fetchPresentations();
            }
        } catch (err) {
            console.error("Failed to create presentation:", err);
        }
    };

    // Handle switching selected presentation
    const handleSelectChange = (e) => {
        const val = e.target.value;
        setSelectedPresName(val);
        const selected = presentations.find(p => p.presentation_name === val);
        if (selected) {
            setMarkdownContent(selected.markdown_content);
            setCurrentSlideIndex(0);
        }
    };

    // Keyboard arrow controls for slide player
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Bypass arrow keys navigation if typing inside the editor/inputs
            if (document.activeElement.tagName === 'TEXTAREA' || document.activeElement.tagName === 'INPUT') {
                return;
            }
            if (e.key === 'ArrowRight' || e.key === ' ') {
                e.preventDefault();
                setCurrentSlideIndex(prev => Math.min(slides.length - 1, prev + 1));
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                setCurrentSlideIndex(prev => Math.max(0, prev - 1));
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [slides.length]);

    // Slide Controls Row
    const renderControls = () => (
        <div className="player-controls">
            <button 
                onClick={() => setCurrentSlideIndex(prev => Math.max(0, prev - 1))}
                disabled={currentSlideIndex === 0}
                className="control-btn"
            >
                ← Prev
            </button>
            <span className="status-text">
                Slide {currentSlideIndex + 1} of {slides.length || 1}
            </span>
            <button 
                onClick={() => setCurrentSlideIndex(prev => Math.min(slides.length - 1, prev + 1))}
                disabled={currentSlideIndex === slides.length - 1 || slides.length === 0}
                className="control-btn"
            >
                Next →
            </button>
        </div>
    );

    // COMPACT RENDERING (Sidebar panel nested in Code Workspace)
    if (isCompact) {
        return (
            <div className="workspace-presentation-container is-compact">
                <div className="compact-header">
                    <span className="header-title">Slide Preview</span>
                    <select 
                        value={selectedPresName}
                        onChange={handleSelectChange}
                        className="deck-switcher"
                    >
                        {presentations.map(p => (
                            <option key={p.id} value={p.presentation_name}>{p.presentation_name}</option>
                        ))}
                    </select>
                </div>

                {/* Slides Display Box */}
                <div className="compact-preview-card">
                    <div 
                        dangerouslySetInnerHTML={renderMarkdownToHTML(slides[currentSlideIndex])} 
                        className="preview-canvas-content"
                    />
                </div>

                {renderControls()}

                {/* Quick Slide Jump Dropdown */}
                <div className="jump-row">
                    <span className="jump-label">JUMP:</span>
                    <select
                        value={currentSlideIndex}
                        onChange={(e) => setCurrentSlideIndex(parseInt(e.target.value))}
                        className="jump-select"
                    >
                        {slides.map((_, idx) => (
                            <option key={idx} value={idx}>Slide {idx + 1}: {(slides[idx].split('\n')[0] || "").replace(/^#+\s*/, "").slice(0, 20)}...</option>
                        ))}
                    </select>
                </div>
            </div>
        );
    }

    // REGULAR EXPANDED VIEW
    return (
        <div className="workspace-presentation-container">
            
            {/* Top Toolbar Navigation Dashboard */}
            <div className="top-toolbar">
                <div>
                    <h1>Slides-as-Code</h1>
                    <p>Build elegant project presentations using raw Markdown scripts. Zero dependency rendering.</p>
                </div>
                
                {/* Save & Switch Presentation controls */}
                <div className="deck-actions">
                    {presentations.length > 0 && (
                        <select 
                            value={selectedPresName}
                            onChange={handleSelectChange}
                        >
                            {presentations.map(p => (
                                <option key={p.id} value={p.presentation_name}>{p.presentation_name}</option>
                            ))}
                        </select>
                    )}
                    <button 
                        onClick={handleSave}
                        className="apple-btn-primary save-btn"
                    >
                        Save Deck
                    </button>
                    {saveStatus && <span className="save-status">{saveStatus}</span>}
                </div>
            </div>

            {/* Create New Deck form inline */}
            <div className="new-deck-row">
                <span className="row-label">➕ Create Presentation:</span>
                <form onSubmit={handleCreateNew}>
                    <input 
                        type="text" 
                        placeholder="Presentation Name (e.g. Sprint Review)"
                        value={newPresName}
                        onChange={(e) => setNewPresName(e.target.value)}
                    />
                    <button 
                        type="submit"
                        className="apple-btn-primary"
                    >
                        + Create
                    </button>
                </form>
            </div>

            {/* Split view workspace layout */}
            <div className="workspace-split-row implementations-grid-responsive">
                
                {/* Left Side: Markdown Text Area Code Editor */}
                <div className="editor-col">
                    <label className="col-title-label">Raw Slide Markdown Script</label>
                    <textarea 
                        value={markdownContent}
                        onChange={(e) => setMarkdownContent(e.target.value)}
                        placeholder="Write markdown here..."
                    />
                </div>

                {/* Right Side: Live Slide Preview Render Canvas */}
                <div className="preview-col">
                    <label className="col-title-label">Live Responsive Preview</label>
                    <div className="preview-canvas">
                        <div 
                            dangerouslySetInnerHTML={renderMarkdownToHTML(slides[currentSlideIndex])} 
                            className="preview-canvas-content"
                        />
                    </div>
                    {renderControls()}
                </div>

            </div>

        </div>
    );
}
