import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { getFriendlyErrorMessage } from '../utils/errorUtils';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, organization, setOrganization } = useAuth();

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill all fields');
            return;
        }

        const cleanEmail = email.trim().toLowerCase();
        const cleanPassword = password.trim();

        setLoading(true);
        try {
            const result = await login(cleanEmail, cleanPassword, organization.organization_id);
            if (!result.success) {
                // If the app logic returns success: false, we still treat it as an error
                Alert.alert('Login Failed', result.message || 'Invalid credentials');
                return;
            }
        } catch (e) {
            Alert.alert('Login Failed', getFriendlyErrorMessage(e, 'Incorrect email or password.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <LinearGradient
                colors={['#0f172a', '#1e293b']}
                style={styles.background}
            >
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => setOrganization(null)}
                >
                    <Text style={styles.backText}>← Change Organization</Text>
                </TouchableOpacity>

                <View style={styles.header}>
                    {organization?.logo_url ? (
                        <Image source={{ uri: organization.logo_url }} style={styles.logo} />
                    ) : (
                        <View style={styles.logoPlaceholder}>
                            <Text style={styles.logoEmoji}>🛡️</Text>
                        </View>
                    )}
                    <Text style={styles.title}>{organization?.name || 'LogDay'}</Text>
                    <Text style={styles.subtitle}>Sign in to your agent account</Text>
                </View>

                <View style={styles.glassCard}>
                    <TextInput
                        style={styles.input}
                        placeholder="Email Address"
                        placeholderTextColor="#94a3b8"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Password"
                        placeholderTextColor="#94a3b8"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />

                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: organization?.primary_color || '#6366f1' }, loading && styles.buttonDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Authorize Access</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </LinearGradient>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    background: { flex: 1, justifyContent: 'center', padding: 20 },
    backButton: { position: 'absolute', top: 60, left: 20 },
    backText: { color: '#94a3b8', fontSize: 14, fontWeight: '500' },
    header: { alignItems: 'center', marginBottom: 40 },
    logo: { width: 80, height: 80, borderRadius: 20, marginBottom: 20 },
    logoPlaceholder: {
        width: 80, height: 80, borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        justifyContent: 'center', alignItems: 'center', marginBottom: 20
    },
    logoEmoji: { fontSize: 40 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#f8fafc', marginBottom: 8 },
    subtitle: { fontSize: 16, color: '#94a3b8' },
    glassCard: {
        backgroundColor: 'rgba(30, 41, 59, 0.7)',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    input: {
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        padding: 16,
        borderRadius: 16,
        color: '#f8fafc',
        fontSize: 16,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    button: {
        padding: 18,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});
