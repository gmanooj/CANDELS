import React, { useState, useEffect, useRef } from 'react';
import './Monitor.css';

export default function Monitor({
    telemetryData,
    activities
}) {
    const [buildStatus, setBuildStatus] = useState("SUCCESS"); // SUCCESS, BUILDING, FAILED
    const [progress, setProgress] = useState(100);
    const [pipelineLogs, setPipelineLogs] = useState([
        "[08:00:15] CI: Git push detected on branch 'main'.",
        "[08:00:16] CI: Triggering build stage...",
        "[08:00:17] CI: Running lint checks... Pass.",
        "[08:00:19] CI: Running test suites: 12 passed, 0 failed.",
        "[08:00:20] CI: Compiling frontend bundle...",
        "[08:00:21] CI: Bundle compiled. Size: 142.4 KB (gzip: 38.2 KB).",
        "[08:00:22] CI: Deployment successful to https://staging.teambridge.io",
    ]);

    const logsEndRef = useRef(null);

    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollTop = logsEndRef.current.scrollHeight;
        }
    }, [pipelineLogs]);

    const runPipelineSimulation = () => {
        setBuildStatus("BUILDING");
        setProgress(0);
        setPipelineLogs([
            `[${new Date().toLocaleTimeString()}] CI: Pipeline triggered manually.`,
            `[${new Date().toLocaleTimeString()}] CI: Checking repository clean status...`,
        ]);

        let currentProgress = 0;
        const interval = setInterval(() => {
            currentProgress += 10;
            setProgress(currentProgress);
            
            if (currentProgress === 20) {
                setPipelineLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] CI: Running ESLint and style guidelines... Pass.`]);
            } else if (currentProgress === 40) {
                setPipelineLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] CI: Initiating Jest/Vitest unit test suites...`]);
            } else if (currentProgress === 60) {
                setPipelineLogs(prev => [...prev, 
                    `[${new Date().toLocaleTimeString()}] CI: ✓ ActiveWorkspace component test suite passed.`,
                    `[${new Date().toLocaleTimeString()}] CI: ✓ Tasks.jsx custom columns drag-n-drop passed.`,
                    `[${new Date().toLocaleTimeString()}] CI: Running integration checks...`
                ]);
            } else if (currentProgress === 80) {
                setPipelineLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] CI: Optimizing bundle chunking & assets compression...`]);
            } else if (currentProgress === 100) {
                clearInterval(interval);
                const isSuccess = Math.random() > 0.15; // 85% success rate
                if (isSuccess) {
                    setBuildStatus("SUCCESS");
                    setPipelineLogs(prev => [...prev, 
                        `[${new Date().toLocaleTimeString()}] CI: Compiled production bundle successfully (143.8 KB).`,
                        `[${new Date().toLocaleTimeString()}] CI: Staging deployment successful.`,
                        `[${new Date().toLocaleTimeString()}] CI: Pipeline SUCCESS.`
                    ]);
                } else {
                    setBuildStatus("FAILED");
                    setPipelineLogs(prev => [...prev, 
                        `[${new Date().toLocaleTimeString()}] CI: Error: SyntaxError at components/ActiveWorkspace.jsx (Line 1461)`,
                        `[${new Date().toLocaleTimeString()}] CI: Failed compiling frontend production bundle.`,
                        `[${new Date().toLocaleTimeString()}] CI: Pipeline FAILED.`
                    ]);
                }
            }
        }, 600);
    };

    // Helper to colorize log messages
    const getLogLineClass = (line) => {
        if (line.includes("✓") || line.includes("SUCCESS") || line.includes("Pass")) {
            return "log-text-green";
        }
        if (line.includes("Error:") || line.includes("FAILED")) {
            return "log-text-red";
        }
        if (line.includes("CI:")) {
            return "log-text-blue";
        }
        return "log-text-default";
    };

    return (
        <div className="workspace-monitor-container">
            <div className="monitor-header">
                <div>
                    <h1>Activity Monitor</h1>
                    <p>Real-time telemetry and student work transparency statistics.</p>
                </div>
            </div>

            {/* Keystrokes Telemetry Section */}
            <div className="telemetry-grid">
                <div className="apple-card-modern rate-card">
                    <span className="card-title">Current Keyboard Input Rate</span>
                    <div className="rate-val">
                        {telemetryData[telemetryData.length - 1]} <span className="rate-unit">c/min</span>
                    </div>
                    <div className="stream-indicator">
                        <span className="dot"></span>
                        MONITOR STREAM ACTIVE
                    </div>
                </div>

                <div className="apple-card-modern timeline-card">
                    <span className="card-title">Telemetry Keystrokes timeline</span>
                    <svg viewBox="0 0 300 100">
                        <polyline
                            fill="none"
                            stroke="#0052FF"
                            strokeWidth="3"
                            points={telemetryData.map((val, idx) => `${idx * 20},${100 - val}`).join(' ')}
                        />
                    </svg>
                </div>
            </div>

            {/* CI/CD Pipeline Console Upgrade */}
            <div className="apple-card-modern pipeline-console-card">
                <span className="card-header-text">
                    🚀 Pipeline Integration Console
                </span>
                
                <div className="pipeline-grid implementations-grid-responsive">
                    {/* Pipeline Info & Actions */}
                    <div className="actions-col">
                        <div className="status-row-header">
                            <span className="status-title">Build Status</span>
                            <div className="status-row">
                                <div className={`status-light ${buildStatus.toLowerCase()}`} />
                                <span className={`status-text ${buildStatus.toLowerCase()}`}>
                                    {buildStatus}
                                </span>
                            </div>
                        </div>

                        {buildStatus === 'BUILDING' && (
                            <div className="progress-section">
                                <div className="progress-label-row">
                                    <span>Building Assets</span>
                                    <span>{progress}%</span>
                                </div>
                                <div className="progress-track">
                                    <div className="progress-fill" style={{ width: `${progress}%` }} />
                                </div>
                            </div>
                        )}

                        <div className="details-col">
                            <div className="details-row">
                                <span className="detail-label">Bundle Size:</span>
                                <span className="detail-val">142.4 KB (gzip)</span>
                            </div>
                            <div className="details-row">
                                <span className="detail-label">Compile Time:</span>
                                <span className="detail-val">1.48s</span>
                            </div>
                            <div className="details-row">
                                <span className="detail-label">Environment:</span>
                                <span className="detail-val">Staging Sandbox</span>
                            </div>
                        </div>

                        <button
                            onClick={runPipelineSimulation}
                            disabled={buildStatus === 'BUILDING'}
                            className="apple-btn-primary trigger-btn"
                        >
                            {buildStatus === 'BUILDING' ? '🛠️ Building...' : '🚀 Trigger Build Pipeline'}
                        </button>
                    </div>

                    {/* Live Terminal Console logs */}
                    <div 
                        ref={logsEndRef}
                        className="terminal-console-box"
                    >
                        {pipelineLogs.map((log, index) => {
                            const timePart = log.substring(0, 10);
                            const textPart = log.substring(10);
                            return (
                                <div key={index} className="log-row">
                                    <span className="log-time">{timePart}</span>
                                    <span className={getLogLineClass(textPart)}>{textPart}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Activities Logs Section */}
            <div className="apple-card-modern logs-card">
                <span className="logs-header-text">Real-time Workspace Activity logs</span>
                
                <div className="logs-viewport">
                    {activities.length === 0 ? (
                        <div className="logs-empty">No workspace activities registered.</div>
                    ) : (
                        <table className="logs-table">
                            <thead>
                                <tr>
                                    <th>Member Name</th>
                                    <th>Event Action</th>
                                    <th>Timestamp</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activities.map((act, idx) => (
                                    <tr key={idx}>
                                        <td className="member-cell">{act.user_name}</td>
                                        <td className="code-cell">
                                            {act.type === 'file_edit' ? (
                                                (act.file.startsWith("Task") || act.file.startsWith("Linked") || act.file.startsWith("Removed")) ? (
                                                    <span>{act.file}</span>
                                                ) : (
                                                    <span>Edited file <strong>{act.file}</strong> (+{act.keystrokes} strokes)</span>
                                                )
                                            ) : (
                                                <span>Linked document <strong>{act.doc_name}</strong></span>
                                            )}
                                        </td>
                                        <td className="time-cell">{act.timestamp}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
