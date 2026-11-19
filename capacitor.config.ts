import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gaterunner.game',
  appName: 'Gate Runner',
  webDir: 'dist/gate-runner/browser',
  backgroundColor: '#0b1224',
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#0b1224',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0b1224',
      overlaysWebView: false,
    },
  },
};

export default config;
