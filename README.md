# OfficeFlow Mobile Ecosystem (FieldForce Pro)

This directory contains the universal mobile applications for the OfficeFlow Attendance System. Built with **React Native (Expo)**, it provides a premium, fraud-proof experience for both office and field employees.

---

## 📱 Applications

### 1. **FieldForce Pro** (`/field_app`)
Designed for mobile field staff.
- **Features**: Territory-based attendance, Background GPS pings, Expense logging, Route mapping.
- **Constraints**: Flexible geofencing based on assigned territories/clients.

### 2. **OfficeFlow Desk** (`/frontend`)
Designed for traditional office employees. 
- **Features**: Geofenced check-in/out, Biometric Face ID, Office Wi-Fi verification, Personal attendance audit.
- **Constraints**: Requires presence within the Office Wi-Fi zone and Geofence radius.

---

## 🛠️ Features

- **Biometric Face ID**: 1:N facial signature matching with liveness detection.
- **Secure Device Binding**: Restricts account access to a single verified device.
- **Smart Wi-Fi Verification**: Validates BSSID/SSID to ensure presence in authorized zones.
- **Mock Location Blocker**: Automatic detection and prevention of GPS spoofing apps.
- **Glassmorphism UI**: High-end visual design with real-time haptic feedback.

---

## ⚙️ Setup & Installation

### Prerequisites
- Node.js & npm
- Expo Go app on your mobile device (or an emulator)

### Installation
```bash
# Repeat for both sub-folders
cd field_app # or cd frontend
npm install
```

### Running the App
```bash
npx expo start
```
Scan the QR code with your **Expo Go** app to run on a physical device.

---

## 📝 Environment Variables

Create a `.env` file in the folder:
```env
EXPO_PUBLIC_API_URL=http://your-computer-ip:8001
```
*Note: Use your local IP address (e.g., 192.168.x.x) instead of 'localhost' when testing on a real device.*

---

## 🔒 Security Policy
- **Liveness Checks**: Users must follow liveness prompts (e.g., blink eyes) during face scans.
- **Integrity**: Any attempt to bypass GPS or network checks will be logged and flagged in the Command Center.
