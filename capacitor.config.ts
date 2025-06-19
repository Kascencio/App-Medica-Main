import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mimedica.appmedica',
  appName: 'app-medica',
  webDir: 'public',
  bundledWebRuntime: false,
server: {
    url: 'https://app-medica-main.vercel.app/login',
    cleartext: true      // habilita sólo si usas HTTP en vez de HTTPS
  }
};

export default config;
