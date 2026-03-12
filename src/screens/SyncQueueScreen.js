import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StorageHelper from '../utils/StorageHelper';
import SyncEngine from '../services/SyncEngine';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

const SyncQueueScreen = ({ navigation }) => {
    const [counts, setCounts] = useState({ attendance: 0, visits: 0, pings: 0, total: 0 });
    const [isSyncing, setIsSyncing] = useState(false);

    const loadCounts = async () => {
        const freshCounts = await StorageHelper.getPendingCounts();
        setCounts(freshCounts);
    };

    useFocusEffect(
        React.useCallback(() => {
            loadCounts();
            const interval = setInterval(loadCounts, 5000); // Check every 5s if items synced in bg
            return () => clearInterval(interval);
        }, [])
    );

    const handleManualSync = async () => {
        setIsSyncing(true);
        await SyncEngine.syncNow();
        await loadCounts();
        setIsSyncing(false);
    };

    const SummaryCard = ({ title, count, icon }) => (
        <View style={styles.card}>
            <View style={styles.cardLeft}>
                <View style={styles.iconContainer}>
                    <Feather name={icon} size={24} color="#3b82f6" />
                </View>
                <Text style={styles.cardTitle}>{title}</Text>
            </View>
            <View style={styles.badge}>
                <Text style={styles.badgeText}>{count}</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Feather name="arrow-left" size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Offline Queue</Text>
            </View>

            <View style={styles.content}>
                <Text style={styles.description}>
                    The following items have been saved locally because your device is offline.
                    They will sync automatically once the network is restored.
                </Text>

                <SummaryCard title="Pending Check-in/out" count={counts.attendance} icon="clock" />
                <SummaryCard title="Pending Stop Reports" count={counts.visits} icon="map-pin" />
                <SummaryCard title="Pending GPS Breadcrumbs" count={counts.pings} icon="navigation" />

                <View style={styles.totalSection}>
                    <Text style={styles.totalLabel}>Total Pending Items:</Text>
                    <Text style={styles.totalValue}>{counts.total}</Text>
                </View>
            </View>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.syncButton, (counts.total === 0 || isSyncing) && styles.syncButtonDisabled]}
                    onPress={handleManualSync}
                    disabled={counts.total === 0 || isSyncing}
                >
                    {isSyncing ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Feather name="refresh-cw" size={20} color="#fff" style={styles.btnIcon} />
                            <Text style={styles.syncButtonText}>Force Sync Now</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    backButton: { padding: 8, marginRight: 8 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
    content: { flex: 1, padding: 16 },
    description: { fontSize: 14, color: '#64748b', marginBottom: 24, lineHeight: 20 },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    cardLeft: { flexDirection: 'row', alignItems: 'center' },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#eff6ff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    cardTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
    badge: {
        backgroundColor: '#fef2f2',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    badgeText: { color: '#ef4444', fontWeight: 'bold' },
    totalSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 24,
        paddingTop: 24,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
    },
    totalLabel: { fontSize: 16, fontWeight: '600', color: '#475569' },
    totalValue: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
    footer: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    syncButton: {
        backgroundColor: '#3b82f6',
        flexDirection: 'row',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    syncButtonDisabled: { backgroundColor: '#94a3b8' },
    btnIcon: { marginRight: 8 },
    syncButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default SyncQueueScreen;
