import React, { useState } from 'react';
import {
    View, Text, StyleSheet, Modal, TouchableOpacity,
    TextInput, ScrollView, ActivityIndicator, Alert, Pressable
} from 'react-native';
import { Send, X, Zap, Target, AlarmClock, Star, ChevronDown } from 'lucide-react-native';
import client from '../api/client';

// ─── Nudge Type Config ────────────────────────────────────────────────────────
const NUDGE_TYPES = [
    { key: 'general', label: 'General Message', icon: Send, color: '#6366f1' },
    { key: 'target_missed', label: 'Target Missed', icon: Target, color: '#f43f5e' },
    { key: 'late_start', label: 'Late Start', icon: AlarmClock, color: '#f97316' },
    { key: 'great_job', label: 'Great Job!', icon: Star, color: '#10b981' },
];

// ─── Quick message templates ──────────────────────────────────────────────────
const QUICK_MESSAGES = {
    general: ['Please check in with status update.', 'Update your plan for today.', 'Team sync in 15 minutes.'],
    target_missed: ['Your daily visit target is not on track.', 'You have 2 pending visits from plan.', 'Please complete your beat plan for today.'],
    late_start: ['Please check in — you are late today.', 'Your start time was missed. Contact me.', 'Heads up: day started 30 min ago.'],
    great_job: ['Excellent work today! Keep it up 🔥', 'Top performer this week — amazing!', 'You closed 3 leads today. Brilliant work!'],
};

// ─── Team Member Chip ─────────────────────────────────────────────────────────
const MemberChip = ({ member, selected, onToggle, primaryColor }) => (
    <TouchableOpacity
        onPress={() => onToggle(member.email)}
        style={[styles.chip, selected && { backgroundColor: primaryColor + '22', borderColor: primaryColor }]}
        activeOpacity={0.7}
    >
        <View style={[styles.chipAvatar, { backgroundColor: selected ? primaryColor : 'rgba(255,255,255,0.06)' }]}>
            <Text style={[styles.chipAvatarText, { color: selected ? '#fff' : '#94a3b8' }]}>
                {(member.full_name || '?').charAt(0).toUpperCase()}
            </Text>
        </View>
        <View>
            <Text style={[styles.chipName, selected && { color: '#fff' }]} numberOfLines={1}>{member.full_name}</Text>
            {member.status && (
                <View style={styles.chipStatusRow}>
                    <View style={[styles.chipStatusDot, { backgroundColor: member.status === 'check-in' ? '#10b981' : '#64748b' }]} />
                    <Text style={styles.chipStatus}>{member.status === 'check-in' ? 'Active' : 'Offline'}</Text>
                </View>
            )}
        </View>
    </TouchableOpacity>
);

