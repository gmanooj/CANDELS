import { Platform } from 'react-native';

// Dynamically select localhost for Web previews, and the computer's LAN IP for native mobile devices
const getBackendUrl = () => {
    if (Platform.OS === 'web') {
        return "http://localhost:5000";
    }
    // REPLACE this IP address with your computer's actual local network IP (e.g. 192.168.1.7)
    return "http://192.168.1.7:5000";
};

export const API_CONFIG = {
    BACKEND_URL: getBackendUrl(),
    LOCAL_BACKEND_URL: "http://localhost:5000"
};
