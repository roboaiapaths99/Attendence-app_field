import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import { CheckCircle2, Clock, XCircle, ChevronRight, MapPin, MessageCircle } from 'lucide-react-native';

const statusConfig = {
    approved: { label: 'Approved', color: '#10b981', icon: CheckCircle2 },
    submitted: { label: 'Pending Review', color: '#f59e0b', icon: Clock },
    rejected: { label: 'Rejected', color: '#f43f5e', icon: XCircle },
    draft: { label: 'Draft', color: '#94a3b8', icon: Clock }
};

export default function PlanStatusScreen({ navigation }) {
    const { user, organization } = useAuth();
    const primaryColor = organization?.primary_color || '#6366f1';
    const [plan, setPlan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchPlan = async () => {
        try {
            const res = await client.get(`/api/field/plan/${user.email}`);
            setPlan(res.data?.status ? res.data : null);
        } catch (e) {
            setPlan(null);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchPlan();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchPlan();
    };

    const statusKey = plan?.status || 'draft';
    const statusMeta = statusConfig[statusKey] || statusConfig.draft;
    const StatusIcon = statusMeta.icon;

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.background}>
                <ScrollView
                    contentContainerStyle={styles.content}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
                >
                    <Text style={styles.title}>Plan Approval</Text>
                    <Text style={styles.subtitle}>Manager review status for today</Text>

                    {loading ? (
                        <View style={styles.center}>
                            <ActivityIndicator color={primaryColor} />
                        </View>
                    ) : !plan ? (
                        <View style={styles.emptyCard}>
                            <Text style={styles.emptyTitle}>No Plan Found</Text>
                            <Text style={styles.emptyText}>Create your visit plan to start your day.</Text>
                            <TouchableOpacity
                                style={[styles.primaryBtn, { backgroundColor: primaryColor }]}
                                onPress={() => navigation.navigate('VisitPlan')}
                            >
                                <Text style={styles.primaryBtnText}>Create Plan</Text>
                                <ChevronRight color="#fff" size={18} />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <>
                            <View style={styles.statusCard}>
                                <View style={[styles.statusIcon, { backgroundColor: `${statusMeta.color}20` }]}>
                                    <StatusIcon color={statusMeta.color} size={22} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.statusLabel}>Status</Text>
                                    <Text style={styles.statusValue}>{statusMeta.label}</Text>
                                </View>
                                <TouchableOpacity onPress={fetchPlan} style={styles.refreshBtn}>
                                    <Text style={styles.refreshText}>Refresh</Text>
                                </TouchableOpacity>
                            </View>

                            {plan?.manager_comments ? (
                                <View style={styles.commentCard}>
                                    <MessageCircle color="#94a3b8" size={16} />
                                    <Text style={styles.commentText}>{plan.manager_comments}</Text>
                                </View>
                            ) : null}

                            <Text style={styles.sectionTitle}>Stops ({plan.stops?.length || 0})</Text>
                            {plan.stops?.map((stop, idx) => (
                                <View key={`${stop.place_name}-${idx}`} style={styles.stopCard}>
                                    <View style={[styles.stopIcon, { backgroundColor: `${primaryColor}20` }]}>
                                        <MapPin color={primaryColor} size={16} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.stopName}>{stop.place_name}</Text>
                                        <Text style={styles.stopAddress}>{stop.place_address || stop.address || 'Address not set'}</Text>
                                    </View>
                                </View>
                            ))}

                            {plan.status === 'approved' ? (
                                <TouchableOpacity
                                    style={[styles.primaryBtn, { backgroundColor: primaryColor }]}
                                    onPress={() => navigation.navigate('RouteMap')}
                                >
                                    <Text style={styles.primaryBtnText}>Start Route</Text>
                                    <ChevronRight color="#fff" size={18} />
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    style={[styles.secondaryBtn, { borderColor: primaryColor }]}
                                    onPress={() => navigation.navigate('VisitPlan')}
                                >
                                    <Text style={[styles.secondaryBtnText, { color: primaryColor }]}>Edit Plan</Text>
                                </TouchableOpacity>
                            )}
                        </>
                    )}
                </ScrollView>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    background: { flex: 1 },
    content: { padding: 20, paddingTop: 50 },
    center: { paddingTop: 40, alignItems: 'center' },
    title: { fontSize: 26, fontWeight: '800', color: '#f8fafc' },
    subtitle: { fontSize: 14, color: '#94a3b8', marginTop: 6, marginBottom: 20 },
    statusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(30, 41, 59, 0.7)',
        borderRadius: 20,
        padding: 18,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)'
    },
    statusIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12
    },
    statusLabel: { color: '#94a3b8', fontSize: 12, textTransform: 'uppercase' },
    statusValue: { color: '#f8fafc', fontSize: 18, fontWeight: '700', marginTop: 2 },
    refreshBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)' },
    refreshText: { color: '#cbd5f5', fontSize: 12, fontWeight: '600' },
    commentCard: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 14,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)'
    },
    commentText: { color: '#cbd5f5', flex: 1, fontSize: 13 },
    sectionTitle: { marginTop: 24, marginBottom: 10, color: '#94a3b8', textTransform: 'uppercase', fontSize: 12, letterSpacing: 1 },
    stopCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(30, 41, 59, 0.7)',
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)'
    },
    stopIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    stopName: { color: '#f8fafc', fontWeight: '600', fontSize: 15 },
    stopAddress: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
    primaryBtn: {
        marginTop: 20,
        padding: 16,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8
    },
    primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    secondaryBtn: {
        marginTop: 20,
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center'
    },
    secondaryBtnText: { fontSize: 15, fontWeight: '700' },
    emptyCard: {
        backgroundColor: 'rgba(30, 41, 59, 0.6)',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)'
    },
    emptyTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '700' },
    emptyText: { color: '#94a3b8', marginTop: 8 }
});
