import React, { useState } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    TouchableOpacity, 
    TextInput, 
    KeyboardAvoidingView, 
    Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useLoading } from '../context/LoadingContext';
import { API_CONFIG } from '../config/api';

const TEAL_COLOR = '#6548d8';
const ORANGE_COLOR = '#F27A1A';

export default function CreateTeamScreen({ navigation }) {
    const { user, token } = useAuth();
    const { runWithLoader } = useLoading();

    const [teamMeta, setTeamMeta] = useState({
        project_name: "",
        subject: "",
        workplaceName: "",
        workplaceType: "College",
        max_team_size: 3,
        timeline_value: 3,
        timeline_unit: "Months",
        target_industry: "Technology",
        workspace_visibility: "Public"
    });

    const [guideInputId, setGuideInputId] = useState("");
    const [peerInputs, setPeerInputs] = useState({}); 

    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const handleDeployPipeline = async () => {
        setErrorMessage("");
        setSuccessMessage("");

        if (!teamMeta.project_name || !teamMeta.subject || !teamMeta.workplaceName) {
            setErrorMessage("Please fill all required project metadata fields.");
            return;
        }

        if (!guideInputId.trim()) {
            setErrorMessage("Safety Validation Guard: You must assign a target Faculty/Guide Token before initialization.");
            return;
        }

        const payload = {
            leaderCode: user?.user_code,
            projectName: teamMeta.project_name,
            subject: teamMeta.subject,
            workplaceName: teamMeta.workplaceName,
            workplaceType: teamMeta.workplaceType,
            maxSize: parseInt(teamMeta.max_team_size),
            timelineValue: parseInt(teamMeta.timeline_value),
            timelineUnit: teamMeta.timeline_unit,
            targetIndustry: teamMeta.target_industry,
            workspaceVisibility: teamMeta.workspace_visibility,
            facultyCode: guideInputId.trim().toUpperCase(),
            peers: peerInputs 
        };

        const deployTask = fetch(`${API_CONFIG.BACKEND_URL}/api/team/initialize`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        })
        .then(async (res) => {
            const data = await res.json();
            if (res.ok) {
                setSuccessMessage("Project pipeline deployed successfully! Invitations dispatched.");
                setTeamMeta({ 
                    project_name: "", subject: "", workplaceName: "", 
                    workplaceType: "College", max_team_size: 3, timeline_value: 3, 
                    timeline_unit: "Months", target_industry: "Technology", workspace_visibility: "Public" 
                });
                setGuideInputId("");
                setPeerInputs({});
            } else {
                setErrorMessage(data.error || "Initialization failed.");
            }
        })
        .catch(() => {
            setErrorMessage("Network structural fault connecting to database cluster mapping hooks.");
        });

        await runWithLoader(deployTask, "Deploying workspace pipeline...");
    };

    const InputField = ({ label, value, onChange, placeholder, keyboardType, flex, editable = true }) => (
        <View style={[styles.inputContainer, flex && { flex }]}>
            <Text style={styles.label}>{label}</Text>
            <View style={[styles.inputWrapper, !editable && styles.inputWrapperDisabled]}>
                <TextInput 
                    style={styles.input}
                    value={value}
                    onChangeText={onChange}
                    placeholder={placeholder}
                    placeholderTextColor="#A0A0A0"
                    keyboardType={keyboardType}
                    editable={editable}
                />
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Feather name="arrow-left" size={24} color="#000" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Initialize Workspace</Text>
                    <TouchableOpacity style={styles.headerSaveBtn} onPress={handleDeployPipeline}>
                        <Feather name="check-circle" size={14} color={TEAL_COLOR} style={{marginRight: 4}} />
                        <Text style={styles.headerSaveText}>Save</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    
                    {/* Logo Section */}
                    <View style={styles.logoSection}>
                        <View style={styles.logoCircle}>
                            <Feather name="image" size={28} color="#888" />
                        </View>
                        <Text style={styles.addLogoText}>Add Logo</Text>
                    </View>

                    {/* Alerts */}
                    {errorMessage ? (
                        <View style={styles.errorBox}><Text style={styles.errorText}>{errorMessage}</Text></View>
                    ) : null}
                    {successMessage ? (
                        <View style={styles.successBox}><Text style={styles.successText}>{successMessage}</Text></View>
                    ) : null}

                    {/* Form Section */}
                    <InputField 
                        label="Project Title" 
                        value={teamMeta.project_name} 
                        onChange={v => setTeamMeta({...teamMeta, project_name: v})} 
                        placeholder="Autonomous Edge Routing"
                    />

                    <InputField 
                        label="Subject Domain" 
                        value={teamMeta.subject} 
                        onChange={v => setTeamMeta({...teamMeta, subject: v})} 
                        placeholder="Distributed Architecture"
                    />

                    <View style={styles.row}>
                        <InputField 
                            label="Institution Type" 
                            value={teamMeta.workplaceType} 
                            onChange={v => setTeamMeta({...teamMeta, workplaceType: v})} 
                            flex={1}
                        />
                        <View style={{width: 12}} />
                        <InputField 
                            label="Institution Name" 
                            value={teamMeta.workplaceName} 
                            onChange={v => setTeamMeta({...teamMeta, workplaceName: v})} 
                            flex={1}
                        />
                    </View>

                    <View style={styles.row}>
                        <InputField 
                            label="Visibility" 
                            value={teamMeta.workspace_visibility} 
                            onChange={v => setTeamMeta({...teamMeta, workspace_visibility: v})} 
                            flex={1}
                        />
                        <View style={{width: 12}} />
                        <InputField 
                            label="Max Slots" 
                            value={teamMeta.max_team_size?.toString()} 
                            onChange={v => setTeamMeta({...teamMeta, max_team_size: parseInt(v) || 3})} 
                            flex={1}
                            keyboardType="numeric"
                        />
                    </View>

                    <View style={styles.divider} />
                    
                    <View style={styles.subCard}>
                        <View style={styles.subCardHeader}>
                            <Text style={styles.subCardTitle}>Faculty Guide Token</Text>
                            <TouchableOpacity style={styles.editBtn}>
                                <Feather name="edit-2" size={12} color={TEAL_COLOR} />
                                <Text style={styles.editText}>Edit</Text>
                            </TouchableOpacity>
                        </View>
                        <TextInput 
                            style={styles.minimalInput}
                            value={guideInputId}
                            onChangeText={setGuideInputId}
                            placeholder="e.g. TB-FAC-8058"
                            autoCapitalize="characters"
                        />
                    </View>

                    <View style={styles.divider} />
                    
                    <Text style={styles.sectionHeaderTitle}>Peer Slot Allocation</Text>
                    
                    <InputField 
                        label="Slot 1 (Creator)" 
                        value={`${user?.user_code} (You)`} 
                        onChange={() => {}} 
                        editable={false}
                    />

                    {[...Array(Math.max(1, teamMeta.max_team_size - 1)).keys()].map((idx) => {
                        const currentSlot = idx + 2;
                        return (
                            <InputField 
                                key={currentSlot}
                                label={`Slot ${currentSlot} Assignment`}
                                value={peerInputs[currentSlot] || ""}
                                onChange={v => setPeerInputs({...peerInputs, [currentSlot]: v.trim().toUpperCase()})} 
                                placeholder="Colleague Token (e.g. TB-STU-7622)"
                            />
                        );
                    })}

                    <View style={styles.bottomSpacer} />

                </ScrollView>

                {/* Bottom Action Footer */}
                <View style={styles.footerAction}>
                    <TouchableOpacity style={styles.footerBtn} onPress={handleDeployPipeline}>
                        <Text style={styles.footerBtnText}>Deploy Pipeline</Text>
                    </TouchableOpacity>
                </View>

            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F8F9FB',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: '#FFFFFF',
    },
    backBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#111',
    },
    headerSaveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(101, 72, 216, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    headerSaveText: {
        fontSize: 14,
        fontWeight: '700',
        color: TEAL_COLOR,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 100,
    },
    logoSection: {
        alignItems: 'center',
        marginBottom: 30,
    },
    logoCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#EEEEEE',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    addLogoText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    inputContainer: {
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: '#555',
        marginBottom: 6,
        marginLeft: 2,
    },
    inputWrapper: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        height: 48,
        justifyContent: 'center',
    },
    inputWrapperDisabled: {
        backgroundColor: '#F1F5F9',
    },
    input: {
        flex: 1,
        paddingHorizontal: 16,
        fontSize: 15,
        color: '#111',
    },
    divider: {
        height: 1,
        backgroundColor: '#E2E8F0',
        marginVertical: 20,
    },
    subCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    subCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    subCardTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#111',
    },
    editBtn: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    editText: {
        fontSize: 12,
        fontWeight: '700',
        color: TEAL_COLOR,
        marginLeft: 4,
    },
    minimalInput: {
        fontSize: 15,
        color: '#333',
        paddingVertical: 4,
    },
    sectionHeaderTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#111',
        marginBottom: 16,
    },
    footerAction: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingVertical: 16,
        paddingBottom: Platform.OS === 'ios' ? 34 : 16,
        backgroundColor: '#F8F9FB',
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
    },
    footerBtn: {
        backgroundColor: ORANGE_COLOR,
        height: 54,
        borderRadius: 27,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: ORANGE_COLOR,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    footerBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    errorBox: {
        backgroundColor: '#FEE2E2',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    errorText: {
        color: '#DC2626',
        fontSize: 13,
        fontWeight: '600',
    },
    successBox: {
        backgroundColor: '#D1FAE5',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    successText: {
        color: '#059669',
        fontSize: 13,
        fontWeight: '600',
    },
    bottomSpacer: {
        height: 80,
    }
});
