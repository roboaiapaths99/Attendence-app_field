import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ActivityIndicator, FlatList, KeyboardAvoidingView, Platform,
    SafeAreaView, StatusBar, Image
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, ChevronRight, Building2, ShieldCheck } from 'lucide-react-native';

export default function OrganizationSelectionScreen() {
    const { setOrganization } = useAuth();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [debouncedQuery, setDebouncedQuery] = useState(query);

    // Debounce search
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(query);
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

    const handleSelect = (org) => {
        setOrganization({
            organization_id: org.id || org._id,
            name: org.name,
            logo_url: org.logo_url,
            primary_color: org.primary_color,
            slug: org.slug
        });
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity
            onPress={() => handleSelect(item)}
            style={styles.orgCard}
        >
            <View style={styles.logoContainer}>
                {item.logo_url ? (
                    <Image source={{ uri: item.logo_url }} style={styles.orgLogo} resizeMode="contain" />
                ) : (
                    <Building2 size={24} color={item.primary_color || "#94a3b8"} />
                )}
            </View>
            <View style={styles.orgInfo}>
                <Text style={styles.orgName}>{item.name}</Text>
                <Text style={styles.orgSlug}>{item.slug}</Text>
            </View>
            <ChevronRight size={20} color="#64748b" />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient
                colors={['#0f172a', '#1e293b']}
                style={styles.background}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.content}
                >
                    <View style={styles.header}>
                        <View style={styles.iconBadge}>
                            <ShieldCheck size={40} color="#6366f1" />
                        </View>
                        <Text style={styles.title}>LogDay Field</Text>
                        <Text style={styles.subtitle}>Find your workspace to continue</Text>
                    </View>

                    <View style={styles.searchContainer}>
                        <Search size={20} color="#94a3b8" style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search Organization Name..."
                            placeholderTextColor="#64748b"
                            value={query}
                            onChangeText={setQuery}
                            autoCapitalize="none"
                        />
                        {loading && (
                            <ActivityIndicator size="small" color="#6366f1" style={styles.loader} />
                        )}
                    </View>

                    <FlatList
                        data={results}
                        renderItem={renderItem}
                        keyExtractor={item => item.id || item._id}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            query.length >= 2 && !loading ? (
                                <View style={styles.emptyContainer}>
                                    <Text style={styles.emptyText}>No organizations found</Text>
                                    <Text style={styles.emptySubtext}>Check spelling or contact your HR</Text>
                                </View>
                            ) : null
                        }
                    />
                </KeyboardAvoidingView>
            </LinearGradient>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    background: { flex: 1 },
    content: { flex: 1, padding: 20 },
    header: { alignItems: 'center', marginTop: 40, marginBottom: 40 },
    iconBadge: {
        width: 80, height: 80,
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
        borderRadius: 24,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.3)'
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#f8fafc',
        marginBottom: 8
    },
    subtitle: {
        fontSize: 16,
        color: '#94a3b8',
        textAlign: 'center'
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 16,
        marginBottom: 20
    },
    searchIcon: { marginRight: 12 },
    searchInput: {
        flex: 1,
        color: '#f8fafc',
        fontSize: 16,
        paddingVertical: 15
    },
    loader: { marginLeft: 10 },
    orgCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(30, 41, 59, 0.7)',
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)'
    },
    logoContainer: {
        width: 48, height: 48,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        justifyContent: 'center', alignItems: 'center',
        marginRight: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)'
    },
    orgLogo: { width: 32, height: 32, borderRadius: 6 },
    orgInfo: { flex: 1 },
    orgName: { color: '#f8fafc', fontSize: 18, fontWeight: 'bold', marginBottom: 2 },
    orgSlug: { color: '#64748b', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
    listContent: { paddingBottom: 20 },
    emptyContainer: { alignItems: 'center', marginTop: 40 },
    emptyText: { color: '#94a3b8', fontSize: 16, fontWeight: '500' },
    emptySubtext: { color: '#64748b', fontSize: 14, marginTop: 4 }
});
