import { db, auth } from "../config/firebaseConfig";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";
import axios from "axios";

// Update this URL to match your backend's actual IP and port
const BACKEND_URL = "http://192.168.32.202:5000";

// Get current user's data
export const getUserData = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error("No user is logged in");

  const userDoc = await getDoc(doc(db, "users", user.uid));
  if (!userDoc.exists()) {
    throw new Error("User data not found. Consider initializing user data.");
  }

  return { id: userDoc.id, ...userDoc.data() };
};

// Add an expense to the user's expenses subcollection with atomic updates
export const addExpense = async (expenseData) => {
  const user = auth.currentUser;
  if (!user) throw new Error("No user is logged in");

  const amount = parseFloat(expenseData.amount);
  if (isNaN(amount) || amount <= 0) throw new Error("Invalid expense amount");

  const expenseRef = collection(db, "users", user.uid, "expenses");
  const newExpense = {
    ...expenseData,
    amount,
    date: serverTimestamp(),
  };

  try {
    const expenseDoc = await addDoc(expenseRef, newExpense);

    await runTransaction(db, async (transaction) => {
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await transaction.get(userDocRef);
      if (!userDoc.exists()) throw new Error("User document not found");

      const userData = userDoc.data();
      const newTotalExpenses = (userData.totalExpenses || 0) + amount;
      const newBalance = Math.max(0, (userData.balance || 0) - amount);

      transaction.update(userDocRef, {
        totalExpenses: newTotalExpenses,
        balance: newBalance,
      });
    });

    // Sync with backend API (updated to match /add_expense endpoint)
    try {
      await axios.post(`${BACKEND_URL}/add_expense`, {
        ...newExpense,
        userId: user.uid,
      }, {
        headers: { Authorization: `Bearer ${user.uid}` },
      });
    } catch (syncError) {
      console.warn("Failed to sync expense with backend:", syncError.message);
      // Continue execution even if sync fails
    }

    return { id: expenseDoc.id, ...newExpense, date: new Date() };
  } catch (error) {
    console.error("Error adding expense:", error);
    throw new Error(`Failed to add expense: ${error.message}`);
  }
};

// Fetch all expenses for the current user with optional real-time support
export const getExpenses = (onUpdate) => {
  const user = auth.currentUser;
  if (!user) throw new Error("No user is logged in");

  const expensesQuery = query(
    collection(db, "users", user.uid, "expenses"),
    orderBy("date", "desc")
  );

  if (onUpdate) {
    return onSnapshot(expensesQuery, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate() || new Date(),
        amount: parseFloat(doc.data().amount) || 0,
      }));
      onUpdate(data);
    }, (error) => {
      console.error("Error fetching expenses:", error);
      onUpdate([]);
    });
  } else {
    return getDocs(expensesQuery).then((expenseDocs) => {
      return expenseDocs.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate() || new Date(),
        amount: parseFloat(doc.data().amount) || 0,
      }));
    }).catch((error) => {
      console.error("Error fetching expenses:", error);
      throw new Error(`Failed to fetch expenses: ${error.message}`);
    });
  }
};

// Update user balance with atomic transaction
export const updateBalance = async (userId, amount) => {
  const user = auth.currentUser;
  if (!user || user.uid !== userId) throw new Error("Unauthorized or no user logged in");

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount)) throw new Error("Invalid amount");

  const userDocRef = doc(db, "users", userId);

  try {
    const newBalance = await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userDocRef);
      if (!userDoc.exists()) throw new Error("User document not found");

      const userData = userDoc.data();
      const currentBalance = userData.balance || 0;
      const updatedBalance = currentBalance + parsedAmount;

      if (updatedBalance < 0) throw new Error("Balance cannot go negative");

      transaction.update(userDocRef, { balance: updatedBalance });
      return updatedBalance;
    });

    // Optional: Sync with backend API
    await axios.post(`${BACKEND_URL}/set_balance`, {
      userId,
      balance: newBalance,
    }, {
      headers: { Authorization: `Bearer ${user.uid}` },
    }).catch((error) => {
      console.warn("Failed to sync balance with backend:", error);
    });

    return newBalance;
  } catch (error) {
    console.error("Error updating balance:", error);
    throw new Error(`Failed to update balance: ${error.message}`);
  }
};

// Example: Fetch AI insights from backend
export const fetchAIInsights = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error("No user is logged in");

  try {
    const response = await axios.get(`${BACKEND_URL}/categorize`, {
      headers: { Authorization: `Bearer ${user.uid}` },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching AI insights:", error);
    throw new Error(`Failed to fetch AI insights: ${error.message}`);
  }
};