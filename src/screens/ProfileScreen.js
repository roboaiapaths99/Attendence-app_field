import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    Alert,
    Image,
    ActivityIndicator
} from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import {
    User,
    ChevronRight,
    LogOut,
    Camera as CameraIcon,
    Shield,
    Mail,
    Phone,
    MapPin,
    ArrowLeft
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Haptics from 'expo-haptics';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

const ProfileScreen = ({ navigation }) => {
    const { user: authUser, organization, logout } = useAuth();
    const primaryColor = organization?.primary_color || '#6366f1';

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showCamera, setShowCamera] = useState(false);
    const [cameraPermission, setCameraPermission] = useState(null);
    const [cameraRef, setCameraRef] = useState(null);
    const [enrolling, setEnrolling] = useState(false);

    useEffect(() => {
        fetchProfile();
        (async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setCameraPermission(status === 'granted');
        })();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const res = await client.get('/api/employee/profile');
            setUser(res.data);
        } catch (err) {
            const detail = err.response?.data?.detail;
            const msg = typeof detail === 'string' ? detail : JSON.stringify(detail) || 'Failed to load profile data.';
            Alert.alert('Error', msg);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            "Logout",
            "Are you sure you want to log out?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Logout",
                    style: "destructive",
                    onPress: async () => {
                        await AsyncStorage.clear();
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'Login' }],
                        });
                    }
                }
            ]
        );
    };

    const reEnrollFace = async () => {
        if (!cameraPermission) {
            Alert.alert('Permission Denied', 'Camera access is required for face enrollment.');
            return;
        }
        setShowCamera(true);
    };

    const takePicture = async () => {
        if (cameraRef && !enrolling) {
            try {
                setEnrolling(true);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

                const photo = await cameraRef.takePictureAsync({
                    quality: 0.7,
                });

                // Enterprise-grade optimization: Resize and compress for faster processing
                const manipulated = await ImageManipulator.manipulateAsync(
                    photo.uri,
                    [{ resize: { width: 400, height: 400 } }],
                    { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
                );

                await client.post('/api/employee/update-face', {
                    image: manipulated.base64
                });

                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Success', 'Face biometrics updated successfully.');
                setShowCamera(false);
            } catch (err) {
                console.error("[PROFILE] Face update error:", err);
                Alert.alert('Error', 'Failed to update face biometrics. Please try again.');
            } finally {
                setEnrolling(false);
            }
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6366f1" />
            </View>
        );
    }

    if (showCamera) {
        return (
            <View style={styles.cameraContainer}>
                <CameraView
                    style={styles.camera}
                    facing="front"
                    ref={ref => setCameraRef(ref)}
                >
                    <View style={styles.cameraOverlay}>
                        <View style={styles.focusFrame} />
                        <Text style={styles.cameraTitle}>Face Enrollment</Text>
                        <Text style={styles.cameraSubtitle}>Position your face in the frame</Text>

                        <View style={styles.cameraControls}>
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={() => setShowCamera(false)}
                            >
                                <ArrowLeft color="#fff" size={24} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.captureBtn}
                                onPress={takePicture}
                                disabled={enrolling}
                            >
                                {enrolling ? <ActivityIndicator color="#fff" /> : <View style={styles.captureInner} />}
                            </TouchableOpacity>

                            <View style={{ width: 48 }} />
                        </View>
                    </View>
                </CameraView>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#020617', '#0f172a', '#1e293b']} style={styles.background}>
                <SafeAreaView style={{ flex: 1 }}>
                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        <View style={styles.header}>
                            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                                <ArrowLeft color="#fff" size={24} />
                            </TouchableOpacity>
                            <View>
                                <Text style={styles.headerTitle}>Account Profile</Text>
                                <Text style={styles.headerSubtitle}>Manage your enterprise identity</Text>
                            </View>
                        </View>

                        <View style={styles.profileCard}>
                            <View style={styles.avatarContainer}>
                                <View style={[styles.avatar, { borderColor: primaryColor }]}>
                                    <User color={primaryColor} size={48} />
                                </View>
                                <TouchableOpacity style={[styles.editAvatarBtn, { backgroundColor: primaryColor }]}>
                                    <CameraIcon color="#fff" size={16} />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.name}>{user?.full_name}</Text>
                            <Text style={styles.role}>{user?.employee_type?.toUpperCase()} AGENT</Text>

                            <View style={styles.badgeContainer}>
                                <View style={styles.statusBadge}>
                                    <Shield color="#10b981" size={14} />
                                    <Text style={styles.statusText}>VERIFIED ACCESS</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Employee Details</Text>
                            <View style={styles.glassInfoCard}>
                                <View style={styles.infoRow}>
                                    <View style={styles.infoIconBox}>
                                        <Mail color="#94a3b8" size={18} />
                                    </View>
                                    <View>
                                        <Text style={styles.infoLabel}>Corporate Email</Text>
                                        <Text style={styles.infoText}>{user?.email}</Text>
                                    </View>
                                </View>
                                <View style={styles.glassDivider} />
                                <View style={styles.infoRow}>
                                    <View style={styles.infoIconBox}>
                                        <Shield color="#94a3b8" size={18} />
                                    </View>
                                    <View>
                                        <Text style={styles.infoLabel}>Employee ID</Text>
                                        <Text style={styles.infoText}>{user?.employee_id || 'LOG-9921'}</Text>
                                    </View>
                                </View>
                                <View style={styles.glassDivider} />
                                <View style={styles.infoRow}>
                                    <View style={styles.infoIconBox}>
                                        <Briefcase color="#94a3b8" size={18} />
                                    </View>
                                    <View>
                                        <Text style={styles.infoLabel}>Department</Text>
                                        <Text style={styles.infoText}>{user?.department || 'Field Operations'}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Security & Session</Text>

                            <TouchableOpacity style={styles.glassMenuItem} onPress={reEnrollFace}>
                                <View style={styles.menuItemLeft}>
                                    <View style={[styles.menuIcon, { backgroundColor: `${primaryColor}15` }]}>
                                        <CameraIcon color={primaryColor} size={20} />
                                    </View>
                                    <View>
                                        <Text style={styles.menuLabel}>Face Biometrics</Text>
                                        <Text style={styles.menuSublabel}>Update your facial authentication data</Text>
                                    </View>
                                </View>
                                <ChevronRight color="rgba(255,255,255,0.2)" size={18} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.glassMenuItem, { marginTop: 12, borderColor: 'rgba(244, 63, 94, 0.2)' }]}
                                onPress={handleLogout}
                            >
                                <View style={styles.menuItemLeft}>
                                    <View style={[styles.menuIcon, { backgroundColor: 'rgba(244, 63, 94, 0.1)' }]}>
                                        <LogOut color="#f43f5e" size={20} />
                                    </View>
                                    <View>
                                        <Text style={[styles.menuLabel, { color: '#f43f5e' }]}>Sign Out</Text>
                                        <Text style={styles.menuSublabel}>Terminate this terminal session</Text>
                                    </View>
                                </View>
                                <ChevronRight color="rgba(244, 63, 94, 0.2)" size={18} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.footer}>
                            <Text style={styles.versionText}>LogDay Field Enterprise v2.1.0</Text>
                            <Text style={styles.terminalId}>SECURE BUILD-ID: {Math.random().toString(36).substring(7).toUpperCase()}</Text>
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </LinearGradient>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    background: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' },
    scrollContent: { paddingBottom: 40 },
    header: {
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 25,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backBtn: {
        width: 44, height: 44, borderRadius: 14,
        backgroundColor: 'rgba(30, 41, 59, 0.5)',
        justifyContent: 'center', alignItems: 'center',
        marginRight: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)'
    },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
    headerSubtitle: { fontSize: 13, color: '#94a3b8', fontWeight: '600', marginTop: 2 },
    profileCard: { alignItems: 'center', padding: 24, marginTop: 10 },
    avatarContainer: { position: 'relative', marginBottom: 16 },
    avatar: {
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: 'rgba(30, 41, 59, 0.5)',
        borderWidth: 3,
        justifyContent: 'center', alignItems: 'center',
    },
    editAvatarBtn: {
        position: 'absolute', bottom: 0, right: 0,
        padding: 8, borderRadius: 20,
        borderWidth: 3, borderColor: '#020617',
    },
    name: { fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 4 },
    role: {
        fontSize: 12, color: '#94a3b8', fontWeight: '800',
        letterSpacing: 2, marginBottom: 16,
    },
    badgeContainer: { flexDirection: 'row' },
    statusBadge: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 20, gap: 6,
        borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.2)'
    },
    statusText: { color: '#10b981', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    section: { paddingHorizontal: 20, marginTop: 32 },
    sectionTitle: {
        fontSize: 12, fontWeight: '800', color: '#64748b',
        textTransform: 'uppercase', letterSpacing: 2,
        marginBottom: 16, marginLeft: 4,
    },
    glassInfoCard: {
        backgroundColor: 'rgba(30, 41, 59, 0.4)',
        borderRadius: 26, padding: 20,
        borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.06)',
    },
    infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 16 },
    infoIconBox: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.03)',
        justifyContent: 'center', alignItems: 'center'
    },
    infoLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 2 },
    infoText: { color: '#e2e8f0', fontSize: 15, fontWeight: '600' },
    glassDivider: { height: 1.5, backgroundColor: 'rgba(255, 255, 255, 0.04)', marginVertical: 4 },
    glassMenuItem: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: 'rgba(30, 41, 59, 0.4)',
        padding: 16, borderRadius: 26,
        borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.06)',
    },
    menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    menuIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    menuLabel: { color: '#fff', fontSize: 16, fontWeight: '800' },
    menuSublabel: { color: '#64748b', fontSize: 12, fontWeight: '500', marginTop: 2 },
    footer: { marginTop: 40, alignItems: 'center', opacity: 0.3, paddingBottom: 20 },
    versionText: { color: '#94a3b8', fontSize: 11, fontWeight: '700' },
    terminalId: { color: '#64748b', fontSize: 9, marginTop: 4, fontWeight: '600', letterSpacing: 1 },
    cameraContainer: { flex: 1, backgroundColor: '#000' },
    camera: { flex: 1 },
    cameraOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    focusFrame: {
        width: 250, height: 250, borderColor: '#fff', borderStyle: 'dashed',
        borderWidth: 2, borderRadius: 125,
    },
    cameraTitle: { color: '#fff', fontSize: 22, fontWeight: '900', marginTop: 40 },
    cameraSubtitle: { color: '#94a3b8', fontSize: 14, marginTop: 8, fontWeight: '600' },
    cameraControls: {
        position: 'absolute', bottom: 60,
        flexDirection: 'row', width: '100%',
        justifyContent: 'space-around', alignItems: 'center',
    },
    captureBtn: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 4, borderColor: '#fff',
    },
    captureInner: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#fff' },
    cancelBtn: {
        width: 54, height: 54, borderRadius: 27,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center', alignItems: 'center',
    }
});

export default ProfileScreen;
