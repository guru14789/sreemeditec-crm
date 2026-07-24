import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sreemeditec.crm',
  appName: 'Sreemeditec ERP',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '376656303612-ld1mm6bh4tn30b9qhv78ggi49rkbsfnu.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
