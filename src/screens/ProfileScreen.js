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
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '../api/client';

const ProfileScreen = ({ navigation }) => {
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
                const photo = await cameraRef.takePictureAsync({
                    quality: 0.5,
                    base64: true
                });

                await client.post('/api/employee/update-face', {
                    image: photo.base64
                });

                Alert.alert('Success', 'Face biometrics updated successfully.');
                setShowCamera(false);
            } catch (err) {
                console.error(err);
                Alert.alert('Error', 'Failed to update face biometrics.');
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
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <ArrowLeft color="#fff" size={24} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>My Profile</Text>
                </View>

                <View style={styles.profileCard}>
                    <View style={styles.avatarContainer}>
                        <View style={styles.avatar}>
                            <User color="#6366f1" size={48} />
                        </View>
                        <TouchableOpacity style={styles.editAvatarBtn}>
                            <CameraIcon color="#fff" size={16} />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.name}>{user?.full_name}</Text>
                    <Text style={styles.role}>{user?.employee_type?.toUpperCase()} AGENT</Text>

                    <View style={styles.badgeContainer}>
                        <View style={styles.statusBadge}>
                            <Shield color="#10b981" size={14} />
                            <Text style={styles.statusText}>Active</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Contact Information</Text>
                    <View style={styles.infoCard}>
                        <View style={styles.infoRow}>
                            <Mail color="#94a3b8" size={20} />
                            <Text style={styles.infoText}>{user?.email}</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.infoRow}>
                            <Phone color="#94a3b8" size={20} />
                            <Text style={styles.infoText}>+91 98765 43210</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.infoRow}>
                            <MapPin color="#94a3b8" size={20} />
                            <Text style={styles.infoText}>Sector 62, Noida, UP</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Privacy & Security</Text>
                    <TouchableOpacity style={styles.menuItem} onPress={reEnrollFace}>
                        <View style={styles.menuItemLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                                <Shield color="#6366f1" size={20} />
                            </View>
                            <View>
                                <Text style={styles.menuLabel}>Face Biometrics</Text>
                                <Text style={styles.menuSublabel}>Re-enroll your face for verification</Text>
                            </View>
                        </View>
                        <ChevronRight color="#475569" size={20} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                        <View style={styles.menuItemLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: 'rgba(244, 63, 94, 0.1)' }]}>
                                <LogOut color="#f43f5e" size={20} />
                            </View>
                            <View>
                                <Text style={[styles.menuLabel, { color: '#f43f5e' }]}>Logout</Text>
                                <Text style={styles.menuSublabel}>Sign out of your account</Text>
                            </View>
                        </View>
                        <ChevronRight color="#475569" size={20} />
                    </TouchableOpacity>
                </View>

                <Text style={styles.versionText}>Version 1.0.4 (Final Audit Build)</Text>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0f172a',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    header: {
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backBtn: {
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        marginRight: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    profileCard: {
        alignItems: 'center',
        padding: 24,
        marginTop: 10,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#1e293b',
        borderWidth: 2,
        borderColor: '#6366f1',
        justifyContent: 'center',
        alignItems: 'center',
    },
    editAvatarBtn: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#6366f1',
        padding: 8,
        borderRadius: 20,
        borderWidth: 3,
        borderColor: '#0f172a',
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    role: {
        fontSize: 12,
        color: '#94a3b8',
        fontWeight: '700',
        letterSpacing: 2,
        marginBottom: 16,
    },
    badgeContainer: {
        flexDirection: 'row',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    statusText: {
        color: '#10b981',
        fontSize: 12,
        fontWeight: '700',
    },
    section: {
        paddingHorizontal: 20,
        marginTop: 32,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#6366f1',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
        marginLeft: 4,
    },
    infoCard: {
        backgroundColor: '#1e293b',
        borderRadius: 20,
        padding: 16,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        gap: 16,
    },
    infoText: {
        color: '#e2e8f0',
        fontSize: 15,
    },
    divider: {
        height: 1,
        backgroundColor: '#334155',
        marginLeft: 36,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#1e293b',
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    menuIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuLabel: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    menuSublabel: {
        color: '#64748b',
        fontSize: 12,
    },
    versionText: {
        textAlign: 'center',
        color: '#475569',
        fontSize: 12,
        marginTop: 40,
    },
    cameraContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    camera: {
        flex: 1,
    },
    cameraOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    focusFrame: {
        width: 250,
        height: 250,
        borderColor: '#6366f1',
        borderWidth: 2,
        borderRadius: 125,
        backgroundColor: 'transparent',
    },
    cameraTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 40,
    },
    cameraSubtitle: {
        color: '#94a3b8',
        fontSize: 14,
        marginTop: 8,
    },
    cameraControls: {
        position: 'absolute',
        bottom: 50,
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    captureBtn: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#fff',
    },
    captureInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#fff',
    },
    cancelBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    }
});

export default ProfileScreen;
