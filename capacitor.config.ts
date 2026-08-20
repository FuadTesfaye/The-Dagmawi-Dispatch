import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lurkening.dispatch',
  appName: 'The Lurkening',
  webDir: 'public',
  server: {
    url: 'https://the-lurkening.vercel.app',
    cleartext: false,
    androidScheme: 'https',
  },
  backgroundColor: '#0c0d10',
  android: {
    backgroundColor: '#0c0d10',
    allowMixedContent: false,
    captureInput: true,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_name',
      iconColor: '#d97706',
    },
  },
};

export default config;
