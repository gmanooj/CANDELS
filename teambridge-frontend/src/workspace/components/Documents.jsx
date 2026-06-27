import React, { useState, useEffect } from 'react';
import './Documents.css';

// Word-style Markdown/Text formatter
const renderWordContentToHTML = (text) => {
    if (!text) return { __html: "" };
    
    // Check if the content is just a local placeholder string
    if (text.startsWith("[Local Document File:")) {
        return null;
    }

    let html = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    
    // Word Style Headers
    html = html.replace(/^# (.*)$/gm, '<h1 style="font-family: \'SF Pro Display\', \'Calibri\', sans-serif; font-size: 26px; font-weight: 700; color: #1d1d1f; margin-top: 0; margin-bottom: 18px; border-bottom: 2px solid #0052FF; padding-bottom: 6px;">$1</h1>');
    html = html.replace(/^## (.*)$/gm, '<h2 style="font-family: \'SF Pro Display\', \'Calibri\', sans-serif; font-size: 20px; font-weight: 600; color: #1d1d1f; margin-top: 24px; margin-bottom: 12px; border-bottom: 1px solid #edebe9; padding-bottom: 4px;">$1</h2>');
    html = html.replace(/^### (.*)$/gm, '<h3 style="font-family: \'SF Pro Display\', \'Calibri\', sans-serif; font-size: 16px; font-weight: 600; color: #323130; margin-top: 18px; margin-bottom: 8px;">$1</h3>');
    
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #000000; font-weight: 700;">$1</strong>');
    
    // Bullet Points
    html = html.replace(/^[ \t]*-[ \t]+(.*)$/gm, '<li style="font-family: \'Calibri\', \'Segoe UI\', sans-serif; font-size: 14.5px; color: #323130; line-height: 1.6; margin-left: 24px; margin-bottom: 6px; list-style-type: disc;">$1</li>');
    
    // Quotations
    html = html.replace(/^&gt;[ \t]+(.*)$/gm, '<div style="border-left: 3px solid #0052FF; padding-left: 16px; margin: 16px 0; font-style: italic; color: #605e5c;">$1</div>');
    
    // Paragraph spacing
    html = html.split('\n').map(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('<h') || trimmed.startsWith('<li') || trimmed.startsWith('<div') || trimmed === '') {
            return line;
        }
        return `<p style="font-family: 'Calibri', 'Segoe UI', sans-serif; font-size: 14.5px; color: #323130; line-height: 1.6; margin-bottom: 14px; text-indent: 0px;">${line}</p>`;
    }).join('\n');
    
    return { __html: html };
};

// Splits document text into multiple virtual A4 sheets based on paragraph boundaries and character counts
const splitContentIntoA4Pages = (text) => {
    if (!text) return [];
    if (text.startsWith("[Local")) return [text];
    
    const paragraphs = text.split('\n');
    const pages = [];
    let currentPage = [];
    let currentLength = 0;
    // An A4 page at 950px width holds ~1100 characters cleanly without overflowing a 1000px height frame
    const maxCharsPerPage = 1100;
    
    for (let p of paragraphs) {
        currentPage.push(p);
        currentLength += p.length + 1; // +1 for the newline
        
        if (currentLength >= maxCharsPerPage) {
            pages.push(currentPage.join('\n'));
            currentPage = [];
            currentLength = 0;
        }
    }
    
    if (currentPage.length > 0) {
        pages.push(currentPage.join('\n'));
    }
    
    return pages;
};

export default function Documents({
    permissions,
    newDocName,
    setNewDocName,
    newDocUrl,
    setNewDocUrl,
    addDocumentLink,
    uploadFile,
    setUploadFile,
    executeFileUpload,
    isUploading,
    documents,
    removeDocumentLink,
    teamCode
}) {
    const [activeDoc, setActiveDoc] = useState(null);
    const [uploadLocalPath, setUploadLocalPath] = useState("");

    // Keep active doc state updated dynamically when document updates are received via socket
    useEffect(() => {
        if (activeDoc) {
            const updated = documents.find(d => d.id === activeDoc.id);
            if (updated) {
                setActiveDoc(updated);
            }
        }
    }, [documents, activeDoc]);

    // Render Microsoft Word-style High Fidelity Document Preview Panel
    if (activeDoc) {
        const isTextDoc = activeDoc.content_buffer && !activeDoc.content_buffer.startsWith("[Local");
        const formattedContent = isTextDoc ? renderWordContentToHTML(activeDoc.content_buffer) : null;
        const pages = isTextDoc ? splitContentIntoA4Pages(activeDoc.content_buffer) : [];

        return (
            <div className="workspace-documents-container is-preview">
                
                {/* MS Word Ribbon Header */}
                <div className="word-ribbon-header">
                    <div className="info-col">
                        <span className="doc-icon">📄</span>
                        <div className="title-stack">
                            <span className="doc-name">{activeDoc.name}</span>
                            <span className="doc-subtitle">Word Live-Sync Canvas</span>
                        </div>
                    </div>
                    
                    <div className="actions-row">
                        <a 
                            href={activeDoc.url} 
                            download
                            className="download-btn"
                        >
                            Download Document
                        </a>
                        <button 
                            onClick={() => setActiveDoc(null)}
                            className="close-btn"
                        >
                            Close Preview
                        </button>
                    </div>
                </div>

                {/* Word Page Container Area */}
                <div className="pages-viewport">
                    
                    {/* Virtual Page Stack / PDF view */}
                    {(activeDoc.name && activeDoc.name.toLowerCase().endsWith('.pdf')) ? (
                        <div className="pdf-page-container">
                            <iframe 
                                src={activeDoc.url} 
                                title={activeDoc.name}
                            />
                        </div>
                    ) : isTextDoc ? (
                        pages.map((pageText, pageIdx) => {
                            const formattedPage = renderWordContentToHTML(pageText);
                            return (
                                <div 
                                    key={pageIdx}
                                    className="a4-page-sheet"
                                >
                                    <div className="sheet-content" dangerouslySetInnerHTML={formattedPage} />
                                    
                                    {/* Virtual Page Footer */}
                                    <div className="page-footer">
                                        <span>Candles Live Doc</span>
                                        <span>Page {pageIdx + 1} of {pages.length}</span>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="tracker-sync-sheet">
                            <div className="tracker-sync-inner">
                                <div className="tracker-logo">
                                    W
                                </div>
                                
                                <div>
                                    <h3>Microsoft Word Document Linked</h3>
                                    <p>
                                        This document is actively tracked and synchronized from your local system workspace directory.
                                    </p>
                                </div>

                                <div className="tracker-info-box">
                                    <span className="box-label">📂 Local System Tracker Binding</span>
                                    <code>
                                        D:\TeamBridge_Workspaces\team_{teamCode}\{activeDoc.file_path || activeDoc.name}
                                    </code>
                                    <span className="box-disclaimer">
                                        💡 <strong>Dynamic Synchronization:</strong> Open and edit this file locally on your system using Microsoft Word or any editor. The Candles file watcher daemon will automatically capture edits and stream changes in real-time.
                                    </span>
                                </div>

                                <div className="tracker-actions">
                                    <a 
                                        href={activeDoc.url} 
                                        className="tracker-download-link"
                                    >
                                        Download to Edit Locally
                                    </a>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Standard Grid & Selection Table View
    return (
        <div className="workspace-documents-container is-dashboard">
            <div className="dashboard-header">
                <div>
                    <h1>Documents</h1>
                    <p>Securely view project files and track local system documents in real-time.</p>
                </div>
            </div>

            {permissions.mode !== "viewer" && (
                <div className="actions-grid implementations-grid-responsive">
                    {/* Option A: Link External Document */}
                    <div className="apple-card-modern link-card">
                        <h3>🔗 Link External URL</h3>
                        <div className="form-wrapper">
                            <div className="form-col">
                                <label>Document Name</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Project Charter.docx" 
                                    value={newDocName}
                                    onChange={(e) => setNewDocName(e.target.value)}
                                />
                            </div>
                            <div className="form-col">
                                <label>Document URL</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Google Drive/OneDrive URL..." 
                                    value={newDocUrl}
                                    onChange={(e) => setNewDocUrl(e.target.value)}
                                />
                            </div>
                        </div>
                        <button 
                            onClick={addDocumentLink} 
                            className="apple-btn-primary link-btn"
                        >
                            Link Document
                        </button>
                    </div>

                    {/* Option B: Upload Document File */}
                    <div className="apple-card-modern upload-card">
                        <h3>📤 Upload File</h3>
                        <div className="form-wrapper">
                            <label>Select PDF, DOCX, doc, or Image file</label>
                            <div className="upload-dropzone">
                                <input 
                                    type="file" 
                                    id="document-file-input"
                                    onChange={(e) => setUploadFile(e.target.files[0])}
                                    style={{ display: 'none' }}
                                />
                                <label htmlFor="document-file-input">
                                    <div className="upload-icon">📄</div>
                                    {uploadFile ? (
                                        <span className="chosen-name">{uploadFile.name}</span>
                                    ) : (
                                        <span className="browse-text">Click to browse and choose file</span>
                                    )}
                                </label>
                            </div>
                            
                            <div className="form-col">
                                <label>Local System Absolute Path (Optional for Live-Syncing)</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. C:\Users\User\Documents\Report.docx" 
                                    value={uploadLocalPath}
                                    onChange={(e) => setUploadLocalPath(e.target.value)}
                                />
                            </div>
                        </div>
                        <button 
                            onClick={() => {
                                executeFileUpload(uploadLocalPath);
                                setUploadLocalPath("");
                            }} 
                            disabled={!uploadFile || isUploading}
                            className="apple-btn-primary upload-btn"
                            style={{ opacity: (!uploadFile || isUploading) ? 0.5 : 1 }}
                        >
                            {isUploading ? "Uploading..." : "Upload File"}
                        </button>
                    </div>
                </div>
            )}

            <div className="apple-card-modern assets-container">
                <span className="assets-header-text">Linked Workspace Assets</span>
                
                {documents.length === 0 ? (
                    <div className="assets-empty">No documents linked yet.</div>
                ) : (
                    <table className="assets-table">
                        <thead>
                            <tr>
                                <th>Document Name</th>
                                <th>Author</th>
                                <th>Linked On</th>
                                {permissions.mode !== "viewer" && <th className="actions-cell">Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {documents.map(doc => (
                                <tr key={doc.id}>
                                    <td>
                                        <button 
                                            onClick={() => setActiveDoc(doc)} 
                                            className="doc-preview-trigger"
                                        >
                                            {doc.name}
                                        </button>
                                    </td>
                                    <td>{doc.uploaded_by_name}</td>
                                    <td>
                                        <span className="doc-date">{doc.created_at.split(' ')[0]}</span>
                                    </td>
                                    {permissions.mode !== "viewer" && (
                                        <td className="actions-cell">
                                            <button 
                                                onClick={() => removeDocumentLink(doc.id)} 
                                                className="delete-link-btn"
                                            >
                                                Delete Link
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
