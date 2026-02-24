// ============================================
// Delta — Platform Storage Abstraction
//
// Web:          delegates to localStorage (synchronous)
// React Native: swap the implementation below to use
//               @react-native-async-storage/async-storage
//
// All callers use platformStorage.* — never import
// localStorage or AsyncStorage directly in business logic.
// ============================================

const platformStorage = {
    getItem(key: string): string | null {
        try {
            return localStorage.getItem(key);
        } catch {
            return null;
        }
    },

    setItem(key: string, value: string): void {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            console.warn('[Storage] setItem failed:', key, e);
        }
    },

    removeItem(key: string): void {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.warn('[Storage] removeItem failed:', key, e);
        }
    },
};

export default platformStorage;

// ============================================
// React Native swap instructions:
//
// 1. Install: npx expo install @react-native-async-storage/async-storage
// 2. Replace the implementation above with:
//
// import AsyncStorage from '@react-native-async-storage/async-storage';
//
// NOTE: AsyncStorage is async. The storageService uses a
// synchronous pattern, so when migrating fully to RN you will
// also need to make getUser() / getCache() async (or use a
// sync cache layer like react-native-mmkv for drop-in swap).
// ============================================
