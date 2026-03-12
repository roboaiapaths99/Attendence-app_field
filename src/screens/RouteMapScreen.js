import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions, Linking, Platform, Animated } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import { MapPin, Navigation, ListOrdered, ChevronRight, Navigation2, Compass, Zap } from 'lucide-react-native';

const { width } = Dimensions.get('window');

// Custom Pulse Component for current target
const PulseMarker = ({ color }) => {
    const scale = useRef(new Animated.Value(1)).current;
    const opacity = useRef(new Animated.Value(0.6)).current;

    useEffect(() => {
        Animated.loop(
            Animated.parallel([
                Animated.sequence([
                    Animated.timing(scale, { toValue: 2, duration: 1500, useNativeDriver: true }),
                    Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
                ]),
                Animated.sequence([
                    Animated.timing(opacity, { toValue: 0, duration: 1500, useNativeDriver: true }),
                    Animated.timing(opacity, { toValue: 0.6, duration: 0, useNativeDriver: true }),
                ])
            ])
        ).start();
    }, []);

    return (
        <View style={styles.pulseContainer}>
            <Animated.View style={[styles.pulse, { backgroundColor: color, transform: [{ scale }], opacity }]} />
            <View style={[styles.pulseCore, { backgroundColor: color }]} />
        </View>
    );
};

const getRegionFromStops = (stops) => {
    const valid = stops.filter(s => Number.isFinite(s.place_lat) && Number.isFinite(s.place_lng));
    if (valid.length === 0) return {
        latitude: 28.6129,
        longitude: 77.2295,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421
    };
    const lats = valid.map(s => s.place_lat);
    const lngs = valid.map(s => s.place_lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: Math.max(0.04, maxLat - minLat + 0.06),
        longitudeDelta: Math.max(0.04, maxLng - minLng + 0.06)
    };
};

