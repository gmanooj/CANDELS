
import React, { useState, useEffect } from 'react';
import './Implementations.css';

export default function Implementations({ teamCode, userRole }) {
    const [implementations, setImplementations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploadTitle, setUploadTitle] = useState("");
    const [uploadCategory, setUploadCategory] = useState("Frontend UI");
    const [selectedFile, setSelectedFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [activeCategoryFilter, setActiveCategoryFilter] = useState("All");
    const [lightboxImage, setLightboxImage] = useState(null);

    // Dynamic Grading States for Faculty Guide Inputs
    const [tempScores, setTempScores] = useState({});
    const [tempFeedback, setTempFeedback] = useState({});

    const handleTempScoreChange = (id, val) => {
        setTempScores(prev => ({ ...prev, [id]: parseInt(val) }));
    };

    const handleTempFeedbackChange = (id, val) => {
        setTempFeedback(prev => ({ ...prev, [id]: val }));
    };

    // Dynamic checklist for implementation tracking
    const [checklist, setChecklist] = useState([
        { id: 1, label: "Database schema configured & tables generated", checked: true },
        { id: 2, label: "Backend API endpoints linked & authenticated", checked: false },
        { id: 3, label: "Frontend modules connected to active gateway", checked: false },
        { id: 4, label: "Local version synced and pushed to repository", checked: false }
    ]);

    const session = JSON.parse(sessionStorage.getItem("user_session") || "{}");
    const email = session.email || "student@teambridge.edu";

    const fetchImplementations = () => {
        setLoading(true);
        fetch(`${__BACKEND_URL__}/api/workspace/implementation?team_code=${teamCode}`)
            .then(res => res.json())
            .then(data => {
                if (data.implementations) {
                    setImplementations(data.implementations);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch implementations:", err);
                setLoading(false);
            });
    };

    const submitGrade = (implId) => {
        const score = tempScores[implId] !== undefined ? tempScores[implId] : 90;
        const feedback = tempFeedback[implId] || "";
        
        fetch(`${__BACKEND_URL__}/api/workspace/implementation/grade`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                implementation_id: implId,
                grade_score: score,
                grading_feedback: feedback,
                email: email
            })
        })
        .then(res => {
            if (!res.ok) {
                return res.json().then(errData => {
                    throw new Error(errData.error || "Grading failed");
                });
            }
            return res.json();
        })
        .then(() => {
            alert("Milestone graded successfully!");
            fetchImplementations();
        })
        .catch(err => alert(err.message));
    };

    useEffect(() => {
        fetchImplementations();
    }, [teamCode]);

    const handleUploadSubmit = (e) => {
        e.preventDefault();
        if (!selectedFile || !uploadTitle.trim()) {
            alert("Please provide both a title and an image screenshot.");
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('team_code', teamCode);
        formData.append('title', uploadTitle);
        formData.append('category', uploadCategory);
        formData.append('email', email);

        fetch(__BACKEND_URL__ + "/api/workspace/implementation/upload", {
            method: 'POST',
            body: formData
        })
        .then(res => {
            if (!res.ok) {
                return res.json().then(errData => {
                    throw new Error(errData.error || "Upload failed");
                });
            }
            return res.json();
        })
        .then(() => {
            alert("Implementation showcase uploaded successfully!");
            setUploadTitle("");
            setSelectedFile(null);
            setIsUploading(false);
            fetchImplementations();
        })
        .catch(err => {
            alert(err.message);
            setIsUploading(false);
        });
    };

    const toggleChecklistItem = (id) => {
        setChecklist(checklist.map(item => 
            item.id === id ? { ...item, checked: !item.checked } : item
        ));
    };

    const categories = ["All", "Frontend UI", "Backend API", "Database Layout", "Cloud & DevOps"];

    const filteredImplementations = activeCategoryFilter === "All"
        ? implementations
        : implementations.filter(impl => impl.category === activeCategoryFilter);

    return (
        <div className="workspace-implementations-container">
            {/* Header */}
            <div className="impl-header">
                <div>
                    <h1>Project Implementations</h1>
                    <p>Upload and showcase screenshot milestones of your active implementation steps.</p>
                </div>
            </div>

            <div className="impl-panels-row implementations-grid-responsive">
                
                {/* Left Panel: Upload Form & Verification Checklist */}
                <div className="left-col-wrapper">
                    
                    {/* Upload Uploader Card */}
                    <div className="apple-card-modern uploader-card">
                        <h3>📤 Upload Screenshot</h3>
                        <form onSubmit={handleUploadSubmit} className="uploader-form">
                            <div className="form-col">
                                <label>Screenshot Title</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g., Auth API Response / DB Table Layout..." 
                                    value={uploadTitle}
                                    onChange={(e) => setUploadTitle(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-col">
                                <label>Category</label>
                                <select 
                                    value={uploadCategory} 
                                    onChange={(e) => setUploadCategory(e.target.value)}
                                >
                                    <option value="Frontend UI">Frontend UI</option>
                                    <option value="Backend API">Backend API</option>
                                    <option value="Database Layout">Database Layout</option>
                                    <option value="Cloud & DevOps">Cloud & DevOps</option>
                                </select>
                            </div>

                            <div className="form-col">
                                <label>Image Screenshot File</label>
                                <div className="impl-image-dropzone">
                                    <input 
                                        type="file" 
                                        accept="image/*"
                                        id="impl-image-input"
                                        onChange={(e) => setSelectedFile(e.target.files[0])}
                                        style={{ display: 'none' }}
                                        required
                                    />
                                    <label htmlFor="impl-image-input">
                                        <div className="drop-icon">🖼️</div>
                                        {selectedFile ? (
                                            <span className="chosen-name">{selectedFile.name}</span>
                                        ) : (
                                            <span className="empty-text">Choose visual snapshot file</span>
                                        )}
                                    </label>
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                className="apple-btn-primary publish-btn" 
                                disabled={isUploading}
                            >
                                {isUploading ? "Uploading Showcase..." : "Publish Milestone Screenshot"}
                            </button>
                        </form>
                    </div>

                    {/* Progress Verification Checklist */}
                    <div className="apple-card-modern milestones-card">
                        <h3>✅ Active Sprint Milestones</h3>
                        <p className="milestones-description">Tick off components as your team progresses to make implementation status clear.</p>
                        <div className="milestones-list">
                            {checklist.map((item) => (
                                <label key={item.id} className="milestone-item-label">
                                    <input 
                                        type="checkbox" 
                                        checked={item.checked} 
                                        onChange={() => toggleChecklistItem(item.id)}
                                        className="milestone-checkbox"
                                    />
                                    <span className={`milestone-text ${item.checked ? 'is-checked' : ''}`}>
                                        {item.label}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                </div>

                {/* Right Panel: Milestones Showcase Gallery */}
                <div className="right-col-wrapper">
                    
                    {/* Category Filter Tabs */}
                    <div className="tabs-row">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategoryFilter(cat)}
                                className={`tab-btn ${activeCategoryFilter === cat ? 'is-active' : ''}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    {/* Screenshot Gallery Grid */}
                    <div className="apple-card-modern gallery-feed-card">
                        <span className="gallery-header-text">
                            Milestone Screenshot Gallery
                        </span>

                        {loading ? (
                            <div className="gallery-loading">
                                Loading gallery screenshots...
                            </div>
                        ) : filteredImplementations.length === 0 ? (
                            <div className="gallery-empty">
                                <div className="empty-icon">🖼️</div>
                                <div className="empty-text">No screenshot milestones published for "{activeCategoryFilter}" yet.</div>
                            </div>
                        ) : (
                            <div className="gallery-layout-grid">
                                {filteredImplementations.map((impl) => (
                                    <div 
                                        key={impl.id}
                                        onClick={() => setLightboxImage(impl.url)}
                                        className="gallery-card-item"
                                    >
                                        <div className="card-image-box">
                                            <img 
                                                src={impl.url} 
                                                alt={impl.title} 
                                            />
                                            <span className="card-tag">
                                                {impl.category}
                                            </span>
                                        </div>
                                        <div className="card-body">
                                            <h4>{impl.title}</h4>
                                            <div className="card-meta">
                                                <span>By: {impl.uploaded_by_name}</span>
                                                <span>{impl.created_at.split(' ')[0]}</span>
                                            </div>

                                            {/* Grade / Grading feedback display badges */}
                                            {impl.grade_score !== null ? (
                                                <div className="grade-badge-box">
                                                    <strong>Score: {impl.grade_score}/100</strong>
                                                    {impl.grading_feedback && (
                                                        <div className="feedback-notes">
                                                            Feedback: "{impl.grading_feedback}"
                                                        </div>
                                                    )}
                                                    <div className="grade-meta">
                                                        By {impl.graded_by_name} on {impl.graded_at.split(' ')[0]}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="pending-grade-box">
                                                    Pending grading evaluation
                                                </div>
                                            )}

                                            {/* Faculty Grading panel section */}
                                            {userRole === 'Faculty' && (
                                                <div 
                                                    onClick={(ev) => ev.stopPropagation()}
                                                    className="grading-panel"
                                                >
                                                    <div className="grading-row">
                                                        <label>Grade: {tempScores[impl.id] !== undefined ? tempScores[impl.id] : 90}%</label>
                                                        <input 
                                                            type="range" 
                                                            min="0" 
                                                            max="100" 
                                                            value={tempScores[impl.id] !== undefined ? tempScores[impl.id] : 90}
                                                            onChange={(ev) => handleTempScoreChange(impl.id, ev.target.value)}
                                                            className="grading-slider"
                                                        />
                                                    </div>
                                                    <input 
                                                        type="text" 
                                                        placeholder="Notes/Feedback..." 
                                                        value={tempFeedback[impl.id] || ""}
                                                        onChange={(ev) => handleTempFeedbackChange(impl.id, ev.target.value)}
                                                        className="grading-input-notes"
                                                    />
                                                    <button 
                                                        onClick={() => submitGrade(impl.id)}
                                                        className="apple-btn-primary grade-submit-btn"
                                                    >
                                                        Submit Grade
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* Premium Lightbox Overlay */}
            {lightboxImage && (
                <div 
                    onClick={() => setLightboxImage(null)}
                    className="lightbox-overlay"
                >
                    <button 
                        onClick={() => setLightboxImage(null)}
                        className="lightbox-close-btn"
                    >
                        ✕
                    </button>
                    <img 
                        src={lightboxImage} 
                        alt="Zoomed Milestone Screenshot" 
                    />
                </div>
            )}
        </div>
    );
}
