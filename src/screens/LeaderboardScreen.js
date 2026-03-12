import React, { useEffect, useState, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, FlatList,
    ActivityIndicator, Animated, RefreshControl, Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import { Trophy, MapPin, Briefcase, TrendingUp, Star, ChevronLeft, RefreshCw } from 'lucide-react-native';

const { width } = Dimensions.get('window');

// ─── Medal configs for top 3 ─────────────────────────────────────────────────
const MEDALS = {
    1: { color: '#FFD700', shadow: 'rgba(255,215,0,0.4)', emoji: '🥇', label: 'GOLD' },
    2: { color: '#C0C0C0', shadow: 'rgba(192,192,192,0.4)', emoji: '🥈', label: 'SILVER' },
    3: { color: '#CD7F32', shadow: 'rgba(205,127,50,0.4)', emoji: '🥉', label: 'BRONZE' },
};

// ─── Stat Pill ────────────────────────────────────────────────────────────────
const StatPill = ({ icon: Icon, value, label, color }) => (
    <View style={[styles.statPill, { backgroundColor: `${color}18` }]}>
        <Icon size={11} color={color} />
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
    </View>
);

// ─── Podium Card (Top 3) ──────────────────────────────────────────────────────
const PodiumCard = ({ entry, isMe, primaryColor }) => {
    const medal = MEDALS[entry.rank] || {};
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(anim, {
            toValue: 1,
            delay: entry.rank * 120,
            tension: 60,
            friction: 8,
            useNativeDriver: true,
        }).start();
    }, []);

    const cardWidth = entry.rank === 1 ? width * 0.52 : width * 0.38;

    return (
        <Animated.View
            style={{
                opacity: anim,
                transform: [{ scale: anim }, { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
                width: cardWidth,
                marginTop: entry.rank === 1 ? 0 : 30,
            }}
        >
            <View style={[
                styles.podiumCard,
                { borderColor: isMe ? primaryColor : medal.color },
                isMe && styles.meHighlight
            ]}>
                {isMe && (
                    <View style={[styles.meBadge, { backgroundColor: primaryColor }]}>
                        <Text style={styles.meBadgeText}>YOU</Text>
                    </View>
                )}
                <Text style={styles.podiumEmoji}>{medal.emoji}</Text>
                <View style={[styles.podiumAvatar, { backgroundColor: medal.color + '22', borderColor: medal.color }]}>
                    <Text style={[styles.podiumAvatarText, { color: medal.color }]}>
                        {(entry.name || '?').charAt(0).toUpperCase()}
                    </Text>
                </View>
                <Text style={styles.podiumName} numberOfLines={1}>{entry.name}</Text>
                <Text style={styles.podiumDesig} numberOfLines={1}>{entry.designation}</Text>
                <View style={[styles.podiumScore, { backgroundColor: medal.color + '22' }]}>
                    <Trophy size={12} color={medal.color} />
                    <Text style={[styles.podiumScoreText, { color: medal.color }]}>
                        {entry.visits_completed} visits
                    </Text>
                </View>
            </View>
        </Animated.View>
    );
};

// ─── Row Card (Rank 4+) ───────────────────────────────────────────────────────
const RowCard = ({ entry, isMe, primaryColor, index }) => {
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(anim, {
            toValue: 1,
            delay: index * 60 + 400,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, []);

    return (
        <Animated.View style={{ opacity: anim, transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] }}>
            <View style={[styles.rowCard, isMe && { borderColor: primaryColor, borderWidth: 1.5 }]}>
                <View style={[styles.rankBadge, { backgroundColor: isMe ? primaryColor + '22' : 'rgba(255,255,255,0.04)' }]}>
                    <Text style={[styles.rankText, { color: isMe ? primaryColor : '#64748b' }]}>#{entry.rank}</Text>
                </View>
                <View style={[styles.rowAvatar, { backgroundColor: isMe ? primaryColor + '22' : 'rgba(255,255,255,0.06)' }]}>
                    <Text style={[styles.rowAvatarText, { color: isMe ? primaryColor : '#94a3b8' }]}>
                        {(entry.name || '?').charAt(0).toUpperCase()}
                    </Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.rowName, isMe && { color: primaryColor }]} numberOfLines={1}>{entry.name}</Text>
                    <Text style={styles.rowDesig} numberOfLines={1}>{entry.designation}</Text>
                </View>
                <View style={styles.rowStats}>
                    <StatPill icon={Trophy} value={entry.visits_completed} label="v" color={isMe ? primaryColor : '#6366f1'} />
                    {entry.leads_captured > 0 && (
                        <StatPill icon={Star} value={entry.leads_captured} label="l" color="#f59e0b" />
                    )}
                    {entry.distance_km > 0 && (
                        <StatPill icon={MapPin} value={`${entry.distance_km}k`} label="km" color="#10b981" />
                    )}
                </View>
            </View>
        </Animated.View>
    );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function LeaderboardScreen({ navigation }) {
    const { user, organization } = useAuth();
    const primaryColor = organization?.primary_color || '#6366f1';
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchLeaderboard = async () => {
        try {
            const res = await client.get('/api/field/leaderboard');
            setData(res.data);
        } catch (e) {
            console.error('Leaderboard fetch failed', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { fetchLeaderboard(); }, []);

    const onRefresh = () => { setRefreshing(true); fetchLeaderboard(); };

    const leaderboard = data?.leaderboard || [];
    const top3 = leaderboard.filter(e => e.rank <= 3).sort((a, b) => {
        // Re-order for display: 2, 1, 3 (classic podium layout)
        const order = { 1: 1, 2: 0, 3: 2 };
        return order[a.rank] - order[b.rank];
    });
    const rest = leaderboard.filter(e => e.rank > 3);

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0a0f1e', '#0f172a', '#1e293b']} style={styles.bg}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
                        <ChevronLeft color="#fff" size={22} />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.headerTitle}>Leaderboard</Text>
                        <Text style={styles.headerSub}>
                            {data ? `${data.week_start} → ${data.week_end}` : 'This week'}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={fetchLeaderboard} style={styles.refreshBtn}>
                        <RefreshCw color="#94a3b8" size={18} />
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator color={primaryColor} size="large" />
                        <Text style={styles.loadingText}>Calculating rankings…</Text>
                    </View>
                ) : leaderboard.length === 0 ? (
                    <View style={styles.center}>
                        <Trophy size={48} color={primaryColor} opacity={0.3} />
                        <Text style={styles.emptyTitle}>No visits yet this week</Text>
                        <Text style={styles.emptySubtitle}>Complete your first visit to appear on the leaderboard!</Text>
                    </View>
                ) : (
                    <FlatList
                        data={rest}
                        keyExtractor={item => `${item.rank}-${item.employee_id}`}
                        contentContainerStyle={{ paddingBottom: 40 }}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />}
                        ListHeaderComponent={() => (
                            <>
                                {/* Podium */}
                                {top3.length > 0 && (
                                    <View style={styles.podiumRow}>
                                        {top3.map(e => (
                                            <PodiumCard
                                                key={e.rank}
                                                entry={e}
                                                isMe={e.is_me}
                                                primaryColor={primaryColor}
                                            />
                                        ))}
                                    </View>
                                )}

                                {/* My Stats Banner (if not in top 3) */}
                                {rest.some(e => e.is_me) && (
                                    <View style={[styles.myStatsBanner, { borderColor: primaryColor }]}>
                                        <TrendingUp color={primaryColor} size={16} />
                                        <Text style={[styles.myStatsText, { color: primaryColor }]}>
                                            Keep going! You're ranked #{rest.find(e => e.is_me)?.rank} this week.
                                        </Text>
                                    </View>
                                )}

                                {rest.length > 0 && (
                                    <Text style={styles.sectionLabel}>MORE RANKINGS</Text>
                                )}
                            </>
                        )}
                        renderItem={({ item, index }) => (
                            <RowCard
                                entry={item}
                                isMe={item.is_me}
                                primaryColor={primaryColor}
                                index={index}
                            />
                        )}
                    />
                )}
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    bg: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 54, paddingBottom: 16 },
    headerTitle: { color: '#f8fafc', fontSize: 20, fontWeight: '800' },
    headerSub: { color: '#64748b', fontSize: 11, marginTop: 2 },
    backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
    refreshBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
    loadingText: { color: '#64748b', marginTop: 14, fontWeight: '600', fontSize: 13 },
    emptyTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '700', marginTop: 16 },
    emptySubtitle: { color: '#64748b', fontSize: 13, textAlign: 'center', marginTop: 8 },

    // Podium
    podiumRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingVertical: 20 },
    podiumCard: {
        borderRadius: 22, borderWidth: 1.5, padding: 14, alignItems: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
    },
    meHighlight: { shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 8 },
    meBadge: { position: 'absolute', top: -10, right: -8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    meBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    podiumEmoji: { fontSize: 24, marginBottom: 8 },
    podiumAvatar: { width: 48, height: 48, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    podiumAvatarText: { fontSize: 20, fontWeight: '900' },
    podiumName: { color: '#f8fafc', fontSize: 13, fontWeight: '700', textAlign: 'center' },
    podiumDesig: { color: '#64748b', fontSize: 10, marginTop: 2, textAlign: 'center' },
    podiumScore: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 10, marginTop: 8 },
    podiumScoreText: { fontSize: 11, fontWeight: '800' },

    // Rest rows
    rowCard: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: 'rgba(30, 41, 59, 0.5)', borderRadius: 18, padding: 14,
        marginHorizontal: 16, marginBottom: 10,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    },
    rankBadge: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    rankText: { fontSize: 12, fontWeight: '900' },
    rowAvatar: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    rowAvatarText: { fontSize: 15, fontWeight: '800' },
    rowName: { color: '#f1f5f9', fontSize: 14, fontWeight: '700' },
    rowDesig: { color: '#64748b', fontSize: 11, marginTop: 2 },
    rowStats: { flexDirection: 'row', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end' },

    // Stat Pill
    statPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 4, paddingHorizontal: 7, borderRadius: 8 },
    statValue: { fontSize: 11, fontWeight: '900' },
    statLabel: { color: '#64748b', fontSize: 9, fontWeight: '700' },

    // My stats banner
    myStatsBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        marginHorizontal: 16, marginBottom: 10, marginTop: 4,
        padding: 12, borderRadius: 16, borderWidth: 1,
        backgroundColor: 'rgba(99, 102, 241, 0.05)',
    },
    myStatsText: { fontSize: 13, fontWeight: '700', flex: 1 },

    sectionLabel: { color: '#334155', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginLeft: 20, marginBottom: 10, marginTop: 4 },
});
