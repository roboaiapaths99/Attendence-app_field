import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';

// Keys for local storage categories
const KEYS = {
    ATTENDANCE_QUEUE: 'OFFLINE_ATTENDANCE_QUEUE',
    VISITS_QUEUE: 'OFFLINE_VISITS_QUEUE',
    PINGS_QUEUE: 'OFFLINE_PINGS_QUEUE',
};

// Generic read
const getQueue = async (key) => {
    try {
        const data = await AsyncStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error(`Error reading ${key}:`, error);
        return [];
    }
};

// Generic append
const appendToQueue = async (key, item) => {
    try {
        const queue = await getQueue(key);
        const offlineItem = { ...item, offline_id: uuid.v4(), offline_created_at: new Date().toISOString() };
        queue.push(offlineItem);
        await AsyncStorage.setItem(key, JSON.stringify(queue));
        return offlineItem;
    } catch (error) {
        console.error(`Error appending to ${key}:`, error);
        return null;
    }
};

// Generic remove by IDs
const filterQueue = async (key, idsToRemove) => {
    try {
        const queue = await getQueue(key);
        const filteredQueue = queue.filter(item => !idsToRemove.includes(item.offline_id));
        await AsyncStorage.setItem(key, JSON.stringify(filteredQueue));
    } catch (error) {
        console.error(`Error cleaning ${key}:`, error);
    }
};

class StorageHelper {
    // Attendance
    static async queueAttendance(logData) {
        return await appendToQueue(KEYS.ATTENDANCE_QUEUE, logData);
    }
    static async getPendingAttendance() {
        return await getQueue(KEYS.ATTENDANCE_QUEUE);
    }

    // Visits
    static async queueVisit(visitData) {
        return await appendToQueue(KEYS.VISITS_QUEUE, visitData);
    }
    static async getPendingVisits() {
        return await getQueue(KEYS.VISITS_QUEUE);
    }

    // Pings
    static async queuePing(pingData) {
        return await appendToQueue(KEYS.PINGS_QUEUE, pingData);
    }
    static async getPendingPings() {
        return await getQueue(KEYS.PINGS_QUEUE);
    }

    // Bulk Clear after successful sync
    static async clearSyncedData(syncedAttendanceIds = [], syncedVisitIds = [], syncedPingIds = []) {
        if (syncedAttendanceIds.length > 0) {
            await filterQueue(KEYS.ATTENDANCE_QUEUE, syncedAttendanceIds);
        }
        if (syncedVisitIds.length > 0) {
            await filterQueue(KEYS.VISITS_QUEUE, syncedVisitIds);
        }
        if (syncedPingIds.length > 0) {
            await filterQueue(KEYS.PINGS_QUEUE, syncedPingIds);
        }
    }

    // Count helper for UI
    static async getPendingCounts() {
        const [att, visits, pings] = await Promise.all([
            this.getPendingAttendance(),
            this.getPendingVisits(),
            this.getPendingPings()
        ]);
        return {
            attendance: att.length,
            visits: visits.length,
            pings: pings.length,
            total: att.length + visits.length + pings.length
        };
    }
}

export default StorageHelper;
