import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

// 사용자가 제공한 Firebase 설정
export const firebaseConfig = {
  apiKey: "AIzaSyDPN59Yv-h_btPu3bhxtmjeRdxE5hkWJIs",
  authDomain: "agagag-56118.firebaseapp.com",
  projectId: "agagag-56118",
  storageBucket: "agagag-56118.firebasestorage.app",
  messagingSenderId: "715966508148",
  appId: "1:715966508148:web:bc06cd272869ecde2af521"
};

// 싱글톤 Firebase 인스턴스 초기화
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// 익명 로그인 보장 헬퍼 (로그인 절차 없이 보안 규칙 통과 지원)
let authPromise: Promise<any> | null = null;
export async function ensureAnonymousAuth() {
  if (auth.currentUser) return auth.currentUser;
  if (!authPromise) {
    authPromise = signInAnonymously(auth).catch((err) => {
      console.warn('Anonymous auth failed or not required:', err);
      return null;
    });
  }
  return authPromise;
}
