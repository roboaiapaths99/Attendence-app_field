import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, Alert, ActivityIndicator, Platform, SafeAreaView, Switch, Modal, Pressable, FlatList
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import { Plus, Trash2, Send, MapPin, X, FolderOpen, Save, ChevronDown } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getFriendlyErrorMessage } from '../utils/errorUtils';

export default function VisitPlanScreen({ navigation }) {
    const { user, organization } = useAuth();
    const primaryColor = organization?.primary_color || '#6366f1';

    const [stops, setStops] = useState([]);
    const [newStop, setNewStop] = useState({
        place_name: '',
        place_address: '',
        place_lat: '',
        place_lng: '',
        customer_type: 'customer',
        priority: 'medium',
        estimated_duration_minutes: '30'
    });
    const [loading, setLoading] = useState(false);

    // Milk Run Template State
    const [templates, setTemplates] = useState([]);
    const [templatePickerVisible, setTemplatePickerVisible] = useState(false);
    const [saveAsTemplate, setSaveAsTemplate] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const [loadingTemplates, setLoadingTemplates] = useState(false);

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            const res = await client.get(`/api/field/plan/templates/${user.email}`);
            setTemplates(res.data || []);
        } catch (e) {
            console.log('No templates yet');
        }
    };

    const loadTemplate = (template) => {
        const enrichedStops = (template.stops || []).map((s, i) => ({
            ...s,
            id: Date.now() + i,
            place_lat: s.place_lat?.toString() || '',
            place_lng: s.place_lng?.toString() || '',
            estimated_duration_minutes: (s.estimated_duration_minutes || 30).toString(),
        }));
        setStops(enrichedStops);
        setTemplatePickerVisible(false);
        Alert.alert('✅ Template Loaded', `"${template.template_name}" with ${enrichedStops.length} stops.`);
    };

    const addStop = () => {
        if (!newStop.place_name || !newStop.place_address) {
            Alert.alert('Required', 'Please enter client name and address');
            return;
        }
        setStops([...stops, { ...newStop, id: Date.now() }]);
        setNewStop({
            place_name: '',
            place_address: '',
            place_lat: '',
            place_lng: '',
            customer_type: 'customer',
            priority: 'medium',
            estimated_duration_minutes: '30'
        });
    };

    const removeStop = (id) => {
        setStops(stops.filter(s => s.id !== id));
    };

    const submitPlan = async () => {
        if (stops.length === 0) {
            Alert.alert('Empty Plan', 'Please add at least one stop.');
            return;
        }

        setLoading(true);
        try {
            const formattedStops = stops.map((s, index) => ({
                sequence_order: index + 1,
                place_name: s.place_name,
                place_address: s.place_address,
                place_lat: s.place_lat ? parseFloat(s.place_lat) : null,
                place_lng: s.place_lng ? parseFloat(s.place_lng) : null,
                customer_type: s.customer_type,
                priority: s.priority,
                estimated_duration_minutes: parseInt(s.estimated_duration_minutes, 10) || 30
            }));

            const payload = {
                employee_id: user.email,
                organization_id: user.organization_id,
                date: new Date().toISOString().split('T')[0],
                stops: formattedStops
            };


            await client.post('/api/field/plan', payload);

            // Save as Milk Run template if toggled
            if (saveAsTemplate && templateName.trim()) {
                try {
                    await client.post('/api/field/plan/template', {
                        template_name: templateName.trim(),
                        stops: formattedStops,
                        recurrence_days: [0, 1, 2, 3, 4], // Mon-Fri by default
                    });
                } catch (tErr) {
                    console.warn('Template save failed:', tErr.message);
                }
            }

            Alert.alert('✅ Success', 'Visit plan submitted successfully');
            setStops([]);
            navigation.goBack();
        } catch (e) {
            Alert.alert('Submission Failed', getFriendlyErrorMessage(e, 'Could not submit your visit plan.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.background}>
                <SafeAreaView style={{ flex: 1 }}>
                    <View style={styles.content}>
                        <View style={styles.header}>
                            <TouchableOpacity onPress={() => navigation.goBack()}>
                                <X color="#94a3b8" size={24} />
                            </TouchableOpacity>
                            <Text style={styles.headerTitle}>Daily Visit Plan</Text>
                            <TouchableOpacity
                                style={[styles.templateBtn, { backgroundColor: `${primaryColor}20` }]}
                                onPress={() => setTemplatePickerVisible(true)}
                            >
                                <FolderOpen color={primaryColor} size={16} />
                                <Text style={[styles.templateBtnText, { color: primaryColor }]}>Templates</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputCard}>
                            <Text style={styles.cardLabel}>Add Destination</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Client / Entity Name"
                                placeholderTextColor="#94a3b8"
                                value={newStop.place_name}
                                onChangeText={(v) => setNewStop({ ...newStop, place_name: v })}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Address / Territory"
                                placeholderTextColor="#94a3b8"
                                value={newStop.place_address}
                                onChangeText={(v) => setNewStop({ ...newStop, place_address: v })}
                            />
                            <View style={styles.row}>
                                <TextInput
                                    style={[styles.input, styles.halfInput]}
                                    placeholder="Latitude (optional)"
                                    placeholderTextColor="#94a3b8"
                                    keyboardType="numeric"
                                    value={newStop.place_lat}
                                    onChangeText={(v) => setNewStop({ ...newStop, place_lat: v })}
                                />
                                <TextInput
                                    style={[styles.input, styles.halfInput]}
                                    placeholder="Longitude (optional)"
                                    placeholderTextColor="#94a3b8"
                                    keyboardType="numeric"
                                    value={newStop.place_lng}
                                    onChangeText={(v) => setNewStop({ ...newStop, place_lng: v })}
                                />
                            </View>
                            <View style={styles.row}>
                                <TextInput
                                    style={[styles.input, styles.halfInput]}
                                    placeholder="Customer type (school/customer)"
                                    placeholderTextColor="#94a3b8"
                                    value={newStop.customer_type}
                                    onChangeText={(v) => setNewStop({ ...newStop, customer_type: v })}
                                />
                                <TextInput
                                    style={[styles.input, styles.halfInput]}
                                    placeholder="Priority (low/medium/high)"
                                    placeholderTextColor="#94a3b8"
                                    value={newStop.priority}
                                    onChangeText={(v) => setNewStop({ ...newStop, priority: v })}
                                />
                            </View>
                            <TextInput
                                style={[styles.input, { marginBottom: 20 }]}
                                placeholder="Estimated duration (minutes)"
                                placeholderTextColor="#94a3b8"
                                keyboardType="numeric"
                                value={newStop.estimated_duration_minutes}
                                onChangeText={(v) => setNewStop({ ...newStop, estimated_duration_minutes: v })}
                            />
                            <TouchableOpacity style={[styles.addBtn, { backgroundColor: `${primaryColor}20` }]} onPress={addStop}>
                                <Plus color={primaryColor} size={20} />
                                <Text style={[styles.addBtnText, { color: primaryColor }]}>Add to Queue</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Save as Template Toggle */}
                        <View style={styles.templateToggle}>
                            <View style={styles.templateToggleLeft}>
                                <Save color={saveAsTemplate ? primaryColor : '#64748b'} size={16} />
                                <Text style={[styles.templateToggleLabel, saveAsTemplate && { color: '#f8fafc' }]}>Save as Milk Run Template</Text>
                            </View>
                            <Switch
                                value={saveAsTemplate}
                                onValueChange={setSaveAsTemplate}
                                trackColor={{ true: `${primaryColor}44` }}
                                thumbColor={saveAsTemplate ? primaryColor : '#64748b'}
                            />
                        </View>
                        {saveAsTemplate && (
                            <TextInput
                                style={[styles.input, { marginBottom: 20 }]}
                                placeholder="Template name (e.g. Monday Beat)"
                                placeholderTextColor="#94a3b8"
                                value={templateName}
                                onChangeText={setTemplateName}
                            />
                        )}

                        <Text style={styles.sectionTitle}>Planned Stops ({stops.length})</Text>
                        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                            {stops.length === 0 ? (
                                <View style={styles.emptyContainer}>
                                    <Text style={styles.emptyText}>Add some stops to get started</Text>
                                </View>
                            ) : (
                                stops.map((stop, idx) => (
                                    <View key={stop.id} style={styles.stopItem}>
                                        <View style={styles.stopIcon}>
                                            <MapPin color={primaryColor} size={18} />
                                        </View>
                                        <View style={styles.stopInfo}>
                                            <Text style={styles.stopNum}>{stop.place_name}</Text>
                                            <Text style={styles.stopAddress}>{stop.place_address}</Text>
                                        </View>
                                        <TouchableOpacity onPress={() => removeStop(stop.id)} style={styles.removeBtn}>
                                            <Trash2 color="#f43f5e" size={18} />
                                        </TouchableOpacity>
                                    </View>
                                ))
                            )}
                        </ScrollView>

                        <TouchableOpacity
                            style={[
                                styles.submitBtn,
                                { backgroundColor: primaryColor },
                                (stops.length === 0 || loading) && styles.disabled
                            ]}
                            onPress={submitPlan}
                            disabled={stops.length === 0 || loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <>
                                    <Send color="#FFF" size={20} style={{ marginRight: 10 }} />
                                    <Text style={styles.submitBtnText}>Publish Daily Plan</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            {/* Template Picker Modal */}
            <Modal visible={templatePickerVisible} animationType="slide" transparent>
                <Pressable style={styles.modalBackdrop} onPress={() => setTemplatePickerVisible(false)}>
                    <Pressable style={styles.modalSheet} onPress={e => e.stopPropagation()}>
                        <View style={styles.modalHeader}>
                            <FolderOpen color={primaryColor} size={20} />
                            <Text style={styles.modalTitle}>Load Template</Text>
                            <TouchableOpacity onPress={() => setTemplatePickerVisible(false)}>
                                <X color="#94a3b8" size={20} />
                            </TouchableOpacity>
                        </View>
                        {templates.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>No saved templates yet. Create a plan and toggle "Save as Template".</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={templates}
                                keyExtractor={item => item._id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.templateItem}
                                        onPress={() => loadTemplate(item)}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.templateItemName}>{item.template_name}</Text>
                                            <Text style={styles.templateItemMeta}>{item.stops?.length || 0} stops</Text>
                                        </View>
                                        <ChevronDown color="#64748b" size={16} style={{ transform: [{ rotate: '-90deg' }] }} />
                                    </TouchableOpacity>
                                )}
                            />
                        )}
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    background: { flex: 1 },
    content: { flex: 1, padding: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: Platform.OS === 'android' ? 20 : 0 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#f8fafc', flex: 1, textAlign: 'center' },
    templateBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
    templateBtnText: { fontWeight: '700', fontSize: 12 },
    inputCard: {
        backgroundColor: 'rgba(30, 41, 59, 0.7)',
        padding: 20,
        borderRadius: 24,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)'
    },
    cardLabel: { fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 15 },
    input: {
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        padding: 14,
        borderRadius: 12,
        color: '#f8fafc',
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)'
    },
    row: { flexDirection: 'row', gap: 10 },
    halfInput: { flex: 1 },
    addBtn: {
        padding: 14,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center'
    },
    addBtnText: { fontWeight: '600', marginLeft: 8 },
    templateToggle: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: 'rgba(30, 41, 59, 0.5)', borderRadius: 16, padding: 14, marginBottom: 8,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)'
    },
    templateToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    templateToggleLabel: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
    sectionTitle: { fontSize: 14, color: '#94a3b8', fontWeight: '700', marginBottom: 15, textTransform: 'uppercase' },
    list: { flex: 1 },
    emptyContainer: { padding: 40, alignItems: 'center' },
    emptyText: { color: '#64748b', fontSize: 14, textAlign: 'center' },
    stopItem: {
        backgroundColor: 'rgba(30, 41, 59, 0.7)',
        padding: 16, borderRadius: 16, marginBottom: 10,
        flexDirection: 'row', alignItems: 'center',
        borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)'
    },
    stopIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.03)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    stopInfo: { flex: 1 },
    stopNum: { fontSize: 16, fontWeight: '600', color: '#f8fafc' },
    stopAddress: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
    removeBtn: { padding: 8 },
    submitBtn: {
        padding: 18, borderRadius: 20, alignItems: 'center',
        flexDirection: 'row', justifyContent: 'center', marginTop: 20
    },
    submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
    disabled: { opacity: 0.4 },
    // Template Picker Modal
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: '#0f172a', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: '60%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
    modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
    modalTitle: { flex: 1, color: '#f8fafc', fontSize: 18, fontWeight: '800' },
    templateItem: {
        flexDirection: 'row', alignItems: 'center', padding: 16,
        backgroundColor: 'rgba(30,41,59,0.7)', borderRadius: 16, marginBottom: 10,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)'
    },
    templateItemName: { color: '#f8fafc', fontSize: 15, fontWeight: '600' },
    templateItemMeta: { color: '#64748b', fontSize: 12, marginTop: 2 },
});
