/**
 * Capacitor Configuration for Pixora Tools
 *
 * Base configuration prepared for Android APK packaging.
 */

export interface CapacitorConfig {
  appId: string;
  appName: string;
  webDir: string;
  bundledWebRuntime?: boolean;
  server?: {
    url?: string;
    cleartext?: boolean;
    androidScheme?: string;
  };
}

const config: CapacitorConfig = {
  appId: 'com.pixora.tools',
  appName: 'Pixora Tools',
  webDir: 'dist',
};

export default config;
