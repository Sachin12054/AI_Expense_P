import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  Keyboard,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { addExpense } from "../services/expenseService";

const CATEGORIES = [
  { name: "Food", icon: "fast-food" },
  { name: "Transport", icon: "car" },
  { name: "Shopping", icon: "cart" },
  { name: "Bills", icon: "document-text" },
  { name: "Entertainment", icon: "film" },
  { name: "Health", icon: "medical" },
  { name: "Education", icon: "book" },
  { name: "Other", icon: "ellipsis-horizontal" },
];

const AddExpenseScreen = ({ navigation, route }) => {
  const { user = {} } = route.params || {};
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const successOpacity = new Animated.Value(0);
  const buttonScale = new Animated.Value(1);

  useEffect(() => {
    if (showSuccess) {
      Animated.sequence([
        Animated.timing(successOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(1500),
        Animated.timing(successOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowSuccess(false);
        resetForm();
        navigation.goBack();
      });
    }
  }, [showSuccess]);

  const resetForm = () => {
    setAmount("");
    setCategory("");
    setDescription("");
    setDate(new Date().toISOString().split("T")[0]);
    setError("");
  };

  const animateButton = () => {
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleAddExpense = async () => {
    Keyboard.dismiss();
    setError("");
    animateButton();

    if (!amount || !category || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount and select a category");
      return;
    }

    const userId = user?.uid;
    if (!userId) {
      setError("User not authenticated");
      return;
    }

    try {
      setLoading(true);
      const amountValue = parseFloat(amount);

      // Prepare expense data
      const expenseData = {
        amount: amountValue,
        category,
        description: description || category,
        date,
      };

      // Use the service to add expense and update balance
      await addExpense(expenseData);

      setLoading(false);
      setShowSuccess(true);
    } catch (error) {
      setLoading(false);
      console.error("Error adding expense:", error.message);
      setError(error.message || "Failed to add expense. Please try again.");
    }
  };

  const selectCategory = (cat) => {
    setCategory(cat);
    setError("");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.headerContainer}>
          <Text style={styles.headerText}>Add New Expense</Text>
          <Text style={styles.subHeaderText}>
            Track your spending with AI insights
          </Text>
        </View>

        <View style={styles.amountContainer}>
          <Text style={styles.currencySymbol}>₹</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="0.00"
            placeholderTextColor="#A0A0A0"
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={(text) => {
              setAmount(text.replace(/[^0-9.]/g, ""));
              setError("");
            }}
          />
        </View>

        <Text style={styles.sectionTitle}>Category</Text>
        <View style={styles.categoryContainer}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.name}
              style={[
                styles.categoryButton,
                category === cat.name && styles.selectedCategory,
              ]}
              onPress={() => selectCategory(cat.name)}
            >
              <Ionicons
                name={cat.icon}
                size={24}
                color={category === cat.name ? "#FFFFFF" : "#333333"}
              />
              <Text
                style={[
                  styles.categoryText,
                  category === cat.name && styles.selectedCategoryText,
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Description</Text>
        <TextInput
          style={styles.input}
          placeholder="What was this expense for?"
          placeholderTextColor="#A0A0A0"
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <Text style={styles.sectionTitle}>Date</Text>
        <View style={styles.dateContainer}>
          <Ionicons name="calendar" size={24} color="#555555" />
          <TextInput
            style={styles.dateInput}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddExpense}
            disabled={loading}
          >
            {loading ? (
              <Text style={styles.buttonText}>Adding...</Text>
            ) : (
              <>
                <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                <Text style={styles.buttonText}>Add Expense</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {showSuccess && (
        <Animated.View
          style={[styles.successMessage, { opacity: successOpacity }]}
        >
          <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
          <Text style={styles.successText}>Expense Added Successfully!</Text>
        </Animated.View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  scrollContainer: { padding: 20, paddingBottom: 40 },
  headerContainer: { marginBottom: 24 },
  headerText: { fontSize: 24, fontWeight: "700", color: "#333333" },
  subHeaderText: { fontSize: 14, color: "#888888", marginTop: 4 },
  amountContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: "#6200EE",
    paddingBottom: 8,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333333",
    marginRight: 4,
  },
  amountInput: { flex: 1, fontSize: 32, fontWeight: "bold", color: "#333333" },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#555555",
    marginBottom: 12,
    marginTop: 16,
  },
  categoryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
    justifyContent: "space-between",
  },
  categoryButton: {
    width: "23%",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    backgroundColor: "#F0F0F0",
    borderRadius: 12,
    marginBottom: 10,
  },
  selectedCategory: { backgroundColor: "#6200EE" },
  categoryText: { marginTop: 4, fontSize: 12, color: "#333333" },
  selectedCategoryText: { color: "#FFFFFF" },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#333333",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    minHeight: 50,
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  dateInput: { flex: 1, marginLeft: 10, fontSize: 16, color: "#333333" },
  error: {
    color: "#D32F2F",
    marginTop: 16,
    marginBottom: 8,
    fontSize: 14,
  },
  addButton: {
    backgroundColor: "#6200EE",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 8,
  },
  successMessage: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: "#43A047",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  successText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 8,
  },
});

export default AddExpenseScreen;