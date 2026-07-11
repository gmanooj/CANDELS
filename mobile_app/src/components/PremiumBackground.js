import React, { useEffect, useRef } from "react";
import { StyleSheet, Dimensions, View, Animated, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");

export default function PremiumBackground() {
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.timing(anim, {
                toValue: 1,
                duration: 28000,
                useNativeDriver: true,
            })
        ).start();
    }, [anim]);

    // Create orbiting transforms for the soft glowing orbs
    const createOrbTransform = (radiusX, radiusY, reverse = false) => {
        const angle = anim.interpolate({
            inputRange: [0, 1],
            outputRange: reverse ? ['360deg', '0deg'] : ['0deg', '360deg']
        });
        
        const x = anim.interpolate({
            inputRange: [0, 0.25, 0.5, 0.75, 1],
            outputRange: [0, radiusX, 0, -radiusX, 0]
        });
        
        const y = anim.interpolate({
            inputRange: [0, 0.25, 0.5, 0.75, 1],
            outputRange: [0, radiusY, 0, -radiusY, 0]
        });

        return [{ rotate: angle }, { translateX: x }, { translateY: y }];
    };

    return (
        <View style={styles.container} pointerEvents="none">
            {/* Base Background Image */}
            <Image 
                source={require("../../assets/images/modern-workplace-arrangement-with-empty-phone.jpg")} 
                style={StyleSheet.absoluteFillObject}
                resizeMode="cover"
            />

            {/* Glowing Light Orbs using Eclipse Light Theme Colors */}
            <Animated.View style={[styles.orb, styles.orb1, { transform: createOrbTransform(width * 0.3, height * 0.15) }]} />
            <Animated.View style={[styles.orb, styles.orb2, { transform: createOrbTransform(width * 0.2, height * 0.25, true) }]} />
            <Animated.View style={[styles.orb, styles.orb3, { transform: createOrbTransform(-width * 0.25, height * 0.2) }]} />
            <Animated.View style={[styles.orb, styles.orb4, { transform: createOrbTransform(-width * 0.15, -height * 0.2, true) }]} />

            {/* Premium Soft White Vignettes to blend the colors into an airy mesh gradient */}
            <LinearGradient
                colors={["rgba(255, 255, 255, 0.5)", "transparent", "transparent", "rgba(255, 255, 255, 0.8)"]}
                locations={[0, 0.25, 0.75, 1]}
                style={StyleSheet.absoluteFill}
            />
            <LinearGradient
                colors={["rgba(255, 255, 255, 0.5)", "transparent", "transparent", "rgba(255, 255, 255, 0.5)"]}
                start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
                locations={[0, 0.15, 0.85, 1]}
                style={StyleSheet.absoluteFill}
            />
            
            {/* Frosted glass overall tint to subdue background details for text readability */}
            <View style={styles.frostOverlay} />
        </View>
    );
}

const ORB_SIZE = width * 1.6;

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "#ffffffff", 
        overflow: "hidden",
        justifyContent: "center",
        alignItems: "center",
    },
    orb: {
        position: "absolute",
        width: ORB_SIZE,
        height: ORB_SIZE,
        borderRadius: ORB_SIZE / 2,
    },
    orb1: {
        backgroundColor: "#ffffff13", 
        opacity: 0.2,
        top: -ORB_SIZE * 0.3,
        left: -ORB_SIZE * 0.3,
    },
    orb2: {
        backgroundColor: "#ffffff91", 
        opacity: 0.2,
        bottom: -ORB_SIZE * 0.3,
        right: -ORB_SIZE * 0.35,
    },
    orb3: {
        backgroundColor: "#ffffffff", 
        opacity: 0.08,
        top: -ORB_SIZE * 0.1,
        right: -ORB_SIZE * 0.4,
    },
    orb4: {
        backgroundColor: "#ffffffff", 
        opacity: 0.07,
        bottom: -ORB_SIZE * 0.1,
        left: -ORB_SIZE * 0.2,
    },
    frostOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(255, 255, 255, 0.65)", // Subdues background details for text readability
    }
});