// app/lib/authUtils.ts - JWT removed, using AsyncStorage
import * as SecureStore from 'expo-secure-store';

const USER_KEY = 'current_user';

export const saveUser = async (userData: any) => {
  try {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(userData));
  } catch (error) {
    console.error('Error saving user data:', error);
  }
};

export const getUser = async () => {
  try {
    const userData = await SecureStore.getItemAsync(USER_KEY);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};

export const removeUser = async () => {
  try {
    await SecureStore.deleteItemAsync(USER_KEY);
  } catch (error) {
    console.error('Error removing user data:', error);
  }
};

export const getUserId = async (): Promise<string | null> => {
  try {
    const userData = await getUser();
    return userData?.userID || null;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
};