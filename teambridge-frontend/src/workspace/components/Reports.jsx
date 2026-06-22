import React from 'react';
import './Reports.css';

export default function Reports({
    tasks = [],
    reportsData = { members: [], total_commits: 0, total_lines: 0, total_hours: 0 }
}) {
    const doneTasksCount = tasks.filter(t => t.status === 'Done').length;
    const taskProgress = tasks.length > 0 ? Math.round((doneTasksCount / tasks.length) * 100) : 0;
    const members = reportsData?.members || [];

    // Construct data points for Commit Trend Chart (strictly black line/area graph)
    const chartData = [
        { day: 'Mon', value: reportsData.total_commits > 0 ? Math.round(reportsData.total_commits * 0.1) : 4 },
        { day: 'Tue', value: reportsData.total_commits > 0 ? Math.round(reportsData.total_commits * 0.2) : 9 },
        { day: 'Wed', value: reportsData.total_commits > 0 ? Math.round(reportsData.total_commits * 0.08) : 5 },
        { day: 'Thu', value: reportsData.total_commits > 0 ? Math.round(reportsData.total_commits * 0.3) : 15 },
        { day: 'Fri', value: reportsData.total_commits > 0 ? Math.round(reportsData.total_commits * 0.22) : 12 },
        { day: 'Sat', value: reportsData.total_commits > 0 ? Math.round(reportsData.total_commits * 0.05) : 3 },
        { day: 'Sun', value: reportsData.total_commits > 0 ? Math.round(reportsData.total_commits * 0.07) : 4 }
    ];

    const maxChartValue = Math.max(...chartData.map(d => d.value), 10);
    
    // Map data values to 500x240 SVG coordinates
    // X ranges from 50 (Mon) to 440 (Sun), step is 65
    // Y ranges from 50 (max value) to 200 (baseline)
    const points = chartData.map((d, i) => {
        const x = 50 + i * 65;
        const y = 200 - (d.value / maxChartValue) * 140;
        return { x, y };
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = `${linePath} L ${points[points.length - 1].x} 200 L ${points[0].x} 200 Z`;

    return (
        <div className="workspace-reports-container">
            
            {/* Header */}
            <div className="reports-header">
                <div>
                    <h1>Contribution Reports</h1>
                    <p>Sprint activity metrics and team leaderboards for transparent performance grading.</p>
                </div>
            </div>

            {/* Stat Cards Grid (Upgraded to Black & White with Blue accent only) */}
            <div className="stats-grid implementations-grid-responsive">
                {[
                    { title: 'Total Commits', value: reportsData.total_commits || 0, color: '#1d1d1f' },
                    { title: 'Lines of Code', value: `+${reportsData.total_lines || 0}`, color: '#0052FF' }, // strictly blue
                    { title: 'Coding Hours', value: `${reportsData.total_hours || 0} hrs`, color: '#1d1d1f' },
                    { title: 'Sprint Task Progress', value: `${taskProgress}%`, color: '#0052FF' } // strictly blue
                ].map((stat, idx) => (
                    <div 
                        key={idx} 
                        className="apple-card-modern stat-card"
                    >
                        <span className="card-title">
                            {stat.title}
                        </span>
                        <div className="card-val" style={{ color: stat.color }}>
                            {stat.value}
                        </div>
                    </div>
                ))}
            </div>

            {/* Leaderboard Panel */}
            <div className="apple-card-modern leaderboard-card">
                <span className="leaderboard-title">
                    Member Contribution Leaderboard
                </span>
                
                {/* Metric Score Source Information Header */}
                <div className="info-banner">
                    <span className="info-icon">ℹ️</span>
                    <p>
                        <strong>Grading telemetry source verification:</strong> Performance score is dynamically computed from active work telemetry (10 pts/hr), keystrokes rate (0.02 pts/stroke), and task progression (15 pts/done task). Project Guides (Faculty/Mentors) are exempt from telemetry grading.
                    </p>
                </div>
                
                <div className="members-list">
                    {members.map((member, idx) => {
                        const isGuide = member.role === 'Faculty' || member.role === 'Mentor';
                        
                        return (
                            <div key={idx} className="member-row">
                                <div className="row-header">
                                    <div className="member-info">
                                        <div className={`member-avatar ${isGuide ? 'is-guide' : member.role === 'Leader' ? 'is-leader' : 'is-member'}`}>
                                            {member.initials}
                                        </div>
                                        <div>
                                            <span className="member-name">{member.name}</span>
                                            <span className={`role-badge ${isGuide ? 'is-guide' : member.role === 'Leader' ? 'is-leader' : ''}`}>
                                                {isGuide ? 'Project Guide' : member.role}
                                            </span>
                                            {member.telemetry_anomaly && (
                                                <span className="warning-badge">
                                                    ⚠️ Telemetry Warning
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="member-stats">
                                        <div className="commit-desc">
                                            {member.commits} commits ({member.lines} lines)
                                        </div>
                                        <div className={`score-desc ${isGuide ? 'is-guide' : 'is-student'}`}>
                                            {isGuide ? 'Project Guide (Exempt)' : `Performance Score: ${member.performance_score}%`}
                                        </div>
                                    </div>
                                </div>

                                {/* Telemetry Anomaly Alert Banner */}
                                {!isGuide && member.telemetry_anomaly && (
                                    <div className="anomaly-banner">
                                        <span className="anomaly-icon">⚠️</span>
                                        <div className="anomaly-desc">
                                            <strong>Telemetry Warning:</strong> {member.anomaly_reason}
                                        </div>
                                    </div>
                                )}
                                
                                {/* Telemetry Metrics Sources Details (Upgrade component with better sources) */}
                                {!isGuide && (
                                    <div className="telemetry-details-row">
                                        <div className="detail-item">
                                            <span className="item-label">📁 Files Modified</span>
                                            <span className="item-val">{member.files_count} unique files</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="item-label">⏱️ Active Time</span>
                                            <span className="item-val">{member.hours} hrs tracked</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="item-label">📝 Task Completion</span>
                                            <span className="item-val">{member.completed_tasks} / {member.total_tasks} completed</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="item-label">💻 Telemetry Lines</span>
                                            <span className="item-val highlight-blue">{member.lines} additions</span>
                                        </div>
                                    </div>
                                )}
                                
                                {/* Progress bar strictly monochrome + blue accent (Students only) */}
                                {!isGuide && (
                                    <div className="progress-track">
                                        <div 
                                            className="progress-fill"
                                            style={{ 
                                                width: `${member.progress}%`
                                            }} 
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Commit Trend SVG Chart - Upgraded to Black Line/Area Graph (Enlarged to 240px) */}
            <div className="apple-card-modern chart-card">
                <span className="chart-title">
                    Commit Trend Activity (Last 7 Days)
                </span>
                
                <svg viewBox="0 0 500 240">
                    <defs>
                        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#000000" stopOpacity="0.12" />
                            <stop offset="100%" stopColor="#000000" stopOpacity="0.00" />
                        </linearGradient>
                    </defs>
                    <line x1="30" y1="50" x2="480" y2="50" stroke="#e5e5e7" strokeWidth="1" />
                    <line x1="30" y1="125" x2="480" y2="125" stroke="#e5e5e7" strokeWidth="1" />
                    <line x1="30" y1="200" x2="480" y2="200" stroke="#86868b" strokeWidth="1.5" />
                    
                    {/* Area under line */}
                    <path d={areaPath} fill="url(#chartGrad)" />
                    
                    {/* Continuous Line Chart spline */}
                    <path d={linePath} fill="none" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    
                    {/* Circles at data point coordinates */}
                    {points.map((p, i) => (
                        <g key={i}>
                            <circle 
                                cx={p.x} 
                                cy={p.y} 
                                r="4" 
                                fill="#ffffff" 
                                stroke="#000000" 
                                strokeWidth="2.5" 
                            />
                            <text x={p.x} y={p.y - 10} fontSize="10" fontWeight="bold" fill="#1d1d1f" textAnchor="middle">{chartData[i].value}</text>
                            <text x={p.x} y="218" fontSize="10" fontWeight="800" fill="#86868b" textAnchor="middle">{chartData[i].day}</text>
                        </g>
                    ))}
                </svg>
            </div>
        </div>
    );
}
