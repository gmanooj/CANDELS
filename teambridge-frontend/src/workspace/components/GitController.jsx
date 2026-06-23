import React, { useState, useEffect } from 'react';
import './GitController.css';

export default function GitController({
    commitMessage,
    setCommitMessage,
    isSyncing,
    handleGitSync,
    permissions,
    teamCode
}) {
    const [diff, setDiff] = useState("");
    const [untracked, setUntracked] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchGitStatus = () => {
        setLoading(true);
        fetch(`${__BACKEND_URL__}/api/workspace/git/diff?team_code=${teamCode}`)
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    setDiff(data.diff || "No uncommitted modifications in workspace.");
                    setUntracked(data.untracked || []);
                } else {
                    setDiff("Failed to retrieve git diff: " + data.error);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch git diff:", err);
                setDiff("Git server is currently offline or unreachable.");
                setLoading(false);
            });
    };

    useEffect(() => {
        if (teamCode) {
            fetchGitStatus();
        }
    }, [teamCode]);

    const onCommitClick = () => {
        if (typeof handleGitSync === 'function') {
            const resPromise = handleGitSync();
            if (resPromise && typeof resPromise.then === 'function') {
                resPromise
                    .then(() => {
                        // Refresh status on success
                        fetchGitStatus();
                    })
                    .catch(() => {});
            }
        }
    };

    // Helper to style diff lines dynamically
    const renderDiffLine = (line, idx) => {
        let className = "diff-line";
        
        if (line.startsWith('+') && !line.startsWith('+++')) {
            // Addition
            className += " addition";
        } else if (line.startsWith('-') && !line.startsWith('---')) {
            // Deletion
            className += " deletion";
        } else if (line.startsWith('@@')) {
            // Hunk header
            className += " hunk";
        } else if (line.startsWith('diff --git') || line.startsWith('index ') || line.startsWith('--- ') || line.startsWith('+++ ')) {
            // Metadata header
            className += " meta";
        } else {
            // Normal code line
            className += " normal";
        }

        return (
            <div key={idx} className={className}>
                {line}
            </div>
        );
    };

    const diffLines = diff.split('\n');

    return (
        <div className="workspace-git-container">
            
            {/* Header */}
            <div className="git-header">
                <div>
                    <h1>Git Controller</h1>
                    <p>Track version control changes, sync repositories, and review edits in real-time.</p>
                </div>
                <button 
                    onClick={fetchGitStatus} 
                    className="apple-btn-secondary refresh-btn"
                    disabled={loading}
                >
                    {loading ? "Refreshing..." : "🔄 Refresh Diff"}
                </button>
            </div>

            {/* Local Uncommitted changes panel */}
            <div className="apple-card-modern diff-panel">
                <span className="diff-title">
                    Local Workspace Modifications Diff
                </span>
                
                <div className="diff-console-box">
                    {loading ? (
                        <div className="diff-status-text">Analyzing git tree changes...</div>
                    ) : diffLines.length === 0 || (diffLines.length === 1 && !diffLines[0]) || diff === "No uncommitted modifications in workspace." ? (
                        <div className="diff-status-text">
                            ✨ No uncommitted modifications in workspace. Clean working tree.
                        </div>
                    ) : (
                        diffLines.map((line, idx) => renderDiffLine(line, idx))
                    )}
                </div>

                {/* Untracked files list section */}
                {!loading && untracked.length > 0 && (
                    <div className="untracked-files-box">
                        <span className="untracked-title">
                            Untracked Files (Will be committed)
                        </span>
                        <div className="untracked-list">
                            {untracked.map((file, idx) => (
                                <div key={idx} className="untracked-item">
                                    ?? {file}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Commit Form Section */}
            <div className="commit-form-section">
                <label>Commit Log Message</label>
                <textarea 
                    placeholder={permissions.mode === "viewer" ? "Git actions are disabled for supervisors" : "Enter commit description log..."} 
                    disabled={permissions.mode === "viewer" || isSyncing}
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    className="commit-textarea"
                />

                {permissions.mode !== "viewer" && (
                    <button 
                        onClick={onCommitClick} 
                        disabled={isSyncing || !commitMessage.trim()}
                        className="apple-btn-primary sync-btn"
                    >
                        {isSyncing ? "SYNCING REPOSITORY..." : "COMMIT & SYNC REPOSITORY"}
                    </button>
                )}
            </div>
        </div>
    );
}
