import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
    ImageBackground
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import { LinearGradient } from 'expo-linear-gradient';

export default function OrganizationSelectionScreen({ navigation }) {
    const [slug, setSlug] = useState('');
    const [loading, setLoading] = useState(false);
    const { setOrganization } = useAuth();

    const handleDiscover = async () => {
        if (!slug) {
            Alert.alert('Required', 'Please enter your Organization Code');
            return;
        }

        setLoading(true);
        try {
            const response = await client.get(`/organization/discover/${slug.toLowerCase().trim()}`);
            setOrganization(response.data);
        } catch (e) {
            Alert.alert(
                'Not Found',
                'We couldn\'t find an organization with that code. Please check with your administrator.'
            );
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
                <View style={styles.content}>
                    <Text style={styles.emoji}>🏢</Text>
                    <Text style={styles.title}>LogDay Field</Text>
                    <Text style={styles.subtitle}>Enter your company code to continue</Text>

                    <View style={styles.glassCard}>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. acme-corp"
                            placeholderTextColor="#94a3b8"
                            value={slug}
                            onChangeText={setSlug}
                            autoCapitalize="none"
                        />

                        <TouchableOpacity
                            style={[styles.button, loading && styles.buttonDisabled]}
                            onPress={handleDiscover}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>Continue</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.footer}>
                        Don't have a code? Contact your HR department.
                    </Text>
                </View>
            </LinearGradient>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    background: { flex: 1, justifyContent: 'center', padding: 20 },
    content: { alignItems: 'center' },
    emoji: { fontSize: 60, marginBottom: 20 },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#f8fafc',
        marginBottom: 8,
        fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif'
    },
    subtitle: {
        fontSize: 16,
        color: '#94a3b8',
        textAlign: 'center',
        marginBottom: 40
    },
    glassCard: {
        width: '100%',
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
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    button: {
        backgroundColor: '#6366f1',
        padding: 18,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    footer: {
        marginTop: 30,
        color: '#64748b',
        fontSize: 14,
        textAlign: 'center'
    }
});
