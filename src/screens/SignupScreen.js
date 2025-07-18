import React, { useState } from "react";
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from "react-native";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../config/firebaseConfig";

const SignupScreen = ({ navigation }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const handleSignup = async () => {
    setError("");
  
    if (!name || !email || !password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }
  
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
  
    try {
      // Register user with Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Ensure user is defined before proceeding
      if (!userCredential || !userCredential.user) {
        throw new Error("User registration failed. Please try again.");
      }
  
      const user = userCredential.user;
  
      // Update Firebase Auth profile (optional but useful)
      if (user) {
        await updateProfile(user, { displayName: name });
      }
  
      // Save user info to Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name,
        email,
        balance: 0,
        total_expenses: 0,
        createdAt: serverTimestamp(),
      });
  
      console.log("✅ User registered and saved to Firestore");
  
      // Navigate to MainScreen with user data
      navigation.replace("Main", {
        user: {
          uid: user.uid,
          name,
          email,
        },
      });
  
    } catch (err) {
      console.error("❌ Signup Error:", err.message);
      setError(err.message || "Signup failed. Please try again.");
    }
  };
  

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.content}>
            <Image source={require("../../assets/Signup.jpg")} style={styles.headerImage} />
            <Text style={styles.headerText}>Join Expense Tracker</Text>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TextInput
              style={styles.input}
              placeholder="Full Name"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />

            <TouchableOpacity style={styles.button} onPress={handleSignup}>
              <Text style={styles.buttonText}>Sign Up</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
              <Text style={styles.switchText}>
                Already have an account?{" "}
                <Text style={styles.switchTextBold}>Login</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7ff",
  },
  scrollContainer: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  headerImage: {
    width: 180,
    height: 120,
    marginBottom: 10,
    resizeMode: "contain",
  },
  headerText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#6C63FF",
    marginBottom: 20,
  },
  input: {
    width: "100%",
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderRadius: 8,
    borderColor: "#ccc",
    backgroundColor: "#fff",
  },
  button: {
    backgroundColor: "#6C63FF",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    width: "100%",
    marginTop: 10,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  errorText: {
    color: "#FF5252",
    marginBottom: 15,
    textAlign: "center",
    fontWeight: "500",
  },
  switchText: {
    marginTop: 15,
    color: "#666",
    fontSize: 14,
  },
  switchTextBold: {
    color: "#6C63FF",
    fontWeight: "bold",
  },
});

export default SignupScreen;
