import { initializeApp } from 'firebase/app';
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCzKu--kX2K_KlD1OimhD0zseWhJzwrnW0",
  authDomain: "ai-expense-tracker-5bcce.firebaseapp.com",
  databaseURL: "https://ai-expense-tracker-5bcce-default-rtdb.firebaseio.com",
  projectId: "ai-expense-tracker-5bcce",
  storageBucket: "ai-expense-tracker-5bcce.appspot.com",
  messagingSenderId: "603021991672",
  appId: "1:603021991672:web:1fe7841372399259d4250d",
  measurementId: "G-5W1S2PHGT9"
};

const app = initializeApp(firebaseConfig);

// Use AsyncStorage for persistent auth state
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

const db = getFirestore(app);

// Declare the function before exporting
const setUserDataStructure = async (uid) => {
  const userRef = db.collection('users').doc(uid);
  await userRef.set({
    balances: {},
    expenses: {},
    transactions: {}
  }, { merge: true });
};

export { auth, db, setUserDataStructure };