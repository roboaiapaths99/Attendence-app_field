import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, SectionList, ActivityIndicator,
    TouchableOpacity, RefreshControl, Dimensions, Image
} from 'react-native';
import {
    Clock, Calendar, MapPin, ChevronRight, ArrowLeft,
    Wifi, Info, CheckCircle2, AlertCircle
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { format, parseISO } from 'date-fns';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

export default function HistoryScreen({ navigation }) {
    const { user, organization } = useAuth();
    const primaryColor = organization?.primary_color || '#6366f1';

    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchHistory = async () => {
        try {
            const res = await client.get(`/logs/${user.email}`);
            // Backend returns { logs: [], count: 0 }
            const rawLogs = res.data.logs || [];

            // Group by date
            const grouped = rawLogs.reduce((acc, log) => {
                const date = format(parseISO(log.timestamp), 'yyyy-MM-dd');
                if (!acc[date]) acc[date] = [];
                acc[date].push(log);
                return acc;
            }, {});

            const sections = Object.keys(grouped).sort((a, b) => b.localeCompare(a)).map(date => ({
                title: format(parseISO(date), 'EEEE, MMM dd'),
                data: grouped[date]
            }));

            setLogs(sections);
        } catch (e) {
            console.error("[HISTORY] Fetch error:", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        fetchHistory();
    };

    const LogItem = ({ item }) => {
        const isCheckIn = item.type === 'check-in' || item.type === 'IN';
        const time = format(parseISO(item.timestamp), 'hh:mm a');

        return (
            <View style={styles.logCard}>
                <View style={[styles.typeIcon, { backgroundColor: isCheckIn ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)' }]}>
                    <Clock size={18} color={isCheckIn ? "#10b981" : "#f43f5e"} />
                </View>
                <View style={styles.logInfo}>
                    <View style={styles.logHeader}>
                        <Text style={styles.logType}>{isCheckIn ? 'STARTED DAY' : 'ENDED DAY'}</Text>
                        <Text style={styles.logTime}>{time}</Text>
                    </View>
                    <View style={styles.locationRow}>
                        <MapPin size={12} color="#94a3b8" />
                        <Text style={styles.locationText} numberOfLines={1}>
                            {item.address || `${item.lat.toFixed(4)}, ${item.long.toFixed(4)}`}
                        </Text>
                    </View>
                    <View style={styles.metaRow}>
                        <View style={styles.metaItem}>
                            <Wifi size={10} color="#64748b" />
                            <Text style={styles.metaText}>{item.wifi_ssid || 'Mobile'}</Text>
                        </View>
                        {item.distance_meters > 0 && (
                            <View style={styles.metaItem}>
                                <Info size={10} color="#64748b" />
                                <Text style={styles.metaText}>{Math.round(item.distance_meters)}m from target</Text>
                            </View>
                        )}
                    </View>
                </View>
                {item.status === 'SUCCESS' || !!item.type ? (
                    <CheckCircle2 size={16} color="#10b981" style={styles.statusIcon} />
                ) : (
                    <AlertCircle size={16} color="#f43f5e" style={styles.statusIcon} />
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#020617', '#0f172a', '#1e293b']} style={styles.background}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <ArrowLeft color="#fff" size={24} />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.title}>Activity History</Text>
                        <Text style={styles.subtitle}>Remote Attendance Logs</Text>
                    </View>
                </View>

                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={primaryColor} />
                    </View>
                ) : (
                    <SectionList
                        sections={logs}
                        keyExtractor={(item, index) => item._id + index}
                        renderItem={({ item }) => <LogItem item={item} />}
                        renderSectionHeader={({ section: { title } }) => (
                            <View style={styles.sectionHeader}>
                                <Calendar size={14} color={primaryColor} />
                                <Text style={styles.sectionTitle}>{title}</Text>
                            </View>
                        )}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Clock size={48} color="rgba(255,255,255,0.05)" />
                                <Text style={styles.emptyText}>No activity logs yet</Text>
                            </View>
                        }
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />
                        }
                    />
                )}
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    background: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 25,
        backgroundColor: 'rgba(2, 6, 23, 0.4)'
    },
    backBtn: {
        width: 44, height: 44, borderRadius: 14,
        backgroundColor: 'rgba(30, 41, 59, 0.5)',
        justifyContent: 'center', alignItems: 'center',
        marginRight: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)'
    },
    title: { fontSize: 20, fontWeight: '900', color: '#f8fafc' },
    subtitle: { fontSize: 13, color: '#94a3b8', fontWeight: '600', marginTop: 2 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { paddingHorizontal: 20, paddingBottom: 40 },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        backgroundColor: '#020617', // Match gradient start
        marginBottom: 10,
        gap: 10
    },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 },
    logCard: {
        backgroundColor: 'rgba(30, 41, 59, 0.4)',
        borderRadius: 20,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)'
    },
    typeIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    logInfo: { flex: 1 },
    logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    logType: { fontSize: 13, fontWeight: '900', color: '#f1f5f9' },
    logTime: { fontSize: 12, fontWeight: '700', color: '#64748b' },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    locationText: { fontSize: 12, color: '#94a3b8', fontWeight: '500', width: '85%' },
    metaRow: { flexDirection: 'row', gap: 15 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    metaText: { fontSize: 10, fontWeight: '700', color: '#64748b' },
    statusIcon: { marginLeft: 10 },
    emptyState: { alignItems: 'center', marginTop: 100, opacity: 0.3 },
    emptyText: { color: '#94a3b8', marginTop: 15, fontWeight: '700' }
});
