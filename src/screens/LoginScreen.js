import React, { useState, useRef, useEffect } from "react";
import { 
  View, TextInput, Text, TouchableOpacity, StyleSheet, Image, Animated, 
  Dimensions, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard 
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../config/firebaseConfig"; // ✅ Use correct path and include Firestore DB
import { doc, getDoc } from "firebase/firestore"; // ✅ Firestore imports

const { width } = Dimensions.get("window");

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const logoAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(formAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Fetch user data from Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        // Pass a complete user object with fallback for displayName
        navigation.replace("Main", {
          user: {
            uid: user.uid,
            name: userData.name || user.displayName || "User",
            email: user.email,
            displayName: user.displayName || userData.name || "User", // Fallback for displayName
          },
        });
      } else {
        setError("User data not found. Try signing up.");
      }
    } catch (err) {
      console.error("Login Error:", err);
      setError("Invalid email or password");
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
        <View style={styles.gradientBackground}>
          <Animated.View style={[styles.logoContainer, { opacity: logoAnim }]}>
            <Image source={require("../../assets/logo.jpg")} style={styles.logo} resizeMode="contain" />
            <Text style={styles.appName}>Smart AI Expense Tracker</Text>
          </Animated.View>

          <Animated.View style={[styles.formContainer, { opacity: formAnim }]}>
            <Text style={styles.title}>Login</Text>

            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#6C63FF" style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                placeholder="Email" 
                value={email} 
                onChangeText={setEmail} 
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#6C63FF" style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                placeholder="Password" 
                value={password} 
                onChangeText={setPassword} 
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons 
                  name={showPassword ? "eye-outline" : "eye-off-outline"} 
                  size={20} 
                  color="#6C63FF" 
                  style={{ paddingRight: 12 }}
                />
              </TouchableOpacity>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity style={styles.button} onPress={handleLogin}>
              <Text style={styles.buttonText}>Login</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
              <Text style={styles.switchText}>
                Don't have an account? <Text style={styles.switchTextBold}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  gradientBackground: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  logoContainer: { alignItems: "center", marginBottom: 30 },
  logo: { width: 100, height: 100, borderRadius: 20 },
  appName: {
    marginTop: 10,
    fontSize: 24,
    fontWeight: "bold",
    color: "#6C63FF",
  },
  formContainer: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    elevation: 5,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
    textAlign: "center",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f7ff",
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#e0e0ff",
  },
  inputIcon: { padding: 12 },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: "#333",
  },
  button: {
    backgroundColor: "#6C63FF",
    padding: 16,
    borderRadius: 12,
    width: "100",
    alignItems: "center",
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
    color: "#666",
    fontSize: 14,
    textAlign: "center",
    marginTop: 10,
  },
  switchTextBold: {
    color: "#6C63FF",
    fontWeight: "bold",
  },
});

export default LoginScreen;