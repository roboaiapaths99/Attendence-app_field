import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ActivityIndicator, FlatList, KeyboardAvoidingView, Platform,
    SafeAreaView, StatusBar, Image, Dimensions
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, ChevronRight, Building2, ShieldCheck, Info } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

export default function OrganizationSelectionScreen() {
    const { setOrganization } = useAuth();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [debouncedQuery, setDebouncedQuery] = useState(query);

    // Debounce search
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(query.trim());
        }, 500);
        return () => clearTimeout(handler);
    }, [query]);

    useEffect(() => {
        if (debouncedQuery.length >= 2) {
            handleSearch(debouncedQuery);
        } else {
            setResults([]);
        }
    }, [debouncedQuery]);

    const handleSearch = async (text) => {
        setLoading(true);
        try {
            const response = await client.get(`/organizations/search?q=${text}`);
            setResults(response.data);
        } catch (e) {
            console.error("[SEARCH] Failed:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = async (org) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await setOrganization({
            organization_id: org.id || org._id,
            name: org.name,
            logo_url: org.logo_url,
            primary_color: org.primary_color,
            slug: org.slug
        });
    };

    const handleSkip = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Reset to default/generic
        await setOrganization({
            organization_id: null,
            name: 'LogDay',
            logo_url: null,
            primary_color: '#6366f1',
            slug: null
        });
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity
            onPress={() => handleSelect(item)}
            style={styles.orgCard}
            activeOpacity={0.7}
        >
            <View style={[styles.logoContainer, { borderColor: `${item.primary_color || '#6366f1'}30` }]}>
                {item.logo_url ? (
                    <Image source={{ uri: item.logo_url }} style={styles.orgLogo} resizeMode="contain" />
                ) : (
                    <Building2 size={24} color={item.primary_color || "#6366f1"} />
                )}
            </View>
            <View style={styles.orgInfo}>
                <Text style={styles.orgName}>{item.name}</Text>
                <Text style={styles.orgSlug}>{item.slug}</Text>
            </View>
            <View style={styles.arrowCircle}>
                <ChevronRight size={16} color="#6366f1" />
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <LinearGradient
                colors={['#020617', '#0f172a', '#1e293b']}
                style={styles.background}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.content}
                >
                    <View style={styles.header}>
                        <LinearGradient
                            colors={['rgba(99, 102, 241, 0.2)', 'rgba(99, 102, 241, 0.05)']}
                            style={styles.iconBadge}
                        >
                            <ShieldCheck size={42} color="#6366f1" />
                        </LinearGradient>
                        <Text style={styles.title}>Find Your Workspace</Text>
                        <Text style={styles.subtitle}>Search for your organization to access your field portal</Text>
                    </View>

                    <View style={styles.searchWrapper}>
                        <View style={styles.searchContainer}>
                            <Search size={20} color="#6366f1" style={styles.searchIcon} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search Organization Name..."
                                placeholderTextColor="#475569"
                                value={query}
                                onChangeText={setQuery}
                                autoCapitalize="none"
                            />
                            {loading && (
                                <ActivityIndicator size="small" color="#6366f1" style={styles.loader} />
                            )}
                        </View>
                    </View>

                    <FlatList
                        data={results}
                        renderItem={renderItem}
                        keyExtractor={item => item.id || item._id}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            query.length >= 2 && !loading ? (
                                <View style={styles.emptyContainer}>
                                    <View style={styles.emptyIconBox}>
                                        <Info size={32} color="#1e293b" />
                                    </View>
                                    <Text style={styles.emptyText}>No organizations found</Text>
                                    <Text style={styles.emptySubtext}>Try a different keyword or contact your admin</Text>
                                </View>
                            ) : null
                        }
                    />

                    <TouchableOpacity
                        onPress={handleSkip}
                        style={styles.skipButton}
                        activeOpacity={0.6}
                    >
                        <Text style={styles.skipText}>I don't have an organization code</Text>
                    </TouchableOpacity>
                </KeyboardAvoidingView>
            </LinearGradient>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    background: { flex: 1 },
    content: { flex: 1, paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 20 : 40 },

    header: { alignItems: 'center', marginBottom: 40 },
    iconBadge: {
        width: 84, height: 84,
        borderRadius: 28,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 24,
        borderWidth: 1.5,
        borderColor: 'rgba(99, 102, 241, 0.3)',
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8
    },
    title: {
        fontSize: 28,
        fontWeight: '900',
        color: '#ffffff',
        marginBottom: 10,
        textAlign: 'center',
        letterSpacing: -0.5
    },
    subtitle: {
        fontSize: 15,
        lineHeight: 22,
        color: '#94a3b8',
        textAlign: 'center',
        paddingHorizontal: 20,
        fontWeight: '500'
    },

    searchWrapper: {
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        paddingHorizontal: 18,
    },
    searchIcon: { marginRight: 14 },
    searchInput: {
        flex: 1,
        color: '#ffffff',
        fontSize: 16,
        paddingVertical: 16,
        fontWeight: '600'
    },
    loader: { marginLeft: 10 },

    listContent: { paddingBottom: 20 },
    orgCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(30, 41, 59, 0.5)',
        padding: 16,
        borderRadius: 24,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)'
    },
    logoContainer: {
        width: 52, height: 52,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 16,
        justifyContent: 'center', alignItems: 'center',
        marginRight: 16,
        borderWidth: 1,
    },
    orgLogo: { width: 36, height: 36, borderRadius: 10 },
    orgInfo: { flex: 1 },
    orgName: { color: '#ffffff', fontSize: 17, fontWeight: '800', marginBottom: 4 },
    orgSlug: { color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '700' },
    arrowCircle: {
        width: 32, height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        justifyContent: 'center', alignItems: 'center'
    },

    emptyContainer: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
    emptyIconBox: {
        width: 64, height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(30, 41, 59, 0.5)',
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)'
    },
    emptyText: { color: '#f8fafc', fontSize: 18, fontWeight: '800', marginBottom: 8 },
    emptySubtext: { color: '#64748b', fontSize: 13, textAlign: 'center', lineHeight: 20, fontWeight: '500' },

    skipButton: {
        paddingVertical: 20,
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 20
    },
    skipText: {
        color: '#64748b',
        fontSize: 14,
        fontWeight: '700',
        textDecorationLine: 'underline',
        opacity: 0.8
    }
});
