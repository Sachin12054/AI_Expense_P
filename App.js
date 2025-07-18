import React, { useEffect, useState, useCallback } from "react";
import { View, ActivityIndicator, Alert } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { onAuthStateChanged } from "firebase/auth";
import { getDoc, doc, onSnapshot, setDoc } from "firebase/firestore";
import { auth, db } from "./src/config/firebaseConfig";
import "react-native-url-polyfill/auto";

// Screens
import LoginScreen from "./src/screens/LoginScreen";
import SignupScreen from "./src/screens/SignupScreen";
import MainScreen from "./src/screens/MainScreen";
import ScannerScreen from "./src/screens/ScannerScreen";
import AddExpenseScreen from "./src/screens/AddExpenseScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import TransactionHistoryScreen from "./src/screens/TransactionHistoryScreen";
import AIInsightScreen from "./src/screens/AIInsights";

const Stack = createStackNavigator();

function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const updateUserState = useCallback(async (firebaseUser) => {
    setLoading(true);
    try {
      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const unsubscribe = onSnapshot(
          userDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const userData = {
                uid: firebaseUser.uid,
                ...docSnap.data(),
                createdAt: docSnap.data().createdAt
                  ? docSnap.data().createdAt.toDate().toLocaleDateString()
                  : new Date(firebaseUser.metadata.creationTime).toLocaleDateString(),
              };
              setUser(userData);
              AsyncStorage.setItem("userData", JSON.stringify(userData)).catch((err) =>
                console.error("Error saving user data to AsyncStorage:", err)
              );
            } else {
              const initialUserData = {
                uid: firebaseUser.uid,
                name: firebaseUser.displayName || "Guest",
                email: firebaseUser.email || "No email",
                createdAt: new Date(firebaseUser.metadata.creationTime).toLocaleDateString(),
                balance: 0,
                totalExpenses: 0,
              };
              setUser(initialUserData);
              AsyncStorage.setItem("userData", JSON.stringify(initialUserData)).catch((err) =>
                console.error("Error saving initial user data to AsyncStorage:", err)
              );
              setDoc(userDocRef, initialUserData, { merge: true }).catch((err) =>
                console.error("Error initializing user document:", err)
              );
            }
          },
          (error) => {
            console.error("Error listening to user data:", error);
            Alert.alert("Error", "Failed to sync user data.");
          }
        );

        return unsubscribe;
      } else {
        setUser(null);
        AsyncStorage.removeItem("userData").catch((err) =>
          console.error("Error clearing AsyncStorage:", err)
        );
      }
    } catch (error) {
      console.error("Error updating user state:", error);
      Alert.alert("Error", "Failed to load user data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadInitialUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("userData");
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error("Error loading initial user data:", error);
      }
    };

    loadInitialUser();

    const unsubscribeAuth = onAuthStateChanged(auth, updateUserState);
    return () => {
      unsubscribeAuth();
    };
  }, [updateUserState]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F5F5F5" }}>
        <ActivityIndicator size="large" color="#6200EE" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: "#6200EE" }, headerTintColor: "#fff" }}>
        {user ? (
          <>
            <Stack.Screen
              name="Main"
              component={MainScreen}
              initialParams={{ user }}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Scanner"
              component={ScannerScreen}
              initialParams={{ user }}
              options={{ title: "Scan Receipt" }}
            />
            <Stack.Screen
              name="AddExpense"
              component={AddExpenseScreen}
              initialParams={{ user }}
              options={{ title: "Add Expense" }}
            />
            <Stack.Screen
              name="TransactionHistory"
              component={TransactionHistoryScreen}
              initialParams={{ user }}
              options={{ title: "Transaction History" }}
            />
            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
              initialParams={{ user }}
              options={{ title: "Your Profile" }}
            />
            <Stack.Screen
              name="AIInsight"
              component={AIInsightScreen}
              initialParams={{ user }}
              options={{ title: "AI Insights" }}
            />
          </>
        ) : (
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Signup"
              component={SignupScreen}
              options={{ headerShown: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
