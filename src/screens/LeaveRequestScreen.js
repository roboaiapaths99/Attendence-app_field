import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    SafeAreaView, TextInput, Platform, Alert, ActivityIndicator,
    KeyboardAvoidingView, Modal, FlatList
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import {
    Calendar, User, MessageSquare, CheckCircle, XCircle,
    Clock, Send, Filter, ChevronRight, ArrowLeft, Plus,
    Camera as CameraIcon, Trash2, X
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView } from 'expo-camera';
import client from '../api/client';
import { getFriendlyErrorMessage } from '../utils/errorUtils';

export default function LeaveRequestScreen({ navigation }) {
    const { user, organization } = useAuth();
    const primaryColor = organization?.primary_color || '#6366f1';

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('list'); // 'list' or 'new'
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [chatMessage, setChatMessage] = useState('');
    const [sendingMessage, setSendingMessage] = useState(false);

    // New Request Form State
    const [formData, setFormData] = useState({
        leave_type: 'sick_leave',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        reason: ''
    });
    const [proofPhoto, setProofPhoto] = useState(null);
    const [showCamera, setShowCamera] = useState(false);
    const cameraRef = useRef(null);

    useEffect(() => {
        fetchMyRequests();
    }, []);

    const fetchMyRequests = async () => {
        try {
            setLoading(true);
            const res = await client.get('/api/leave/my-requests');
            setRequests(res.data);
        } catch (err) {
            console.error('Failed to fetch requests:', err);
        } finally {
            setLoading(false);
        }
    };

    const submitRequest = async () => {
        if (!formData.reason.trim()) {
            Alert.alert('Error', 'Please provide a reason for the request.');
            return;
        }
        try {
            setLoading(true);
            const payload = {
                ...formData,
                proof_url: proofPhoto ? `data:image/jpeg;base64,${proofPhoto.base64}` : null
            };
            await client.post('/api/leave/request', payload);
            Alert.alert('Success', 'Your request has been submitted.');
            setFormData({
                leave_type: 'sick_leave',
                start_date: new Date().toISOString().split('T')[0],
                end_date: new Date().toISOString().split('T')[0],
                reason: ''
            });
            setProofPhoto(null);
            setView('list');
            fetchMyRequests();
        } catch (err) {
            Alert.alert('Error', getFriendlyErrorMessage(err, 'Failed to submit request.'));
        } finally {
            setLoading(false);
        }
    };

    const sendMessage = async () => {
        if (!chatMessage.trim() || !selectedRequest) return;
        try {
            setSendingMessage(true);
            await client.post(`/api/leave/requests/${selectedRequest._id}/message`, {
                message: chatMessage
            });
            setChatMessage('');
            // Refresh discussion
            const res = await client.get(`/api/leave/requests/${selectedRequest._id}/discussion`);
            setSelectedRequest({ ...selectedRequest, discussion: res.data });
        } catch (err) {
            Alert.alert('Error', getFriendlyErrorMessage(err, 'Failed to send message.'));
        } finally {
            setSendingMessage(false);
        }
    };

    const StatusBadge = ({ status }) => {
        const colors = {
            pending: { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b' },
            approved: { bg: 'rgba(16, 185, 129, 0.1)', text: '#10b981' },
            rejected: { bg: 'rgba(244, 63, 94, 0.1)', text: '#f43f5e' },
            cancelled: { bg: 'rgba(148, 163, 184, 0.1)', text: '#94a3b8' }
        };
        const color = colors[status] || colors.pending;
        return (
            <View style={[styles.statusBadge, { backgroundColor: color.bg, borderColor: `${color.text}30` }]}>
                <Text style={[styles.statusText, { color: color.text }]}>{status.toUpperCase()}</Text>
            </View>
        );
    };

    const DiscussionModal = () => (
        <Modal
            visible={!!selectedRequest}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setSelectedRequest(null)}
        >
            <SafeAreaView style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setSelectedRequest(null)}>
                            <ArrowLeft color="#fff" size={24} />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Discussion</Text>
                        <View style={{ width: 24 }} />
                    </View>

                    <FlatList
                        data={selectedRequest?.discussion || []}
                        keyExtractor={(item, index) => index.toString()}
                        contentContainerStyle={{ padding: 20 }}
                        renderItem={({ item }) => (
                            <View style={[
                                styles.messageBubble,
                                item.sender_id === user.email ? styles.myMessage : styles.otherMessage
                            ]}>
                                <Text style={styles.messageSender}>{item.sender_id === user.email ? 'You' : item.sender_name}</Text>
                                <Text style={styles.messageText}>{item.message}</Text>
                                <Text style={styles.messageTime}>
                                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            </View>
                        )}
                        ListEmptyComponent={() => (
                            <Text style={styles.emptyChat}>No messages yet. Ask questions here.</Text>
                        )}
                    />

                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.chatInputContainer}
                    >
                        <TextInput
                            style={styles.chatInput}
                            placeholder="Type a message..."
                            placeholderTextColor="#64748b"
                            value={chatMessage}
                            onChangeText={setChatMessage}
                        />
                        <TouchableOpacity
                            onPress={sendMessage}
                            disabled={sendingMessage || !chatMessage.trim()}
                            style={[styles.sendBtn, { backgroundColor: primaryColor }]}
                        >
                            {sendingMessage ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Send color="#fff" size={20} />
                            )}
                        </TouchableOpacity>
                    </KeyboardAvoidingView>
                </View>
            </SafeAreaView>
        </Modal>
    );

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.background}>
                <SafeAreaView style={{ flex: 1 }}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <ArrowLeft color="#fff" size={24} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Leave & OD</Text>
                        <TouchableOpacity
                            onPress={() => setView(view === 'list' ? 'new' : 'list')}
                            style={[styles.toggleBtn, { backgroundColor: `${primaryColor}20`, borderColor: `${primaryColor}40` }]}
                        >
                            {view === 'list' ? <Plus color={primaryColor} size={20} /> : <Calendar color={primaryColor} size={20} />}
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        {view === 'list' ? (
                            <>
                                <Text style={styles.sectionTitle}>My Requests</Text>
                                {loading ? (
                                    <ActivityIndicator color={primaryColor} style={{ marginTop: 40 }} />
                                ) : requests.length > 0 ? (
                                    requests.map((item) => (
                                        <TouchableOpacity
                                            key={item._id}
                                            style={styles.requestCard}
                                            onPress={() => setSelectedRequest(item)}
                                        >
                                            <View style={styles.cardHeader}>
                                                <Text style={styles.leaveType}>{item.leave_type.replace('_', ' ').toUpperCase()}</Text>
                                                <StatusBadge status={item.status} />
                                            </View>
                                            <View style={styles.cardInfo}>
                                                <Calendar size={14} color="#94a3b8" />
                                                <Text style={styles.cardDate}>{item.start_date} to {item.end_date}</Text>
                                            </View>
                                            <Text style={styles.cardReason} numberOfLines={1}>{item.reason}</Text>
                                            <View style={styles.cardFooter}>
                                                <View style={styles.msgIndicator}>
                                                    <MessageSquare size={14} color={primaryColor} />
                                                    <Text style={[styles.msgCount, { color: primaryColor }]}>{item.discussion?.length || 0} messages</Text>
                                                </View>
                                                <ChevronRight size={18} color="rgba(255,255,255,0.2)" />
                                            </View>
                                        </TouchableOpacity>
                                    ))
                                ) : (
                                    <View style={styles.emptyContainer}>
                                        <Calendar size={48} color="rgba(255,255,255,0.1)" />
                                        <Text style={styles.emptyText}>No requests found</Text>
                                    </View>
                                )}
                            </>
                        ) : (
                            <View style={styles.formCard}>
                                <Text style={styles.formTitle}>Submit New Request</Text>

                                <Text style={styles.label}>Request Type</Text>
                                <View style={styles.typeSelector}>
                                    {['sick_leave', 'casual_leave', 'on_duty'].map((t) => (
                                        <TouchableOpacity
                                            key={t}
                                            onPress={() => setFormData({ ...formData, leave_type: t })}
                                            style={[
                                                styles.typeBtn,
                                                formData.leave_type === t && { backgroundColor: primaryColor, borderColor: primaryColor }
                                            ]}
                                        >
                                            <Text style={[styles.typeBtnText, formData.leave_type === t && { color: '#fff' }]}>
                                                {t.replace('_', ' ').toUpperCase()}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <View style={styles.row}>
                                    <View style={{ flex: 1, marginRight: 10 }}>
                                        <Text style={styles.label}>Start Date</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={formData.start_date}
                                            onChangeText={(t) => setFormData({ ...formData, start_date: t })}
                                            placeholder="YYYY-MM-DD"
                                            placeholderTextColor="#475569"
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.label}>End Date</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={formData.end_date}
                                            onChangeText={(t) => setFormData({ ...formData, end_date: t })}
                                            placeholder="YYYY-MM-DD"
                                            placeholderTextColor="#475569"
                                        />
                                    </View>
                                </View>

                                <Text style={styles.label}>Reason</Text>
                                <TextInput
                                    style={[styles.input, { height: 100, textAlignVertical: 'top', paddingTop: 12 }]}
                                    value={formData.reason}
                                    onChangeText={(t) => setFormData({ ...formData, reason: t })}
                                    multiline
                                    placeholder="Explain your request..."
                                    placeholderTextColor="#475569"
                                />

                                <Text style={styles.label}>Proof (Optional)</Text>
                                {proofPhoto ? (
                                    <View style={styles.proofPreviewContainer}>
                                        <Image source={{ uri: proofPhoto.uri }} style={styles.proofPreview} />
                                        <TouchableOpacity
                                            style={styles.removeProofBtn}
                                            onPress={() => setProofPhoto(null)}
                                        >
                                            <Trash2 color="white" size={16} />
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <TouchableOpacity
                                        style={styles.addProofBtn}
                                        onPress={() => setShowCamera(true)}
                                    >
                                        <CameraIcon color={primaryColor} size={24} />
                                        <Text style={[styles.addProofText, { color: primaryColor }]}>TAKE PROOF PHOTO</Text>
                                    </TouchableOpacity>
                                )}

                                <TouchableOpacity
                                    onPress={submitRequest}
                                    style={[styles.submitBtn, { backgroundColor: primaryColor }]}
                                    disabled={loading}
                                >
                                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit Request</Text>}
                                </TouchableOpacity>
                            </View>
                        )}
                    </ScrollView>
                </SafeAreaView>
            </LinearGradient>
            <DiscussionModal />
            {showCamera && (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'black', zIndex: 9999 }]}>
                    <CameraView style={{ flex: 1 }} ref={cameraRef} facing="back">
                        <View style={styles.cameraOverlay}>
                            <TouchableOpacity style={styles.closeCameraBtn} onPress={() => setShowCamera(false)}>
                                <X color="white" size={32} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.captureBtn}
                                onPress={async () => {
                                    if (cameraRef.current) {
                                        const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5 });
                                        setProofPhoto(photo);
                                        setShowCamera(false);
                                    }
                                }}
                            >
                                <View style={styles.captureBtnInner} />
                            </TouchableOpacity>
                        </View>
                    </CameraView>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    background: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)'
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
    toggleBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { padding: 20 },
    sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 20 },
    requestCard: {
        backgroundColor: 'rgba(30, 41, 59, 0.7)',
        borderRadius: 20,
        padding: 18,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)'
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    leaveType: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
    statusBadge: { px: 10, py: 4, borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2 },
    statusText: { fontSize: 10, fontWeight: 'bold' },
    cardInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    cardDate: { marginLeft: 8, color: '#94a3b8', fontSize: 13 },
    cardReason: { color: '#64748b', fontSize: 13, marginBottom: 15 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 12 },
    msgIndicator: { flexDirection: 'row', alignItems: 'center' },
    msgCount: { marginLeft: 6, fontSize: 12, fontWeight: 'bold' },
    formCard: { backgroundColor: 'rgba(30, 41, 59, 0.7)', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)' },
    formTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 25 },
    label: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 10 },
    input: { backgroundColor: 'rgba(15, 23, 42, 0.5)', borderRadius: 16, paddingHorizontal: 15, height: 50, color: '#fff', borderWeight: 1, borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, marginBottom: 20 },
    row: { flexDirection: 'row' },
    typeSelector: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
    typeBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginRight: 10, marginBottom: 10 },
    typeBtnText: { color: '#94a3b8', fontSize: 11, fontWeight: 'bold' },
    submitBtn: { height: 55, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    emptyContainer: { alignItems: 'center', marginTop: 60, opacity: 0.5 },
    emptyText: { color: '#64748b', marginTop: 15, fontSize: 14 },
    modalOverlay: { flex: 1, backgroundColor: '#0f172a' },
    modalContent: { flex: 1 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
    messageBubble: { maxWidth: '85%', padding: 12, borderRadius: 16, marginBottom: 15 },
    myMessage: { alignSelf: 'flex-end', backgroundColor: '#6366f1', borderBottomRightRadius: 2 },
    otherMessage: { alignSelf: 'flex-start', backgroundColor: '#1e293b', borderBottomLeftRadius: 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    messageSender: { fontSize: 10, fontWeight: 'bold', color: 'rgba(255,255,255,0.5)', marginBottom: 4 },
    messageText: { color: '#fff', fontSize: 13, lineHeight: 18 },
    messageTime: { fontSize: 9, color: 'rgba(255,255,255,0.4)', alignSelf: 'flex-end', marginTop: 4 },
    chatInputContainer: { flexDirection: 'row', padding: 15, backgroundColor: 'rgba(15, 23, 42, 0.8)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
    chatInput: { flex: 1, backgroundColor: 'rgba(30, 41, 59, 0.5)', borderRadius: 14, paddingHorizontal: 15, color: '#fff', marginRight: 10, height: 45 },
    sendBtn: { width: 45, height: 45, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    emptyChat: { textAlign: 'center', color: '#64748b', fontSize: 12, marginTop: 40, textTransform: 'uppercase', letterSpacing: 1 },
    addProofBtn: { height: 100, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10, marginBottom: 20 },
    addProofText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    proofPreviewContainer: { marginTop: 10, marginBottom: 20, position: 'relative' },
    proofPreview: { width: '100%', height: 200, borderRadius: 16 },
    removeProofBtn: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(244, 63, 94, 0.8)', padding: 8, borderRadius: 12 },
    cameraOverlay: { flex: 1, justifyContent: 'space-between', padding: 40, alignItems: 'center', paddingVertical: 60 },
    closeCameraBtn: { alignSelf: 'flex-start' },
    captureBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
    captureBtnInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'white' }
});
