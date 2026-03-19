import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getStorage, provideStorage } from '@angular/fire/storage';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes), provideFirebaseApp(() => initializeApp({ projectId: "projects-10f8e", appId: "1:1097043451026:web:45d46677a85473e2a51a4b", storageBucket: "projects-10f8e.firebasestorage.app", apiKey: "AIzaSyBaynudjKT9maCCl7Xmzl7sggbtkGpw9ls", authDomain: "projects-10f8e.firebaseapp.com", messagingSenderId: "1097043451026", measurementId: "G-T2QVTK5ZQ4" })), provideAuth(() => getAuth()), provideFirestore(() => getFirestore()), provideStorage(() => getStorage())
  ]
};
