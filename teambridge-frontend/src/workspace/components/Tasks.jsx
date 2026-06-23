import React, { useState, useEffect } from 'react';
import './Tasks.css';

export default function Tasks({
    tasks,
    teamMembers,
    userRole,
    teamCode,
    permissions = {},
    addTask,
    deleteTask,
    toggleTask,
    moveTask,
    isCompact = false
}) {
    // Local state for custom columns
    const [columns, setColumns] = useState(['To Do', 'In Progress', 'Done']);
    const [newColName, setNewColName] = useState("");

    // Fetch board columns from backend on mount or teamCode change
    useEffect(() => {
        const fetchColumns = async () => {
            try {
                const res = await fetch(`${__BACKEND_URL__}/api/workspace/board-columns?team_code=${teamCode}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.columns && data.columns.length > 0) {
                        setColumns(data.columns);
                    }
                }
            } catch (err) {
                console.error("Failed to load workspace board columns:", err);
            }
        };
        if (teamCode) {
            fetchColumns();
        }
    }, [teamCode]);

    // Form inputs states
    const [taskTitle, setTaskTitle] = useState("");
    const [taskAssignee, setTaskAssignee] = useState("");
    const [taskPriority, setTaskPriority] = useState("Medium");
    const [taskEpic, setTaskEpic] = useState("");
    const [taskSprint, setTaskSprint] = useState("");

    // Filters states
    const [filterEpic, setFilterEpic] = useState("All");
    const [filterSprint, setFilterSprint] = useState("All");

    // Highlight and scroll task card when selected from code reviews
    useEffect(() => {
        const highlightAndScroll = (taskId) => {
            if (!taskId) return;
            setFilterEpic("All");
            setFilterSprint("All");

            setTimeout(() => {
                const card = document.getElementById(`task-card-${taskId}`);
                if (card) {
                    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    card.classList.add('is-highlighted');
                    setTimeout(() => {
                        card.classList.remove('is-highlighted');
                    }, 2500);
                }
            }, 300);
        };

        const pendingTaskId = sessionStorage.getItem('tb_highlight_task');
        if (pendingTaskId) {
            sessionStorage.removeItem('tb_highlight_task');
            highlightAndScroll(pendingTaskId);
        }

        const handleCustomEvent = (e) => {
            if (e.detail && e.detail.taskId) {
                highlightAndScroll(e.detail.taskId);
            }
        };

        window.addEventListener('highlight-task', handleCustomEvent);
        return () => {
            window.removeEventListener('highlight-task', handleCustomEvent);
        };
    }, [tasks]);

    // Parse the compound category field (format: "Epic | Sprint")
    const parseCategory = (catStr) => {
        const parts = (catStr || "").split(" | ");
        return {
            epic: (parts[0] || "General").trim(),
            sprint: (parts[1] || "General").trim()
        };
    };

    // Extract unique epics and sprints from current tasks list for filters
    const uniqueEpics = Array.from(new Set(tasks.map(t => parseCategory(t.category).epic))).filter(Boolean);
    const uniqueSprints = Array.from(new Set(tasks.map(t => parseCategory(t.category).sprint))).filter(Boolean);

    const assignableMembers = teamMembers.filter(m => {
        const roleLower = (m.role || "").toLowerCase();
        return roleLower !== 'faculty' && roleLower !== 'mentor' && roleLower !== 'supervisor' && !m.user_code.toLowerCase().includes('fac');
    });

    // Handle adding custom columns
    const handleAddColumn = async (e) => {
        e.preventDefault();
        const cleanName = newColName.trim();
        if (!cleanName) return;
        if (columns.includes(cleanName)) {
            alert("Column status name already exists!");
            return;
        }
        const updated = [...columns, cleanName];
        setColumns(updated);
        setNewColName("");

        try {
            await fetch(`${__BACKEND_URL__}/api/workspace/board-columns`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ team_code: teamCode, columns: updated })
            });
        } catch (err) {
            console.error("Failed to save column:", err);
        }
    };

    // Handle deleting custom columns
    const handleRemoveColumn = async (colName) => {
        if (['To Do', 'In Progress', 'Done'].includes(colName)) {
            alert("Core workflow columns ('To Do', 'In Progress', 'Done') cannot be deleted.");
            return;
        }
        if (!window.confirm(`Are you sure you want to delete the column '${colName}'? Any active tasks in this column will be moved back to 'To Do'.`)) {
            return;
        }

        // 1. Move tasks back to "To Do"
        tasks.forEach(t => {
            if (t.status === colName) {
                moveTask(t.id, 'To Do');
            }
        });

        // 2. Remove column from active state list
        const updated = columns.filter(c => c !== colName);
        setColumns(updated);

        try {
            await fetch(`${__BACKEND_URL__}/api/workspace/board-columns`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ team_code: teamCode, columns: updated })
            });
        } catch (err) {
            console.error("Failed to save columns after deletion:", err);
        }
    };

    // Handle submitting a new task with packed metadata
    const handleCreateTask = () => {
        if (!taskTitle.trim()) {
            alert("Please provide a task title.");
            return;
        }
        const epicPart = taskEpic.trim() || "General";
        const sprintPart = taskSprint.trim() || "General";
        const combinedCategory = `${epicPart} | ${sprintPart}`;

        addTask(taskTitle, combinedCategory, taskAssignee, taskPriority);

        // Reset form inputs
        setTaskTitle("");
        setTaskAssignee("");
        setTaskPriority("Medium");
        setTaskEpic("");
        setTaskSprint("");
    };

    // Filter tasks based on selected Epic & Sprint filters
    const filteredTasks = tasks.filter(t => {
        const { epic, sprint } = parseCategory(t.category);
        const matchesEpic = filterEpic === "All" || epic === filterEpic;
        const matchesSprint = filterSprint === "All" || sprint === filterSprint;
        return matchesEpic && matchesSprint;
    });

    // Calculate sprint/epic completion rate
    const totalFiltered = filteredTasks.length;
    const completedFiltered = filteredTasks.filter(t => t.status === 'Done').length;
    const completionPercent = totalFiltered > 0 ? Math.round((completedFiltered / totalFiltered) * 100) : 0;

    if (isCompact) {
        return (
            <div className={`workspace-tasks-container is-compact`}>
                <div className="checklist-header">
                    <span className="checklist-title">Tasks Checklist</span>
                    <span className="checklist-badge">
                        {tasks.length}
                    </span>
                </div>
                <div className="checklist-viewport">
                    {tasks.length === 0 ? (
                        <div className="checklist-empty">
                            No active tasks.
                        </div>
                    ) : (
                        tasks.map((task) => (
                            <div 
                                key={task.id}
                                className="checklist-item-card"
                            >
                                <div className="item-row">
                                    <input 
                                        type="checkbox" 
                                        checked={task.status === 'Done'} 
                                        disabled={permissions.mode === "viewer"}
                                        onChange={() => toggleTask(task.id)}
                                        className="item-checkbox"
                                    />
                                    <div className={`item-title ${task.status === 'Done' ? 'is-done' : ''}`}>
                                        {task.title}
                                    </div>
                                </div>
                                <div className="item-footer">
                                    <span>By: <strong>{task.assignee_name || "Unassigned"}</strong></span>
                                    <select
                                        value={task.status}
                                        disabled={permissions.mode === "viewer"}
                                        onChange={(e) => moveTask(task.id, e.target.value)}
                                        className="item-select"
                                    >
                                        {columns.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="workspace-tasks-container">
            
            {/* Header section with Dynamic filters & Sprint progress */}
            <div className="tasks-header">
                <div className="header-top">
                    <div>
                        <h1>Sprint Tasks</h1>
                        <p>Plan sprints, customize board workflows, and map multi-dimensional task networks.</p>
                    </div>
                    <span className="node-badge">
                        Node ID: {teamCode}
                    </span>
                </div>

                {/* Filters Row & Progress Tracker */}
                <div className="filters-row">
                    <div className="selects-wrapper">
                        <div className="filter-col">
                            <label>Filter Sprint</label>
                            <select 
                                value={filterSprint} 
                                onChange={(e) => setFilterSprint(e.target.value)}
                            >
                                <option value="All">All Sprints</option>
                                {uniqueSprints.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="filter-col">
                            <label>Filter Epic</label>
                            <select 
                                value={filterEpic} 
                                onChange={(e) => setFilterEpic(e.target.value)}
                            >
                                <option value="All">All Epics</option>
                                {uniqueEpics.map(ep => <option key={ep} value={ep}>{ep}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Visual Sprint Progress Gauge */}
                    <div className="progress-gauge">
                        <div className="gauge-label">
                            <span>Sprint Progress</span>
                            <span className="percent">{completionPercent}% ({completedFiltered}/{totalFiltered} Done)</span>
                        </div>
                        <div className="progress-bar-track">
                            <div 
                                className="progress-bar-fill"
                                style={{ width: `${completionPercent}%` }} 
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Creation Form & Columns Customizer (Side by side for Leader) */}
            {userRole === 'Leader' && (
                <div className="leader-actions-grid implementations-grid-responsive">
                    
                    {/* Sprint Task Creator */}
                    <div className="apple-card-modern task-creator-card">
                        <h3>➕ Create Sprint Task</h3>
                        <div className="creator-row-1">
                            <input 
                                type="text" 
                                placeholder="Task title..." 
                                value={taskTitle}
                                onChange={(e) => setTaskTitle(e.target.value)}
                            />
                            <select
                                value={taskAssignee}
                                onChange={(e) => setTaskAssignee(e.target.value)}
                            >
                                <option value="">Select Assignee</option>
                                {assignableMembers.map(m => (
                                    <option key={m.user_code} value={m.user_code}>{m.name} ({m.role})</option>
                                ))}
                            </select>
                            <select
                                value={taskPriority}
                                onChange={(e) => setTaskPriority(e.target.value)}
                            >
                                <option value="Low">Low Priority</option>
                                <option value="Medium">Medium Priority</option>
                                <option value="High">High Priority</option>
                            </select>
                        </div>
                        <div className="creator-row-2">
                            <input 
                                type="text" 
                                placeholder="Epic (e.g. Auth API)" 
                                value={taskEpic}
                                onChange={(e) => setTaskEpic(e.target.value)}
                            />
                            <input 
                                type="text" 
                                placeholder="Sprint (e.g. Sprint 1)" 
                                value={taskSprint}
                                onChange={(e) => setTaskSprint(e.target.value)}
                            />
                            <button 
                                onClick={handleCreateTask} 
                                className="apple-btn-primary"
                            >
                                Create Task
                            </button>
                        </div>
                    </div>

                    {/* Columns Workflow Customizer */}
                    <div className="apple-card-modern cols-customizer-card">
                        <h3>🛠️ Custom Columns</h3>
                        <form onSubmit={handleAddColumn}>
                            <input 
                                type="text" 
                                placeholder="Column Name (e.g. Testing)" 
                                value={newColName}
                                onChange={(e) => setNewColName(e.target.value)}
                            />
                            <button 
                                type="submit"
                                className="apple-btn-primary"
                            >
                                + Add
                            </button>
                        </form>
                        <span className="disclaimer">Custom columns are persisted and can be removed by leaders.</span>
                    </div>

                </div>
            )}

            {/* Dynamic columns grid view with horizontal scrolling scrollbar */}
            <div className="board-viewport">
                <div 
                    className="board-grid"
                    style={{ 
                        gridTemplateColumns: `repeat(${columns.length}, 300px)` 
                    }}
                >
                    {columns.map((colStatus) => {
                        const colTasks = filteredTasks.filter(t => t.status === colStatus);
                        const isCore = ['To Do', 'In Progress', 'Done'].includes(colStatus);

                        return (
                            <div 
                                key={colStatus} 
                                className="apple-card-modern column-card" 
                            >
                                <div className="column-header">
                                    <div className="title-badge-wrapper">
                                        <span className="title">
                                            {colStatus}
                                        </span>
                                        <span className="badge">
                                            {colTasks.length}
                                        </span>
                                    </div>
                                    {userRole === 'Leader' && !isCore && (
                                        <button 
                                            onClick={() => handleRemoveColumn(colStatus)}
                                            className="col-delete-btn"
                                            title="Delete Column"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>

                                <div className="column-tasks-list">
                                    {colTasks.length === 0 ? (
                                        <div className="empty-col-text">
                                            No tasks here
                                        </div>
                                    ) : (
                                        colTasks.map((task) => {
                                            const { epic, sprint } = parseCategory(task.category);
                                            return (
                                                <div 
                                                    key={task.id} 
                                                    id={`task-card-${task.id}`}
                                                    className={`task-item-card ${task.status === 'Done' ? 'is-done' : ''}`}
                                                >
                                                    <div className="card-top-row">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={task.status === 'Done'} 
                                                            disabled={permissions.mode === "viewer"}
                                                            onChange={() => toggleTask(task.id)}
                                                            className="card-checkbox"
                                                        />
                                                        <div className="card-content">
                                                            <div className={`card-title ${task.status === 'Done' ? 'is-done' : ''}`}>
                                                                {task.title}
                                                            </div>
                                                            <div className="card-assignee">
                                                                By: <strong>{task.assignee_name || "Unassigned"}</strong>
                                                            </div>
                                                        </div>
                                                        {userRole === 'Leader' && (
                                                            <button 
                                                                onClick={() => deleteTask(task.id)} 
                                                                className="card-delete-btn"
                                                                title="Delete Task"
                                                            >
                                                                ✕
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Pinned metadata pills/badges */}
                                                    <div className="card-pills-row">
                                                        <span className="pill-epic" title="Epic Module">
                                                            🏷️ {epic}
                                                        </span>
                                                        <span className="pill-sprint" title="Sprint Group">
                                                            🚀 {sprint}
                                                        </span>
                                                        <span className="pill-priority">
                                                            {task.priority}
                                                        </span>
                                                    </div>

                                                    {/* Dynamic move selector options */}
                                                    <div className="card-move-row">
                                                        <select
                                                            value={task.status}
                                                            disabled={permissions.mode === "viewer"}
                                                            onChange={(e) => moveTask(task.id, e.target.value)}
                                                            className="card-move-select"
                                                        >
                                                            {columns.map(c => (
                                                                <option key={c} value={c}>{c}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

        </div>
    );
}
