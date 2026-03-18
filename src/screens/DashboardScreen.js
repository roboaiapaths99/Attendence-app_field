import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    SafeAreaView, Image, Platform, Alert, RefreshControl, Dimensions
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import {
    MapPin, Calendar, Briefcase, DollarSign, LogOut, ChevronRight,
    CheckCircle2, Clock, Route, PlaneTakeoff, User, Users, Trophy,
    CloudOff, Wifi, Zap, Activity, Building2
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import NetInfo from '@react-native-community/netinfo';
import * as Location from 'expo-location';
import client from '../api/client';
import StorageHelper from '../utils/StorageHelper';
import DiagnosticModal from '../components/DiagnosticModal';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation }) {
    const { user, organization, logout } = useAuth();
    const primaryColor = organization?.primary_color || '#6366f1';

    const [summary, setSummary] = useState(null);
    const [planStatus, setPlanStatus] = useState('draft');
    const [pendingSyncCount, setPendingSyncCount] = useState(0);
    const [recentLogs, setRecentLogs] = useState([]);
    const [lastFetchType, setLastFetchType] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    // Connectivity States
    const [isWifiConnected, setIsWifiConnected] = useState(false);
    const [isGpsEnabled, setIsGpsEnabled] = useState(false);
    const [showDiagnostics, setShowDiagnostics] = useState(false);

    const fetchDashboardData = useCallback(async () => {
        if (!user?.email) return;

        try {
            const [summaryRes, planRes, logsRes] = await Promise.all([
                client.get(`/api/field/summary/${user.email}`),
                client.get(`/api/field/plan/${user.email}`),
                client.get(`/logs/${user.email}`)
            ]);
            setSummary(summaryRes.data);
            setPlanStatus(planRes.data?.status || 'draft');
            setRecentLogs(logsRes.data.slice(0, 3));
        } catch (e) {
            console.log("[DASHBOARD] Data fetch error (offline?)");
        }

        try {
            const counts = await StorageHelper.getPendingCounts();
            setPendingSyncCount((counts.attendance || 0) + (counts.visits || 0) + (counts.pings || 0));
        } catch (_) { }
    }, [user?.email]);

    useEffect(() => {
        fetchDashboardData();

        // Connectivity Listeners
        const unsubscribeNet = NetInfo.addEventListener(state => {
            const connected = !!(state.isConnected && state.isInternetReachable);
            const connectionType = state.type;

            // Refresh if connection status OR type (e.g., wifi) changed
            if ((!isWifiConnected && connected) || (lastFetchType !== connectionType && connected)) {
                fetchDashboardData();
                setLastFetchType(connectionType);
            }
            setIsWifiConnected(connected);
        });

        const checkGps = async () => {
            try {
                const enabled = await Location.hasServicesEnabledAsync();
                setIsGpsEnabled(enabled);
            } catch (e) {
                setIsGpsEnabled(false);
            }
        };

        checkGps();
        const gpsInterval = setInterval(checkGps, 5000);
        const dataInterval = setInterval(fetchDashboardData, 30000);

        return () => {
            unsubscribeNet();
            clearInterval(gpsInterval);
            clearInterval(dataInterval);
        };
    }, [user?.email, isWifiConnected, fetchDashboardData, lastFetchType]);

    const onRefresh = async () => {
        setRefreshing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await fetchDashboardData();
        setRefreshing(false);
    };

    const handleLogout = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert('Sign Out', 'Are you sure you want to end your session?', [
            { text: 'Stay Logged In', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: logout }
        ]);
    };

    const StatusBadge = ({ icon: Icon, label, active, onPress }) => (
        <TouchableOpacity
            onPress={onPress}
            style={[styles.statusBadge, { backgroundColor: active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)' }]}
        >
            <Icon size={12} color={active ? "#10b981" : "#f43f5e"} />
            <Text style={[styles.statusText, { color: active ? "#10b981" : "#f43f5e" }]}>{label}</Text>
        </TouchableOpacity>
    );

    const ActionCard = ({ title, subtitle, icon: Icon, color, onPress }) => (
        <TouchableOpacity style={styles.glassCard} onPress={onPress} activeOpacity={0.7}>
            <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
                <Icon color={color} size={24} />
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{title}</Text>
                <Text style={styles.cardSubtitle}>{subtitle}</Text>
            </View>
            <ChevronRight color="rgba(255,255,255,0.2)" size={18} />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#020617', '#0f172a', '#1e293b']} style={styles.background}>
                <SafeAreaView style={{ flex: 1 }}>
                    <View style={styles.topBar}>
                        <View style={styles.userInfo}>
                            {organization?.logo_url ? (
                                <Image source={{ uri: organization.logo_url }} style={styles.orgLogoSmall} />
                            ) : (
                                <View style={styles.orgLogoPlaceholder}>
                                    <Building2 size={20} color={primaryColor} />
                                </View>
                            )}
                            <View>
                                <Text style={styles.userName}>{user?.full_name?.split(' ')[0]}</Text>
                                <View style={styles.statusRow}>
                                    <StatusBadge
                                        icon={Wifi}
                                        label={isWifiConnected ? "Online" : "Offline"}
                                        active={isWifiConnected}
                                        onPress={() => setShowDiagnostics(true)}
                                    />
                                    <StatusBadge
                                        icon={MapPin}
                                        label={isGpsEnabled ? "GPS Active" : "GPS Off"}
                                        active={isGpsEnabled}
                                        onPress={() => setShowDiagnostics(true)}
                                    />
                                </View>
                            </View>
                        </View>
                        <View style={styles.headerActions}>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('Profile')}
                                style={styles.iconBtn}
                            >
                                <User color="#94a3b8" size={22} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleLogout}
                                style={[styles.iconBtn, { backgroundColor: 'rgba(244, 63, 94, 0.1)' }]}
                            >
                                <LogOut color="#f43f5e" size={20} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />
                        }
                    >
                        <View style={styles.statsContainer}>
                            <View style={styles.statBox}>
                                <Text style={styles.statLabel}>Visits</Text>
                                <Text style={[styles.statValue, { color: primaryColor }]}>{summary?.total_visits || 0}</Text>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.statBox}>
                                <Text style={styles.statLabel}>Distance</Text>
                                <Text style={[styles.statValue, { color: primaryColor }]}>{summary?.total_km || 0} km</Text>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.statBox}>
                                <Text style={styles.statLabel}>Sync</Text>
                                <Text style={[styles.statValue, { color: pendingSyncCount > 0 ? '#f97316' : '#10b981' }]}>
                                    {pendingSyncCount > 0 ? `-${pendingSyncCount}` : 'OK'}
                                </Text>
                            </View>
                        </View>

                        <Text style={styles.sectionTitle}>Agent Operations</Text>

                        <ActionCard
                            title={summary?.attendance_status === 'check-in' ? "End of Day" : "Start of Day"}
                            subtitle={!isGpsEnabled ? "Enable GPS to continue" : (summary?.attendance_status === 'check-in' ? "Complete your shift" : "Ready for field work")}
                            icon={summary?.attendance_status === 'check-in' ? LogOut : Zap}
                            color={summary?.attendance_status === 'check-in' ? "#f43f5e" : "#38bdf8"}
                            onPress={() => {
                                if (!isGpsEnabled) {
                                    setShowDiagnostics(true);
                                    return;
                                }
                                navigation.navigate('Attendance', {
                                    type: summary?.attendance_status === 'check-in' ? 'check-out' : 'check-in'
                                });
                            }}
                        />

                        <ActionCard
                            title="Attendance History"
                            subtitle="View previous logs"
                            icon={Clock}
                            color="#10b981"
                            onPress={() => navigation.navigate('History')}
                        />

                        <ActionCard
                            title="Visit Plan"
                            subtitle={planStatus === 'approved' ? 'Active Route' : 'Draft / Pending'}
                            icon={Calendar}
                            color="#8b5cf6"
                            onPress={() => navigation.navigate('PlanStatus')}
                        />

                        <ActionCard
                            title="Navigation"
                            subtitle="View optimized routes"
                            icon={Route}
                            color="#22d3ee"
                            onPress={() => navigation.navigate('RouteMap')}
                        />

                        <ActionCard
                            title="Field Visits"
                            subtitle="On-field customer check-ins"
                            icon={Briefcase}
                            color="#10b981"
                            onPress={() => navigation.navigate('ActiveVisits')}
                        />

                        <ActionCard
                            title="Expenses"
                            subtitle="Claims & Reimbursement"
                            icon={DollarSign}
                            color="#f59e0b"
                            onPress={() => navigation.navigate('Expenses')}
                        />

                        <ActionCard
                            title="Leave / OD"
                            subtitle="Requests & Approvals"
                            icon={PlaneTakeoff}
                            color="#f43f5e"
                            onPress={() => navigation.navigate('LeaveRequest')}
                        />

                        <ActionCard
                            title="Leaderboard"
                            subtitle="Performance Rankings"
                            icon={Trophy}
                            color="#eab308"
                            onPress={() => navigation.navigate('Leaderboard')}
                        />

                        {user?.is_manager && (
                            <ActionCard
                                title="Manager Portal"
                                subtitle="Team Approvals & Monitoring"
                                icon={Users}
                                color="#10b981"
                                onPress={() => navigation.navigate('TeamPortal')}
                            />
                        )}

                        {/* Recent Activity Section */}
                        <View style={styles.activitySection}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>RECENT ACTIVITY</Text>
                                <TouchableOpacity onPress={() => navigation.navigate('History')}>
                                    <Text style={[styles.viewAll, { color: primaryColor }]}>View All</Text>
                                </TouchableOpacity>
                            </View>

                            {recentLogs.length > 0 ? (
                                recentLogs.map((log, idx) => (
                                    <View key={idx} style={styles.logItem}>
                                        <View style={[styles.logTypeIcon, { backgroundColor: (log.type === 'check-in' || log.type === 'IN') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)' }]}>
                                            <Clock size={14} color={(log.type === 'check-in' || log.type === 'IN') ? "#10b981" : "#f43f5e"} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.logLabel}>{(log.type === 'check-in' || log.type === 'IN') ? 'Check In' : 'Check Out'}</Text>
                                            <Text style={styles.logSubText}>
                                                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {log.location_name || 'Field'}
                                            </Text>
                                        </View>
                                    </View>
                                ))
                            ) : (
                                <Text style={styles.emptyText}>No recent activity</Text>
                            )}
                        </View>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>LogDay Field Enterprise v2.1</Text>
                            <Text style={styles.terminalId}>TERMINAL: {Platform.OS.toUpperCase()}-{user?.email?.split('@')[0]}</Text>
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </LinearGradient>

            <DiagnosticModal
                visible={showDiagnostics}
                onClose={() => setShowDiagnostics(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    background: { flex: 1 },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: 'rgba(2, 6, 23, 0.8)',
    },
    userInfo: { flexDirection: 'row', alignItems: 'center' },
    orgLogoSmall: { width: 44, height: 44, borderRadius: 12, marginRight: 12, backgroundColor: 'rgba(255,255,255,0.05)' },
    orgLogoPlaceholder: { width: 44, height: 44, borderRadius: 12, marginRight: 12, backgroundColor: 'rgba(99, 102, 241, 0.1)', justifyContent: 'center', alignItems: 'center' },
    userName: { fontSize: 18, fontWeight: '900', color: '#f8fafc', marginBottom: 2 },
    statusRow: { flexDirection: 'row', gap: 6 },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 20,
    },
    statusText: { fontSize: 10, fontWeight: '800', marginLeft: 4, textTransform: 'uppercase' },
    headerActions: { flexDirection: 'row', gap: 10 },
    iconBtn: {
        width: 42, height: 42, borderRadius: 14,
        backgroundColor: 'rgba(30, 41, 59, 0.5)',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)'
    },
    scrollContent: { padding: 20, paddingBottom: 40 },
    statsContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        borderRadius: 24,
        padding: 20,
        marginBottom: 30,
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
        elevation: 10
    },
    statBox: { flex: 1, alignItems: 'center' },
    divider: { width: 1, height: '40%', backgroundColor: 'rgba(255, 255, 255, 0.1)' },
    statLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
    statValue: { fontSize: 20, fontWeight: '900' },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: '#64748b', marginBottom: 20, textTransform: 'uppercase', letterSpacing: 2 },
    glassCard: {
        backgroundColor: 'rgba(30, 41, 59, 0.4)',
        padding: 20,
        borderRadius: 26,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.06)',
    },
    iconContainer: { width: 54, height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 18 },
    cardContent: { flex: 1 },
    cardTitle: { fontSize: 17, fontWeight: '800', color: '#f1f5f9' },
    cardSubtitle: { fontSize: 13, color: '#64748b', marginTop: 3, fontWeight: '500' },
    footer: { marginTop: 40, alignItems: 'center', opacity: 0.5, paddingBottom: 20 },
    footerText: { color: '#94a3b8', fontSize: 10, fontWeight: '600', letterSpacing: 1 },
    terminalId: { color: '#64748b', fontSize: 9, marginTop: 4, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },

    // Activity Section
    activitySection: { marginTop: 24, paddingHorizontal: 4 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    // sectionTitle updated above
    viewAll: { fontSize: 11, fontWeight: '700' },
    logItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(30, 41, 59, 0.5)', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)' },
    logTypeIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    logLabel: { color: '#f8fafc', fontSize: 13, fontWeight: '600' },
    logSubText: { color: '#64748b', fontSize: 11, marginTop: 2 },
    emptyText: { color: '#475569', fontSize: 12, textAlign: 'center', marginVertical: 20 }
});
