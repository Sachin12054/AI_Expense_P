import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { fetchAIInsights } from "../services/expenseService";

const AIInsightScreen = ({ route }) => {
  const { user, insights: initialInsights } = route.params;
  const [insights, setInsights] = useState(initialInsights);
  const [loading, setLoading] = useState(!initialInsights);

  useEffect(() => {
    if (!insights) {
      const fetchData = async () => {
        try {
          const data = await fetchAIInsights();
          setInsights(data);
        } catch (error) {
          console.error("Error fetching AI insights:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [user.uid]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200EE" />
        <Text style={styles.loadingText}>Loading AI insights...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>AI Insights</Text>
      <Text style={styles.insightText}>
        {insights ? JSON.stringify(insights, null, 2) : "No insights available"}
      </Text>
    </View>
  );
};

export default AIInsightScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5", padding: 16, paddingTop: 50 },
  header: { fontSize: 26, fontWeight: "bold", marginBottom: 12 },
  insightText: { fontSize: 16, color: "#333" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  loadingText: { marginTop: 10, fontSize: 16, color: "#666" },
});