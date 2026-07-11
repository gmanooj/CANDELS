import React, { useState, useEffect, useRef } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    TouchableOpacity, 
    Platform, 
    Animated, 
    Dimensions,
    TextInput,
    Easing
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { API_CONFIG } from '../../../config/api';
import { useSecureOffline } from '../../../context/SecureOfflineContext';
import GlassCard from '../../../components/GlassCard';
import FileFolderAnimation from '../../../components/FileFolderAnimation';

function LoadingSpinner({ size = 24, color = '#6548d8ff' }) {
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

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Category colors and icons based on file extension ──────────
const getFileStyleProps = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    let icon = 'file';
    let bgColor = 'rgba(100, 116, 139, 0.08)';
    let color = '#64748b';

    if (['js', 'jsx', 'ts', 'tsx'].includes(ext)) {
        icon = 'code';
        bgColor = 'rgba(59, 130, 246, 0.1)';
        color = '#3b82f6';
    } else if (ext === 'html' || ext === 'css') {
        icon = 'layout';
        bgColor = 'rgba(99, 102, 241, 0.1)';
        color = '#6366f1';
    } else if (ext === 'py') {
        icon = 'terminal';
        bgColor = 'rgba(249, 115, 22, 0.1)';
        color = '#f97316';
    } else if (ext === 'sql') {
        icon = 'database';
        bgColor = 'rgba(139, 92, 246, 0.1)';
        color = '#8b5cf6';
    } else if (['env', 'config', 'key', 'json'].includes(ext)) {
        icon = 'key';
        bgColor = 'rgba(16, 185, 129, 0.1)';
        color = '#10b981';
    } else if (['md', 'txt', 'pdf'].includes(ext)) {
        icon = 'file-text';
        bgColor = 'rgba(236, 72, 153, 0.1)';
        color = '#ec4899';
    }

    return { icon, bgColor, color };
};

const formatFileSize = (bytes) => {
    if (bytes === 0 || !bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp * 1000);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
};

// ── Virtual directory tree extractor ───────────────────────────
const getPathContents = (fileItems, currentPath) => {
    const folders = new Set();
    const files = [];

    fileItems.forEach(item => {
        const p = item.path;
        if (currentPath === "") {
            const parts = p.split('/');
            if (parts.length === 1) {
                files.push(item);
            } else {
                folders.add(parts[0]);
            }
        } else {
            const prefix = currentPath + '/';
            if (p.startsWith(prefix)) {
                const relative = p.substring(prefix.length);
                const parts = relative.split('/');
                if (parts.length === 1) {
                    files.push(item);
                } else {
                    folders.add(parts[0]);
                }
            }
        }
    });

    return {
        folders: Array.from(folders).map(folderName => {
            const folderPath = currentPath === "" ? folderName : `${currentPath}/${folderName}`;
            const recursiveItems = fileItems.filter(item => item.path === folderPath || item.path.startsWith(folderPath + '/'));
            const totalBytes = recursiveItems.reduce((acc, curr) => acc + (curr.size_bytes || 0), 0);
            return {
                name: folderName,
                path: folderPath,
                itemCount: recursiveItems.length,
                size: formatFileSize(totalBytes)
            };
        }),
        files: files.map(item => {
            const parts = item.path.split('/');
            const fileName = parts[parts.length - 1];
            return {
                name: fileName,
                path: item.path,
                size: formatFileSize(item.size_bytes),
                date: formatDate(item.modified_at)
            };
        })
    };
};