// ─── Main Modal Component ─────────────────────────────────────────────────────
const ManagerNudgeModal = ({ visible, onClose, teamMembers = [], primaryColor = '#6366f1' }) => {
    const [selectedEmails, setSelectedEmails] = useState([]);
    const [nudgeType, setNudgeType] = useState('general');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [showTypeMenu, setShowTypeMenu] = useState(false);

    const currentType = NUDGE_TYPES.find(t => t.key === nudgeType) || NUDGE_TYPES[0];
    const NudgeIcon = currentType.icon;

    const toggleMember = (email) => {
        setSelectedEmails(prev =>
            prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
        );
    };

    const selectAll = () => {
        setSelectedEmails(teamMembers.map(m => m.email));
    };

    const handleSend = async () => {
        if (selectedEmails.length === 0) {
            Alert.alert('Select Recipients', 'Please select at least one team member.');
            return;
        }
        if (!message.trim()) {
            Alert.alert('Add Message', 'Please write a nudge message.');
            return;
        }

        setSending(true);
        try {
            const res = await client.post('/api/manager/nudge', {
                employee_emails: selectedEmails,
                message: message.trim(),
                nudge_type: nudgeType,
            });
            Alert.alert(
                'Nudge Sent! 🚀',
                `Your message was sent to ${res.data.recipients_count} team member(s).`,
                [{ text: 'Done', onPress: handleClose }]
            );
        } catch (e) {
            const errMsg = e.response?.data?.detail || 'Failed to send nudge.';
            Alert.alert('Error', errMsg);
        } finally {
            setSending(false);
        }
    };

    const handleClose = () => {
        setSelectedEmails([]);
        setNudgeType('general');
        setMessage('');
        setShowTypeMenu(false);
        onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
            <Pressable style={styles.backdrop} onPress={handleClose}>
                <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
                    {/* Header */}
                    <View style={styles.sheetHeader}>
                        <View style={[styles.headerIcon, { backgroundColor: primaryColor + '22' }]}>
                            <Zap color={primaryColor} size={20} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.sheetTitle}>Send Nudge</Text>
                            <Text style={styles.sheetSubtitle}>Motivate your field team instantly</Text>
                        </View>
                        <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                            <X color="#94a3b8" size={20} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                        {/* Step 1: Type */}
                        <Text style={styles.sectionLabel}>1 — TYPE</Text>
                        <TouchableOpacity
                            style={[styles.typeSelector, showTypeMenu && { borderColor: primaryColor }]}
                            onPress={() => setShowTypeMenu(!showTypeMenu)}
                        >
                            <View style={[styles.typeIcon, { backgroundColor: currentType.color + '22' }]}>
                                <NudgeIcon size={16} color={currentType.color} />
                            </View>
                            <Text style={[styles.typeName, { color: currentType.color }]}>{currentType.label}</Text>
                            <ChevronDown size={16} color="#64748b" style={{ marginLeft: 'auto' }} />
                        </TouchableOpacity>

                        {showTypeMenu && (
                            <View style={styles.typeMenu}>
                                {NUDGE_TYPES.map(t => {
                                    const TIcon = t.icon;
                                    return (
                                        <TouchableOpacity
                                            key={t.key}
                                            style={[styles.typeMenuItem, nudgeType === t.key && { backgroundColor: t.color + '15' }]}
                                            onPress={() => { setNudgeType(t.key); setShowTypeMenu(false); setMessage(''); }}
                                        >
                                            <TIcon size={14} color={t.color} />
                                            <Text style={[styles.typeMenuLabel, { color: t.color }]}>{t.label}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}

                        {/* Step 2: Quick messages */}
                        <Text style={styles.sectionLabel}>2 — QUICK MESSAGE</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickRow}>
                            {(QUICK_MESSAGES[nudgeType] || []).map((msg, idx) => (
                                <TouchableOpacity
                                    key={idx}
                                    style={[styles.quickChip, message === msg && { borderColor: primaryColor, backgroundColor: primaryColor + '18' }]}
                                    onPress={() => setMessage(msg)}
                                >
                                    <Text style={[styles.quickChipText, message === msg && { color: primaryColor }]} numberOfLines={2}>
                                        {msg}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <TextInput
                            style={[styles.messageInput, { borderColor: message ? primaryColor + '60' : 'rgba(255,255,255,0.08)' }]}
                            value={message}
                            onChangeText={setMessage}
                            placeholder="Or type a custom message…"
                            placeholderTextColor="#475569"
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                        />
                        <Text style={styles.charCount}>{message.length} / 280</Text>

                        {/* Step 3: Recipients */}
                        <View style={styles.recipientsHeader}>
                            <Text style={styles.sectionLabel}>3 — RECIPIENTS</Text>
                            {teamMembers.length > 0 && (
                                <TouchableOpacity onPress={selectAll}>
                                    <Text style={[styles.selectAll, { color: primaryColor }]}>Select All</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {teamMembers.length === 0 ? (
                            <View style={styles.noTeam}>
                                <Text style={styles.noTeamText}>No team members found</Text>
                            </View>
                        ) : (
                            <View style={styles.memberGrid}>
                                {teamMembers.map(m => (
                                    <MemberChip
                                        key={m.email}
                                        member={m}
                                        selected={selectedEmails.includes(m.email)}
                                        onToggle={toggleMember}
                                        primaryColor={primaryColor}
                                    />
                                ))}
                            </View>
                        )}
                    </ScrollView>

                    {/* Send Button */}
                    <TouchableOpacity
                        style={[styles.sendBtn, { backgroundColor: primaryColor }, (sending || !message || selectedEmails.length === 0) && { opacity: 0.5 }]}
                        onPress={handleSend}
                        disabled={sending || !message || selectedEmails.length === 0}
                    >
                        {sending ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <>
                                <Send color="#fff" size={18} />
                                <Text style={styles.sendBtnText}>
                                    Send to {selectedEmails.length > 0 ? `${selectedEmails.length} member${selectedEmails.length > 1 ? 's' : ''}` : 'team'}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </Pressable>
            </Pressable>
        </Modal>
    );
};

export default ManagerNudgeModal;

const styles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    sheet: {
        backgroundColor: '#0f172a', borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: 20, maxHeight: '88%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    },
    sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
    headerIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    sheetTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '800' },
    sheetSubtitle: { color: '#64748b', fontSize: 12, marginTop: 2 },
    closeBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },

    sectionLabel: { color: '#334155', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 10, marginTop: 4 },

    typeSelector: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 14,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 4,
    },
    typeIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    typeName: { fontSize: 14, fontWeight: '700' },
    typeMenu: { backgroundColor: '#1e293b', borderRadius: 16, padding: 8, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
    typeMenuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10 },
    typeMenuLabel: { fontSize: 13, fontWeight: '700' },

    quickRow: { marginBottom: 12 },
    quickChip: {
        backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 12, marginRight: 10,
        maxWidth: 160, minWidth: 130, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    },
    quickChipText: { color: '#94a3b8', fontSize: 12, lineHeight: 18 },

    messageInput: {
        backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 16,
        color: '#f8fafc', fontSize: 14, lineHeight: 22, minHeight: 90,
        borderWidth: 1, marginBottom: 4,
    },
    charCount: { color: '#334155', fontSize: 10, fontWeight: '700', textAlign: 'right', marginBottom: 16 },

    recipientsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    selectAll: { fontSize: 12, fontWeight: '700', marginBottom: 10 },
    noTeam: { alignItems: 'center', padding: 30 },
    noTeamText: { color: '#475569', fontSize: 13 },
    memberGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },

    chip: {
        flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10,
        backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', flex: 1, minWidth: '45%',
    },
    chipAvatar: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    chipAvatarText: { fontWeight: '700', fontSize: 13 },
    chipName: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
    chipStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    chipStatusDot: { width: 5, height: 5, borderRadius: 3 },
    chipStatus: { color: '#475569', fontSize: 9, fontWeight: '700' },

    sendBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        padding: 18, borderRadius: 20, marginTop: 4,
    },
    sendBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