export default function RouteMapScreen({ navigation }) {
    const { user, organization } = useAuth();
    const primaryColor = organization?.primary_color || '#6366f1';
    const [plan, setPlan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [optimizing, setOptimizing] = useState(false);

    const fetchPlan = async () => {
        try {
            const res = await client.get(`/api/field/plan/${user.email}`);
            setPlan(res.data);
        } catch (e) {
            setPlan(null);
        } finally {
            setLoading(false);
        }
    };

    const handleOptimize = async () => {
        setOptimizing(true);
        try {
            const res = await client.post('/api/field/plan/optimize', {});
            if (res.data?.status === 'success') {
                setPlan(prev => ({ ...prev, stops: res.data.stops }));
            }
        } catch (e) {
            console.error("Optimization failed", e);
        } finally {
            setOptimizing(false);
        }
    };

    useEffect(() => {
        fetchPlan();
    }, []);

    const stops = plan?.stops || [];
    const region = getRegionFromStops(stops);

    const openNavigation = (lat, lng, label) => {
        const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
        const latLng = `${lat},${lng}`;
        const url = Platform.select({
            ios: `${scheme}${label}@${latLng}`,
            android: `${scheme}${latLng}(${label})`
        });
        Linking.openURL(url);
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.background}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>Beat Navigation</Text>
                        <Text style={styles.subtitle}>TSP Optimized Route</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.optimizeBtn, { borderColor: `${primaryColor}40` }]}
                        onPress={handleOptimize}
                        disabled={optimizing || stops.length <= 1}
                    >
                        {optimizing ? (
                            <ActivityIndicator size="small" color={primaryColor} />
                        ) : (
                            <>
                                <Zap size={16} color={primaryColor} />
                                <Text style={[styles.optimizeBtnText, { color: primaryColor }]}>OPTIMIZE</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator color={primaryColor} />
                    </View>
                ) : (
                    <>
                        {(() => {
                            const currentTarget = stops.find(s => s.status === 'pending') || stops[stops.length - 1];
                            const isAllDone = stops.length > 0 && stops.every(s => s.status === 'completed');

                            if (stops.length === 0) return null;

                            return (
                                <TouchableOpacity
                                    style={[styles.nextStopCard, isAllDone && { borderColor: '#10b981' }]}
                                    onPress={() => !isAllDone && openNavigation(currentTarget.place_lat, currentTarget.place_lng, currentTarget.place_name)}
                                >
                                    <View style={styles.nextStopHeader}>
                                        <View style={[styles.activeIndicator, { backgroundColor: isAllDone ? '#10b981' : primaryColor }]} />
                                        <Text style={styles.nextStopLabel}>{isAllDone ? 'BEAT COMPLETED' : 'CURRENT TARGET'}</Text>
                                    </View>
                                    <View style={styles.nextStopBody}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.nextStopName}>{isAllDone ? 'All Stops Done' : currentTarget.place_name}</Text>
                                            <Text style={styles.nextStopAddr} numberOfLines={1}>
                                                {isAllDone ? 'Great work for today!' : (currentTarget.place_address || 'Navigate to location')}
                                            </Text>
                                        </View>
                                        {!isAllDone && (
                                            <TouchableOpacity
                                                style={[styles.navCircle, { backgroundColor: primaryColor }]}
                                                onPress={() => openNavigation(currentTarget.place_lat, currentTarget.place_lng, currentTarget.place_name)}
                                            >
                                                <Navigation2 color="#fff" size={24} />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            );
                        })()}

                        <View style={styles.mapCard}>
                            {region ? (
                                <MapView
                                    style={styles.map}
                                    initialRegion={region}
                                    region={region}
                                    customMapStyle={mapStyle}
                                    showsUserLocation={true}
                                >
                                    {stops.map((stop, idx) => {
                                        const isCompleted = stop.status === 'completed';
                                        const isOngoing = stop.status === 'ongoing';
                                        const isNext = stops.find(s => s.status === 'pending')?.visit_id === stop.visit_id;

                                        let pinColor = '#475569'; // Pending
                                        if (isCompleted) pinColor = '#10b981';
                                        if (isOngoing || isNext) pinColor = primaryColor;

                                        return Number.isFinite(stop.place_lat) && Number.isFinite(stop.place_lng) ? (
                                            <Marker
                                                key={`${stop.visit_id}-${idx}`}
                                                coordinate={{ latitude: stop.place_lat, longitude: stop.place_lng }}
                                                title={stop.place_name}
                                            >
                                                {isNext || isOngoing ? (
                                                    <PulseMarker color={pinColor} />
                                                ) : (
                                                    <View style={[
                                                        styles.pin,
                                                        {
                                                            backgroundColor: pinColor,
                                                            borderColor: 'transparent',
                                                        }
                                                    ]}>
                                                        <Text style={styles.pinText}>{idx + 1}</Text>
                                                    </View>
                                                )}
                                            </Marker>
                                        ) : null;
                                    })}
                                    <Polyline
                                        coordinates={stops
                                            .filter(s => Number.isFinite(s.place_lat) && Number.isFinite(s.place_lng))
                                            .map(s => ({ latitude: s.place_lat, longitude: s.place_lng }))}
                                        strokeColor={primaryColor}
                                        strokeWidth={3}
                                        lineDashPattern={[5, 10]}
                                        opacity={0.6}
                                    />
                                </MapView>
                            ) : (
                                <View style={styles.mapPlaceholder}>
                                    <Compass color={primaryColor} size={48} opacity={0.3} />
                                    <Text style={styles.placeholderText}>No route data available</Text>
                                </View>
                            )}
                        </View>

                        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                            <View style={styles.listHeader}>
                                <ListOrdered color="#94a3b8" size={16} />
                                <Text style={styles.listTitle}>Optimized Sequence</Text>
                            </View>
                            {stops.map((stop, idx) => {
                                const isCompleted = stop.status === 'completed';
                                const isNext = stops.find(s => s.status === 'pending')?.visit_id === stop.visit_id;

                                return (
                                    <TouchableOpacity
                                        key={`${stop.visit_id || idx}`}
                                        style={[
                                            styles.stopCard,
                                            isNext && styles.activeStopCard,
                                            isCompleted && { opacity: 0.6 }
                                        ]}
                                        onPress={() => openNavigation(stop.place_lat, stop.place_lng, stop.place_name)}
                                    >
                                        <View style={[
                                            styles.stopIndex,
                                            { backgroundColor: isCompleted ? '#10b981' : (isNext ? primaryColor : 'rgba(255,255,255,0.05)') }
                                        ]}>
                                            <Text style={[styles.stopIndexText, { color: (isCompleted || isNext) ? '#fff' : '#94a3b8' }]}>
                                                {isCompleted ? '✓' : idx + 1}
                                            </Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.stopName, isNext && { fontWeight: '800' }]}>{stop.place_name}</Text>
                                            <Text style={styles.stopAddress}>{isCompleted ? 'VISITED' : (stop.place_address || 'TAP TO NAVIGATE')}</Text>
                                        </View>
                                        {isNext && <Compass color={primaryColor} size={18} />}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        <TouchableOpacity
                            style={[styles.primaryBtn, { backgroundColor: primaryColor }]}
                            onPress={() => navigation.navigate('ActiveVisits')}
                        >
                            <Text style={styles.primaryBtnText}>Check-in at Location</Text>
                            <ChevronRight color="#fff" size={18} />
                        </TouchableOpacity>
                    </>
                )}
            </LinearGradient>
        </View>
    );
}

const mapStyle = [
    { elementType: 'geometry', stylers: [{ color: '#0b1324' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f172a' }] }
];

const styles = StyleSheet.create({
    container: { flex: 1 },
    background: { flex: 1, paddingHorizontal: 20, paddingTop: 50, paddingBottom: 20 },
    header: { marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 26, fontWeight: '800', color: '#f8fafc' },
    subtitle: { fontSize: 13, color: '#64748b', marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 },
    optimizeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.03)' },
    optimizeBtnText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    nextStopCard: { backgroundColor: '#1e293b', borderRadius: 24, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.3)', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
    nextStopHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
    activeIndicator: { width: 8, height: 8, borderRadius: 4 },
    nextStopLabel: { color: '#64748b', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
    nextStopBody: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    nextStopName: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
    nextStopAddr: { color: '#94a3b8', fontSize: 13, marginTop: 2 },
    navCircle: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowRadius: 10, shadowOpacity: 0.2 },
    mapCard: { height: 220, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    map: { flex: 1 },
    mapPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, backgroundColor: 'rgba(15, 23, 42, 0.4)' },
    placeholderText: { color: '#475569', fontSize: 14, fontWeight: '600' },
    list: { marginTop: 20 },
    listHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    listTitle: { color: '#64748b', textTransform: 'uppercase', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
    stopCard: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 18, backgroundColor: 'rgba(30, 41, 59, 0.4)', borderWidth: 1, borderColor: 'transparent', marginBottom: 10 },
    activeStopCard: { backgroundColor: 'rgba(99, 102, 241, 0.05)', borderColor: 'rgba(99, 102, 241, 0.2)' },
    stopIndex: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
    stopIndexText: { fontWeight: 'bold', fontSize: 13 },
    stopName: { color: '#f8fafc', fontSize: 15, fontWeight: '600' },
    stopAddress: { color: '#64748b', fontSize: 12, marginTop: 2 },
    primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 18, borderRadius: 20 },
    primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
    pin: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 3, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 5 },
    pinText: { color: '#fff', fontSize: 11, fontWeight: '900' },
    pulseContainer: { alignItems: 'center', justifyContent: 'center' },
    pulse: { position: 'absolute', width: 40, height: 40, borderRadius: 20 },
    pulseCore: { width: 20, height: 20, borderRadius: 10, borderWidth: 3, borderColor: 'white' },
});
