import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, Image, ActivityIndicator, FlatList } from 'react-native';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import { Camera, Send, Map, FileText, CheckCircle2, CloudUpload, Bed, MapPin, Link2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';

export default function ExpensesScreen({ navigation }) {
    const { user } = useAuth();
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('Fuel');
    const [description, setDescription] = useState('');
    const [claimedKm, setClaimedKm] = useState('');
    const [autoKm, setAutoKm] = useState(0);

    // Accommodation fields
    const [nights, setNights] = useState('');
    const [property, setProperty] = useState('');
    const [city, setCity] = useState('');

    const [receipt, setReceipt] = useState(null);
    const [loading, setLoading] = useState(false);
    const [fetchingKm, setFetchingKm] = useState(true);

    // Per-stop expense tagging
    const [planStops, setPlanStops] = useState([]);
    const [linkedStopId, setLinkedStopId] = useState(null);
    const [linkedStopName, setLinkedStopName] = useState('');

    useEffect(() => {
        fetchKmSuggestion();
        fetchPlanStops();
    }, []);

    const fetchKmSuggestion = async () => {
        try {
            const res = await client.get('/api/field/km-suggestion');
            setAutoKm(res.data.suggested_km);
        } catch (e) {
            console.error('Failed to fetch KM suggestion', e);
        } finally {
            setFetchingKm(false);
        }
    };

    const fetchPlanStops = async () => {
        try {
            const res = await client.get(`/api/field/plan/${user?.email}`);
            if (res.data?.stops) {
                setPlanStops(res.data.stops.map((s, i) => ({
                    id: s.visit_id || `stop_${i}`,
                    name: s.place_name,
                    address: s.place_address || s.address || '',
                })));
            }
        } catch (e) {
            // No plan today or not approved — that's fine
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.7,
            base64: true
        });

        if (!result.canceled) {
            setReceipt(result.assets[0]);
        }
    };

    const handleAutoFill = () => {
        setClaimedKm(autoKm.toString());
    };

    const handleSubmit = async () => {
        if (!amount || !description) {
            Alert.alert('Error', 'Please enter amount and description');
            return;
        }

        if (category === 'Fuel' && !claimedKm) {
            Alert.alert('Error', 'Please enter KM for fuel reimbursement');
            return;
        }

        if (category === 'Accommodation' && (!nights || !property || !city)) {
            Alert.alert('Error', 'Please fill all accommodation details');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                expense_type: category.toLowerCase(),
                amount: parseFloat(amount),
                description: description,
                receipt_url: receipt ? `data:image/jpeg;base64,${receipt.base64}` : "",
                claimed_km: claimedKm ? parseFloat(claimedKm) : null,
                auto_calculated_km: autoKm,
                visit_plan_stop_id: linkedStopId,
                // New Fields
                nights: category === 'Accommodation' ? parseInt(nights) : null,
                accommodation_name: category === 'Accommodation' ? property : null,
                location_city: category === 'Accommodation' ? city : null
            };

            await client.post('/api/field/expenses', payload);
            Alert.alert('Success', 'Expense claim submitted with proof.', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (e) {
            const detail = e.response?.data?.detail;
            const msg = typeof detail === 'string' ? detail : JSON.stringify(detail) || 'Submission failed';
            Alert.alert('Error', msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.background}>
                <View style={styles.headerRow}>
                    <Text style={styles.header}>Expense Claim</Text>
                    {fetchingKm ? (
                        <ActivityIndicator size="small" color="#6366f1" />
                    ) : (
                        <View style={styles.kmBadge}>
                            <Map color="#6366f1" size={14} />
                            <Text style={styles.kmBadgeText}>{autoKm} KM tracked today</Text>
                        </View>
                    )}
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={styles.form}>
                    <Text style={styles.label}>Category</Text>
                    <View style={styles.pickerContainer}>
                        {['Fuel', 'Meal', 'Accommodation', 'Misc'].map(cat => (
                            <TouchableOpacity
                                key={cat}
                                style={[styles.chip, category === cat && styles.chipActive]}
                                onPress={() => setCategory(cat)}
                            >
                                <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>{cat}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {category === 'Fuel' && (
                        <View style={styles.kmContainer}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Claimed KM</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter KM"
                                    placeholderTextColor="#94a3b8"
                                    keyboardType="numeric"
                                    value={claimedKm}
                                    onChangeText={setClaimedKm}
                                />
                            </View>
                            <TouchableOpacity style={styles.autoFillBtn} onPress={handleAutoFill}>
                                <CheckCircle2 color="#6366f1" size={16} />
                                <Text style={styles.autoFillText}>Use Tracked KM</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {category === 'Accommodation' && (
                        <View style={styles.extraFields}>
                            <Text style={styles.label}>Stay Details</Text>
                            <View style={styles.row}>
                                <View style={{ flex: 2, marginRight: 10 }}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Hotel Name"
                                        placeholderTextColor="#94a3b8"
                                        value={property}
                                        onChangeText={setProperty}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Nights"
                                        placeholderTextColor="#94a3b8"
                                        keyboardType="numeric"
                                        value={nights}
                                        onChangeText={setNights}
                                    />
                                </View>
                            </View>
                            <TextInput
                                style={styles.input}
                                placeholder="City"
                                placeholderTextColor="#94a3b8"
                                value={city}
                                onChangeText={setCity}
                            />
                        </View>
                    )}

                    <Text style={styles.label}>Amount (₹)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="0.00"
                        placeholderTextColor="#94a3b8"
                        keyboardType="numeric"
                        value={amount}
                        onChangeText={setAmount}
                    />

                    <Text style={styles.label}>Description</Text>
                    <TextInput
                        style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                        placeholder="Purpose of expense..."
                        placeholderTextColor="#94a3b8"
                        multiline
                        value={description}
                        onChangeText={setDescription}
                    />

                    <Text style={styles.label}>Proof of Expense</Text>
                    <TouchableOpacity style={styles.receiptCard} onPress={pickImage}>
                        {receipt ? (
                            <Image source={{ uri: receipt.uri }} style={styles.receiptPreview} />
                        ) : (
                            <View style={styles.receiptPlaceholder}>
                                <Camera color="#6366f1" size={32} />
                                <Text style={styles.receiptBtnText}>Take Photo of Bill / Receipt</Text>
                                <Text style={styles.receiptSubtext}>Required for verification</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    {/* Per-stop Expense Tagging */}
                    {planStops.length > 0 && (
                        <View style={styles.stopLinkSection}>
                            <Text style={styles.label}>Link to Visit Stop</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                                <TouchableOpacity
                                    style={[styles.stopChip, !linkedStopId && styles.stopChipActive]}
                                    onPress={() => { setLinkedStopId(null); setLinkedStopName(''); }}
                                >
                                    <Text style={[styles.stopChipText, !linkedStopId && styles.stopChipTextActive]}>None</Text>
                                </TouchableOpacity>
                                {planStops.map(stop => (
                                    <TouchableOpacity
                                        key={stop.id}
                                        style={[styles.stopChip, linkedStopId === stop.id && styles.stopChipActive]}
                                        onPress={() => { setLinkedStopId(stop.id); setLinkedStopName(stop.name); }}
                                    >
                                        <Link2 size={12} color={linkedStopId === stop.id ? '#fff' : '#94a3b8'} />
                                        <Text style={[styles.stopChipText, linkedStopId === stop.id && styles.stopChipTextActive]} numberOfLines={1}>{stop.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    <TouchableOpacity
                        style={[styles.submitBtn, loading && styles.disabled]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <>
                                <Send color="#FFF" size={20} style={{ marginRight: 10 }} />
                                <Text style={styles.submitBtnText}>Submit for Approval</Text>
                            </>
                        )}
                    </TouchableOpacity>
                    <View style={{ height: 40 }} />
                </ScrollView>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    background: { flex: 1, paddingHorizontal: 25, paddingTop: 50 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    header: { fontSize: 24, fontWeight: 'bold', color: '#f8fafc' },
    kmBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(99, 102, 241, 0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 },
    kmBadgeText: { color: '#6366f1', fontSize: 12, fontWeight: '700' },
    form: { flex: 1 },
    label: { fontSize: 13, color: '#64748b', marginBottom: 8, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
    input: { backgroundColor: 'rgba(30, 41, 59, 0.5)', padding: 16, borderRadius: 14, fontSize: 16, marginBottom: 20, color: '#f8fafc', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    pickerContainer: { flexDirection: 'row', gap: 10, marginBottom: 25, flexWrap: 'wrap' },
    chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#334155', backgroundColor: 'rgba(30, 41, 59, 0.5)' },
    chipActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
    chipText: { color: '#94a3b8', fontSize: 14 },
    chipTextActive: { color: '#FFF', fontWeight: 'bold' },
    kmContainer: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    extraFields: { marginBottom: 10 },
    row: { flexDirection: 'row' },
    autoFillBtn: { marginTop: 32, paddingVertical: 14, paddingHorizontal: 12, backgroundColor: 'rgba(99, 102, 241, 0.1)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.3)', flexDirection: 'row', alignItems: 'center', gap: 6 },
    autoFillText: { color: '#6366f1', fontWeight: '700', fontSize: 12 },
    receiptCard: { height: 180, borderRadius: 20, borderStyle: 'dashed', borderWidth: 2, borderColor: '#334155', backgroundColor: 'rgba(15, 23, 42, 0.3)', marginBottom: 30, overflow: 'hidden' },
    receiptPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    receiptBtnText: { marginTop: 12, color: '#f8fafc', fontWeight: '600', fontSize: 15 },
    receiptSubtext: { marginTop: 4, color: '#64748b', fontSize: 12 },
    receiptPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
    submitBtn: { backgroundColor: '#6366f1', padding: 18, borderRadius: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
    submitBtnText: { color: '#FFF', fontSize: 17, fontWeight: 'bold' },
    disabled: { opacity: 0.6 },
    // Per-stop expense tagging
    stopLinkSection: { marginBottom: 5 },
    stopChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#334155', backgroundColor: 'rgba(30, 41, 59, 0.5)', marginRight: 10 },
    stopChipActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
    stopChipText: { color: '#94a3b8', fontSize: 13, maxWidth: 120 },
    stopChipTextActive: { color: '#FFF', fontWeight: 'bold' },
});
