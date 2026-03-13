import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Image, Platform, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { MapPin, Calendar, Briefcase, DollarSign, LogOut, ChevronRight, CheckCircle2, Clock, Route, PlaneTakeoff, User, Users, Trophy, CloudOff } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import client from '../api/client';
import StorageHelper from '../utils/StorageHelper';

export default function DashboardScreen({ navigation }) {
    const { user, organization, logout } = useAuth();
    const primaryColor = organization?.primary_color || '#6366f1';
    const [summary, setSummary] = useState(null);
    const [planStatus, setPlanStatus] = useState('draft');
    const [pendingSyncCount, setPendingSyncCount] = useState(0);

    const fetchDashboardData = async () => {
        try {
            const [summaryRes, planRes] = await Promise.all([
                client.get(`/api/field/summary/${user.email}`),
                client.get(`/api/field/plan/${user.email}`)
            ]);
            setSummary(summaryRes.data);
            setPlanStatus(planRes.data?.status || 'draft');
        } catch (e) {
            // Silently handle polling errors
        }

        try {
            const counts = await StorageHelper.getPendingCounts();
            setPendingSyncCount((counts.attendance || 0) + (counts.visits || 0) + (counts.pings || 0));
        } catch (_) { }
    };

    useEffect(() => {
        fetchDashboardData();

        // Real-time Data Flow: Polling every 30s for nudges/updates
        const interval = setInterval(fetchDashboardData, 30000);
        return () => clearInterval(interval);
    }, [user?.email]);

    const ActionCard = ({ title, subtitle, icon: Icon, color, onPress }) => (
        <TouchableOpacity style={styles.glassCard} onPress={onPress}>
            <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
                <Icon color={color} size={24} />
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{title}</Text>
                <Text style={styles.cardSubtitle}>{subtitle}</Text>
            </View>
            <ChevronRight color="rgba(255,255,255,0.3)" size={20} />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#0f172a', '#1e293b']}
                style={styles.background}
            >
                <SafeAreaView style={{ flex: 1 }}>
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        <View style={styles.header}>
                            <View style={styles.userInfo}>
                                {organization?.logo_url && (
                                    <Image source={{ uri: organization.logo_url }} style={styles.orgLogoSmall} />
                                )}
                                <View>
                                    <Text style={styles.welcomeText}>Welcome back,</Text>
                                    <Text style={styles.userName}>{user?.full_name}</Text>
                                </View>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <TouchableOpacity
                                    onPress={() => navigation.navigate('Profile')}
                                    style={[styles.logoutBtn, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}
                                >
                                    <User color="#6366f1" size={20} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => {
                                        Alert.alert('Logout', 'Are you sure you want to sign out?', [
                                            { text: 'Cancel', style: 'cancel' },
                                            { text: 'Sign Out', style: 'destructive', onPress: logout }
                                        ]);
                                    }}
                                    style={styles.logoutBtn}
                                >
                                    <LogOut color="#f43f5e" size={20} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.statsContainer}>
                            <View style={styles.statBox}>
                                <Text style={styles.statLabel}>Today's Visits</Text>
                                <Text style={[styles.statValue, { color: primaryColor }]}>{summary?.total_visits || 0}</Text>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.statBox}>
                                <Text style={styles.statLabel}>Distance</Text>
                                <Text style={[styles.statValue, { color: primaryColor }]}>{summary?.total_km || 0} km</Text>
                            </View>
                        </View>

                        <Text style={styles.sectionTitle}>Agent Terminal</Text>

                        <ActionCard
                            title="Start of Day"
                            subtitle="Remote attendance check-in"
                            icon={MapPin}
                            color={primaryColor}
                            onPress={() => navigation.navigate('Attendance')}
                        />

                        <ActionCard
                            title="Plan Status"
                            subtitle={planStatus === 'approved' ? 'Approved by manager' : 'Pending review'}
                            icon={Calendar}
                            color="#8b5cf6"
                            onPress={() => navigation.navigate('PlanStatus')}
                        />

                        <ActionCard
                            title="Route Map"
                            subtitle="Optimized visit route"
                            icon={Route}
                            color="#22d3ee"
                            onPress={() => navigation.navigate('RouteMap')}
                        />

                        <ActionCard
                            title="Field Visits"
                            subtitle="Check-in at locations"
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
                            title="End of Day"
                            subtitle="KM + summary report"
                            icon={CheckCircle2}
                            color="#34d399"
                            onPress={() => navigation.navigate('EndDaySummary')}
                        />

                        <ActionCard
                            title="Leave / OD"
                            subtitle="Requests & Discussions"
                            icon={PlaneTakeoff}
                            color="#f43f5e"
                            onPress={() => navigation.navigate('LeaveRequest')}
                        />

                        <ActionCard
                            title="Leaderboard"
                            subtitle="Weekly rankings & performance"
                            icon={Trophy}
                            color="#eab308"
                            onPress={() => navigation.navigate('Leaderboard')}
                        />

                        <ActionCard
                            title="Sync Queue"
                            subtitle={pendingSyncCount > 0 ? `${pendingSyncCount} items pending` : 'All synced'}
                            icon={CloudOff}
                            color={pendingSyncCount > 0 ? '#f97316' : '#10b981'}
                            onPress={() => navigation.navigate('SyncQueue')}
                        />

                        {user?.is_manager && (
                            <ActionCard
                                title="Team Portal"
                                subtitle="Team Attendance & Approvals"
                                icon={Users}
                                color="#10b981"
                                onPress={() => navigation.navigate('TeamPortal')}
                            />
                        )}

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>LogDay Field Enterprise v2.0</Text>
                            <Text style={styles.orgName}>{organization?.name}</Text>
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    background: { flex: 1 },
    scrollContent: { padding: 20, paddingTop: Platform.OS === 'android' ? 40 : 0 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
    },
    userInfo: { flexDirection: 'row', alignItems: 'center' },
    orgLogoSmall: { width: 45, height: 45, borderRadius: 12, marginRight: 15, backgroundColor: 'rgba(255,255,255,0.05)' },
    welcomeText: { fontSize: 13, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 },
    userName: { fontSize: 22, fontWeight: 'bold', color: '#f8fafc' },
    logoutBtn: {
        width: 45, height: 45, borderRadius: 12,
        backgroundColor: 'rgba(244, 63, 94, 0.1)',
        justifyContent: 'center', alignItems: 'center'
    },
    statsContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(30, 41, 59, 0.7)',
        borderRadius: 20,
        padding: 20,
        marginBottom: 30,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center'
    },
    statBox: { flex: 1, alignItems: 'center' },
    divider: { width: 1, height: '60%', backgroundColor: 'rgba(255, 255, 255, 0.1)' },
    statLabel: { fontSize: 12, color: '#94a3b8', marginBottom: 5 },
    statValue: { fontSize: 24, fontWeight: 'bold' },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#f8fafc', marginBottom: 20, textTransform: 'uppercase', letterSpacing: 1.5, opacity: 0.6 },
    glassCard: {
        backgroundColor: 'rgba(30, 41, 59, 0.7)',
        padding: 18,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    iconContainer: { width: 50, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    cardContent: { flex: 1 },
    cardTitle: { fontSize: 17, fontWeight: '600', color: '#f8fafc' },
    cardSubtitle: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
    footer: { marginTop: 40, alignItems: 'center', opacity: 0.4 },
    footerText: { color: '#94a3b8', fontSize: 12 },
    orgName: { color: '#94a3b8', fontSize: 10, marginTop: 4 }
});
