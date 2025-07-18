import { useState, useEffect } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { getExpenses } from "../services/expenseService";

const ExpenseListScreen = () => {
  const [expenses, setExpenses] = useState([]);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    const result = await getExpenses("user-id-here");
    if (result.success) {
      setExpenses(result.expenses);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Expenses</Text>
      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.expenseItem}>
            <Text>{item.category}: ${item.amount}</Text>
            <Text>{item.description}</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
  expenseItem: { padding: 10, borderBottomWidth: 1 },
});

export default ExpenseListScreen;
