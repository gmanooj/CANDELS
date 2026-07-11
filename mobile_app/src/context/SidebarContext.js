import React, { createContext, useContext, useState, useRef } from 'react';
import { Animated, Easing, Dimensions, View, StyleSheet } from 'react-native';

const SidebarContext = createContext(null);
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = SCREEN_WIDTH * 0.75;

export function SidebarProvider({ children }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const sidebarAnimVal = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
    const backdropOpacityVal = useRef(new Animated.Value(0)).current;

    const toggleSidebar = () => {
        if (isSidebarOpen) {
            closeSidebar();
        } else {
            openSidebar();
        }
    };

    const closeSidebar = () => {
        Animated.parallel([
            Animated.timing(sidebarAnimVal, {
                toValue: -SIDEBAR_WIDTH,
                duration: 300,
                easing: Easing.bezier(0.25, 1, 0.5, 1),
                useNativeDriver: true
            }),
            Animated.timing(backdropOpacityVal, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true
            })
        ]).start(() => {
            setIsSidebarOpen(false);
        });
    };

    const openSidebar = () => {
        setIsSidebarOpen(true);
        Animated.parallel([
            Animated.timing(sidebarAnimVal, {
                toValue: 0,
                duration: 350,
                easing: Easing.bezier(0.25, 1, 0.5, 1),
                useNativeDriver: true
            }),
            Animated.timing(backdropOpacityVal, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true
            })
        ]).start();
    };

    return (
        <SidebarContext.Provider value={{ 
            isSidebarOpen, 
            toggleSidebar, 
            closeSidebar, 
            openSidebar,
            sidebarAnimVal,
            backdropOpacityVal,
            SIDEBAR_WIDTH
        }}>
            <View style={styles.providerContainer}>
                {children}
            </View>
        </SidebarContext.Provider>
    );
}

export function useSidebar() {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new Error('useSidebar must be used within a SidebarProvider');
    }
    return context;
}

const styles = StyleSheet.create({
    providerContainer: {
        flex: 1,
    }
});
