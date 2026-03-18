/**
 * Centralized error mapping for Field App.
 */

export const getFriendlyErrorMessage = (error, defaultMsg = "Something went wrong") => {
    const detail = error?.response?.data?.detail;
    const status = error?.response?.status;
    const message = error?.message;

    if (detail) {
        const detailStr = String(detail).toLowerCase();

        // Check-in / Visit Log specific
        if (detailStr.includes("not within the allowed") || detailStr.includes("outside") || detailStr.includes("geofence")) {
            return "You are too far from the customer location. Please check in when you arrive.";
        }
        if (detailStr.includes("hardware id mismatch") || detailStr.includes("device_id") || detailStr.includes("bound to a different device")) {
            return "Device Mismatch: This account is restricted to your primary device.";
        }
        if (detailStr.includes("already checked in")) {
            return "You are already checked in to this visit.";
        }

        // Visit Plan specific
        if (detailStr.includes("plan already exists")) {
            return "A visit plan for this date already exists.";
        }
        if (detailStr.includes("incomplete") || detailStr.includes("missing")) {
            return "Please fill in all required fields before submitting.";
        }

        // Auth
        if (status === 401) return "Session timed out. Please login again.";
        if (status === 422) return "Submission failed due to invalid data format. Please contact support.";

        // General fallback for safe short strings
        if (detailStr.length < 50 && !detailStr.includes("err") && !detailStr.includes("exc")) {
            return String(detail);
        }
    }

    if (message === "Network Error") return "No internet connection. Use Connectivity Diagnostics on Dashboard.";
    if (message?.includes("timeout")) return "Server response slow. Use Connectivity Diagnostics to check signal.";

    return defaultMsg;
};
