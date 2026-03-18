import React, { useState, useEffect } from 'react';
import {
    Modal, View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, Dimensions, ScrollView, Platform
} from 'react-native';
import {
    X, Wifi, Globe, Zap, Shield, CheckCircle2,
    AlertCircle, RefreshCw, Activity
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import NetInfo from '@react-native-community/netinfo';
import * as Location from 'expo-location';
import client from '../api/client';

const { width, height } = Dimensions.get('window');

export default function DiagnosticModal({ visible, onClose }) {
    const [results, setResults] = useState({
        network: { status: 'pending', detail: 'Waiting...' },
        dns: { status: 'pending', detail: 'Waiting...' },
        api: { status: 'pending', detail: 'Waiting...' },
        gps: { status: 'pending', detail: 'Waiting...' }
    });
    const [running, setRunning] = useState(false);

    const runTests = async () => {
        setRunning(true);
        setResults({
            network: { status: 'running', detail: 'Checking adapter...' },
            dns: { status: 'running', detail: 'Resolving host...' },
            api: { status: 'running', detail: 'Ping backend...' },
            gps: { status: 'running', detail: 'Acquiring lock...' }
        });

        // 1. Network Adapter
        const netState = await NetInfo.fetch();
        setResults(prev => ({
            ...prev,
            network: {
                status: netState.isConnected ? 'success' : 'error',
                detail: netState.type + (netState.isConnected ? ' Connected' : ' No Link')
            }
        }));

        // 2. DNS / External Internet
        try {
            const google = await fetch('https://8.8.8.8', { method: 'HEAD' }).catch(() => null);
            setResults(prev => ({
                ...prev,
                dns: { status: google ? 'success' : 'error', detail: google ? 'Internet OK' : 'DNS/Portal Issue' }
            }));
        } catch (e) {
            setResults(prev => ({ ...prev, dns: { status: 'error', detail: 'No Internet' } }));
        }

        // 3. API Connectivity
        try {
            const start = Date.now();
            const res = await client.get('/health', { timeout: 5000 });
            const latency = Date.now() - start;
            setResults(prev => ({
                ...prev,
                api: { status: 'success', detail: `Connected (${latency}ms)` }
            }));
        } catch (e) {
            setResults(prev => ({
                ...prev,
                api: { status: 'error', detail: e.response?.status ? `HTTP ${e.response.status}` : 'Backend Unreachable' }
            }));
        }

        // 4. GPS
        try {
            const { status } = await Location.getForegroundPermissionsAsync();
            if (status !== 'granted') {
                setResults(prev => ({ ...prev, gps: { status: 'error', detail: 'Permission Denied' } }));
            } else {
                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                setResults(prev => ({
                    ...prev,
                    gps: { status: 'success', detail: `Acc: ${Math.round(loc.coords.accuracy)}m` }
                }));
            }
        } catch (e) {
            setResults(prev => ({ ...prev, gps: { status: 'error', detail: 'Timeout/Disabled' } }));
        }

        setRunning(false);
    };

    useEffect(() => {
        if (visible) runTests();
    }, [visible]);

    const StatusIcon = ({ status }) => {
        if (status === 'running') return <ActivityIndicator size="small" color="#6366f1" />;
        if (status === 'success') return <CheckCircle2 size={20} color="#10b981" />;
        if (status === 'error') return <AlertCircle size={20} color="#f43f5e" />;
        return <Activity size={20} color="#94a3b8" />;
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <View style={styles.headerTitles}>
                            <Text style={styles.title}>System Diagnostics</Text>
                            <Text style={styles.subtitle}>Enterprise Connectivity Audit</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X color="#94a3b8" size={20} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.body}>
                        <TestRow
                            icon={Wifi}
                            label="Network Interface"
                            status={results.network.status}
                            detail={results.network.detail}
                            StatusIcon={StatusIcon}
                        />
                        <TestRow
                            icon={Globe}
                            label="Internet Backbone"
                            status={results.dns.status}
                            detail={results.dns.detail}
                            StatusIcon={StatusIcon}
                        />
                        <TestRow
                            icon={Zap}
                            label="API Handshake"
                            status={results.api.status}
                            detail={results.api.detail}
                            StatusIcon={StatusIcon}
                        />
                        <TestRow
                            icon={Shield}
                            label="Positioning (GPS)"
                            status={results.gps.status}
                            detail={results.gps.detail}
                            StatusIcon={StatusIcon}
                        />

                        <View style={styles.infoBox}>
                            <Activity size={16} color="#6366f1" />
                            <Text style={styles.infoText}>
                                If API Handshake fails while Internet is OK, the backend might be under maintenance.
                            </Text>
                        </View>
                    </ScrollView>

                    <TouchableOpacity
                        style={[styles.retryBtn, running && styles.disabled]}
                        onPress={runTests}
                        disabled={running}
                    >
                        {running ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <RefreshCw size={18} color="#fff" style={{ marginRight: 10 }} />
                                <Text style={styles.retryText}>Run Full Audit</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const TestRow = ({ icon: Icon, label, status, detail, StatusIcon }) => (
    <View style={styles.testRow}>
        <View style={[styles.iconBox, { backgroundColor: status === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)' }]}>
            <Icon size={20} color={status === 'success' ? "#10b981" : "#6366f1"} />
        </View>
        <View style={styles.testInfo}>
            <Text style={styles.testLabel}>{label}</Text>
            <Text style={[styles.testDetail, status === 'error' && { color: '#f43f5e' }]}>{detail}</Text>
        </View>
        <StatusIcon status={status} />
    </View>
);

const styles = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
    modalContent: {
        width: width * 0.9,
        maxHeight: height * 0.7,
        backgroundColor: '#1e293b',
        borderRadius: 28,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.5,
        shadowRadius: 30,
        elevation: 20
    },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 25 },
    headerTitles: { flex: 1 },
    title: { fontSize: 20, fontWeight: '900', color: '#f8fafc' },
    subtitle: { fontSize: 13, color: '#94a3b8', marginTop: 4, fontWeight: '600' },
    closeBtn: { padding: 4 },
    body: { marginBottom: 20 },
    testRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    iconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    testInfo: { flex: 1 },
    testLabel: { fontSize: 15, fontWeight: '800', color: '#f1f5f9' },
    testDetail: { fontSize: 12, color: '#94a3b8', marginTop: 3, fontWeight: '600' },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: 'rgba(99, 102, 241, 0.05)',
        padding: 15,
        borderRadius: 16,
        marginTop: 10,
        alignItems: 'flex-start'
    },
    infoText: { flex: 1, color: '#94a3b8', fontSize: 12, marginLeft: 10, lineHeight: 18, fontWeight: '500' },
    retryBtn: {
        flexDirection: 'row',
        backgroundColor: '#6366f1',
        padding: 16,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    retryText: { color: '#fff', fontWeight: '800', fontSize: 16 },
    disabled: { opacity: 0.6 }
});
