import NetInfo from '@react-native-community/netinfo';
import client from '../api/client';
import StorageHelper from '../utils/StorageHelper';

class SyncEngine {
    static _isRunning = false;
    static _retryTimer = null;
    static _retryDelay = 30000; // 30 seconds between retries
    static _maxRetryDelay = 300000; // 5 min max
    static _currentDelay = 30000;
    static _listener = null;

    /**
     * Initialize the sync engine: listen for connectivity changes + start periodic retry.
     */
    static init() {
        // Listen for connectivity changes
        this._listener = NetInfo.addEventListener(state => {
            if (state.isConnected && state.isInternetReachable !== false) {
                console.log('[SyncEngine] Network restored → triggering sync');
                this._currentDelay = this._retryDelay; // reset backoff
                this.syncNow();
            }
        });

        // Start periodic retry loop
        this._startPeriodicRetry();
        console.log('[SyncEngine] Initialized with periodic retry');
    }

    /**
     * Periodic retry: check for pending items and sync if connected.
     */
    static _startPeriodicRetry() {
        if (this._retryTimer) clearInterval(this._retryTimer);
        this._retryTimer = setInterval(async () => {
            try {
                const counts = await StorageHelper.getPendingCounts();
                const total = (counts.attendance || 0) + (counts.visits || 0) + (counts.pings || 0);
                if (total > 0) {
                    const state = await NetInfo.fetch();
                    if (state.isConnected) {
                        console.log(`[SyncEngine] Periodic check: ${total} items pending → syncing`);
                        await this.syncNow();
                    } else {
                        // Exponential backoff for next retry
                        this._currentDelay = Math.min(this._currentDelay * 1.5, this._maxRetryDelay);
                    }
                }
            } catch (e) {
                console.warn('[SyncEngine] Periodic retry check failed:', e.message);
            }
        }, this._currentDelay);
    }

    /**
     * Core sync — batch upload all pending offline data.
     */
    static async syncNow() {
        if (this._isRunning) {
            console.log('[SyncEngine] Sync already in progress, skipping');
            return { status: 'skipped' };
        }

        this._isRunning = true;
        try {
            const pendingAttendance = await StorageHelper.getPendingAttendance();
            const pendingVisits = await StorageHelper.getPendingVisits();
            const pendingPings = await StorageHelper.getPendingPings();

            const totalPending = pendingAttendance.length + pendingVisits.length + pendingPings.length;
            if (totalPending === 0) {
                return { status: 'nothing_to_sync' };
            }

            console.log(`[SyncEngine] Syncing: ${pendingAttendance.length} attendance, ${pendingVisits.length} visits, ${pendingPings.length} pings`);

            const response = await client.post('/api/field/sync/batch', {
                attendance_logs: pendingAttendance,
                visits: pendingVisits,
                pings: pendingPings,
            });

            if (response.data?.status === 'success') {
                // Clear successfully synced items using their offline IDs
                await StorageHelper.clearSyncedData(
                    pendingAttendance.map(i => i.offline_id),
                    pendingVisits.map(i => i.offline_id),
                    pendingPings.map(i => i.offline_id)
                );

                // Reset backoff
                this._currentDelay = this._retryDelay;

                console.log('[SyncEngine] ✅ Batch sync complete:', response.data.synced);
                return { status: 'success', synced: response.data.synced };
            }

            return { status: 'server_error' };
        } catch (error) {
            console.warn('[SyncEngine] Sync failed:', error?.message || 'Unknown error');
            // Increase backoff
            this._currentDelay = Math.min(this._currentDelay * 2, this._maxRetryDelay);
            return { status: 'error', message: error?.message };
        } finally {
            this._isRunning = false;
        }
    }

    /**
     * Cleanup — remove listener and timer.
     */
    static destroy() {
        if (this._listener) {
            this._listener();
            this._listener = null;
        }
        if (this._retryTimer) {
            clearInterval(this._retryTimer);
            this._retryTimer = null;
        }
    }
}

export default SyncEngine;
