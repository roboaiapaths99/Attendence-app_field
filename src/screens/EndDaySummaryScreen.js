import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import { Car, CheckCircle2, Wallet, ChevronRight } from 'lucide-react-native';

export default function EndDaySummaryScreen({ navigation }) {
    const { user, organization } = useAuth();
    const primaryColor = organization?.primary_color || '#6366f1';
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchSummary = async () => {
        try {
            const res = await client.get(`/api/field/summary/${user.email}`);
            setSummary(res.data);
        } catch (e) {
            setSummary(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSummary();
    }, []);

    const ratePerKm = organization?.rate_per_km || 10;
    const estimatedReimbursement = summary ? (summary.total_km * ratePerKm).toFixed(2) : '0.00';

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.background}>
                <View style={styles.content}>
                    <Text style={styles.title}>End of Day</Text>
                    <Text style={styles.subtitle}>Your field summary for today</Text>

                    {loading ? (
                        <View style={styles.center}>
                            <ActivityIndicator color={primaryColor} />
                        </View>
                    ) : (
                        <>
                            <View style={styles.card}>
                                <View style={styles.cardRow}>
                                    <Car color={primaryColor} size={20} />
                                    <Text style={styles.cardLabel}>Total Distance</Text>
                                    <Text style={styles.cardValue}>{summary?.total_km || 0} km</Text>
                                </View>
                                <View style={styles.cardRow}>
                                    <CheckCircle2 color="#10b981" size={20} />
                                    <Text style={styles.cardLabel}>Completed Visits</Text>
                                    <Text style={styles.cardValue}>{summary?.total_visits || 0}</Text>
                                </View>
                                <View style={styles.cardRow}>
                                    <Wallet color="#f59e0b" size={20} />
                                    <Text style={styles.cardLabel}>Estimated Reimbursement</Text>
                                    <Text style={styles.cardValue}>₹{estimatedReimbursement}</Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[styles.primaryBtn, { backgroundColor: primaryColor, marginBottom: 12 }]}
                                onPress={() => navigation.navigate('Expenses')}
                            >
                                <Text style={styles.primaryBtnText}>Submit Expenses</Text>
                                <ChevronRight color="#fff" size={18} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.secondaryBtn, { borderColor: primaryColor }]}
                                onPress={() => navigation.navigate('Attendance', { type: 'check-out' })}
                            >
                                <Text style={[styles.secondaryBtnText, { color: primaryColor }]}>Complete Day & Check Out</Text>
                                <CheckCircle2 color={primaryColor} size={18} />
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    background: { flex: 1 },
    content: { flex: 1, padding: 20, paddingTop: 50 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 26, fontWeight: '800', color: '#f8fafc' },
    subtitle: { fontSize: 14, color: '#94a3b8', marginTop: 6, marginBottom: 20 },
    card: {
        backgroundColor: 'rgba(30, 41, 59, 0.7)',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        gap: 14
    },
    cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    cardLabel: { color: '#94a3b8', fontSize: 14, flex: 1 },
    cardValue: { color: '#f8fafc', fontWeight: '700', fontSize: 16 },
    primaryBtn: {
        marginTop: 20,
        padding: 16,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8
    },
    primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    secondaryBtn: {
        marginTop: 12,
        padding: 16,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1.5,
        backgroundColor: 'rgba(255, 255, 255, 0.02)'
    },
    secondaryBtnText: { fontSize: 16, fontWeight: '700' }
});
