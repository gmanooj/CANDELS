import React, { createContext, useContext } from 'react';
import { StyleSheet, Platform } from 'react-native';

const ThemeContext = createContext();

// ═══════════════════════════════════════════════════════════════
//  ECLIPSE DESIGN SYSTEM — CANDELS v2.0
//  Sophisticated Light Theme with Glassmorphism + Neumorphism
// ═══════════════════════════════════════════════════════════════

export function ThemeProvider({ children }) {
    const theme = {
        colors: {
            // ── Core Brand ──────────────────────────────────────────────
            primary:          '#1A1A2E',   // Deep Midnight — headings, CTAs
            accent:           '#6366F1',   // Indigo Violet — interactive focus
            accentSky:        '#0EA5E9',   // Sky Blue — data metrics, links
            accentEmerald:    '#10B981',   // Emerald — success states
            accentRose:       '#F43F5E',   // Rose — errors, destructive

            // ── Backgrounds ─────────────────────────────────────────────
            backgroundStart:  '#EEF2FF',   // Soft indigo-tinted white
            backgroundEnd:    '#F0FAFB',   // Soft sky-tinted white
            surface:          '#FFFFFF',   // Card / Panel base

            // ── Glass System ────────────────────────────────────────────
            glass:            'rgba(255, 255, 255, 0.72)',
            glassBorder:      'rgba(255, 255, 255, 0.45)',
            glassStrong:      'rgba(255, 255, 255, 0.88)',
            glassSubtle:      'rgba(255, 255, 255, 0.45)',

            // ── Text ────────────────────────────────────────────────────
            textPrimary:      '#1A1A2E',   // Deep Midnight
            textSecondary:    '#334155',   // Slate 700
            textMuted:        '#64748B',   // Slate 500
            textSubtle:       '#94A3B8',   // Slate 400

            // ── Borders & Dividers ───────────────────────────────────────
            border:           '#E2E8F0',   // Slate 200
            borderFocus:      '#6366F1',   // Indigo on focus
            divider:          'rgba(15, 23, 42, 0.06)',

            // ── Semantic States ──────────────────────────────────────────
            success:          '#10B981',
            danger:           '#F43F5E',
            warning:          '#F59E0B',
            info:             '#0EA5E9',

            // ── Sidebar Specific ─────────────────────────────────────────
            sidebarBg:        'rgba(255, 255, 255, 0.97)',
            sidebarActive:    'rgba(99, 102, 241, 0.08)',
            sidebarActiveBorder: '#6366F1',

            // ── Metric Cards ─────────────────────────────────────────────
            metricCard1:      'rgba(99, 102, 241, 0.08)',
            metricCard2:      'rgba(14, 165, 233, 0.08)',
            metricCard3:      'rgba(16, 185, 129, 0.08)',
            metricCard4:      'rgba(244, 63, 94, 0.08)',
        },

        // ── Shadow System ─────────────────────────────────────────────────
        shadows: {
            sm: {
                shadowColor: '#1A1A2E',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 8,
                elevation: 1,
            },
            md: {
                shadowColor: '#1A1A2E',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.07,
                shadowRadius: 20,
                elevation: 3,
            },
            lg: {
                shadowColor: '#1A1A2E',
                shadowOffset: { width: 0, height: 16 },
                shadowOpacity: 0.12,
                shadowRadius: 30,
                elevation: 6,
            },
            glow: (color = '#6366F1') => ({
                shadowColor: color,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.28,
                shadowRadius: 14,
                elevation: 5,
            }),
        },

        styles: StyleSheet.create({
            // ── Default Glass Card ─────────────────────────────────────────
            glassCard: {
                backgroundColor: 'rgba(255, 255, 255, 0.78)',
                borderRadius: 24,
                padding: 24,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.55)',
                shadowColor: '#1A1A2E',
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.08,
                shadowRadius: 28,
                elevation: 4,
            },

            // ── Elevated Glass Card ────────────────────────────────────────
            glassCardElevated: {
                backgroundColor: 'rgba(255, 255, 255, 0.88)',
                borderRadius: 24,
                padding: 24,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.6)',
                shadowColor: '#1A1A2E',
                shadowOffset: { width: 0, height: 20 },
                shadowOpacity: 0.12,
                shadowRadius: 36,
                elevation: 7,
            },

            // ── Subtle Glass Card ──────────────────────────────────────────
            glassCardSubtle: {
                backgroundColor: 'rgba(255, 255, 255, 0.5)',
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.35)',
                shadowColor: '#1A1A2E',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.04,
                shadowRadius: 10,
                elevation: 1,
            },

            // ── Accent Glass Card (Indigo left border) ─────────────────────
            glassCardAccent: {
                backgroundColor: 'rgba(99, 102, 241, 0.06)',
                borderRadius: 20,
                padding: 20,
                borderWidth: 1,
                borderColor: 'rgba(99, 102, 241, 0.2)',
                borderLeftWidth: 4,
                borderLeftColor: '#6366F1',
                shadowColor: '#6366F1',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.08,
                shadowRadius: 18,
                elevation: 3,
            },

            // ── Input Field ────────────────────────────────────────────────
            inputField: {
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                borderWidth: 1.5,
                borderColor: '#E2E8F0',
                borderRadius: 14,
                paddingVertical: Platform.OS === 'ios' ? 15 : 13,
                paddingHorizontal: 18,
                fontSize: 15,
                color: '#1A1A2E',
                shadowColor: '#1A1A2E',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 8,
                elevation: 1,
            },

            // ── Focused Input Field ────────────────────────────────────────
            inputFieldFocused: {
                backgroundColor: '#FFFFFF',
                borderWidth: 1.5,
                borderColor: '#6366F1',
                borderRadius: 14,
                paddingVertical: Platform.OS === 'ios' ? 15 : 13,
                paddingHorizontal: 18,
                fontSize: 15,
                color: '#1A1A2E',
                shadowColor: '#6366F1',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
                elevation: 3,
            },
        })
    };

    return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);