import React, { createContext, useContext } from 'react';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const theme = {
        colors: {
            backgroundStart: "#F5F7FA",
            backgroundEnd: "#FFFFFF",
            primary: "#0f172a",         // Deep Midnight Blue
            accent: "#2563eb",          // Clean Tech Blue
            danger: "#ef4444",          // Warning Red
            textMain: "#0f172a",        // Dark zinc
            textMuted: "#64748b",       // Slate grey
            borderSubtle: "rgba(226, 232, 240, 0.8)", // Slate-200 border
            glassBackground: "rgba(255, 255, 255, 0.6)", // Frosted glass opacity
        },
        styles: {
            glassCard: {
                backgroundColor: "rgba(255, 255, 255, 0.6)",
                borderWidth: 1,
                borderColor: "rgba(226, 232, 240, 0.8)",
                borderRadius: 12,
                padding: 20,
                shadowColor: "#000000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.04,
                shadowRadius: 15,
                elevation: 3, // Android shadow fallback
            },
            inputField: {
                backgroundColor: "rgba(255, 255, 255, 0.8)",
                borderWidth: 1,
                borderColor: "#cbd5e1",
                borderRadius: 8,
                paddingVertical: 10,
                paddingHorizontal: 14,
                fontSize: 14,
                color: "#0f172a",
            },
            primaryButton: {
                backgroundColor: "#0f172a",
                borderRadius: 24,
                paddingVertical: 12,
                paddingHorizontal: 24,
                alignItems: "center",
                justifyContent: "center",
                transition: "opacity 0.2s",
            }
        }
    };

    return (
        <ThemeContext.Provider value={theme}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
