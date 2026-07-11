import React from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    Dimensions,
    Platform,
    ScrollView,
    Image
} from 'react-native';
import { Feather } from '@expo/vector-icons';

export default function AboutUsScreen({ navigation }) {
    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.headerBlock}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                    <Feather name="arrow-left" size={24} color="#ffffff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>About Us</Text>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView 
                style={styles.contentScroll} 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.aboutCard}>
                    <Feather name="info" size={44} color="#6548d8ff" style={styles.logoIcon} />
                    <Text style={styles.title}>TeamBridge Workspace</Text>
                    <Text style={styles.versionText}>Version 1.2.0 • Release Stable</Text>

                    {/* Developer Image & Info */}
                    <Image 
                        source={require('../../assets/images/developer.png')} 
                        style={styles.developerImage} 
                    />
                    <Text style={styles.developerTitle}>Manoj G (Lead Developer)</Text>
                    <Text style={styles.developerSub}>Platform Architect & Fullstack Engineer</Text>
                    
                    <Text style={styles.sectionTitle}>Our Mission</Text>
                    <Text style={styles.paragraph}>
                        TeamBridge is designed to bridge the gap between educational course guides, project coordinators, and development teams. We provide course developers with an isolated, real-time environment to monitor workspace changes, review staging commits, collaborate in channels, and track deliverables.
                    </Text>

                    <Text style={styles.sectionTitle}>Key Ecosystem Features</Text>
                    <View style={styles.bulletList}>
                        <View style={styles.bulletItem}>
                            <Feather name="git-branch" size={14} color="#6548d8ff" style={styles.bulletIcon} />
                            <Text style={styles.bulletText}>Dual repository remote Git integration and code analysis panels.</Text>
                        </View>
                        <View style={styles.bulletItem}>
                            <Feather name="folder-plus" size={14} color="#6548d8ff" style={styles.bulletIcon} />
                            <Text style={styles.bulletText}>Isolated workspace sandbox file hosting and content inspection.</Text>
                        </View>
                        <View style={styles.bulletItem}>
                            <Feather name="check-square" size={14} color="#6548d8ff" style={styles.bulletIcon} />
                            <Text style={styles.bulletText}>Leader-governed sprint task board with target assignee locks.</Text>
                        </View>
                        <View style={styles.bulletItem}>
                            <Feather name="message-square" size={14} color="#6548d8ff" style={styles.bulletIcon} />
                            <Text style={styles.bulletText}>Real-time peer chat channels with activity progress markers.</Text>
                        </View>
                    </View>

                    <Text style={styles.sectionTitle}>How It Is Made</Text>
                    <Text style={styles.paragraph}>
                        TeamBridge Mobile is built using React Native and Expo, enabling a cross-platform compilation pipeline. The user interface leverages vanilla styling elements to deliver fluid transitions and modular view architectures. The backend is powered by a Flask microservice layer linked to a cloud-hosted MySQL data store, facilitating real-time telemetry analytics, instant team chat sync, and dual-slot Git synchronization.
                    </Text>

                    <Text style={styles.sectionTitle}>Developer Notice</Text>
                    <Text style={styles.paragraph}>
                        This mobile application is strictly optimized for internal organizational upgrades, workspace telemetry assessments, and future features upgrades. All files hosted on the staging stacks are secure.
                    </Text>

                    <Text style={styles.footerText}>© 2026 TeamBridge Dev Labs. All rights reserved.</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    headerBlock: {
        backgroundColor: '#6548d8ff',
        paddingTop: Platform.OS === 'ios' ? 60 : 44,
        paddingBottom: 24,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    backBtn: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#ffffff',
        textAlign: 'center',
    },
    contentScroll: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    aboutCard: {
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.04,
        shadowRadius: 16,
        elevation: 2,
        marginTop: 10,
    },
    logoIcon: {
        alignSelf: 'center',
        marginBottom: 12,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: '#0f172a',
        textAlign: 'center',
        marginBottom: 4,
    },
    versionText: {
        fontSize: 12,
        color: '#94a3b8',
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 28,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#1e293b',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginTop: 20,
        marginBottom: 10,
    },
    paragraph: {
        fontSize: 13,
        color: '#475569',
        lineHeight: 20,
        fontWeight: '500',
    },
    bulletList: {
        marginTop: 6,
        gap: 12,
    },
    bulletItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    bulletIcon: {
        marginRight: 10,
        marginTop: 2,
    },
    bulletText: {
        flex: 1,
        fontSize: 13,
        color: '#475569',
        lineHeight: 18,
        fontWeight: '500',
    },
    footerText: {
        fontSize: 11,
        color: '#94a3b8',
        textAlign: 'center',
        marginTop: 36,
        fontWeight: '600',
    },
    developerImage: {
        width: 140,
        height: 140,
        borderRadius: 70,
        alignSelf: 'center',
        marginTop: 10,
        marginBottom: 12,
        borderWidth: 3,
        borderColor: '#6548d8ff',
    },
    developerTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0f172a',
        textAlign: 'center',
        marginBottom: 2,
    },
    developerSub: {
        fontSize: 12,
        color: '#94a3b8',
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 24,
    },
});
