import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pixora.tools',
  appName: 'Pixora Tools',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
