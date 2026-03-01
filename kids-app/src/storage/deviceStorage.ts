import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  TOKEN: 'device:token',
  NAME: 'device:name',
  DEVICE_ID: 'device:id',
  REGISTERED: 'device:registered',
} as const;

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.TOKEN);
}

async function setToken(token: string): Promise<void> {
  return AsyncStorage.setItem(KEYS.TOKEN, token);
}

async function getDeviceId(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.DEVICE_ID);
}

async function setDeviceId(id: string): Promise<void> {
  return AsyncStorage.setItem(KEYS.DEVICE_ID, id);
}

async function getDeviceName(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.NAME);
}

async function setDeviceName(name: string): Promise<void> {
  return AsyncStorage.setItem(KEYS.NAME, name);
}

async function isRegistered(): Promise<boolean> {
  const val = await AsyncStorage.getItem(KEYS.REGISTERED);
  return val === 'true';
}

async function setRegistered(registered: boolean): Promise<void> {
  return AsyncStorage.setItem(KEYS.REGISTERED, String(registered));
}

async function clear(): Promise<void> {
  await AsyncStorage.multiRemove(Object.values(KEYS));
}

export const deviceStorage = {
  getToken,
  setToken,
  getDeviceId,
  setDeviceId,
  getDeviceName,
  setDeviceName,
  isRegistered,
  setRegistered,
  clear,
};
