import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder, Easing } from 'react-native';
import { Feather } from '@expo/vector-icons';

function LoadingSpinner({ size = 18, color = '#FFFFFF' }) {
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

export default function SlideButton({
    title,
    onSlideComplete,
    disabled = false,
    loading = false,
}) {
    const [containerWidth, setContainerWidth] = useState(0);
    const THUMB_SIZE = 52;
    const PADDING = 4;
    
    const pan = useRef(new Animated.Value(0)).current;
    
    const maxSlide = containerWidth > 0 ? containerWidth - THUMB_SIZE - (PADDING * 2) : 0;

    const latestState = useRef({ disabled, loading, maxSlide, onSlideComplete });
    useEffect(() => {
        latestState.current = { disabled, loading, maxSlide, onSlideComplete };
    }, [disabled, loading, maxSlide, onSlideComplete]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => !latestState.current.disabled && !latestState.current.loading,
            onMoveShouldSetPanResponder: (e, gesture) => {
                if (latestState.current.disabled || latestState.current.loading) return false;
                return Math.abs(gesture.dx) > Math.abs(gesture.dy) && Math.abs(gesture.dx) > 2;
            },
            onMoveShouldSetPanResponderCapture: (e, gesture) => {
                if (latestState.current.disabled || latestState.current.loading) return false;
                return Math.abs(gesture.dx) > Math.abs(gesture.dy) && Math.abs(gesture.dx) > 2;
            },
            onPanResponderGrant: () => {
                pan.setOffset(pan._value);
                pan.setValue(0);
            },
            onPanResponderMove: (e, gesture) => {
                const { maxSlide } = latestState.current;
                let newX = gesture.dx;
                if (newX < 0) newX = 0;
                if (newX > maxSlide) newX = maxSlide;
                pan.setValue(newX);
            },
            onPanResponderRelease: (e, gesture) => {
                pan.flattenOffset();
                const { maxSlide, onSlideComplete } = latestState.current;
                if (maxSlide > 0 && pan._value >= maxSlide * 0.85) { 
                    Animated.timing(pan, {
                        toValue: maxSlide,
                        duration: 150,
                        useNativeDriver: false,
                    }).start(() => {
                        if (onSlideComplete) {
                            onSlideComplete(() => {
                                Animated.spring(pan, {
                                    toValue: 0,
                                    useNativeDriver: false,
                                    bounciness: 8,
                                }).start();
                            });
                        }
                    });
                } else {
                    Animated.spring(pan, {
                        toValue: 0,
                        useNativeDriver: false,
                        bounciness: 8,
                    }).start();
                }
            },
            onPanResponderTerminate: () => {
                pan.flattenOffset();
                Animated.spring(pan, {
                    toValue: 0,
                    useNativeDriver: false,
                    bounciness: 8,
                }).start();
            }
        })
    ).current;

    useEffect(() => {
        if (!loading && !disabled) {
            Animated.spring(pan, {
                toValue: 0,
                useNativeDriver: false,
                bounciness: 8,
            }).start();
        }
    }, [loading, disabled]);

    const trackFillWidth = pan.interpolate({
        inputRange: [0, maxSlide > 0 ? maxSlide : 1],
        outputRange: [THUMB_SIZE + (PADDING * 2), containerWidth],
        extrapolate: 'clamp',
    });

    const textOpacity = pan.interpolate({
        inputRange: [0, maxSlide > 0 ? maxSlide * 0.5 : 1],
        outputRange: [1, 0],
        extrapolate: 'clamp',
    });

    return (
        <View 
            style={[styles.container, disabled && styles.disabled]}
            onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        >
            <View style={styles.textContainer} pointerEvents="none">
                <Animated.Text style={[styles.titleText, { opacity: textOpacity }]}>
                    {loading ? 'Verifying...' : title}
                </Animated.Text>
            </View>

            <Animated.View style={[styles.activeTrack, { width: trackFillWidth }]} pointerEvents="none" />

            <Animated.View
                style={[
                    styles.thumb,
                    { transform: [{ translateX: pan }] }
                ]}
                {...panResponder.panHandlers}
            >
                {loading ? (
                    <LoadingSpinner size={16} color="#FFFFFF" />
                ) : (
                    <Text style={styles.arrowIcon}>»</Text>
                )}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 60,
        backgroundColor: 'rgba(15, 23, 42, 0.05)', 
        borderRadius: 90,
        justifyContent: 'center',
        padding: 4,
        marginTop: 8,
        position: 'relative',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(15, 23, 42, 0.08)',
    },
    disabled: {
        opacity: 0.6,
    },
    textContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    titleText: {
        color: '#64748B',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
        marginLeft: 20, // Offset for thumb
    },
    activeTrack: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        backgroundColor: 'rgba(251, 110, 26, 0.1)', // light orange background trail
        borderRadius: 90,
        zIndex: 2,
    },
    thumb: {
        width: 50,
        height: 50,
        backgroundColor: '#fb6e1aff',
        borderRadius: 90,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 3,
        shadowColor: '#fb6e1aff',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 5,
    },
    arrowIcon: {
        color: '#FFFFFF',
        fontSize: 26,
        fontWeight: '500',
        lineHeight: 30, // to vertically align properly
        marginLeft: 2, // slight optical adjustment
    },
});
