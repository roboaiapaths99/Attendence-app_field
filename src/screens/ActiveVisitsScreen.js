import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, Alert,
    ActivityIndicator, Modal, TextInput, Switch, ScrollView
} from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
    MapPin, CheckCircle2, Circle, Camera, Calendar, X,
    Mic, MicOff, ShoppingBag, User, Briefcase, FileText, AlertTriangle
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getFriendlyErrorMessage } from '../utils/errorUtils';

export default function ActiveVisitsScreen({ navigation }) {
    const { user } = useAuth();
    const [plan, setPlan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeVisit, setActiveVisit] = useState(null);
    const [checkoutVisible, setCheckoutVisible] = useState(false);

    // Check-out form state
    const [remarks, setRemarks] = useState('');
    const [personMet, setPersonMet] = useState('');
    const [roleMet, setRoleMet] = useState('');
    const [outcome, setOutcome] = useState('Completed');
    const [orderCaptured, setOrderCaptured] = useState(false);
    const [leadCaptured, setLeadCaptured] = useState(false);
    const [leadDetails, setLeadDetails] = useState('');

    // Media state
    const [sitePhoto, setSitePhoto] = useState(null);
    const [voiceNoteBase64, setVoiceNoteBase64] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const recordingRef = useRef(null);
    const timerRef = useRef(null);

    useEffect(() => {
        fetchPlan();
    }, []);

    const fetchPlan = async () => {
        try {
            const res = await client.get(`/api/field/plan/${user.email}`);
            setPlan(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // -------- CHECK-IN with Geofence --------
    const handleCheckIn = async (stop) => {
        setLoading(true);
        try {
            const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High
            });

            const res = await client.post('/api/field/visit/check-in', {
                employee_id: user.email,
                organization_id: user.organization_id,
                lat: loc.coords.latitude,
                lng: loc.coords.longitude,
                accuracy: loc.coords.accuracy,
                place_name: stop.place_name,
                stop_id: stop.sequence_order
            });

            setActiveVisit({ ...stop, visit_id: res.data.visit_id });

            const distMsg = res.data.distance_meters
                ? ` (${res.data.distance_meters}m away)`
                : '';
            Alert.alert('✅ Checked In', `Visit started at ${stop.place_name}${distMsg}`);
        } catch (e) {
            Alert.alert('Check-in Failed', getFriendlyErrorMessage(e, 'Check-in failed. Ensure you are at the client site.'));
        } finally {
            setLoading(false);
        }
    };

    // -------- PHOTO CAPTURE --------
    const pickSitePhoto = async () => {
        try {
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.6,
                base64: true,
            });
            if (!result.canceled && result.assets?.length > 0) {
                setSitePhoto(result.assets[0].base64);
            }
        } catch (e) {
            Alert.alert('Error', 'Camera not available');
        }
    };

    // -------- VOICE RECORDING (simulated) --------
    const toggleRecording = async () => {
        if (isRecording) {
            // Stop recording
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
            // In production, use expo-av Audio.Recording to capture audio
            // For now, we set a placeholder to indicate a voice note was recorded
            setVoiceNoteBase64('VOICE_NOTE_RECORDED');
            Alert.alert('🎤 Saved', `Voice note recorded (${recordingDuration}s)`);
        } else {
            // Start recording
            setIsRecording(true);
            setRecordingDuration(0);
            timerRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);
        }
    };

    // -------- CHECK-OUT --------
    const handleCheckOut = async () => {
        if (!remarks) {
            Alert.alert('Required', 'Please enter visit remarks');
            return;
        }

        setLoading(true);
        try {
            const loc = await Location.getCurrentPositionAsync({});
            await client.post('/api/field/visit/check-out', {
                visit_id: activeVisit.visit_id,
                lat: loc.coords.latitude,
                lng: loc.coords.longitude,
                remarks: remarks,
                outcome: outcome,
                order_captured: orderCaptured,
                lead_captured: leadCaptured,
                lead_details: leadDetails || undefined,
                person_met_name: personMet || undefined,
                person_met_role: roleMet || undefined,
                site_photo_base64: sitePhoto || undefined,
                voice_note_base64: voiceNoteBase64 !== 'VOICE_NOTE_RECORDED' ? voiceNoteBase64 : undefined,
            });

            Alert.alert('✅ Visit Completed', 'Details saved. Safe travels to your next stop!');
            resetCheckoutForm();
            fetchPlan();
        } catch (e) {
            Alert.alert('Error', 'Check-out failed.');
        } finally {
            setLoading(false);
        }
    };

    const resetCheckoutForm = () => {
        setActiveVisit(null);
        setCheckoutVisible(false);
        setRemarks('');
        setPersonMet('');
        setRoleMet('');
        setOutcome('Completed');
        setOrderCaptured(false);
        setLeadCaptured(false);
        setLeadDetails('');
        setSitePhoto(null);
        setVoiceNoteBase64(null);
        setIsRecording(false);
        setRecordingDuration(0);
    };

    // -------- RENDER STOP CARD --------
    const renderStop = ({ item }) => {
        const isCompleted = item.status === 'completed';
        const isOngoing = item.status === 'ongoing';

        return (
            <View style={[
                styles.stopCard,
                isCompleted && styles.stopCardCompleted,
                isOngoing && styles.stopCardOngoing,
            ]}>
                <View style={styles.stopStatus}>
                    {isCompleted ? (
                        <CheckCircle2 color="#34C759" size={24} />
                    ) : isOngoing ? (
                        <View style={styles.ongoingDot} />
                    ) : (
                        <Circle color="#94a3b8" size={24} />
                    )}
                </View>
                <View style={styles.stopInfo}>
                    <Text style={styles.stopName}>{item.place_name}</Text>
                    <Text style={styles.stopAddress}>{item.place_address || item.address}</Text>
                    {item.customer_type && item.customer_type !== 'other' && (
                        <View style={styles.typeBadge}>
                            <Text style={styles.typeBadgeText}>{item.customer_type}</Text>
                        </View>
                    )}
                </View>
                {!activeVisit && !isCompleted && (
                    <TouchableOpacity style={styles.checkInBtn} onPress={() => handleCheckIn(item)}>
                        <MapPin color="#FFF" size={14} />
                        <Text style={styles.checkInText}>Check In</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    if (loading && !plan) return <View style={styles.center}><ActivityIndicator color="#6366f1" size="large" /></View>;

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.background}>
                <View style={styles.header}>
                    <Text style={styles.title}>Today's Visits</Text>
                    <Text style={styles.date}>{new Date().toDateString()}</Text>
                </View>

                {/* Active Visit Banner */}
                {activeVisit && (
                    <View style={styles.activeCard}>
                        <View style={styles.activeHeader}>
                            <View style={styles.pulse} />
                            <Text style={styles.activeTitle}>CURRENTLY VISITING</Text>
                        </View>
                        <Text style={styles.activeName}>{activeVisit.place_name}</Text>
                        <TouchableOpacity style={styles.checkoutBtn} onPress={() => setCheckoutVisible(true)}>
                            <Text style={styles.checkoutBtnText}>Complete Visit (Check-out)</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Stop List */}
                {plan?.stops ? (
                    <FlatList
                        data={plan.stops}
                        renderItem={renderStop}
                        keyExtractor={(item) => String(item.sequence_order || item.sequence)}
                        contentContainerStyle={styles.list}
                    />
                ) : (
                    <View style={styles.empty}>
                        <Calendar size={50} color="#94a3b8" />
                        <Text style={styles.emptyText}>No approved plan for today.</Text>
                        <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('PlanStatus')}>
                            <Text style={styles.emptyBtnText}>Check Plan Status</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </LinearGradient>

            {/* ====== CHECK-OUT MODAL ====== */}
            <Modal visible={checkoutVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Visit Details</Text>
                                <TouchableOpacity onPress={() => setCheckoutVisible(false)}>
                                    <X color="#94a3b8" size={18} />
                                </TouchableOpacity>
                            </View>

                            {/* Person Met */}
                            <Text style={styles.sectionLabel}>Person Met</Text>
                            <View style={styles.rowInputs}>
                                <View style={styles.halfInput}>
                                    <User color="#64748b" size={14} style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.fieldInput}
                                        placeholder="Name"
                                        placeholderTextColor="#475569"
                                        value={personMet}
                                        onChangeText={setPersonMet}
                                    />
                                </View>
                                <View style={styles.halfInput}>
                                    <Briefcase color="#64748b" size={14} style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.fieldInput}
                                        placeholder="Role / Designation"
                                        placeholderTextColor="#475569"
                                        value={roleMet}
                                        onChangeText={setRoleMet}
                                    />
                                </View>
                            </View>

                            {/* Remarks */}
                            <Text style={styles.sectionLabel}>What happened?</Text>
                            <TextInput
                                style={[styles.remarksInput, { height: 80 }]}
                                placeholder="Describe the visit outcome, discussions, observations..."
                                placeholderTextColor="#475569"
                                multiline
                                numberOfLines={4}
                                value={remarks}
                                onChangeText={setRemarks}
                            />

                            {/* Media Row */}
                            <Text style={styles.sectionLabel}>Attachments</Text>
                            <View style={styles.mediaRow}>
                                <TouchableOpacity
                                    style={[styles.mediaBtn, sitePhoto && styles.mediaBtnActive]}
                                    onPress={pickSitePhoto}
                                >
                                    <Camera color={sitePhoto ? "#34C759" : "#94a3b8"} size={20} />
                                    <Text style={[styles.mediaBtnText, sitePhoto && { color: '#34C759' }]}>
                                        {sitePhoto ? 'Photo ✓' : 'Site Photo'}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.mediaBtn, isRecording && styles.mediaBtnRecording, voiceNoteBase64 && styles.mediaBtnActive]}
                                    onPress={toggleRecording}
                                >
                                    {isRecording ? <MicOff color="#ef4444" size={20} /> : <Mic color={voiceNoteBase64 ? "#34C759" : "#94a3b8"} size={20} />}
                                    <Text style={[styles.mediaBtnText, isRecording && { color: '#ef4444' }, voiceNoteBase64 && { color: '#34C759' }]}>
                                        {isRecording ? `${recordingDuration}s ■ Stop` : voiceNoteBase64 ? 'Voice ✓' : 'Voice Note'}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* Order / Lead Capture */}
                            <Text style={styles.sectionLabel}>Business Outcome</Text>
                            <View style={styles.toggleRow}>
                                <View style={styles.toggleItem}>
                                    <ShoppingBag color={orderCaptured ? "#34C759" : "#64748b"} size={16} />
                                    <Text style={styles.toggleLabel}>Order Captured</Text>
                                    <Switch
                                        value={orderCaptured}
                                        onValueChange={setOrderCaptured}
                                        trackColor={{ true: '#22c55e33' }}
                                        thumbColor={orderCaptured ? '#22c55e' : '#64748b'}
                                    />
                                </View>
                                <View style={styles.toggleItem}>
                                    <FileText color={leadCaptured ? "#34C759" : "#64748b"} size={16} />
                                    <Text style={styles.toggleLabel}>Lead Captured</Text>
                                    <Switch
                                        value={leadCaptured}
                                        onValueChange={setLeadCaptured}
                                        trackColor={{ true: '#22c55e33' }}
                                        thumbColor={leadCaptured ? '#22c55e' : '#64748b'}
                                    />
                                </View>
                            </View>

                            {leadCaptured && (
                                <TextInput
                                    style={styles.remarksInput}
                                    placeholder="Lead details (contact info, interest level...)"
                                    placeholderTextColor="#475569"
                                    value={leadDetails}
                                    onChangeText={setLeadDetails}
                                    multiline
                                />
                            )}

                            {/* Actions */}
                            <View style={styles.modalActions}>
                                <TouchableOpacity style={styles.cancelBtn} onPress={() => setCheckoutVisible(false)}>
                                    <Text style={{ color: '#94a3b8', fontWeight: '600' }}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.doneBtn} onPress={handleCheckOut}>
                                    <CheckCircle2 color="#FFF" size={16} />
                                    <Text style={styles.doneBtnText}>Confirm Check-out</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    background: { flex: 1, paddingTop: 50 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
    header: { paddingHorizontal: 20, marginBottom: 10 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#f8fafc' },
    date: { fontSize: 14, color: '#94a3b8' },
    list: { padding: 20 },

    // Stop Card
    stopCard: {
        backgroundColor: 'rgba(30, 41, 59, 0.7)',
        padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center',
        marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)'
    },
    stopCardCompleted: { borderColor: 'rgba(52,199,89,0.2)', backgroundColor: 'rgba(30,41,59,0.4)' },
    stopCardOngoing: { borderColor: '#6366f1', borderWidth: 1.5 },
    stopStatus: { marginRight: 15 },
    ongoingDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#6366f1', borderWidth: 3, borderColor: '#818cf8' },
    stopInfo: { flex: 1 },
    stopName: { fontSize: 16, fontWeight: '600', color: '#f8fafc' },
    stopAddress: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
    typeBadge: { marginTop: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, backgroundColor: 'rgba(99,102,241,0.15)', borderRadius: 6 },
    typeBadgeText: { fontSize: 10, color: '#a5b4fc', textTransform: 'uppercase', fontWeight: '700', letterSpacing: 0.5 },
    checkInBtn: { backgroundColor: '#6366f1', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 5 },
    checkInText: { color: '#FFF', fontWeight: '600', fontSize: 13 },

    // Active Visit Banner
    activeCard: { backgroundColor: '#6366f1', marginHorizontal: 20, marginVertical: 10, padding: 20, borderRadius: 20 },
    activeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
    pulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFF', marginRight: 8 },
    activeTitle: { color: 'rgba(255,255,255,0.7)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '700' },
    activeName: { color: '#FFF', fontSize: 22, fontWeight: 'bold', marginBottom: 15 },
    checkoutBtn: { backgroundColor: '#FFF', padding: 12, borderRadius: 12, alignItems: 'center' },
    checkoutBtnText: { color: '#1e293b', fontWeight: '700' },

    // Empty State
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyText: { marginTop: 15, color: '#94a3b8', textAlign: 'center' },
    emptyBtn: { marginTop: 14, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(99,102,241,0.2)' },
    emptyBtnText: { color: '#c7d2fe', fontWeight: '600' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#0f172a', padding: 25, borderTopLeftRadius: 30, borderTopRightRadius: 30, maxHeight: '85%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#f8fafc' },

    // Section Labels
    sectionLabel: { fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 14 },

    // Inputs
    rowInputs: { flexDirection: 'row', gap: 10 },
    halfInput: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', borderRadius: 12, paddingHorizontal: 12 },
    inputIcon: { marginRight: 8 },
    fieldInput: { flex: 1, height: 48, color: '#f8fafc', fontSize: 14 },
    remarksInput: { backgroundColor: '#111827', padding: 15, borderRadius: 12, textAlignVertical: 'top', marginBottom: 4, color: '#f8fafc', fontSize: 14 },

    // Media Row
    mediaRow: { flexDirection: 'row', gap: 10 },
    mediaBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        borderWidth: 1, borderColor: '#1f2937', padding: 14, borderRadius: 12, borderStyle: 'dashed'
    },
    mediaBtnActive: { borderColor: '#22c55e', borderStyle: 'solid', backgroundColor: 'rgba(34,197,94,0.05)' },
    mediaBtnRecording: { borderColor: '#ef4444', borderStyle: 'solid', backgroundColor: 'rgba(239,68,68,0.08)' },
    mediaBtnText: { color: '#94a3b8', fontWeight: '600', fontSize: 13 },

    // Toggle Row
    toggleRow: { gap: 8 },
    toggleItem: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#111827', padding: 12, borderRadius: 12 },
    toggleLabel: { flex: 1, color: '#cbd5e1', fontSize: 14 },

    // Actions
    modalActions: { flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 20 },
    cancelBtn: { flex: 1, padding: 15, alignItems: 'center', backgroundColor: '#111827', borderRadius: 12 },
    doneBtn: { flex: 2, backgroundColor: '#6366f1', padding: 15, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
    doneBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 }
});
