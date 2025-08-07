import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'login.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        profile: resolve(__dirname, 'profile.html'),
        admin: resolve(__dirname, 'admin.html'),
        dashboardDocente: resolve(__dirname, 'dashboard-docente.html'),
        premium: resolve(__dirname, 'premium.html'),
        premiumSuccess: resolve(__dirname, 'premium-success.html'),
        portatoreRequests: resolve(__dirname, 'portatore-requests.html'),
        chat: resolve(__dirname, 'chat.html'),
        privacyPolicy: resolve(__dirname, 'privacy-policy.html'),
        terminiDiServizio: resolve(__dirname, 'termini-di-servizio.html'),
        comeFunziona: resolve(__dirname, 'come-funziona.html'),
        mcPerLeScuole: resolve(__dirname, 'mc-per-le-scuole.html'),
      },
      output: {
        // Nomina file con fingerprint per evitare cache stantia
        entryFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
        chunkFileNames: 'assets/[name].[hash].js',
      },
    },
  },
}); 