export default function FilesTab({ teamCode, token, runWithLoader, handleUserScroll }) {
    const { offlineWorkspaces } = useSecureOffline();
    const [filesList, setFilesList] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [fileContent, setFileContent] = useState("");
    const [fileContentLoading, setFileContentLoading] = useState(false);

    const [projectDetails, setProjectDetails] = useState(null);

    // Explorer 2-Screen Layout & Navigation States
    const [activeScreen, setActiveScreen] = useState("my-files"); // 'my-files' | 'folders'
    const [currentPath, setCurrentPath] = useState("");
    const [viewMode, setViewMode] = useState("list"); // 'list' | 'grid'
    const [searchQuery, setSearchQuery] = useState("");
    const [searchActive, setSearchActive] = useState(false);

    // Animation States
    const [isFolderOpened, setIsFolderOpened] = useState(false);
    const [isTransitionDone, setIsTransitionDone] = useState(false);

    const animScale = useRef(new Animated.Value(1.5)).current;
    const animTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT * 0.25)).current;
    const animTranslateX = useRef(new Animated.Value(0)).current;
    const contentOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (teamCode) {
            fetchFiles();
        }
    }, [teamCode]);

    const fetchFiles = async () => {
        if (!token) {
            if (offlineWorkspaces) {
                if (offlineWorkspaces.project_details) {
                    setProjectDetails(offlineWorkspaces.project_details);
                }
                if (offlineWorkspaces.files) {
                    setFilesList(offlineWorkspaces.files.map(f => ({
                        path: f.path,
                        size_bytes: f.content?.length || 0,
                        modified_at: Math.floor(Date.now() / 1000)
                    })));
                }
            }
            return;
        }

        const fetchTask = (async () => {
            try {
                // Trigger backend workspace self-healing / regeneration of folder if missing
                const statusRes = await fetch(`${API_CONFIG.BACKEND_URL}/api/workspace/status?team_code=${teamCode}`);
                if (statusRes.ok) {
                    const statusData = await statusRes.json();
                    setProjectDetails(statusData);
                }
                
                const res = await fetch(`${API_CONFIG.BACKEND_URL}/api/workspace/files?team_code=${teamCode}&metadata=true`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.files) {
                        setFilesList(data.files);
                    }
                }
            } catch (err) {
                console.error("Error fetching files:", err);
                if (offlineWorkspaces) {
                    if (offlineWorkspaces.project_details) setProjectDetails(offlineWorkspaces.project_details);
                    if (offlineWorkspaces.files) {
                        setFilesList(offlineWorkspaces.files.map(f => ({
                            path: f.path,
                            size_bytes: f.content?.length || 0,
                            modified_at: Math.floor(Date.now() / 1000)
                        })));
                    }
                }
            }
        })();
        await runWithLoader(fetchTask, "Fetching workspace files from the cloud...");
    };

    const fetchFileContent = async (file) => {
        if (!token) {
            if (offlineWorkspaces && offlineWorkspaces.files) {
                const cachedFile = offlineWorkspaces.files.find(f => f.path === file.path);
                setFileContent(cachedFile ? cachedFile.content : "No offline content cached.");
            }
            return;
        }

        try {
            const res = await fetch(`${API_CONFIG.BACKEND_URL}/api/workspace/file-content?team_code=${teamCode}&path=${encodeURIComponent(file.path)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setFileContent(data.content || "");
            }
        } catch (e) {
            console.error("Error loading file content:", e);
            if (offlineWorkspaces && offlineWorkspaces.files) {
                const cachedFile = offlineWorkspaces.files.find(f => f.path === file.path);
                setFileContent(cachedFile ? cachedFile.content : "No offline content cached.");
            }
        } finally {
            setFileContentLoading(false);
        }
    };

    const handleFileSelect = (file) => {
        setSelectedFile(file);
        setFileContentLoading(true);
        setIsFolderOpened(true);
        setIsTransitionDone(false);

        // Reset Animations for full screen center
        animScale.setValue(1.5);
        animTranslateY.setValue(SCREEN_HEIGHT * 0.25);
        animTranslateX.setValue(0);
        contentOpacity.setValue(0);

        // Allow CSS folder to open (800ms)
        setTimeout(() => {
            // Shrink and move to top left
            Animated.parallel([
                Animated.timing(animScale, { toValue: 0.35, duration: 600, useNativeDriver: true }),
                Animated.timing(animTranslateY, { toValue: 10, duration: 600, useNativeDriver: true }),
                Animated.timing(animTranslateX, { toValue: - (SCREEN_WIDTH / 2 - 80), duration: 600, useNativeDriver: true })
            ]).start(() => {
                setIsTransitionDone(true);
                Animated.timing(contentOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
            });

            fetchFileContent(file);
        }, 1000);
    };

    const closeFile = () => {
        setSelectedFile(null);
        setFileContent("");
        setIsFolderOpened(false);
        setIsTransitionDone(false);
    };

    const navigateUp = () => {
        if (currentPath === "") {
            setActiveScreen("my-files");
            return;
        }
        const parts = currentPath.split('/');
        parts.pop();
        setCurrentPath(parts.join('/'));
    };

    const handleFolderSelect = (folder) => {
        setCurrentPath(folder.path);
        setActiveScreen("folders");
        setSearchQuery("");
    };

    const setSwitchedToFoldersScreen = (path) => {
        setCurrentPath(path);
        setActiveScreen("folders");
        setSearchQuery("");
    };

    const rawPaths = filesList.map(item => item.path);

    // Calculate file distribution stats
    const stats = React.useMemo(() => {
        let frontendCount = 0;
        let backendCount = 0;
        let databaseCount = 0;
        let configCount = 0;
        let docCount = 0;
        let otherCount = 0;

        let frontendBytes = 0;
        let backendBytes = 0;
        let databaseBytes = 0;
        let configBytes = 0;
        let docBytes = 0;
        let otherBytes = 0;

        let totalBytes = 0;

        filesList.forEach(item => {
            const p = item.path;
            const size = item.size_bytes || 0;
            totalBytes += size;

            const ext = p.split('.').pop().toLowerCase();
            const parts = p.split('/');
            
            if (['js', 'jsx', 'ts', 'tsx', 'html', 'css'].includes(ext)) {
                frontendCount++;
                frontendBytes += size;
            } else if (['py', 'go', 'java', 'php', 'rb'].includes(ext) || parts[0] === 'backend') {
                backendCount++;
                backendBytes += size;
            } else if (ext === 'sql') {
                databaseCount++;
                databaseBytes += size;
            } else if (['env', 'config', 'json', 'key', 'yaml', 'yml'].includes(ext)) {
                configCount++;
                configBytes += size;
            } else if (['md', 'txt', 'pdf'].includes(ext)) {
                docCount++;
                docBytes += size;
            } else {
                otherCount++;
                otherBytes += size;
            }
        });

        const totalFiles = filesList.length || 1;

        return {
            totalFiles,
            totalBytes,
            categories: [
                { name: 'Frontend', count: frontendCount, percentage: (frontendCount / totalFiles) * 100, color: '#3b82f6', size: formatFileSize(frontendBytes) },
                { name: 'Backend', count: backendCount, percentage: (backendCount / totalFiles) * 100, color: '#6366f1', size: formatFileSize(backendBytes) },
                { name: 'Database', count: databaseCount, percentage: (databaseCount / totalFiles) * 100, color: '#f97316', size: formatFileSize(databaseBytes) },
                { name: 'Configs', count: configCount, percentage: (configCount / totalFiles) * 100, color: '#10b981', size: formatFileSize(configBytes) },
                { name: 'Docs', count: docCount, percentage: (docCount / totalFiles) * 100, color: '#ec4899', size: formatFileSize(docBytes) },
                { name: 'Other', count: otherCount, percentage: (otherCount / totalFiles) * 100, color: '#64748b', size: formatFileSize(otherBytes) }
            ].filter(c => c.count > 0)
        };
    }, [filesList]);

    // Tree extraction based on active level
    const { folders, files } = getPathContents(filesList, currentPath);
    const { folders: rootFolders } = getPathContents(filesList, "");

    const isSearching = searchQuery.trim().length > 0;
    
    // Part 1: Flat files list
    const allFiles = filesList.map(item => {
        const fileName = item.path.split('/').pop();
        return {
            name: fileName,
            path: item.path,
            size: formatFileSize(item.size_bytes),
            date: formatDate(item.modified_at)
        };
    });

    // Part 2: Folder files filter
    const filteredFolders = isSearching ? [] : folders.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const filteredFiles = isSearching 
        ? filesList.filter(item => {
            const fileName = item.path.split('/').pop();
            return fileName.toLowerCase().includes(searchQuery.toLowerCase());
          }).map(item => {
            const fileName = item.path.split('/').pop();
            return {
                name: fileName,
                path: item.path,
                size: formatFileSize(item.size_bytes),
                date: formatDate(item.modified_at)
            };
          })
        : files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const isWorkspaceEmpty = filesList.length === 0;

    return (
        <View style={styles.container}>
            {/* Absolute overlay for the full-screen transition phase */}
            {selectedFile && !isTransitionDone && (
                <Animated.View style={[
                    styles.transitionOverlay,
                    { transform: [{ scale: animScale }, { translateY: animTranslateY }, { translateX: animTranslateX }] }
                ]}>
                    <FileFolderAnimation isOpened={isFolderOpened} />
                </Animated.View>
            )}

            {selectedFile ? (
                // ── SCREEN 3: File Content Viewer Overlay ────────────────────────
                <Animated.View style={[styles.viewerContainer, { opacity: contentOpacity }]}>
                    <View style={styles.viewerHeaderBlock}>
                        <TouchableOpacity style={styles.viewerBackButton} onPress={closeFile}>
                            <Feather name="arrow-left" size={24} color="#ffffff" />
                        </TouchableOpacity>
                        <Text style={styles.viewerHeaderTitle} numberOfLines={1}>
                            {selectedFile.name}
                        </Text>
                        <View style={{ width: 40 }} />
                    </View>

                    <ScrollView 
                        style={styles.viewerContentWrapper} 
                        contentContainerStyle={styles.viewerContentScroll}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.viewerMetaCard}>
                            <Feather name="file-text" size={32} color="#6548d8ff" style={{ marginBottom: 12 }} />
                            <Text style={styles.viewerMetaPath}>{selectedFile.path}</Text>
                            <Text style={styles.viewerMetaDetail}>{selectedFile.size} • Modified {selectedFile.date}</Text>
                        </View>

                        <Text style={styles.viewerBodyTitle}>Content Preview</Text>
                        <View style={styles.viewerCodeBox}>
                            {fileContentLoading ? (
                                <View style={{ alignItems: 'center', justifyContent: 'center', marginVertical: 40 }}>
                                    <LoadingSpinner size={28} color="#ffffff" />
                                </View>
                            ) : (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <Text style={styles.codeTextDisplay}>{fileContent}</Text>
                                </ScrollView>
                            )}
                        </View>
                    </ScrollView>
                </Animated.View>
            ) : (
                // ── MAIN FILE EXPLORER SCROLL VIEW ───────────────────────────────
                <ScrollView 
                    style={styles.container} 
                    contentContainerStyle={styles.scrollContainer}
                    showsVerticalScrollIndicator={false}
                    onScroll={handleUserScroll}
                    scrollEventThrottle={16}
                >
                    {activeScreen === "my-files" ? (
                        // ── PART 1: "My Files" Overview Screen ────────────────────
                        <View style={styles.screenWrapper}>
                            <View style={styles.blueHeaderContainer}>
                                <Text style={styles.headerTitle}>{projectDetails?.project_name || "My Files"}</Text>
                                <Text style={styles.headerSubtitle}>{projectDetails?.subject || "Collaborative Workspace"}</Text>

                                {/* Storage Stats Card */}
                                <View style={styles.statsCard}>
                                    <View style={styles.statsHeader}>
                                        <Text style={styles.statsTitle}>Storage</Text>
                                        <Text style={styles.statsTotalText}>
                                            {formatFileSize(stats.totalBytes)} of 50 MB Used
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
                                                    <Text style={styles.legendValue}>{c.size}</Text>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            </View>

                            {/* White Bottom Section */}
                            <View style={styles.whiteBottomContainer}>
                                {/* Workspace Folders horizontal selector */}
                                {rootFolders.length > 0 && (
                                    <View style={{ marginBottom: 26 }}>
                                        <View style={styles.sectionHeaderRow}>
                                            <Text style={styles.sectionHeaderTitle}>Workspace Folders</Text>
                                            <TouchableOpacity onPress={() => setSwitchedToFoldersScreen("")}>
                                                <Text style={styles.viewAllBtnText}>View All</Text>
                                            </TouchableOpacity>
                                        </View>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalFolderScroll}>
                                            {rootFolders.map((folder, idx) => (
                                                <TouchableOpacity 
                                                    key={idx} 
                                                    style={styles.folderPillCard}
                                                    onPress={() => handleFolderSelect(folder)}
                                                    activeOpacity={0.8}
                                                >
                                                    <Feather name="folder" size={18} color="#4F52FF" style={{ marginRight: 8 }} />
                                                    <Text style={styles.folderPillName} numberOfLines={1}>{folder.name}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}

                                {/* Recent Flat Files List */}
                                <View style={styles.sectionHeaderRow}>
                                    <Text style={styles.sectionHeaderTitle}>Recent Files</Text>
                                    <TouchableOpacity onPress={() => setSwitchedToFoldersScreen("")}>
                                        <Text style={styles.viewAllBtnText}>View All</Text>
                                    </TouchableOpacity>
                                </View>

                                {isWorkspaceEmpty ? (
                                    <View style={styles.emptyContainer}>
                                        <Feather name="info" size={32} color="#94a3b8" />
                                        <Text style={styles.emptyText}>This workspace repository has no files.</Text>
                                    </View>
                                ) : (
                                    <View style={styles.listWrapper}>
                                        {allFiles.map((file, idx) => {
                                            const { icon, bgColor, color } = getFileStyleProps(file.name);
                                            return (
                                                <TouchableOpacity 
                                                    key={idx} 
                                                    style={styles.fileRowList}
                                                    onPress={() => handleFileSelect(file)}
                                                    activeOpacity={0.8}
                                                >
                                                    <View style={styles.fileLeftWrapList}>
                                                        <View style={[styles.fileIconCircleList, { backgroundColor: bgColor }]}>
                                                            <Feather name={icon} size={16} color={color} />
                                                        </View>
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={styles.fileNameList} numberOfLines={1}>{file.name}</Text>
                                                            <Text style={styles.fileDateList}>{file.date}</Text>
                                                        </View>
                                                    </View>
                                                    <View style={styles.fileRightWrapList}>
                                                        <Text style={styles.fileSizeList}>{file.size}</Text>
                                                        <TouchableOpacity style={styles.threeDotButton} activeOpacity={0.7}>
                                                            <Feather name="more-vertical" size={16} color="#94a3b8" />
                                                        </TouchableOpacity>
                                                    </View>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                )}
                            </View>
                        </View>
                    ) : (
                        // ── PART 2: "Folders" Browser Screen ─────────────────────
                        <View style={styles.screenWrapper}>
                            <View style={styles.blueHeaderContainer}>
                                <View style={styles.headerRow}>
                                    <TouchableOpacity style={styles.headerIconBtn} onPress={() => setActiveScreen('my-files')}>
                                        <Feather name="arrow-left" size={24} color="#ffffff" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.headerIconBtn} onPress={() => setSearchActive(!searchActive)}>
                                        <Feather name="search" size={24} color="#ffffff" />
                                    </TouchableOpacity>
                                </View>
                                <Text style={styles.headerTitle}>Folders</Text>
                            </View>

                            {/* White Bottom Section */}
                            <View style={styles.whiteBottomContainer}>
                                {/* Path directory breadcrumbs and Settings */}
                                <View style={styles.foldersSubHeaderRow}>
                                    <View style={styles.breadcrumbsContainer}>
                                        {currentPath !== "" && (
                                            <TouchableOpacity style={styles.miniBackBtn} onPress={navigateUp}>
                                                <Feather name="chevron-left" size={16} color="#4F52FF" />
                                            </TouchableOpacity>
                                        )}
                                        <Text style={styles.breadcrumbsText} numberOfLines={1}>
                                            {currentPath === "" ? "Workspace Root" : currentPath.split('/').join(' / ')}
                                        </Text>
                                    </View>

                                    <View style={styles.foldersActionButtons}>
                                        <TouchableOpacity 
                                            style={styles.foldersActionButton}
                                            onPress={() => setViewMode(viewMode === "list" ? "grid" : "list")}
                                            activeOpacity={0.8}
                                        >
                                            <Feather name={viewMode === "list" ? "grid" : "list"} size={16} color="#64748b" />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Search Input panel */}
                                {searchActive && (
                                    <View style={styles.searchContainer}>
                                        <Feather name="search" size={16} color="#94a3b8" style={styles.searchIcon} />
                                        <TextInput
                                            style={styles.searchInput}
                                            placeholder="Search directory..."
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
                                )}

                                {/* Subfolders List/Grid */}
                                {filteredFolders.length > 0 && (
                                    <View style={{ marginBottom: 20 }}>
                                        <Text style={styles.foldersSectionTitle}>Subfolders</Text>
                                        {viewMode === "grid" ? (
                                            <View style={styles.gridWrapper}>
                                                {filteredFolders.map((folder, idx) => (
                                                    <TouchableOpacity 
                                                        key={idx} 
                                                        style={styles.folderCardGrid}
                                                        onPress={() => handleFolderSelect(folder)}
                                                        activeOpacity={0.8}
                                                    >
                                                        <View style={styles.folderIconWrapGrid}>
                                                            <Feather name="folder" size={28} color="#4F52FF" />
                                                        </View>
                                                        <Text style={styles.folderNameGrid} numberOfLines={1}>{folder.name}</Text>
                                                        <Text style={styles.folderMetaGrid}>{folder.itemCount} items</Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        ) : (
                                            <View style={styles.listWrapper}>
                                                {filteredFolders.map((folder, idx) => (
                                                    <TouchableOpacity 
                                                        key={idx} 
                                                        style={styles.folderRowList}
                                                        onPress={() => handleFolderSelect(folder)}
                                                        activeOpacity={0.8}
                                                    >
                                                        <View style={styles.folderLeftWrapList}>
                                                            <View style={styles.folderIconWrapList}>
                                                                <Feather name="folder" size={22} color="#4F52FF" />
                                                            </View>
                                                            <Text style={styles.folderNameList} numberOfLines={1}>{folder.name}</Text>
                                                        </View>
                                                        <View style={styles.folderRightWrapList}>
                                                            <Text style={styles.folderSizeList}>{folder.size}</Text>
                                                            <Text style={styles.folderCountList}>{folder.itemCount} items</Text>
                                                        </View>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        )}
                                    </View>
                                )}

                                {/* Files List/Grid */}
                                {filteredFiles.length > 0 && (
                                    <View style={{ marginBottom: 20 }}>
                                        <Text style={styles.foldersSectionTitle}>Files</Text>
                                        {viewMode === "grid" ? (
                                            <View style={styles.gridWrapper}>
                                                {filteredFiles.map((file, idx) => {
                                                    const { icon, bgColor, color } = getFileStyleProps(file.name);
                                                    return (
                                                        <TouchableOpacity 
                                                            key={idx} 
                                                            style={styles.fileCardGrid}
                                                            onPress={() => handleFileSelect(file)}
                                                            activeOpacity={0.8}
                                                        >
                                                            <View style={[styles.fileIconCircleGrid, { backgroundColor: bgColor }]}>
                                                                <Feather name={icon} size={18} color={color} />
                                                            </View>
                                                            <Text style={styles.fileNameGrid} numberOfLines={2}>{file.name}</Text>
                                                            <Text style={styles.fileMetaGrid}>{file.size}</Text>
                                                        </TouchableOpacity>
                                                    );
                                                })}
                                            </View>
                                        ) : (
                                            <View style={styles.listWrapper}>
                                                {filteredFiles.map((file, idx) => {
                                                    const { icon, bgColor, color } = getFileStyleProps(file.name);
                                                    return (
                                                        <TouchableOpacity 
                                                            key={idx} 
                                                            style={styles.fileRowList}
                                                            onPress={() => handleFileSelect(file)}
                                                            activeOpacity={0.8}
                                                        >
                                                            <View style={styles.fileLeftWrapList}>
                                                                <View style={[styles.fileIconCircleList, { backgroundColor: bgColor }]}>
                                                                    <Feather name={icon} size={16} color={color} />
                                                                </View>
                                                                <View style={{ flex: 1 }}>
                                                                    <Text style={styles.fileNameList} numberOfLines={1}>{file.name}</Text>
                                                                    <Text style={styles.fileDateList}>{file.date}</Text>
                                                                </View>
                                                            </View>
                                                            <View style={styles.fileRightWrapList}>
                                                                <Text style={styles.fileSizeList}>{file.size}</Text>
                                                                <TouchableOpacity style={styles.threeDotButton} activeOpacity={0.7}>
                                                                    <Feather name="more-vertical" size={16} color="#94a3b8" />
                                                                </TouchableOpacity>
                                                            </View>
                                                        </TouchableOpacity>
                                                    );
                                                })}
                                            </View>
                                        )}
                                    </View>
                                )}

                                {/* Folder Empty States */}
                                {filteredFolders.length === 0 && filteredFiles.length === 0 && (
                                    <View style={styles.emptyContainer}>
                                        <Feather name="info" size={32} color="#94a3b8" />
                                        <Text style={styles.emptyText}>This folder has no files or subfolders.</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    )}
                </ScrollView>
            )}
        </View>
    );
}

// ── Stylesheets ────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        margin:-10,
        flex: 1,
        backgroundColor: '#6548d8ff', // Solid header color fills background cleanly
    },
    scrollContainer: {
        flexGrow: 1,
    },
    screenWrapper: {
        flex: 1,
    },
    // Solid Blue Header block
    blueHeaderContainer: {
        backgroundColor: '#6548d8ff',
        paddingTop: Platform.OS === 'ios' ? 24 : 16,
        paddingBottom: 36,
        paddingHorizontal: 20,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerIconBtn: {
        padding: 4,
    },
    profileCircle: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
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

    // White Bottom Curved card
    whiteBottomContainer: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 36,
        borderTopRightRadius: 36,
        paddingHorizontal: 20,
        paddingTop: 32,
        minHeight: SCREEN_HEIGHT * 0.65,
        marginTop: -16, // slides slightly under the header
    },

    // Storage Stats Card (Mockup)
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

    // Workspace Folder scroll selector
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionHeaderTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#1e293b',
        letterSpacing: 0.1,
    },
    viewAllBtnText: {
        fontSize: 12,
        color: '#6548d8ff',
        fontWeight: '700',
    },
    horizontalFolderScroll: {
        paddingVertical: 4,
    },
    folderPillCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.01,
        shadowRadius: 4,
        elevation: 1,
    },
    folderPillName: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1e293b',
        maxWidth: 100,
    },

    // Directory list views
    listWrapper: {
        gap: 10,
    },
    gridWrapper: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },

    // Folders view Stage 2
    foldersSubHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 18,
    },
    breadcrumbsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 8,
    },
    miniBackBtn: {
        padding: 5,
        backgroundColor: '#f1f5f9',
        borderRadius: 10,
        marginRight: 8,
    },
    breadcrumbsText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#1e293b',
        flexShrink: 1,
    },
    foldersActionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    foldersActionButton: {
        padding: 8,
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    foldersSectionTitle: {
        fontSize: 11,
        fontWeight: '800',
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: 1.0,
        marginBottom: 12,
        marginTop: 6,
    },

    // Search bar
    searchContainer: {
        marginBottom: 16,
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

    // Folder styles grid
    folderCardGrid: {
        width: '48%',
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
    folderIconWrapGrid: {
        marginBottom: 16,
    },
    folderNameGrid: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 4,
    },
    folderMetaGrid: {
        fontSize: 11,
        color: '#94a3b8',
        fontWeight: '600',
    },

    // Folder styles list
    folderRowList: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f8fafc',
        borderRadius: 18,
        padding: 14,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.01,
        shadowRadius: 4,
        elevation: 1,
    },
    folderLeftWrapList: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    folderIconWrapList: {
        marginRight: 12,
    },
    folderNameList: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1e293b',
        flexShrink: 1,
    },
    folderMetaList: {
        fontSize: 11,
        color: '#94a3b8',
        fontWeight: '600',
    },
    folderRightWrapList: {
        alignItems: 'flex-end',
    },
    folderSizeList: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '700',
    },
    folderCountList: {
        fontSize: 10,
        color: '#94a3b8',
        fontWeight: '600',
        marginTop: 2,
    },

    // File styles grid
    fileCardGrid: {
        width: '48%',
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
    fileIconCircleGrid: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    fileNameGrid: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 8,
        height: 36,
    },
    fileMetaGrid: {
        fontSize: 11,
        color: '#94a3b8',
        fontWeight: '600',
    },

    // File styles list
    fileRowList: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f8fafc',
        borderRadius: 18,
        padding: 12,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.01,
        shadowRadius: 4,
        elevation: 1,
    },
    fileLeftWrapList: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    fileIconCircleList: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    fileNameList: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1e293b',
        flexShrink: 1,
    },
    fileDateList: {
        fontSize: 11,
        color: '#94a3b8',
        fontWeight: '600',
        marginTop: 2,
    },
    fileRightWrapList: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    fileSizeList: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '700',
    },
    threeDotButton: {
        padding: 6,
    },

    // Empty State
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 36,
        backgroundColor: '#f8fafc',
        borderRadius: 24,
        marginTop: 10,
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

    // File content viewer
    viewerContainer: {
        flex: 1,
        backgroundColor: '#ffffff',
        minHeight: SCREEN_HEIGHT,
    },
    viewerHeaderBlock: {
        backgroundColor: '#6548d8ff',
        paddingTop: Platform.OS === 'ios' ? 44 : 20,
        paddingBottom: 20,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    viewerBackButton: {
        padding: 4,
    },
    viewerHeaderTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#ffffff',
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 12,
    },
    viewerContentWrapper: {
        flex: 1,
        paddingHorizontal: 20,
    },
    viewerContentScroll: {
        paddingTop: 20,
        paddingBottom: 40,
    },
    viewerMetaCard: {
        backgroundColor: '#f8fafc',
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#f1f5f9',
        marginBottom: 24,
    },
    viewerMetaPath: {
        fontSize: 15,
        fontWeight: '800',
        color: '#1e293b',
        textAlign: 'center',
        marginBottom: 4,
    },
    viewerMetaDetail: {
        fontSize: 11,
        color: '#94a3b8',
        fontWeight: '600',
    },
    viewerBodyTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: 1.0,
        marginBottom: 12,
    },
    viewerCodeBox: {
        backgroundColor: '#1e293b',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
    },
    codeContentScroll: {
        maxHeight: 350,
    },
    codeTextDisplay: {
        color: '#f8fafc',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 12,
        lineHeight: 18,
    },
    transitionOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 999,
        elevation: 10,
    },
    cardSpacing: {
        marginHorizontal: 16,
        marginBottom: 15,
        marginTop: 10,
    },
    fileViewerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    headerLeftWrap: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    minimizedLogoWrap: {
        marginRight: -10,
        marginLeft: -10,
    },
    fileViewerTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#3b82f6',
        maxWidth: SCREEN_WIDTH * 0.5,
    },
    fileViewerClose: {
        fontSize: 13,
        color: '#ef4444',
        fontWeight: 'bold',
        padding: 5,
    },
});
