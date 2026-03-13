import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import client from '../api/client';
import * as SecureStore from 'expo-secure-store';
import StorageHelper from './StorageHelper';

const LOCATION_TASK_NAME = 'background-location-task';

export const initBackgroundLocation = async () => {
    const { status } = await Location.requestBackgroundPermissionsAsync();
    if (status === 'granted') {
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 600000, // Every 10 mins
            distanceInterval: 100, // Or every 100m
            foregroundService: {
                notificationTitle: "LogDay Field",
                notificationBody: "Monitoring location for field safety and KM calculation.",
                notificationColor: "#007AFF"
            }
        });
        console.log('Background location started');
    }
};

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
        console.error('Background location task error', error);
        return;
    }
    if (data) {
        const { locations } = data;
        const location = locations[0];

        try {
            const userDataStr = await SecureStore.getItemAsync('userData');
            if (userDataStr) {
                const user = JSON.parse(userDataStr);
                const pingData = {
                    employee_id: user.employee_id,
                    organization_id: user.organization_id,
                    lat: location.coords.latitude,
                    lng: location.coords.longitude,
                    accuracy: location.coords.accuracy,
                    mock_detected: location.mocked || false,
                    recorded_at: new Date().toISOString(),
                };

                try {
                    // Try sending directly first
                    await client.post('/api/field/ping', pingData);
                } catch (networkError) {
                    // Offline or server error — queue for later batch sync
                    console.warn('Ping queued offline (will sync later)');
                    await StorageHelper.queuePing(pingData);
                }
            }
        } catch (e) {
            console.error('Background location task failed', e);
        }
    }
});
