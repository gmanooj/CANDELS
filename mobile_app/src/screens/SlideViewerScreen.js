import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useSecureOffline } from '../context/SecureOfflineContext';
import { useTheme } from '../context/ThemeContext';
import GlassCard from '../components/GlassCard';

export default function SlideViewerScreen({ route, navigation }) {
    const { offlineWorkspaces } = useSecureOffline();
    const theme = useTheme();

    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

    const isOnline = route.params?.isOnline;
    
    // Fallback if not passed in params
    let readmeContent = route.params?.readmeContent;
    if (!readmeContent) {
        if (isOnline) {
            readmeContent = "# Presentation\n---\n## Loading...";
        } else if (offlineWorkspaces) {
            const readmeFile = offlineWorkspaces.files.find(f => f.path === 'README.md');
            readmeContent = readmeFile ? readmeFile.content : '# Presentation\n---\n## No Content Available';
        } else {
            readmeContent = '# Presentation\n---\n## No Content Available';
        }
    }

    if (!isOnline && !offlineWorkspaces) {
        return (
            <View style={[styles.mainLayout, { backgroundColor: theme.colors.backgroundStart, justifyContent: 'center' }]}>
                <Text style={{ color: theme.colors.danger, textAlign: 'center' }}>
                    Access Denied: Please log in first.
                </Text>
            </View>
        );
    }

    // Split markdown using standard '---' slide separators
    const slides = readmeContent
        .split(/^[ \t]*---[ \t]*$/m)
        .map(s => s.trim())
        .filter(s => s.length > 0);

    const activeSlideMarkdown = slides[currentSlideIndex] || "## Empty Slide";

    const handlePrev = () => {
        setCurrentSlideIndex(prev => Math.max(0, prev - 1));
    };

    const handleNext = () => {
        setCurrentSlideIndex(prev => Math.min(slides.length - 1, prev + 1));
    };

    /**
     * Custom JSX Parser for native rendering
     * Since React Native Text nodes render strings raw, XSS script tags are inherently neutralized
     */
    const parseMarkdownToJSX = (text) => {
        if (!text) return null;
        
        const lines = text.split('\n');
        const elements = [];
        let inCodeBlock = false;
        let codeBlockContent = [];
        
        lines.forEach((line, index) => {
            const trimmed = line.trim();
            
            // Code block logic
            if (trimmed.startsWith('```')) {
                if (inCodeBlock) {
                    elements.push(
                        <View key={`code-${index}`} style={styles.codeBlock}>
                            <Text style={styles.codeText}>{codeBlockContent.join('\n')}</Text>
                        </View>
                    );
                    codeBlockContent = [];
                    inCodeBlock = false;
                } else {
                    inCodeBlock = true;
                }
                return;
            }
            
            if (inCodeBlock) {
                codeBlockContent.push(line);
                return;
            }

            // Headers
            if (trimmed.startsWith('# ')) {
                elements.push(
                    <View key={index} style={styles.h1Container}>
                        <Text style={[styles.h1, { color: theme.colors.primary }]}>
                            {trimmed.replace(/^#\s+/, '')}
                        </Text>
                    </View>
                );
            } else if (trimmed.startsWith('## ')) {
                elements.push(
                    <Text key={index} style={[styles.h2, { color: theme.colors.primary }]}>
                        {trimmed.replace(/^##\s+/, '')}
                    </Text>
                );
            } else if (trimmed.startsWith('### ')) {
                elements.push(
                    <Text key={index} style={[styles.h3, { color: theme.colors.accent }]}>
                        {trimmed.replace(/^###\s+/, '')}
                    </Text>
                );
            }
            // List items
            else if (trimmed.startsWith('- ')) {
                elements.push(
                    <View key={index} style={styles.listItem}>
                        <Text style={[styles.bullet, { color: theme.colors.accent }]}>Ôûá</Text>
                        <Text style={styles.listText}>{trimmed.replace(/^-\s+/, '')}</Text>
                    </View>
                );
            }
            // Blockquotes
            else if (trimmed.startsWith('>') || trimmed.startsWith('&gt;')) {
                const quoteText = trimmed.replace(/^(&gt;|>)\s*/, '');
                elements.push(
                    <View key={index} style={[styles.blockquote, { borderLeftColor: theme.colors.accent }]}>
                        <Text style={styles.blockquoteText}>{quoteText}</Text>
                    </View>
                );
            }
            // Non-text assets or images: Render elegant, graceful offline placeholders
            else if (trimmed.startsWith('![') || trimmed.includes('![')) {
                const imgMatch = trimmed.match(/!\[([^\]]*)\]\(([^)]+)\)/);
                if (imgMatch) {
                    const altText = imgMatch[1] || "Asset";
                    elements.push(
                        <View key={index} style={styles.imagePlaceholder}>
                            <Text style={styles.placeholderIcon}>­ƒû╝´©Å</Text>
                            <Text style={styles.placeholderText}>Offline Image: &quot;{altText}&quot;</Text>
                            <Text style={styles.placeholderUrl}>{imgMatch[2]}</Text>
                        </View>
                    );
                }
            }
            // Normal paragraph text
            else if (trimmed !== '') {
                // Check for inline bold markdown: **bold**
                const boldMatch = trimmed.match(/\*\*(.*?)\*\*/);
                if (boldMatch) {
                    const parts = trimmed.split(/\*\*.*?\*\*/);
                    elements.push(
                        <Text key={index} style={styles.paragraph}>
                            {parts[0]}
                            <Text style={{ fontWeight: '800', color: theme.colors.accent }}>{boldMatch[1]}</Text>
                            {parts[1]}
                        </Text>
                    );
                } else {
                    elements.push(
                        <Text key={index} style={styles.paragraph}>
                            {trimmed}
                        </Text>
                    );
                }
            }
        });

        return elements;
    };

    return (
        <View style={[styles.mainLayout, { backgroundColor: theme.colors.backgroundStart }]}>
            
            {/* Header Toolbar */}
            <View style={styles.header}>
                <View>
                    <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>SLIDES-AS-CODE</Text>
                    <Text style={styles.slideHeader}>Offline Presentation Player</Text>
                </View>
                <TouchableOpacity 
                    onPress={() => navigation.navigate("Dashboard")}
                    style={styles.closeBtn}
                >
                    <Text style={styles.closeText}>Close</Text>
                </TouchableOpacity>
            </View>

            {/* Core Slide Canvas */}
            <View style={styles.canvasContainer}>
                <GlassCard style={styles.slideCard}>
                    <ScrollView contentContainerStyle={styles.slideContent}>
                        {parseMarkdownToJSX(activeSlideMarkdown)}
                    </ScrollView>
                </GlassCard>
            </View>

            {/* Control Panel */}
            <View style={styles.playerControls}>
                <TouchableOpacity 
                    onPress={handlePrev}
                    disabled={currentSlideIndex === 0}
                    style={[styles.ctrlBtn, currentSlideIndex === 0 && styles.ctrlBtnDisabled]}
                >
                    <Text style={styles.ctrlText}>ÔåÉ Prev</Text>
                </TouchableOpacity>
                <Text style={styles.slideIndexText}>
                    Slide {currentSlideIndex + 1} of {slides.length}
                </Text>
                <TouchableOpacity 
                    onPress={handleNext}
                    disabled={currentSlideIndex === slides.length - 1}
                    style={[styles.ctrlBtn, currentSlideIndex === slides.length - 1 && styles.ctrlBtnDisabled]}
                >
                    <Text style={styles.ctrlText}>Next ÔåÆ</Text>
                </TouchableOpacity>
            </View>

        </View>
    );
}

const styles = StyleSheet.create({
    mainLayout: {
        flex: 1,
        backgroundColor: '#EEF2FF',
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        paddingBottom: 10,
    },
    subtitle: {
        fontSize: 10,
        fontWeight: '800',
        color: '#64748B',
        letterSpacing: 0.8,
    },
    slideHeader: {
        fontSize: 18,
        fontWeight: '900',
        color: '#1A1A2E',
    },
    closeBtn: {
        backgroundColor: 'rgba(99, 102, 241, 0.08)',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.2)',
    },
    closeText: {
        color: '#6366F1',
        fontSize: 12,
        fontWeight: '700',
    },
    canvasContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    slideCard: {
        height: '100%',
        maxHeight: 480,
        justifyContent: 'center',
        borderColor: 'rgba(255, 255, 255, 0.5)',
        borderWidth: 1.5,
    },
    slideContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingVertical: 10,
    },
    playerControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.5)',
        borderRadius: 24,
        paddingVertical: 10,
        paddingHorizontal: 16,
        marginVertical: 20,
        shadowColor: '#1A1A2E',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    ctrlBtn: {
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: 16,
        backgroundColor: '#6366F1',
    },
    ctrlBtnDisabled: {
        opacity: 0.3,
    },
    ctrlText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '700',
    },
    slideIndexText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#64748B',
    },

    // Scoped Markdown Render Styles
    h1Container: {
        borderBottomWidth: 2,
        borderBottomColor: '#6366F1',
        paddingBottom: 8,
        marginBottom: 16,
    },
    h1: {
        fontSize: 24,
        fontWeight: '900',
        textAlign: 'center',
    },
    h2: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 12,
        textAlign: 'center',
    },
    h3: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 10,
        textAlign: 'center',
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginVertical: 4,
        paddingHorizontal: 10,
    },
    bullet: {
        fontSize: 10,
        marginRight: 8,
        marginTop: 4,
    },
    listText: {
        fontSize: 14,
        color: '#334155',
        lineHeight: 20,
        flex: 1,
    },
    blockquote: {
        borderLeftWidth: 4,
        paddingLeft: 12,
        marginVertical: 12,
        fontStyle: 'italic',
    },
    blockquoteText: {
        fontSize: 14,
        color: '#475569',
        fontStyle: 'italic',
    },
    paragraph: {
        fontSize: 14,
        color: '#334155',
        lineHeight: 22,
        marginVertical: 8,
        textAlign: 'center',
        paddingHorizontal: 10,
    },
    codeBlock: {
        backgroundColor: 'rgba(15, 23, 42, 0.03)',
        borderWidth: 1,
        borderColor: 'rgba(15, 23, 42, 0.06)',
        borderRadius: 10,
        padding: 12,
        marginVertical: 12,
    },
    codeText: {
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        fontSize: 11,
        color: '#334155',
    },
    imagePlaceholder: {
        backgroundColor: 'rgba(15, 23, 42, 0.02)',
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: 'rgba(99, 102, 241, 0.25)',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginVertical: 15,
    },
    placeholderIcon: {
        fontSize: 24,
        marginBottom: 4,
    },
    placeholderText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#475569',
    },
    placeholderUrl: {
        fontSize: 10,
        color: '#94a3b8',
        marginTop: 2,
    }
});
