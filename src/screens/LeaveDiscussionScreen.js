import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet,
    Keyboard, Alert
} from 'react-native';
import { Send, MessageSquare, User, Clock, ChevronLeft } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import { LinearGradient } from 'expo-linear-gradient';

const LeaveDiscussionScreen = ({ route, navigation }) => {
    const { requestId } = route.params;
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const scrollViewRef = useRef();

    useEffect(() => {
        loadData();
        const interval = setInterval(fetchMessages, 5000);
        return () => clearInterval(interval);
    }, []);

    const loadData = async () => {
        await fetchMessages();
        setLoading(false);
    };

    const fetchMessages = async () => {
        try {
            const res = await client.get(`/api/leave/requests/${requestId}/discussion`);
            setMessages(res.data);
        } catch (e) {
            console.error('Failed to fetch messages', e);
        }
    };

    const sendMessage = async () => {
        if (!newMessage.trim()) return;
        setSending(true);
        try {
            await client.post(`/api/leave/requests/${requestId}/message`, {
                message: newMessage
            });
            setNewMessage('');
            Keyboard.dismiss();
            await fetchMessages();
            scrollViewRef.current?.scrollToEnd({ animated: true });
        } catch (e) {
            Alert.alert('Error', 'Failed to send message');
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: '#0f172a', justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color="#6366f1" />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <LinearGradient colors={['#0f172a', '#1e293b']} style={StyleSheet.absoluteFill} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ChevronLeft color="#fff" size={24} />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Discussion</Text>
                    <Text style={styles.headerSub}>Leave Request ID: {requestId.substring(requestId.length - 8)}</Text>
                </View>
            </View>

            <ScrollView
                ref={scrollViewRef}
                style={styles.chatArea}
                contentContainerStyle={styles.chatContent}
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            >
                {messages.length === 0 ? (
                    <View style={styles.emptyState}>
                        <MessageSquare size={48} color="#1e293b" />
                        <Text style={styles.emptyText}>No messages yet. Start the discussion.</Text>
                    </View>
                ) : (
                    messages.map((msg, index) => {
                        const isMe = msg.sender_id === user?.email;
                        return (
                            <View key={index} style={[styles.messageRow, isMe ? styles.myMessageRow : styles.theirMessageRow]}>
                                {!isMe && (
                                    <View style={styles.avatar}>
                                        <Text style={styles.avatarText}>{msg.sender_name?.charAt(0)}</Text>
                                    </View>
                                )}
                                <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.theirBubble]}>
                                    {!isMe && <Text style={styles.senderName}>{msg.sender_name}</Text>}
                                    <Text style={styles.messageText}>{msg.message}</Text>
                                    <Text style={styles.timestamp}>
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </View>
                            </View>
                        );
                    })
                )}
            </ScrollView>

            <View style={styles.inputArea}>
                <TextInput
                    style={styles.input}
                    placeholder="Type a message..."
                    placeholderTextColor="#64748b"
                    value={newMessage}
                    onChangeText={setNewMessage}
                    multiline
                />
                <TouchableOpacity
                    style={[styles.sendBtn, { backgroundColor: '#6366f1' }]}
                    onPress={sendMessage}
                    disabled={sending}
                >
                    {sending ? <ActivityIndicator size="small" color="#fff" /> : <Send size={20} color="#fff" />}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingTop: 50,
        backgroundColor: 'rgba(30, 41, 59, 0.8)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(51, 65, 85, 0.5)'
    },
    backBtn: { marginRight: 16 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
    headerSub: { fontSize: 12, color: '#94a3b8' },
    chatArea: { flex: 1 },
    chatContent: { padding: 16 },
    messageRow: { marginBottom: 16, maxWidth: '85%', flexDirection: 'row', alignItems: 'flex-end' },
    myMessageRow: { alignSelf: 'flex-end' },
    theirMessageRow: { alignSelf: 'flex-start' },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#334155',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8
    },
    avatarText: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold' },
    messageBubble: { padding: 12, borderRadius: 20 },
    myBubble: { backgroundColor: '#6366f1', borderBottomRightRadius: 4 },
    theirBubble: { backgroundColor: '#1e293b', borderBottomLeftRadius: 4 },
    senderName: { fontSize: 10, fontWeight: 'bold', color: '#64748b', marginBottom: 4 },
    messageText: { color: '#fff', fontSize: 14, lineHeight: 20 },
    timestamp: { fontSize: 9, color: 'rgba(255,255,255,0.5)', alignSelf: 'flex-end', marginTop: 4 },
    inputArea: {
        flexDirection: 'row',
        padding: 16,
        paddingBottom: Platform.OS === 'ios' ? 32 : 16,
        backgroundColor: '#0f172a',
        borderTopWidth: 1,
        borderTopColor: '#1e293b'
    },
    input: {
        flex: 1,
        backgroundColor: '#1e293b',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 10,
        color: '#fff',
        maxHeight: 100,
        marginRight: 8
    },
    sendBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center'
    },
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
    emptyText: { color: '#475569', marginTop: 16, fontSize: 14, textAlign: 'center' }
});

export default LeaveDiscussionScreen;
