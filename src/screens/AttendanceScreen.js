import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Alert,
    ActivityIndicator, Image, Platform, Dimensions, TextInput
} from 'react-native';
import * as Location from 'expo-location';
import { CameraView, Camera } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Camera as CameraIcon, Shield, MapPin, X, RotateCcw } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function AttendanceScreen({ route, navigation }) {
    const { user, organization } = useAuth();
    const primaryColor = organization?.primary_color || '#6366f1';

    const attendanceType = route?.params?.type || 'check-in';
    const isCheckIn = attendanceType === 'check-in';

    const [hasPermission, setHasPermission] = useState(null);
    const [cameraVisible, setCameraVisible] = useState(false);
    const [photo, setPhoto] = useState(null);
    const [loading, setLoading] = useState(false);
    const [location, setLocation] = useState(null);
    const [otp, setOtp] = useState('');
    const [otpRequired, setOtpRequired] = useState(false);
    const cameraRef = useRef(null);

    useEffect(() => {
        (async () => {
            const { status: camStatus } = await Camera.requestCameraPermissionsAsync();
            const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
            setHasPermission(camStatus === 'granted' && locStatus === 'granted');
            if (camStatus === 'granted' && locStatus === 'granted') {
                try {
                    // Quick fallback to last known position
                    const lastLoc = await Location.getLastKnownPositionAsync();
                    if (lastLoc) setLocation(lastLoc);

                    // Race between fresh GPS and a 12s timeout
                    const loc = await Promise.race([
                        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('GPS Timeout')), 12000))
                    ]);
                    setLocation(loc);
                    const weakGps = (loc.coords.accuracy || 0) > 80;
                    setOtpRequired(weakGps);
                } catch (err) {
                    console.warn("[GPS] Location acquisition failed or timed out", err);
                }
            }
        })();
    }, []);

    const handleCapture = async () => {
        if (cameraRef.current) {
            const photoData = await cameraRef.current.takePictureAsync({ quality: 0.5, base64: true });
            setPhoto(photoData);
            setCameraVisible(false);
        }
    };

    const markAttendance = async () => {
        if (!photo) {
            Alert.alert('Incomplete', 'Selfie is required for verification.');
            return;
        }

        setLoading(true);
        try {
            // Optimization: Resize and Compress before sending
            const optimized = await ImageManipulator.manipulateAsync(
                photo.uri,
                [{ resize: { width: 400, height: 400 } }],
                { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
            );

            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            const isMocked = loc.mocked || false;
            const weakGps = (loc.coords.accuracy || 0) > 80;

            const payload = {
                email: user.email,
                lat: loc.coords.latitude,
                long: loc.coords.longitude,
                wifi_ssid: "Mobile_Data",
                wifi_strength: -50,
                face_image: optimized.base64,
                intended_type: attendanceType,
                mock_detected: isMocked,
                otp_used: weakGps,
                otp_code: otp || null
            };

            const response = await client.post('/smart-attendance', payload);

            Alert.alert('Verification Success', response.data.message, [
                { text: 'Dashboard', onPress: () => navigation.popToTop() }
            ]);
        } catch (e) {
            const detail = e.response?.data?.detail;
            const msg = typeof detail === 'string' ? detail : JSON.stringify(detail) || 'Identity or Territory verification failed.';
            Alert.alert('Security Violation', msg);
        } finally {
            setLoading(false);
        }
    };

    if (hasPermission === null) return <View style={styles.center}><ActivityIndicator color={primaryColor} /></View>;
    if (hasPermission === false) return (
        <View style={styles.center}>
            <Text style={{ color: '#f8fafc' }}>Permissions required to continue</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.background}>
                {cameraVisible ? (
                    <View style={styles.cameraContainer}>
                        <CameraView
                            ref={cameraRef}
                            style={styles.camera}
                            facing="front"
                        >
                            <View style={styles.cameraOverlay}>
                                <View style={styles.faceGuide} />
                                <View style={styles.cameraControls}>
                                    <TouchableOpacity
                                        style={styles.captureBtn}
                                        onPress={handleCapture}
                                    >
                                        <View style={styles.captureInner} />
                                    </TouchableOpacity>
                                </View>
                                <TouchableOpacity
                                    style={styles.closeCamera}
                                    onPress={() => setCameraVisible(false)}
                                >
                                    <X color="white" size={30} />
                                </TouchableOpacity>
                            </View>
                        </CameraView>
                    </View>
                ) : (
                    <View style={styles.content}>
                        <View style={styles.header}>
                            <TouchableOpacity onPress={() => navigation.goBack()}>
                                <X color="#94a3b8" size={24} />
                            </TouchableOpacity>
                            <Text style={styles.headerTitle}>{isCheckIn ? 'Start of Day' : 'End of Day'}</Text>
                            <View style={{ width: 24 }} />
                        </View>

                        <View style={styles.previewSection}>
                            <Text style={styles.previewLabel}>Remote Attendance</Text>
                            <TouchableOpacity
                                style={[styles.photoBox, photo && { borderColor: primaryColor }]}
                                onPress={() => setCameraVisible(true)}
                            >
                                {photo ? (
                                    <View style={{ flex: 1 }}>
                                        <Image source={{ uri: photo.uri }} style={styles.photo} />
                                        <View style={styles.photoOverlay}>
                                            <RotateCcw color="#fff" size={20} />
                                            <Text style={styles.retakeText}>Retake</Text>
                                        </View>
                                    </View>
                                ) : (
                                    <View style={styles.placeholder}>
                                        <View style={[styles.cameraIconBg, { backgroundColor: `${primaryColor}20` }]}>
                                            <CameraIcon size={32} color={primaryColor} />
                                        </View>
                                        <Text style={styles.placeholderText}>Capture Live Selfie</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>

                        <View style={styles.securitySection}>
                            <View style={styles.glassCard}>
                                <View style={styles.securityHeader}>
                                    <Shield color="#10b981" size={20} />
                                    <Text style={styles.securityTitle}>Remote {isCheckIn ? 'Check-in' : 'Check-out'} Validation</Text>
                                </View>
                                <View style={styles.securityItem}>
                                    <MapPin color="#94a3b8" size={16} />
                                    <Text style={styles.securityText}>
                                        GPS Accuracy: {location?.coords?.accuracy ? `${Math.round(location.coords.accuracy)}m` : 'Checking...'}
                                    </Text>
                                </View>
                                <View style={styles.securityItem}>
                                    <Shield color="#94a3b8" size={16} />
                                    <Text style={styles.securityText}>Selfie: Liveness required</Text>
                                </View>
                                {otpRequired && (
                                    <View style={styles.otpBox}>
                                        <Text style={styles.otpTitle}>GPS weak. Enter OTP fallback</Text>
                                        <Text style={styles.otpHint}>Request OTP from your manager if not received.</Text>
                                        <View style={styles.otpRow}>
                                            <TextInput
                                                style={[styles.otpInput, { borderColor: primaryColor }]}
                                                placeholder="Enter OTP"
                                                placeholderTextColor="#94a3b8"
                                                keyboardType="number-pad"
                                                value={otp}
                                                onChangeText={setOtp}
                                            />
                                            <TouchableOpacity
                                                style={[styles.otpRequest, { backgroundColor: `${primaryColor}20` }]}
                                                onPress={() => Alert.alert('OTP Requested', 'Ask your manager for the OTP.')}
                                            >
                                                <Text style={[styles.otpRequestText, { color: primaryColor }]}>Request OTP</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.mainBtn,
                                { backgroundColor: primaryColor },
                                (!photo || loading) && styles.disabled
                            ]}
                            onPress={markAttendance}
                            disabled={!photo || loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <>
                                    <Text style={styles.mainBtnText}>Confirm Presence</Text>
                                    <Shield color="#fff" size={20} style={{ marginLeft: 10 }} />
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                )}
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    background: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
    content: { flex: 1, padding: 24 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, marginBottom: 30 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#f8fafc' },
    previewSection: { alignItems: 'center', marginBottom: 30 },
    previewLabel: { fontSize: 14, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 20 },
    photoBox: {
        width: width * 0.7,
        aspectRatio: 1,
        backgroundColor: 'rgba(30, 41, 59, 0.7)',
        borderRadius: 150,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    photo: { width: '100%', height: '100%' },
    photoOverlay: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: 'rgba(0,0,0,0.5)', padding: 10,
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center'
    },
    retakeText: { color: '#fff', marginLeft: 8, fontSize: 12, fontWeight: '600' },
    placeholder: { alignItems: 'center' },
    cameraIconBg: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
    placeholderText: { color: '#94a3b8', fontSize: 14, fontWeight: '500' },
    securitySection: { marginBottom: 40 },
    glassCard: {
        backgroundColor: 'rgba(30, 41, 59, 0.7)',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    securityHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    securityTitle: { marginLeft: 10, color: '#f8fafc', fontWeight: 'bold' },
    securityItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, opacity: 0.7 },
    securityText: { marginLeft: 10, color: '#94a3b8', fontSize: 13 },
    otpBox: {
        marginTop: 14,
        padding: 12,
        borderRadius: 12,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)'
    },
    otpTitle: { color: '#f8fafc', fontWeight: '700', marginBottom: 4, fontSize: 13 },
    otpHint: { color: '#94a3b8', fontSize: 12, marginBottom: 10 },
    otpRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    otpInput: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        borderWidth: 1,
        color: '#f8fafc',
        backgroundColor: 'rgba(15, 23, 42, 0.5)'
    },
    otpRequest: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 },
    otpRequestText: { fontSize: 12, fontWeight: '700' },
    mainBtn: {
        flexDirection: 'row',
        padding: 20,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 10
    },
    mainBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
    disabled: { opacity: 0.4 },
    cameraContainer: { flex: 1 },
    camera: { flex: 1 },
    cameraOverlay: { flex: 1, backgroundColor: 'transparent', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 60 },
    faceGuide: {
        width: width * 0.7,
        aspectRatio: 1,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.5)',
        borderRadius: 150,
        borderStyle: 'dashed'
    },
    captureBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.2)', padding: 6 },
    captureInner: { flex: 1, borderRadius: 40, backgroundColor: '#fff' },
    closeCamera: { position: 'absolute', top: 50, right: 20, padding: 10 }
});
