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
    Easing,
    Animated,
    Alert
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { API_CONFIG } from '../../../config/api';
import CustomAlert from '../../../components/CustomAlert';
import { useSecureOffline } from '../../../context/SecureOfflineContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const getRepoPathContents = (fileItems, currentPath) => {
    const folders = new Set();
    const files = [];

    fileItems.forEach(item => {
        const p = item.path;
        if (p.startsWith(currentPath + '/')) {
            const relative = p.substring(currentPath.length + 1);
            const parts = relative.split('/');
            if (parts.length === 1) {
                files.push(item);
            } else {
                folders.add(parts[0]);
            }
        }
    });

    return {
        folders: Array.from(folders).map(folderName => ({
            name: folderName,
            path: `${currentPath}/${folderName}`
        })),
        files: files.map(item => {
            const parts = item.path.split('/');
            return {
                name: parts[parts.length - 1],
                path: item.path,
                size_bytes: item.size_bytes
            };
        })
    };
};

const formatFileSize = (bytes) => {
    if (bytes === 0 || !bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export default function GitControllerTab({ teamCode, token, user, runWithLoader, handleUserScroll }) {
    const { offlineWorkspaces } = useSecureOffline();
    const [projectDetails, setProjectDetails] = useState(null);
    const [diffContent, setDiffContent] = useState("");
    const [untrackedFiles, setUntrackedFiles] = useState([]);
    const [commitMessage, setCommitMessage] = useState("");

    // External Git integration states
    const [externalGitData, setExternalGitData] = useState(null);
    const [newGitLink, setNewGitLink] = useState("");
    const [gitRepoPath, setGitRepoPath] = useState("");
    const [allFilesList, setAllFilesList] = useState([]);

    const [isLinking, setIsLinking] = useState(false);
    const [activeRepoSlot, setActiveRepoSlot] = useState(null);

    // File viewer states
    const [viewedFile, setViewedFile] = useState(null);
    const [viewedFileContent, setViewedFileContent] = useState("");
    const [viewedFileLoading, setViewedFileLoading] = useState(false);

    // Custom alert card modal configurations
    const [alertConfig, setAlertConfig] = useState({
        visible: false,
        title: "",
        message: "",
        confirmText: "Confirm",
        cancelText: "Cancel",
        onConfirm: () => {},
        onCancel: () => {},
        confirmColor: "#1b8a07",
        cancelColor: "#b30e0e"
    });

    const triggerCustomAlert = (title, message, onConfirm, onCancel = null, confirmText = "Confirm", cancelText = "Cancel", confirmColor = "#1b8a07", cancelColor = "#b30e0e") => {
        setAlertConfig({
            visible: true,
            title,
            message,
            confirmText,
            cancelText,
            confirmColor,
            cancelColor,
            onConfirm: () => {
                setAlertConfig(prev => ({ ...prev, visible: false }));
                if (onConfirm) onConfirm();
            },
            onCancel: () => {
                setAlertConfig(prev => ({ ...prev, visible: false }));
                if (onCancel) onCancel();
            }
        });
    };

    useEffect(() => {
        if (teamCode) {
            fetchGitDiff();
            fetchProjectDetails();
            fetchExternalGitStatus();
            fetchFilesList();

            const pollInterval = setInterval(() => {
                fetchExternalGitStatusSilently();
            }, 10000);

            return () => clearInterval(pollInterval);
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
            console.error("Error fetching project details in Git:", err);
            if (offlineWorkspaces?.project_details) {
                setProjectDetails(offlineWorkspaces.project_details);
            }
        }
    };

    const fetchGitDiff = async () => {
        if (!token) {
            if (offlineWorkspaces?.git_diff) {
                const data = offlineWorkspaces.git_diff;
                setDiffContent(data.diff || "No uncommitted changes in workspace.");
                setUntrackedFiles(data.untracked || []);
            }
            return;
        }

        const fetchTask = fetch(`${API_CONFIG.BACKEND_URL}/api/workspace/git/diff?team_code=${teamCode}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(async (res) => {
                if (res.ok) {
                    const data = await res.json();
                    setDiffContent(data.diff || "No uncommitted changes in workspace.");
                    setUntrackedFiles(data.untracked || []);
                }
            })
            .catch((err) => {
                console.error("Error fetching git diff:", err);
                if (offlineWorkspaces?.git_diff) {
                    const data = offlineWorkspaces.git_diff;
                    setDiffContent(data.diff || "No uncommitted changes in workspace.");
                    setUntrackedFiles(data.untracked || []);
                }
            });
        await runWithLoader(fetchTask, "Fetching workspace changes from the cloud...");
    };

    const setApiActiveRepo = (repos) => {
        if (repos.length > 0) {
            setActiveRepoSlot(prev => {
                const stillExists = repos.some(r => r.slot === prev);
                if (stillExists) return prev;
                return repos[0].slot;
            });
        } else {
            setActiveRepoSlot(null);
            setGitRepoPath("");
        }
    };

    const fetchExternalGitStatus = async () => {
        if (!token) {
            if (offlineWorkspaces?.git_status) {
                const data = offlineWorkspaces.git_status;
                setExternalGitData(data);
                if (data.repos && data.repos.length > 0) {
                    setApiActiveRepo(data.repos);
                }
            }
            return;
        }

        const checkTask = fetch(`${API_CONFIG.BACKEND_URL}/api/workspace/git/external?team_code=${teamCode}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(async (res) => {
                if (res.ok) {
                    const data = await res.json();
                    setExternalGitData(data);
                    if (data.repos && data.repos.length > 0) {
                        setApiActiveRepo(data.repos);
                    }
                }
            })
            .catch((err) => {
                console.error("Error checking external git:", err);
                if (offlineWorkspaces?.git_status) {
                    const data = offlineWorkspaces.git_status;
                    setExternalGitData(data);
                    if (data.repos && data.repos.length > 0) {
                        setApiActiveRepo(data.repos);
                    }
                }
            });
        await runWithLoader(checkTask, "Checking external Git repository state...");
    };

    const fetchExternalGitStatusSilently = async () => {
        if (!token) return;
        try {
            const res = await fetch(`${API_CONFIG.BACKEND_URL}/api/workspace/git/external?team_code=${teamCode}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setExternalGitData(prev => {
                    data.repos?.forEach(repo => {
                        const oldRepo = prev?.repos?.find(r => r.slot === repo.slot);
                        if (repo.has_new_commits && (!oldRepo || !oldRepo.has_new_commits)) {
                            triggerCustomAlert(
                                "New Git Commits Detected",
                                `Repository '${repo.repo_name}' has new commits. Do you want to update your workspace files with the latest changes?`,
                                () => performGitPull(repo.slot, repo.repo_name),
                                null,
                                "Update",
                                "Later"
                            );
                        }
                    });
                    return data;
                });
            }
        } catch (e) { }
    };

    const fetchFilesList = async () => {
        if (!token) {
            if (offlineWorkspaces?.files) {
                setAllFilesList(offlineWorkspaces.files.map(f => ({
                    path: f.path,
                    is_dir: false,
                    size: f.content?.length || 0,
                    last_modified: 'Offline Cached'
                })));
            }
            return;
        }
        try {
            const res = await fetch(`${API_CONFIG.BACKEND_URL}/api/workspace/files?team_code=${teamCode}&metadata=true`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAllFilesList(data.files || []);
            }
        } catch (e) { }
    };

    const handleLinkExternalGit = async () => {
        if (!newGitLink.trim()) {
            Alert.alert("Invalid Input", "Please enter a valid Git repository URL.");
            return;
        }

        const linkedSlots = externalGitData?.repos?.map(r => r.slot) || [];
        let targetSlot = 1;
        if (linkedSlots.includes(1)) {
            if (linkedSlots.includes(2)) {
                Alert.alert("Limit Reached", "Maximum of 2 repositories can be linked per project.");
                return;
            }
            targetSlot = 2;
        }

        triggerCustomAlert(
            "Public Repository Warning",
            "Are you sure you want to clone this repository? Please ensure the repository is PUBLIC. Private repositories are not supported and cloning will fail.",
            async () => {
                const linkTask = fetch(`${API_CONFIG.BACKEND_URL}/api/workspace/git/external`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        team_code: teamCode,
                        git_link: newGitLink.trim(),
                        slot: targetSlot
                    })
                })
                    .then(async (res) => {
                        const data = await res.json();
                        if (res.ok) {
                            setNewGitLink("");
                            setIsLinking(false);
                            Alert.alert("Success", "Repository linked and cloned successfully.");
                            fetchExternalGitStatus();
                            fetchFilesList();
                        } else {
                            Alert.alert("Link Failed", data.error || "Failed to link and clone repository.");
                        }
                    })
                    .catch(() => {
                        Alert.alert("Link Failed", "Network request failed.");
                    });

                await runWithLoader(linkTask, "Cloning remote Git repository...");
            },
            null,
            "Clone",
            "Cancel"
        );
    };

    const handleUnlinkExternalGit = (slot, repoName) => {
        triggerCustomAlert(
            "Confirm Delete",
            `Are you sure you want to delete and unlink repository '${repoName}'? This will delete the cloned Git repository folder from the workspace.`,
            async () => {
                const unlinkTask = fetch(`${API_CONFIG.BACKEND_URL}/api/workspace/git/external`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        team_code: teamCode,
                        git_link: null,
                        slot: slot
                    })
                })
                    .then(async (res) => {
                        if (res.ok) {
                            Alert.alert("Success", "Repository unlinked successfully.");
                            fetchExternalGitStatus();
                            fetchFilesList();
                        } else {
                            Alert.alert("Error", "Failed to unlink repository.");
                        }
                    })
                    .catch(() => Alert.alert("Error", "Network request failed."));
                await runWithLoader(unlinkTask, "Deleting Git repository...");
            },
            null,
            "Delete",
            "Cancel",
            "#b30e0e",
            "#1b8a07"
        );
    };

    const handlePullExternalGit = (slot, repoName) => {
        triggerCustomAlert(
            "Approve Update",
            `Do you approve updating workspace files for '${repoName}' from the remote Git repository? This will override local modifications in the repository directory.`,
            () => performGitPull(slot, repoName),
            null,
            "Approve",
            "Decline"
        );
    };

    const performGitPull = async (slot, repoName) => {
        const pullTask = fetch(`${API_CONFIG.BACKEND_URL}/api/workspace/git/external/pull`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ team_code: teamCode, slot: slot })
        })
            .then(async (res) => {
                const data = await res.json();
                if (res.ok) {
                    Alert.alert("Success", "Workspace successfully synced with latest Git commits.");
                    fetchExternalGitStatus();
                    fetchFilesList();
                } else {
                    Alert.alert("Pull Failed", data.error || "Failed to pull updates from remote.");
                }
            })
            .catch(() => Alert.alert("Error", "Network request failed."));
        await runWithLoader(pullTask, `Syncing Git commits for '${repoName}'...`);
    };

    const handleGitSync = async () => {
        if (!commitMessage.trim()) return;

        const syncTask = fetch(`${API_CONFIG.BACKEND_URL}/api/workspace/git/sync`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                team_code: teamCode,
                commit_message: commitMessage,
                email: user?.email
            })
        })
            .then(async (res) => {
                if (res.ok) {
                    setCommitMessage("");
                    fetchGitDiff();
                }
            });

        await runWithLoader(syncTask, "Syncing commit changes...");
    };

    // Parse git diff lines to show insertions/deletions counts dynamically
    const diffStats = React.useMemo(() => {
        if (!diffContent || diffContent === "No uncommitted changes in workspace.") {
            return { insertions: 0, deletions: 0, totalLines: 0 };
        }
        const lines = diffContent.split('\n');
        let insertions = 0;
        let deletions = 0;
        lines.forEach(l => {
            if (l.startsWith('+') && !l.startsWith('+++')) insertions++;
            else if (l.startsWith('-') && !l.startsWith('---')) deletions++;
        });
        return { insertions, deletions, totalLines: insertions + deletions };
    }, [diffContent]);

    const activeRepoName = React.useMemo(() => {
        const repo = externalGitData?.repos?.find(r => r.slot === activeRepoSlot);
        return repo ? repo.repo_name : "";
    }, [externalGitData, activeRepoSlot]);

    // Synchronize gitRepoPath when active repo changes
    useEffect(() => {
        if (activeRepoName) {
            setGitRepoPath(activeRepoName);
        }
    }, [activeRepoName]);

    const { folders: repoFolders, files: repoFiles } = React.useMemo(() => {
        if (!gitRepoPath || allFilesList.length === 0) {
            return { folders: [], files: [] };
        }
        return getRepoPathContents(allFilesList, gitRepoPath);
    }, [allFilesList, gitRepoPath]);

    const enterRepoFolder = (folderPath) => {
        setGitRepoPath(folderPath);
    };

    const exitRepoFolder = () => {
        if (!activeRepoName) return;
        if (gitRepoPath === activeRepoName) return;
        const parts = gitRepoPath.split('/');
        parts.pop();
        setGitRepoPath(parts.join('/'));
    };

    // File content opening
    const handleOpenFile = async (file) => {
        setViewedFile(file);
        setViewedFileLoading(true);
        try {
            const res = await fetch(`${API_CONFIG.BACKEND_URL}/api/workspace/file-content?team_code=${teamCode}&path=${encodeURIComponent(file.path)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setViewedFileContent(data.content || "");
            } else {
                setViewedFileContent("Failed to load file content.");
            }
        } catch (e) {
            setViewedFileContent("Network error loading file content.");
        } finally {
            setViewedFileLoading(false);
        }
    };

    const handleCloseFileViewer = () => {
        setViewedFile(null);
        setViewedFileContent("");
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
                    <Text style={styles.headerTitle}>{projectDetails?.project_name || "Git Sync"}</Text>
                    <Text style={styles.headerSubtitle}>{projectDetails?.subject || "Staging & Commits"}</Text>

                    {/* Git Status Progress Card */}
                    <View style={styles.statsCard}>
                        <View style={styles.statsHeader}>
                            <Text style={styles.statsTitle}>Git Status</Text>
                            <Text style={styles.statsTotalText}>
                                {diffStats.totalLines === 0 && untrackedFiles.length === 0 ? "Repository Clean" : "Modified Node"}
                            </Text>
                        </View>

                        {/* Segmented Color Bar */}
                        <View style={styles.progressBarContainer}>
                            <View
                                style={[
                                    styles.progressSegment,
                                    {
                                        width: diffStats.totalLines > 0 ? '70%' : '0%',
                                        backgroundColor: '#ef4444'
                                    }
                                ]}
                            />
                            <View
                                style={[
                                    styles.progressSegment,
                                    {
                                        width: untrackedFiles.length > 0 ? '30%' : '0%',
                                        backgroundColor: '#f59e0b'
                                    }
                                ]}
                            />
                        </View>

                        {/* Legend Indicators */}
                        <View style={styles.legendGrid}>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendIndicatorColor, { backgroundColor: '#ef4444' }]} />
                                <View style={styles.legendContent}>
                                    <Text style={styles.legendName} numberOfLines={1}>Modifications</Text>
                                    <Text style={styles.legendValue}>+{diffStats.insertions} / -{diffStats.deletions}</Text>
                                </View>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendIndicatorColor, { backgroundColor: '#f59e0b' }]} />
                                <View style={styles.legendContent}>
                                    <Text style={styles.legendName} numberOfLines={1}>Untracked</Text>
                                    <Text style={styles.legendValue}>{untrackedFiles.length} files</Text>
                                </View>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendIndicatorColor, { backgroundColor: '#10b981' }]} />
                                <View style={styles.legendContent}>
                                    <Text style={styles.legendName} numberOfLines={1}>Git Branch</Text>
                                    <Text style={styles.legendValue}>main</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* ── PART 2: Curved White Bottom Container ──────────── */}
                <View style={styles.whiteBottomContainer}>

                    {/* Public Git Repository Integration */}
                    <View style={styles.syncCard}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                            <Text style={styles.subSectionTitle}>Public Git Repositories</Text>

                            {(!externalGitData || !externalGitData.repos || externalGitData.repos.length < 2) && !isLinking && (
                                <TouchableOpacity
                                    style={styles.newRepoBtn}
                                    onPress={() => setIsLinking(true)}
                                    activeOpacity={0.8}
                                >
                                    <Feather name="plus" size={14} color="#6548d8ff" style={{ marginRight: 4 }} />
                                    <Text style={styles.newRepoBtnText}>New</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {isLinking && (
                            <View style={styles.linkFormWrapper}>
                                <Text style={styles.gitInstructions}>
                                    Paste a public Git URL to connect it to this project workspace (Max 2 repositories).
                                </Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={newGitLink}
                                    onChangeText={setNewGitLink}
                                    placeholder="https://github.com/owner/repository.git"
                                    placeholderTextColor="#94a3b8"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                    <TouchableOpacity
                                        style={styles.cancelLinkBtn}
                                        onPress={() => {
                                            setIsLinking(false);
                                            setNewGitLink("");
                                        }}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.cancelLinkBtnText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.confirmLinkBtn}
                                        onPress={handleLinkExternalGit}
                                        activeOpacity={0.8}
                                    >
                                        <Feather name="link" size={14} color="#ffffff" style={{ marginRight: 6 }} />
                                        <Text style={styles.confirmLinkBtnText}>Clone & Link</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {(!externalGitData || !externalGitData.repos || externalGitData.repos.length === 0) ? (
                            !isLinking && (
                                <Text style={styles.gitInstructions}>
                                    No public repositories linked. Click the "New" button above to add one.
                                </Text>
                            )
                        ) : (
                            <View>
                                {externalGitData.repos.map((repo) => (
                                    <View key={repo.slot} style={[styles.repoItemCard, activeRepoSlot === repo.slot && styles.repoItemCardActive]}>
                                        <TouchableOpacity
                                            style={styles.repoDetailsHeader}
                                            onPress={() => {
                                                setActiveRepoSlot(repo.slot);
                                                setGitRepoPath(repo.repo_name);
                                            }}
                                            activeOpacity={0.9}
                                        >
                                            <Feather name="github" size={20} color={activeRepoSlot === repo.slot ? "#6548d8ff" : "#64748b"} style={{ marginRight: 10 }} />
                                            <View style={{ flex: 1 }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    <Text style={styles.repoDetailsName}>{repo.repo_name}</Text>
                                                    <View style={[styles.slotBadge, { backgroundColor: repo.slot === 1 ? '#e0f2fe' : '#f3e8ff' }]}>
                                                        <Text style={[styles.slotBadgeText, { color: repo.slot === 1 ? '#0369a1' : '#6b21a8' }]}>Slot {repo.slot}</Text>
                                                    </View>
                                                </View>
                                                <Text style={styles.repoDetailsLink} numberOfLines={1}>{repo.git_link}</Text>
                                            </View>
                                            <Feather name={activeRepoSlot === repo.slot ? "check-circle" : "circle"} size={16} color={activeRepoSlot === repo.slot ? "#6548d8ff" : "#cbd5e1"} />
                                        </TouchableOpacity>

                                        {activeRepoSlot === repo.slot && (
                                            <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 }}>
                                                <View style={styles.repoStatusBox}>
                                                    <Text style={styles.repoStatusLabel}>Local Commit:</Text>
                                                    <Text style={styles.repoStatusHash} numberOfLines={1}>{repo.local_commit.substring(0, 10)}</Text>
                                                    <Text style={styles.repoStatusLabel}>Remote Commit:</Text>
                                                    <Text style={styles.repoStatusHash} numberOfLines={1}>{repo.remote_commit.substring(0, 10)}</Text>

                                                    {repo.has_new_commits ? (
                                                        <View style={styles.updateBadge}>
                                                            <Feather name="alert-circle" size={12} color="#f59e0b" style={{ marginRight: 4 }} />
                                                            <Text style={styles.updateBadgeText}>New commits available!</Text>
                                                        </View>
                                                    ) : (
                                                        <View style={styles.cleanBadge}>
                                                            <Feather name="check-circle" size={12} color="#10b981" style={{ marginRight: 4 }} />
                                                            <Text style={styles.cleanBadgeText}>Up to date</Text>
                                                        </View>
                                                    )}
                                                </View>

                                                <View style={styles.repoActionsRow}>
                                                    <TouchableOpacity
                                                        style={styles.unlinkBtn}
                                                        onPress={() => handleUnlinkExternalGit(repo.slot, repo.repo_name)}
                                                        activeOpacity={0.8}
                                                    >
                                                        <Feather name="trash-2" size={15} color="#ef4444" style={{ marginRight: 6 }} />
                                                        <Text style={styles.unlinkBtnText}>Delete</Text>
                                                    </TouchableOpacity>

                                                    <TouchableOpacity
                                                        style={[
                                                            styles.pullBtn,
                                                            repo.has_new_commits && styles.pullBtnHighlight
                                                        ]}
                                                        onPress={() => handlePullExternalGit(repo.slot, repo.repo_name)}
                                                        activeOpacity={0.8}
                                                    >
                                                        <Feather name="download-cloud" size={15} color="#ffffff" style={{ marginRight: 6 }} />
                                                        <Text style={styles.pullBtnText}>Pull Updates</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                ))}

                                {activeRepoName ? (
                                    <View style={[styles.treeContainer, { marginTop: 16 }]}>
                                        <View style={styles.treeHeaderRow}>
                                            <Text style={styles.treeHeaderTitle}>Repository Files Explorer ({activeRepoName})</Text>
                                            {gitRepoPath !== activeRepoName && (
                                                <TouchableOpacity style={styles.treeBackBtn} onPress={exitRepoFolder}>
                                                    <Feather name="arrow-up" size={14} color="#6548d8ff" style={{ marginRight: 4 }} />
                                                    <Text style={styles.treeBackBtnText}>Up</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                        <Text style={styles.currentPathText} numberOfLines={1}>
                                            📁 {gitRepoPath.replace(activeRepoName, '') || '/'}
                                        </Text>

                                        <View style={styles.treeList}>
                                            {repoFolders.length === 0 && repoFiles.length === 0 && (
                                                <Text style={styles.treeEmptyText}>No files inside this directory.</Text>
                                            )}
                                            {repoFolders.map((folder, idx) => (
                                                <TouchableOpacity
                                                    key={`f-${idx}`}
                                                    style={styles.treeRow}
                                                    onPress={() => enterRepoFolder(folder.path)}
                                                    activeOpacity={0.7}
                                                >
                                                    <Feather name="folder" size={16} color="#f59e0b" style={{ marginRight: 10 }} />
                                                    <Text style={styles.treeFolderName} numberOfLines={1}>{folder.name}</Text>
                                                    <Feather name="chevron-right" size={14} color="#94a3b8" />
                                                </TouchableOpacity>
                                            ))}
                                            {repoFiles.map((file, idx) => (
                                                <TouchableOpacity
                                                    key={`fl-${idx}`}
                                                    style={styles.treeRow}
                                                    onPress={() => handleOpenFile(file)}
                                                    activeOpacity={0.7}
                                                >
                                                    <Feather name="file" size={16} color="#64748b" style={{ marginRight: 10 }} />
                                                    <Text style={styles.treeFileName} numberOfLines={1}>{file.name}</Text>
                                                    <Text style={styles.treeFileSize}>{formatFileSize(file.size_bytes)}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                ) : null}
                            </View>
                        )}
                    </View>

                    {/* Commit Input Field */}
                    <View style={styles.syncCard}>
                        <Text style={styles.subSectionTitle}>Stage & Sync Changes</Text>
                        <TextInput
                            style={styles.textInput}
                            value={commitMessage}
                            onChangeText={setCommitMessage}
                            placeholder="Enter commit log message..."
                            placeholderTextColor="#94a3b8"
                        />
                        <TouchableOpacity
                            style={[
                                styles.syncBtn,
                                !commitMessage.trim() && styles.syncBtnDisabled
                            ]}
                            onPress={handleGitSync}
                            disabled={!commitMessage.trim()}
                            activeOpacity={0.8}
                        >
                            <Feather name="git-commit" size={16} color="#ffffff" style={{ marginRight: 8 }} />
                            <Text style={styles.syncBtnText}>Stage & Commit Changes</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Git Diff Output Box */}
                    <Text style={[styles.subSectionTitle, { marginTop: 12 }]}>Workspace Code Modifications (git diff)</Text>
                    <View style={styles.diffBox}>
                        <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={true}>
                            <Text style={styles.diffTextDisplay}>{diffContent}</Text>
                        </ScrollView>
                    </View>

                    {/* Untracked Files list */}
                    {untrackedFiles.length > 0 && (
                        <View style={{ marginTop: 24, marginBottom: 40 }}>
                            <Text style={styles.subSectionTitle}>Untracked Files</Text>
                            <View style={styles.untrackedWrapper}>
                                {untrackedFiles.map((uf, idx) => (
                                    <View key={idx} style={styles.untrackedRow}>
                                        <Feather name="file-plus" size={14} color="#f97316" style={{ marginRight: 8 }} />
                                        <Text style={styles.untrackedTextLine} numberOfLines={1}>
                                            {uf}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Custom alert card component */}
            <CustomAlert {...alertConfig} />

            {/* Absolute overlay file viewer */}
            {viewedFile && (
                <View style={styles.fileViewerOverlay}>
                    <View style={styles.fileViewerHeader}>
                        <TouchableOpacity style={styles.closeFileBtn} onPress={handleCloseFileViewer}>
                            <Feather name="arrow-left" size={24} color="#1e293b" />
                        </TouchableOpacity>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.fileViewerTitle} numberOfLines={1}>{viewedFile.name}</Text>
                            <Text style={styles.fileViewerSubtitle} numberOfLines={1}>{viewedFile.path}</Text>
                        </View>
                    </View>

                    {viewedFileLoading ? (
                        <View style={styles.fileViewerLoading}>
                            <Text style={{ color: '#64748b', fontWeight: '600' }}>Loading file content...</Text>
                        </View>
                    ) : (
                        <ScrollView style={styles.fileViewerScroll} contentContainerStyle={{ padding: 16 }}>
                            <Text style={styles.fileContentText} selectable={true}>
                                {viewedFileContent}
                            </Text>
                        </ScrollView>
                    )}
                </View>
            )}
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
        paddingBottom: 40,
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

    // Commit Action Card
    syncCard: {
        backgroundColor: '#f8fafc',
        borderRadius: 24,
        padding: 16,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        marginBottom: 20,
    },
    subSectionTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1e293b',
        marginBottom: 14,
        letterSpacing: 0.1,
    },
    textInput: {
        height: 48,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        paddingHorizontal: 14,
        fontSize: 14,
        color: '#0f172a',
        marginBottom: 14,
    },
    syncBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 48,
        backgroundColor: '#6548d8ff',
        borderRadius: 12,
    },
    syncBtnDisabled: {
        backgroundColor: '#94a3b8',
    },
    syncBtnText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '800',
    },

    // Diff Output Console
    diffBox: {
        backgroundColor: '#1e293b',
        padding: 16,
        borderRadius: 20,
        maxHeight: 300,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    diffTextDisplay: {
        color: '#f8fafc',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 11,
        lineHeight: 18,
    },

    // Untracked Files List style
    untrackedWrapper: {
        backgroundColor: '#fffbeb',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#fef3c7',
        padding: 16,
        gap: 10,
    },
    untrackedRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    untrackedTextLine: {
        color: '#d97706',
        fontSize: 12,
        fontWeight: '700',
        flex: 1,
    },
    gitInstructions: {
        fontSize: 13,
        color: '#64748b',
        lineHeight: 18,
        marginBottom: 16,
    },
    repoDetailsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    repoDetailsName: {
        fontSize: 15,
        fontWeight: '800',
        color: '#1e293b',
        marginBottom: 2,
    },
    repoDetailsLink: {
        fontSize: 11,
        color: '#64748b',
    },
    repoStatusBox: {
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        gap: 6,
    },
    repoStatusLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: '#94a3b8',
        textTransform: 'uppercase',
    },
    repoStatusHash: {
        fontSize: 12,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        color: '#1e293b',
        marginBottom: 4,
    },
    updateBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fffbeb',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 6,
        alignSelf: 'flex-start',
        marginTop: 4,
    },
    updateBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#d97706',
    },
    cleanBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0fdf4',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 6,
        alignSelf: 'flex-start',
        marginTop: 4,
    },
    cleanBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#10b981',
    },
    repoActionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
    },
    unlinkBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        height: 40,
        backgroundColor: '#fff1f2',
        borderWidth: 1,
        borderColor: '#ffe4e6',
        borderRadius: 10,
    },
    unlinkBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#ef4444',
    },
    pullBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 2,
        height: 40,
        backgroundColor: '#6548d8ff',
        borderRadius: 10,
    },
    pullBtnHighlight: {
        backgroundColor: '#d97706',
    },
    pullBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#ffffff',
    },
    treeContainer: {
        backgroundColor: '#f8fafc',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    treeHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    treeHeaderTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#1e293b',
    },
    treeBackBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 8,
        backgroundColor: '#f5f3ff',
        borderRadius: 8,
    },
    treeBackBtnText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#6548d8ff',
    },
    currentPathText: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '600',
        marginBottom: 12,
    },
    treeList: {
        gap: 8,
    },
    treeEmptyText: {
        textAlign: 'center',
        color: '#94a3b8',
        fontSize: 12,
        paddingVertical: 12,
    },
    treeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    treeFolderName: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1e293b',
        flex: 1,
    },
    treeFileName: {
        fontSize: 13,
        fontWeight: '500',
        color: '#334155',
        flex: 1,
    },
    treeFileSize: {
        fontSize: 11,
        color: '#94a3b8',
        fontWeight: '600',
    },
    newRepoBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 5,
        paddingHorizontal: 12,
        backgroundColor: '#f5f3ff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e9d5ff',
    },
    newRepoBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#6548d8ff',
    },
    linkFormWrapper: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 16,
        padding: 14,
        marginBottom: 16,
        gap: 10,
    },
    cancelLinkBtn: {
        flex: 1,
        height: 38,
        backgroundColor: '#f1f5f9',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelLinkBtnText: {
        color: '#64748b',
        fontWeight: '700',
        fontSize: 13,
    },
    confirmLinkBtn: {
        flex: 2,
        height: 38,
        backgroundColor: '#6548d8ff',
        borderRadius: 8,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    confirmLinkBtnText: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 13,
    },
    repoItemCard: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 16,
        padding: 12,
        marginBottom: 12,
    },
    repoItemCardActive: {
        borderColor: '#6548d8ff',
        borderWidth: 1.5,
    },
    slotBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
    },
    slotBadgeText: {
        fontSize: 9,
        fontWeight: '800',
    },
    fileViewerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#ffffff',
        zIndex: 999,
        paddingTop: Platform.OS === 'ios' ? 44 : 20,
    },
    fileViewerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    closeFileBtn: {
        padding: 4,
    },
    fileViewerTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1e293b',
    },
    fileViewerSubtitle: {
        fontSize: 11,
        color: '#64748b',
        marginTop: 1,
    },
    fileViewerLoading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fileViewerScroll: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    fileContentText: {
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 12,
        color: '#f8fafc',
        lineHeight: 18,
    },
});
