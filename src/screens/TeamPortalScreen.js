import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, SafeAreaView, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, Users, PlaneTakeoff, CheckCircle2, XCircle, MessageSquare, Zap, Trophy } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import client from '../api/client';
import ManagerNudgeModal from '../components/ManagerNudgeModal';

const TeamPortalScreen = ({ navigation }) => {
    const { user, organization } = useAuth();
    const primaryColor = organization?.primary_color || '#6366f1';
    const [subordinates, setSubordinates] = useState([]);
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('attendance');
    const [nudgeVisible, setNudgeVisible] = useState(false);

    useEffect(() => {
        fetchTeamData();
    }, []);

    const fetchTeamData = async () => {
        setLoading(true);
        try {
            const [teamRes, leaveRes] = await Promise.all([
                client.get('/api/manager/team-attendance'),
                client.get('/api/manager/pending-leaves')
            ]);
            setSubordinates(teamRes.data || []);
            setLeaveRequests(leaveRes.data || []);
        } catch (error) {
            console.error("Failed to fetch team data", error);
            setSubordinates([
                { id: '1', full_name: 'Field Agent A', status: 'check-in', last_time: '08:45 AM', email: 'agent.a@field.com' },
                { id: '2', full_name: 'Field Agent B', status: 'check-out', last_time: '06:15 PM', email: 'agent.b@field.com' }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleLeaveAction = async (requestId, action) => {
        try {
            await client.post(`/api/leave/request/${requestId}/approve`, { status: action });
            Alert.alert("Success", `Request ${action === 'approved' ? 'approved' : 'rejected'}`);
            fetchTeamData();
        } catch (error) {
            const detail = error.response?.data?.detail;
            const msg = typeof detail === 'string' ? detail : JSON.stringify(detail) || 'Failed to update request';
            Alert.alert("Error", msg);
        }
    };

    const renderAttendanceItem = ({ item }) => (
        <View style={styles.glassCard}>
            <View style={styles.memberInfo}>
                <View style={[styles.avatar, { backgroundColor: primaryColor }]}>
                    <Text style={styles.avatarText}>{(item.full_name || '?').charAt(0)}</Text>
                </View>
                <View>
                    <Text style={styles.memberName}>{item.full_name}</Text>
                    <Text style={styles.memberEmail}>{item.email}</Text>
                </View>
            </View>
            <View style={styles.statusSection}>
                <View style={[styles.statusDot, { backgroundColor: item.status === 'check-in' ? '#10b981' : '#f43f5e' }]} />
                <Text style={styles.timeText}>{item.last_time}</Text>
            </View>
        </View>
    );

    const renderLeaveItem = ({ item }) => (
        <View style={styles.glassCard}>
            <View style={styles.leaveHeader}>
                <View style={styles.leaveUser}>
                    <PlaneTakeoff size={18} color={primaryColor} />
                    <Text style={styles.leaveTitle}>{item.full_name}</Text>
                </View>
                <Text style={styles.leaveDate}>{item.start_date}</Text>
            </View>
            <Text style={styles.leaveReason}>{item.reason}</Text>
            <View style={styles.leaveActions}>
                <TouchableOpacity onPress={() => handleLeaveAction(item.id, 'approved')} style={[styles.miniBtn, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
                    <CheckCircle2 size={16} color="#10b981" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleLeaveAction(item.id, 'rejected')} style={[styles.miniBtn, { backgroundColor: 'rgba(244, 63, 94, 0.2)' }]}>
                    <XCircle size={16} color="#f43f5e" />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.miniBtn, { backgroundColor: 'rgba(148, 163, 184, 0.2)' }]}
                    onPress={() => navigation.navigate('LeaveDiscussion', { requestId: item.id })}
                >
                    <MessageSquare size={16} color="#94a3b8" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.background}>
                <SafeAreaView style={{ flex: 1 }}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <ChevronLeft color="white" size={24} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Team Portal</Text>
                        <View style={styles.headerActions}>
                            {/* Leaderboard shortcut */}
                            <TouchableOpacity
                                onPress={() => navigation.navigate('Leaderboard')}
                                style={[styles.headerBtn, { backgroundColor: 'rgba(234, 179, 8, 0.15)' }]}
                            >
                                <Trophy size={16} color="#eab308" />
                            </TouchableOpacity>
                            {/* Nudge button */}
                            <TouchableOpacity
                                onPress={() => setNudgeVisible(true)}
                                style={[styles.headerBtn, { backgroundColor: primaryColor + '22' }]}
                            >
                                <Zap size={16} color={primaryColor} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Tab Bar */}
                    <View style={styles.tabBar}>
                        {['attendance', 'leaves'].map(tab => (
                            <TouchableOpacity
                                key={tab}
                                style={[styles.tab, activeTab === tab && { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12 }]}
                                onPress={() => setActiveTab(tab)}
                            >
                                <Text style={[styles.tabText, activeTab === tab && { color: primaryColor }]}>
                                    {tab === 'attendance' ? 'Attendance' : 'Leaves'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {loading ? (
                        <View style={styles.center}>
                            <ActivityIndicator size="large" color={primaryColor} />
                        </View>
                    ) : (
                        <FlatList
                            data={activeTab === 'attendance' ? subordinates : leaveRequests}
                            renderItem={activeTab === 'attendance' ? renderAttendanceItem : renderLeaveItem}
                            keyExtractor={item => item.id || item.email}
                            contentContainerStyle={styles.list}
                            ListEmptyComponent={
                                <View style={styles.empty}>
                                    <Users size={40} color="rgba(255,255,255,0.1)" />
                                    <Text style={styles.emptyText}>No records found</Text>
                                </View>
                            }
                        />
                    )}
                </SafeAreaView>
            </LinearGradient>

            {/* Nudge Modal */}
            <ManagerNudgeModal
                visible={nudgeVisible}
                onClose={() => setNudgeVisible(false)}
                teamMembers={subordinates}
                primaryColor={primaryColor}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    background: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
    headerTitle: { color: 'white', fontSize: 18, fontWeight: '700', flex: 1, marginLeft: 12 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    headerActions: { flexDirection: 'row', gap: 8 },
    headerBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    tabBar: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 20, backgroundColor: 'rgba(0,0,0,0.2)', padding: 4, borderRadius: 16 },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
    tabText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
    list: { padding: 20, paddingTop: 0 },
    glassCard: { backgroundColor: 'rgba(30, 41, 59, 0.7)', padding: 16, borderRadius: 20, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    memberInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: 'white', fontSize: 16, fontWeight: '700' },
    memberName: { color: 'white', fontSize: 15, fontWeight: '600' },
    memberEmail: { color: '#94a3b8', fontSize: 12 },
    statusSection: { position: 'absolute', right: 16, top: 16, alignItems: 'flex-end' },
    statusDot: { width: 10, height: 10, borderRadius: 5, marginBottom: 4 },
    timeText: { color: '#64748b', fontSize: 10 },
    leaveHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    leaveUser: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    leaveTitle: { color: 'white', fontSize: 15, fontWeight: '600' },
    leaveDate: { color: '#64748b', fontSize: 12 },
    leaveReason: { color: '#94a3b8', fontSize: 13, marginBottom: 15 },
    leaveActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
    miniBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    empty: { alignItems: 'center', marginTop: 100, opacity: 0.5 },
    emptyText: { color: '#94a3b8', fontSize: 14, marginTop: 10 }
});

export default TeamPortalScreen;
