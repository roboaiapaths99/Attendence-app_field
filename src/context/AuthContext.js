import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as Device from 'expo-device';
import client from '../api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [organization, setOrgState] = useState(null);

    useEffect(() => {
        loadStoredData();
    }, []);

    const loadStoredData = async () => {
        try {
            const storedUser = await SecureStore.getItemAsync('userData');
            const storedOrg = await SecureStore.getItemAsync('orgData');

            if (storedUser) setUser(JSON.parse(storedUser));
            if (storedOrg) setOrgState(JSON.parse(storedOrg));
        } catch (e) {
            console.error('Failed to load auth data', e);
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password, organizationId) => {
        try {
            let deviceId = await SecureStore.getItemAsync('deviceId');
            if (!deviceId) {
                deviceId = `${Device.deviceName}-${Date.now()}`;
                await SecureStore.setItemAsync('deviceId', deviceId);
            }

            const response = await client.post('/login', {
                email,
                password,
                organization_id: organizationId,
                device_id: deviceId
            });

            const { access_token, user: userData, force_password_change } = response.data;
            if (force_password_change) {
                userData.force_password_change = true;
            }

            await SecureStore.setItemAsync('userToken', access_token);
            await SecureStore.setItemAsync('userData', JSON.stringify(userData));

            setUser(userData);
            return { success: true };
        } catch (e) {
            let errorMsg = 'Login failed';
            if (e.response?.data?.detail) {
                errorMsg = typeof e.response.data.detail === 'string'
                    ? e.response.data.detail
                    : JSON.stringify(e.response.data.detail);
            } else if (e.message) {
                errorMsg = e.message;
            }
            return { success: false, message: errorMsg };
        }
    };

    const logout = async () => {
        await SecureStore.deleteItemAsync('userToken');
        await SecureStore.deleteItemAsync('userData');
        setUser(null);
    };

    const setOrganization = async (org) => {
        if (org) {
            await SecureStore.setItemAsync('orgData', JSON.stringify(org));
        } else {
            await SecureStore.deleteItemAsync('orgData');
        }
        setOrgState(org);
    };

    return (
        <AuthContext.Provider value={{ user, organization, loading, login, logout, setOrganization }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
