import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { db, auth } from "../config/firebaseConfig";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
} from "firebase/firestore";

const filters = ["All", "Food", "Transport", "Bills", "Entertainment", "Shopping", "Health", "Education", "Other"];

const TransactionHistoryScreen = ({ navigation }) => {
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      console.error("No authenticated user");
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "users", userId, "expenses"), // Corrected collection path
      orderBy("date", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate().toDateString() || new Date().toDateString(),
        amount: parseFloat(doc.data().amount) || 0, // Ensure amount is a number
      }));
      setTransactions(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching transactions:", error);
      Alert.alert("Error", "Failed to load transactions.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filterAndSearchTransactions = () => {
    return transactions.filter((tx) => {
      const matchSearch = tx.title?.toLowerCase().includes(search.toLowerCase()) ||
                         tx.description?.toLowerCase().includes(search.toLowerCase()) ||
                         false;
      const matchCategory = selectedFilter === "All" || tx.category === selectedFilter;
      return matchSearch && matchCategory;
    });
  };

  const groupByDate = (list) => {
    const grouped = {};
    list.forEach((tx) => {
      const date = tx.date;
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(tx);
    });
    return grouped;
  };

  const getSummary = (list) => {
    const total = list.reduce((sum, tx) => sum + Math.abs(tx.amount), 0).toFixed(2);
    return { total, count: list.length };
  };

  const filtered = filterAndSearchTransactions();
  const grouped = groupByDate(filtered);
  const { total, count } = getSummary(filtered);

  const renderTransactionItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate("EditExpense", { user: auth.currentUser, expense: item })}
    >
      <Text style={styles.title}>{item.title || item.description || "No Title"}</Text>
      <Text style={[styles.amount, item.amount < 0 ? { color: "#F44336" } : { color: "#4CAF50" }]}>
        ₹{Math.abs(item.amount).toFixed(2)}
      </Text>
      <Text style={styles.category}>{item.category || "Uncategorized"}</Text>
    </TouchableOpacity>
  );

  const renderDateGroup = ({ item: date }) => (
    <View style={styles.dateGroup}>
      <Text style={styles.dateHeader}>{date}</Text>
      {grouped[date].map((tx) => (
        <View key={tx.id}>{renderTransactionItem({ item: tx })}</View>
      ))}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200EE" />
        <Text style={styles.loadingText}>Loading transactions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Transaction History</Text>

      {/* Summary */}
      <View style={styles.summary}>
        <Text style={styles.summaryText}>Total: ₹{total}</Text>
        <Text style={styles.summaryText}>Transactions: {count}</Text>
      </View>

      {/* Search */}
      <TextInput
        placeholder="Search transactions..."
        value={search}
        onChangeText={setSearch}
        style={styles.searchInput}
      />

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setSelectedFilter(f)}
            style={[styles.filterButton, selectedFilter === f && styles.selected]}
          >
            <Text style={styles.filterText}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Transactions List */}
      <FlatList
        data={Object.keys(grouped)}
        renderItem={renderDateGroup}
        keyExtractor={(date) => date}
        style={styles.transactionsList}
        ListEmptyComponent={
          <Text style={styles.empty}>No transactions found</Text>
        }
      />

      {/* AI Insights */}
      <TouchableOpacity
        style={styles.aiButton}
        onPress={() => navigation.navigate("AIInsights")}
      >
        <Ionicons name="sparkles" size={20} color="#fff" />
        <Text style={styles.aiButtonText}>AI Insights</Text>
      </TouchableOpacity>

      {/* Floating Add */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => navigation.navigate("AddExpense", { user: auth.currentUser })}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

export default TransactionHistoryScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5", padding: 16, paddingTop: 50 },
  header: { fontSize: 26, fontWeight: "bold", marginBottom: 12 },
  summary: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 10,
    elevation: 2,
  },
  summaryText: { fontSize: 16, fontWeight: "500" },
  searchInput: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 10,
    borderColor: "#ddd",
    borderWidth: 1,
    marginBottom: 10,
  },
  filterScroll: { marginBottom: 12 },
  filterButton: {
    backgroundColor: "#E0E0E0",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginRight: 8,
  },
  selected: { backgroundColor: "#6200EE" },
  filterText: { color: "#333" },
  transactionsList: { flex: 1 },
  dateGroup: { marginBottom: 16 },
  dateHeader: {
    fontSize: 16,
    fontWeight: "600",
    color: "#444",
    marginBottom: 6,
    paddingLeft: 10,
  },
  card: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 6,
    elevation: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 16, fontWeight: "500", flex: 1 },
  amount: { fontSize: 14, fontWeight: "bold", marginLeft: 10 },
  category: { fontSize: 12, color: "#888" },
  empty: { marginTop: 50, textAlign: "center", fontSize: 16, color: "#888" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  loadingText: { marginTop: 10, fontSize: 16, color: "#666" },
  floatingButton: {
    position: "absolute",
    right: 20,
    bottom: 20,
    backgroundColor: "#6200EE",
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
  },
  aiButton: {
    position: "absolute",
    bottom: 90,
    right: 20,
    backgroundColor: "#03DAC6",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    elevation: 5,
  },
  aiButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 8,
  },
});