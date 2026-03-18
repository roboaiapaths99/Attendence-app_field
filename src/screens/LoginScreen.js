import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform,
    SafeAreaView, StatusBar, Dimensions
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { getFriendlyErrorMessage } from '../utils/errorUtils';
import { Mail, Lock, LogIn, ChevronLeft, Building2, UserCheck } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, organization, setOrganization } = useAuth();

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Configuration Required', 'Please provide both email and password to authorize access.');
            return;
        }

        const cleanEmail = email.trim().toLowerCase();
        const cleanPassword = password.trim();

        setLoading(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const result = await login(cleanEmail, cleanPassword, organization?.organization_id);
            if (!result.success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert('Access Denied', result.message || 'The credentials provided do not match our records.');
                return;
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Connectivity Issue', getFriendlyErrorMessage(e, 'Unable to establish a secure connection to the authentication server.'));
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setOrganization(null);
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <LinearGradient
                colors={['#020617', '#0f172a', '#1e293b']}
                style={styles.background}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={handleBack}
                        activeOpacity={0.7}
                    >
                        <View style={styles.backButtonInner}>
                            <ChevronLeft size={20} color="#94a3b8" />
                            <Text style={styles.backText}>Switch Organization</Text>
                        </View>
                    </TouchableOpacity>

                    <View style={styles.header}>
                        <View style={styles.logoWrapper}>
                            {organization?.logo_url ? (
                                <Image source={{ uri: organization.logo_url }} style={styles.logo} />
                            ) : (
                                <View style={styles.logoPlaceholder}>
                                    <Building2 size={36} color="#6366f1" />
                                </View>
                            )}
                            <View style={styles.badge}>
                                <UserCheck size={12} color="#fff" />
                            </View>
                        </View>
                        <Text style={styles.title}>{organization?.name || 'LogDay Field'}</Text>
                        <Text style={styles.subtitle}>Enter your credentials to access the field portal</Text>
                    </View>

                    <View style={styles.cardContainer}>
                        <View style={styles.glassCard}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Email Address</Text>
                                <View style={styles.inputWrapper}>
                                    <Mail size={18} color="#6366f1" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="user@example.com"
                                        placeholderTextColor="#475569"
                                        value={email}
                                        onChangeText={setEmail}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Safety Password</Text>
                                <View style={styles.inputWrapper}>
                                    <Lock size={18} color="#6366f1" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="••••••••"
                                        placeholderTextColor="#475569"
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry
                                    />
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[
                                    styles.button,
                                    { backgroundColor: organization?.primary_color || '#6366f1' },
                                    loading && styles.buttonDisabled
                                ]}
                                onPress={handleLogin}
                                disabled={loading}
                                activeOpacity={0.8}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <>
                                        <Text style={styles.buttonText}>Authorize Access</Text>
                                        <LogIn size={20} color="#fff" style={styles.loginIcon} />
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Secure Terminal ID: {Platform.OS.toUpperCase()}-{height.toFixed(0)}</Text>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </LinearGradient>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    background: { flex: 1 },
    keyboardView: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },

    backButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 10 : 40,
        left: 20,
        zIndex: 10
    },
    backButtonInner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(30, 41, 59, 0.4)',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)'
    },
    backText: { color: '#94a3b8', fontSize: 13, fontWeight: '600', marginLeft: 4 },

    header: { alignItems: 'center', marginBottom: 40 },
    logoWrapper: { position: 'relative', marginBottom: 20 },
    logo: {
        width: 84, height: 84,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.1)'
    },
    logoPlaceholder: {
        width: 84, height: 84, borderRadius: 24,
        backgroundColor: 'rgba(30, 41, 59, 0.6)',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(99, 102, 241, 0.2)'
    },
    badge: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#10b981',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#020617'
    },
    title: {
        fontSize: 26,
        fontWeight: '900',
        color: '#ffffff',
        marginBottom: 8,
        textAlign: 'center',
        letterSpacing: -0.5
    },
    subtitle: {
        fontSize: 14,
        color: '#94a3b8',
        textAlign: 'center',
        fontWeight: '500',
        paddingHorizontal: 20
    },

    cardContainer: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.4,
        shadowRadius: 30,
        elevation: 10
    },
    glassCard: {
        backgroundColor: 'rgba(30, 41, 59, 0.4)',
        borderRadius: 32,
        padding: 24,
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    inputGroup: { marginBottom: 20 },
    label: {
        color: '#94a3b8',
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 8,
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 1
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        paddingHorizontal: 16,
    },
    inputIcon: { marginRight: 12 },
    input: {
        flex: 1,
        color: '#ffffff',
        fontSize: 16,
        paddingVertical: 16,
        fontWeight: '600'
    },

    button: {
        flexDirection: 'row',
        padding: 20,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 10
    },
    buttonDisabled: { opacity: 0.5 },
    buttonText: { color: '#fff', fontSize: 17, fontWeight: '800' },
    loginIcon: { marginLeft: 10 },

    footer: { marginTop: 30, alignItems: 'center' },
    footerText: { color: '#475569', fontSize: 11, fontWeight: '600', letterSpacing: 0.5 }
});
