import React, { useState, useEffect, useRef } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    TextInput, 
    TouchableOpacity, 
    Platform, 
    Dimensions, 
    Animated,
    Modal,
    Easing
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { API_CONFIG } from '../../../config/api';
import { useSecureOffline } from '../../../context/SecureOfflineContext';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

function LoadingSpinner({ size = 20, color = '#6548d8ff' }) {
    const spinAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.timing(spinAnim, {
                toValue: 1,
                duration: 1000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        );
        animation.start();
        return () => animation.stop();
    }, [spinAnim]);

    const spin = spinAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Feather name="loader" size={size} color={color} />
        </Animated.View>
    );
}

export default function TasksTab({ teamCode, token, runWithLoader, handleUserScroll, roster, leaderCode, facultyCode, user }) {
    const { offlineWorkspaces } = useSecureOffline();
    const [tasks, setTasks] = useState([]);
    const [projectDetails, setProjectDetails] = useState(null);

    const isLeader = user?.user_code === leaderCode;

    // Form inputs states
    const [taskTitle, setTaskTitle] = useState("");
    const [taskAssignee, setTaskAssignee] = useState("");
    const [taskPriority, setTaskPriority] = useState("Medium");
    const [taskSprint, setTaskSprint] = useState("Sprint 1");

    // UI control states
    const [statusFilter, setStatusFilter] = useState("All"); // 'All' | 'To Do' | 'In Progress' | 'Done'
    const [searchQuery, setSearchQuery] = useState("");
    const [createModalVisible, setCreateModalVisible] = useState(false);

    useEffect(() => {
        if (teamCode) {
            fetchTasks();
            fetchProjectDetails();
        }
    }, [teamCode]);

    const fetchProjectDetails = async () => {
        if (!token) {
            if (offlineWorkspaces?.project_details) {
                setProjectDetails(offlineWorkspaces.project_details);
            }
            return;
        }
        try {
            const res = await fetch(`${API_CONFIG.BACKEND_URL}/api/workspace/status?team_code=${teamCode}`);
            if (res.ok) {
                const data = await res.json();
                setProjectDetails(data);
            }
        } catch (err) {
            console.error("Error fetching project details in tasks:", err);
            if (offlineWorkspaces?.project_details) {
                setProjectDetails(offlineWorkspaces.project_details);
            }
        }
    };

    const fetchTasks = async () => {
        if (!token) {
            if (offlineWorkspaces && offlineWorkspaces.tasks) {
                setTasks(offlineWorkspaces.tasks);
            }
            return;
        }

        const fetchTask = fetch(`${API_CONFIG.BACKEND_URL}/api/workspace/tasks?team_code=${teamCode}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(async (res) => {
            if (res.ok) {
                const data = await res.json();
                setTasks(data.tasks || []);
            }
        })
        .catch((err) => {
            console.error("Error fetching tasks:", err);
            if (offlineWorkspaces && offlineWorkspaces.tasks) {
                setTasks(offlineWorkspaces.tasks);
            }
        });
        await runWithLoader(fetchTask, "Fetching tasks information from the cloud...");
    };

    const handleAddTask = async () => {
        if (!taskTitle.trim()) return;

        if (taskAssignee && facultyCode && taskAssignee === facultyCode) {
            alert("Faculty/Guides cannot be assigned tasks.");
            return;
        }
        
        const payload = {
            team_code: teamCode,
            title: taskTitle,
            assigned_to: taskAssignee,
            priority: taskPriority,
            category: `Epic | ${taskSprint}`,
            email: user?.email
        };

        const addTaskTask = fetch(`${API_CONFIG.BACKEND_URL}/api/workspace/tasks`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        })
        .then(async (res) => {
            if (res.ok) {
                setTaskTitle("");
                setCreateModalVisible(false);
                fetchTasks();
            } else {
                const errData = await res.json();
                alert(errData.error || "Failed to add sprint task.");
            }
        })
        .catch((err) => {
            console.error("Add task error:", err);
        });

        await runWithLoader(addTaskTask, "Registering sprint task...");
    };

    const handleToggleTask = async (taskId, currentStatus) => {
        const nextStatus = currentStatus === 'Done' ? 'To Do' : 'Done';
        const toggleTaskTask = fetch(`${API_CONFIG.BACKEND_URL}/api/workspace/tasks`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ id: taskId, status: nextStatus })
        })
        .then(async (res) => {
            if (res.ok) {
                fetchTasks();
            } else {
                const errData = await res.json();
                alert(errData.error || "Failed to update task.");
            }
        })
        .catch((err) => {
            console.error("Toggle task error:", err);
        });

        await runWithLoader(toggleTaskTask, "Updating task progression status...");
    };

    const handleDeleteTask = async (taskId) => {
        const deleteTaskTask = fetch(`${API_CONFIG.BACKEND_URL}/api/workspace/tasks?id=${taskId}&email=${encodeURIComponent(user?.email || "")}`, {
            method: 'DELETE',
            headers: { 
                'Authorization': `Bearer ${token}`
            }
        })
        .then(async (res) => {
            if (res.ok) {
                fetchTasks();
            } else {
                const errData = await res.json();
                alert(errData.error || "Failed to delete task. Only the team leader can delete tasks.");
            }
        })
        .catch((err) => {
            console.error("Delete task error:", err);
        });

        await runWithLoader(deleteTaskTask, "Purging task node...");
    };

    // Calculate dynamic stats
    const stats = React.useMemo(() => {
        let doneCount = 0;
        let inProgressCount = 0;
        let toDoCount = 0;

        tasks.forEach(t => {
            if (t.status === 'Done') doneCount++;
            else if (t.status === 'In Progress') inProgressCount++;
            else toDoCount++;
        });

        const total = tasks.length || 1;

        return {
            total: tasks.length,
            doneCount,
            inProgressCount,
            toDoCount,
            categories: [
                { name: 'Completed', count: doneCount, percentage: (doneCount / total) * 100, color: '#10b981' },
                { name: 'In Progress', count: inProgressCount, percentage: (inProgressCount / total) * 100, color: '#6548d8ff' },
                { name: 'To Do', count: toDoCount, percentage: (toDoCount / total) * 100, color: '#64748b' }
            ].filter(c => c.count > 0)
        };
    }, [tasks]);

    // Local filters parsing
    const filteredTasks = tasks.filter(task => {
        const matchesSearch = 
            task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (task.assigned_to && task.assigned_to.toLowerCase().includes(searchQuery.toLowerCase()));
        
        const matchesStatus = 
            statusFilter === 'All' ||
            (statusFilter === 'Done' && task.status === 'Done') ||
            (statusFilter === 'In Progress' && task.status === 'In Progress') ||
            (statusFilter === 'To Do' && task.status !== 'Done' && task.status !== 'In Progress');

        return matchesSearch && matchesStatus;
    });

    const getPriorityColor = (priority) => {
        const p = (priority || "").toLowerCase();
        if (p === 'high') return '#ef4444';
        if (p === 'medium') return '#f97316';
        return '#10b981';
    };

    return (
        <View style={styles.container}>
            <ScrollView 
                style={styles.container} 
                contentContainerStyle={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
                onScroll={handleUserScroll}
                scrollEventThrottle={16}
            >
                {/* ── PART 1: Solid Royal Blue Header ─────────────────── */}
                <View style={styles.blueHeaderContainer}>
                    <Text style={styles.headerTitle}>{projectDetails?.project_name || "My Tasks"}</Text>
                    <Text style={styles.headerSubtitle}>{projectDetails?.subject || "Collaborative Task Board"}</Text>

                    {/* Tasks Progress Stats Card */}
                    <View style={styles.statsCard}>
                        <View style={styles.statsHeader}>
                            <Text style={styles.statsTitle}>Task Progress</Text>
                            <Text style={styles.statsTotalText}>
                                {stats.doneCount} of {stats.total} Tasks Completed
                            </Text>
                        </View>
                        
                        {/* Segmented Color Bar */}
                        <View style={styles.progressBarContainer}>
                            {stats.categories.map((c, i) => (
                                <View 
                                    key={i} 
                                    style={[
                                        styles.progressSegment, 
                                        { 
                                            width: `${c.percentage}%`, 
                                            backgroundColor: c.color 
                                        }
                                    ]} 
                                />
                            ))}
                        </View>

                        {/* Legend Indicators */}
                        <View style={styles.legendGrid}>
                            {stats.categories.map((c, i) => (
                                <View key={i} style={styles.legendItem}>
                                    <View style={[styles.legendIndicatorColor, { backgroundColor: c.color }]} />
                                    <View style={styles.legendContent}>
                                        <Text style={styles.legendName} numberOfLines={1}>{c.name}</Text>
                                        <Text style={styles.legendValue}>{c.count} tasks</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>
                </View>

                {/* ── PART 2: Curved White Bottom Container ──────────── */}
                <View style={styles.whiteBottomContainer}>
                    
                    {/* Status Filters Horizontal bar */}
                    <View style={styles.filtersWrapper}>
                        {['All', 'To Do', 'In Progress', 'Done'].map((statusOption) => (
                            <TouchableOpacity 
                                key={statusOption}
                                style={[
                                    styles.filterPill,
                                    statusFilter === statusOption && styles.filterPillActive
                                ]}
                                onPress={() => setStatusFilter(statusOption)}
                                activeOpacity={0.8}
                            >
                                <Text style={[
                                    styles.filterText,
                                    statusFilter === statusOption && styles.filterTextActive
                                ]}>
                                    {statusOption}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Search Bar */}
                    <View style={styles.searchContainer}>
                        <Feather name="search" size={16} color="#94a3b8" style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search tasks..."
                            placeholderTextColor="#94a3b8"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery("")}>
                                <Feather name="x" size={16} color="#94a3b8" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Task List */}
                    <View style={styles.tasksListWrapper}>
                        {filteredTasks.length > 0 ? (
                            filteredTasks.map((task) => {
                                const isDone = task.status === 'Done';
                                return (
                                    <View 
                                        key={task.id} 
                                        style={[
                                            styles.taskRowCard,
                                            isDone && styles.taskDoneCard
                                        ]}
                                    >
                                        <TouchableOpacity 
                                            style={styles.taskCheckboxTouch} 
                                            onPress={() => handleToggleTask(task.id, task.status)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={[
                                                styles.checkboxCircle,
                                                isDone && styles.checkboxCircleChecked
                                            ]}>
                                                {isDone && <Feather name="check" size={12} color="#ffffff" />}
                                            </View>
                                        </TouchableOpacity>

                                        <View style={styles.taskContentBody}>
                                            <Text style={[
                                                styles.taskTitleText,
                                                isDone && styles.taskDoneText
                                            ]} numberOfLines={2}>
                                                {task.title}
                                            </Text>
                                            <View style={styles.taskBadgeRow}>
                                                <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(task.priority) + '15' }]}>
                                                    <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(task.priority) }]} />
                                                    <Text style={[styles.priorityBadgeText, { color: getPriorityColor(task.priority) }]}>
                                                        {task.priority || "Medium"}
                                                    </Text>
                                                </View>
                                                {task.assigned_to && (
                                                    <View style={styles.assigneeBadge}>
                                                        <Feather name="user" size={10} color="#64748b" style={{ marginRight: 4 }} />
                                                        <Text style={styles.assigneeBadgeText} numberOfLines={1}>
                                                            {task.assigned_to}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>

                                        {isLeader && (
                                            <TouchableOpacity 
                                                style={styles.trashBtnTouch} 
                                                onPress={() => handleDeleteTask(task.id)}
                                                activeOpacity={0.7}
                                            >
                                                <Feather name="trash-2" size={16} color="#94a3b8" />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                );
                            })
                        ) : (
                            <View style={styles.emptyContainer}>
                                <Feather name="inbox" size={32} color="#94a3b8" />
                                <Text style={styles.emptyText}>No tasks matched the filters.</Text>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Floating Action Button (FAB) */}
            {isLeader && (
                <TouchableOpacity 
                    style={styles.fabButton}
                    onPress={() => setCreateModalVisible(true)}
                    activeOpacity={0.8}
                >
                    <Feather name="plus" size={24} color="#ffffff" />
                </TouchableOpacity>
            )}

            {/* Task Creation Modal */}
            <Modal
                visible={createModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setCreateModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContentCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Create Workspace Task</Text>
                            <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                                <Feather name="x" size={20} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.inputLabel}>Task Details</Text>
                        <TextInput 
                            style={styles.textInput}
                            value={taskTitle}
                            onChangeText={setTaskTitle}
                            placeholder="What needs to be done?"
                            placeholderTextColor="#94a3b8"
                        />

                        <Text style={styles.inputLabel}>Assignee</Text>
                        {roster && roster.length > 0 ? (
                            <ScrollView 
                                horizontal 
                                showsHorizontalScrollIndicator={false}
                                style={{ marginBottom: 16 }}
                                contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
                            >
                                {roster.map((member) => {
                                    const isSelected = taskAssignee === member.user_code;
                                    return (
                                        <TouchableOpacity
                                            key={member.user_code}
                                            style={[
                                                styles.assigneePill,
                                                isSelected && styles.assigneePillActive
                                            ]}
                                            onPress={() => setTaskAssignee(member.user_code)}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={[
                                                styles.assigneePillText,
                                                isSelected && styles.assigneePillTextActive
                                            ]}>
                                                {member.name}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        ) : (
                            <TextInput 
                                style={styles.textInput}
                                value={taskAssignee}
                                onChangeText={setTaskAssignee}
                                placeholder="e.g. TB-STU-ADB9A6"
                                placeholderTextColor="#94a3b8"
                                autoCapitalize="characters"
                            />
                        )}

                        <Text style={styles.inputLabel}>Sprint</Text>
                        <TextInput 
                            style={styles.textInput}
                            value={taskSprint}
                            onChangeText={setTaskSprint}
                            placeholder="e.g. Sprint 1"
                            placeholderTextColor="#94a3b8"
                        />

                        <Text style={styles.inputLabel}>Task Priority</Text>
                        <View style={styles.priorityToggleGroup}>
                            {['Low', 'Medium', 'High'].map((p) => {
                                const isActive = taskPriority === p;
                                const activeBg = getPriorityColor(p);
                                return (
                                    <TouchableOpacity
                                        key={p}
                                        style={[
                                            styles.prioritySelectBtn,
                                            isActive && { backgroundColor: activeBg, borderColor: activeBg }
                                        ]}
                                        onPress={() => setTaskPriority(p)}
                                    >
                                        <Text style={[
                                            styles.prioritySelectBtnText,
                                            isActive && { color: '#ffffff' }
                                        ]}>
                                            {p}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <TouchableOpacity 
                            style={styles.submitTaskBtn}
                            onPress={handleAddTask}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.submitTaskBtnText}>Add Sprint Task</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        margin: -10,
        flex: 1,
        backgroundColor: '#6548d8ff',
    },
    scrollContainer: {
        flexGrow: 1,
    },
    blueHeaderContainer: {
        backgroundColor: '#6548d8ff',
        paddingTop: Platform.OS === 'ios' ? 24 : 16,
        paddingBottom: 36,
        paddingHorizontal: 20,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#ffffff',
        marginTop: 18,
        letterSpacing: 0.2,
    },
    headerSubtitle: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.75)',
        marginTop: 4,
        letterSpacing: 0.1,
    },
    whiteBottomContainer: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 36,
        borderTopRightRadius: 36,
        paddingHorizontal: 20,
        paddingTop: 32,
        minHeight: SCREEN_HEIGHT * 0.65,
        marginTop: -16,
    },

    // Stats progress card
    statsCard: {
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 20,
        marginTop: 20,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 6,
    },
    statsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statsTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1e293b',
    },
    statsTotalText: {
        fontSize: 11,
        color: '#94a3b8',
        fontWeight: '600',
    },
    progressBarContainer: {
        height: 10,
        borderRadius: 5,
        backgroundColor: '#f1f5f9',
        flexDirection: 'row',
        overflow: 'hidden',
        marginVertical: 14,
    },
    progressSegment: {
        height: '100%',
    },
    legendGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    legendItem: {
        width: '31%',
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 6,
    },
    legendIndicatorColor: {
        width: 3.5,
        height: 24,
        borderRadius: 2,
        marginRight: 8,
    },
    legendContent: {
        flex: 1,
    },
    legendName: {
        fontSize: 10,
        color: '#94a3b8',
        fontWeight: '600',
    },
    legendValue: {
        fontSize: 11,
        color: '#1e293b',
        fontWeight: '800',
        marginTop: 1,
    },

    // Quick-Filters Horizontal Bar
    filtersWrapper: {
        flexDirection: 'row',
        marginBottom: 18,
        gap: 8,
    },
    filterPill: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    filterPillActive: {
        backgroundColor: '#6548d8ff',
        borderColor: '#6548d8ff',
    },
    filterText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#64748b',
    },
    filterTextActive: {
        color: '#ffffff',
    },

    // Search input
    searchContainer: {
        marginBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        paddingHorizontal: 12,
        height: 48,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#1e293b',
        height: '100%',
        paddingVertical: 0,
    },

    // Task Rows Cards
    tasksListWrapper: {
        gap: 12,
        paddingBottom: 80, // Space for FAB
    },
    taskRowCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.01,
        shadowRadius: 8,
        elevation: 1,
    },
    taskDoneCard: {
        opacity: 0.65,
    },
    taskCheckboxTouch: {
        marginRight: 14,
    },
    checkboxCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: '#94a3b8',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
    },
    checkboxCircleChecked: {
        borderColor: '#10b981',
        backgroundColor: '#10b981',
    },
    taskContentBody: {
        flex: 1,
        marginRight: 8,
    },
    taskTitleText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1e293b',
        lineHeight: 20,
    },
    taskDoneText: {
        textDecorationLine: 'line-through',
        color: '#94a3b8',
    },
    taskBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        gap: 8,
    },
    priorityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 8,
    },
    priorityDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    priorityBadgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    assigneeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 8,
    },
    assigneeBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#64748b',
    },
    trashBtnTouch: {
        padding: 6,
    },

    // Floating Action Button
    fabButton: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#6548d8ff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#6548d8ff',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 8,
        zIndex: 99,
    },

    // Empty States
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 36,
        backgroundColor: '#f8fafc',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    emptyText: {
        fontSize: 13,
        color: '#94a3b8',
        fontWeight: '600',
        marginTop: 10,
        textAlign: 'center',
    },

    // Dialog Modal styling
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        justifyContent: 'flex-end',
    },
    modalContentCard: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: Platform.OS === 'ios' ? 44 : 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1e293b',
    },
    inputLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    textInput: {
        height: 48,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        paddingHorizontal: 14,
        fontSize: 14,
        color: '#0f172a',
        marginBottom: 16,
    },
    priorityToggleGroup: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    prioritySelectBtn: {
        width: '31%',
        height: 40,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
    },
    prioritySelectBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#64748b',
    },
    submitTaskBtn: {
        height: 52,
        backgroundColor: '#6548d8ff',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#6548d8ff',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 6,
    },
    submitTaskBtnText: {
        color: '#ffffff',
        fontSize: 15,
        fontWeight: '800',
    },
    assigneePill: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    assigneePillActive: {
        backgroundColor: '#6548d8ff',
        borderColor: '#6548d8ff',
    },
    assigneePillText: {
        fontSize: 13,
        color: '#475569',
        fontWeight: '600',
    },
    assigneePillTextActive: {
        color: '#ffffff',
        fontWeight: '700',
    },
});
