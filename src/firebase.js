import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyC07wUCcCPCFTcZkFV-3g9F-BDvfIAv_II',
  authDomain: 'blanco-menu.firebaseapp.com',
  projectId: 'blanco-menu',
  storageBucket: 'blanco-menu.firebasestorage.app',
  messagingSenderId: '411043575202',
  appId: '1:411043575202:web:27a8cb5255db0db3b6aefb',
}

const app = initializeApp(firebaseConfig)

export const db = getFirestore(app)
export const storage = getStorage(app)
export const auth = getAuth(app)