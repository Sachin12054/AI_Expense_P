import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  FlatList,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  ScrollView,
  RefreshControl,
} from "react-native";
import { signOut, getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc, onSnapshot, collection, query, orderBy } from "firebase/firestore";
import { auth, db } from "../config/firebaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { PieChart, LineChart } from "react-native-chart-kit";
import { MaterialIcons, FontAwesome5, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

const CATEGORIES = {
  Food: { color: "#FF6B6B", icon: "utensils" },
  Transport: { color: "#4ECDC4", icon: "car" },
  Shopping: { color: "#FFD166", icon: "shopping-bag" },
  Bills: { color: "#6A0572", icon: "file-invoice" },
  Entertainment: { color: "#F72585", icon: "film" },
  Health: { color: "#4CC9F0", icon: "heartbeat" },
  Other: { color: "#8A8A8A", icon: "dot-circle" },
};

const COLORS = {
  background: "#F8F9FA",
  card: "#FFFFFF",
  text: "#333333",
  subtext: "#888888",
  primary: "#6C63FF",
  secondary: "#4ECDC4",
  danger: "#FF5252",
  border: "#F0F0F0",
  gradientStart: "#6C63FF",
  gradientEnd: "#5A56E9",
  icon: "#333333",
  statusBar: "dark-content",
};

const MainScreen = ({ route, navigation }) => {
  const { user = {} } = route.params || {};
  const [name, setName] = useState(user?.name || user?.displayName || "User");
  const [email, setEmail] = useState(user?.email || "");
  const [balance, setBalance] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [spendingTrends, setSpendingTrends] = useState([]);

  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const addButtonScale = useRef(new Animated.Value(1)).current;
  const balanceOpacity = useRef(new Animated.Value(1)).current;
  const tabIndicatorPosition = useRef(new Animated.Value(0)).current;

  const screenWidth = Dimensions.get("window").width;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    Animated.timing(tabIndicatorPosition, {
      toValue: activeTab === "overview" ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [activeTab]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userRef = doc(db, "users", user?.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setName(data.name || user?.displayName || "User");
          setEmail(data.email || user?.email || "");
          setBalance(data.balance || 0);
          setTotalExpenses(data.totalExpenses || 0);
        }
      } catch (error) {
        console.error("❌ Failed to fetch user data:", error);
        Alert.alert("Error", "Unable to load user data.");
      } finally {
        setLoading(false);
      }
    };

    const unsubscribeUser = user?.uid
      ? onSnapshot(doc(db, "users", user.uid), (docSnap) => {
          const data = docSnap.data();
          if (data) {
            setBalance(data.balance || 0);
            setTotalExpenses(data.totalExpenses || 0);
            setName(data.name || user?.displayName || "User");
          }
        })
      : null;

    const unsubscribeExpenses = user?.uid
      ? onSnapshot(
          query(collection(db, "users", user.uid, "expenses"), orderBy("date", "desc")),
          (querySnapshot) => {
            const expList = [];
            querySnapshot.forEach((doc) => {
              expList.push({ id: doc.id, ...doc.data() });
            });
            setExpenses(expList);
            processCategories(expList);
            processSpendingTrends(expList);
          }
        )
      : null;

    fetchUserData();

    return () => {
      if (unsubscribeUser) unsubscribeUser();
      if (unsubscribeExpenses) unsubscribeExpenses();
    };
  }, [user]);

  const processCategories = (expensesList) => {
    const categories = {};
    let total = 0;

    expensesList.forEach((expense) => {
      const category = expense.category || "Other";
      const amount = parseFloat(expense.amount) || 0;
      
      if (!categories[category]) {
        categories[category] = {
          amount: 0,
          color: CATEGORIES[category]?.color || "#8A8A8A",
          name: category,
          icon: CATEGORIES[category]?.icon || "dot-circle",
        };
      }
      
      categories[category].amount += amount;
      total += amount;
    });

    const chartData = Object.values(categories).map((cat) => ({
      name: cat.name,
      amount: cat.amount,
      color: cat.color,
      icon: cat.icon,
      legendFontColor: COLORS.text,
      legendFontSize: 12,
      percentage: Math.round((cat.amount / (total || 1)) * 100),
    }));

    chartData.sort((a, b) => b.amount - a.amount);
    setCategoryData(chartData);
  };

  const processSpendingTrends = (expensesList) => {
    const trends = {};
    expensesList.forEach((expense) => {
      const date = expense.date?.toDate ? expense.date.toDate() : new Date(expense.date || Date.now());
      const monthYear = date.toLocaleString("default", { month: "short", year: "numeric" });
      const amount = parseFloat(expense.amount) || 0;
      
      if (!trends[monthYear]) {
        trends[monthYear] = 0;
      }
      trends[monthYear] += amount;
    });

    const trendData = Object.keys(trends).map((monthYear, index) => ({
      label: monthYear,
      value: trends[monthYear],
      color: COLORS.primary,
      index,
    }));
    setSpendingTrends(trendData);
  };

  const handleLogout = async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await signOut(auth);
      await AsyncStorage.removeItem("userData");
      navigation.replace("Login");
    } catch (err) {
      console.error("❌ Logout error:", err);
      Alert.alert("Logout Failed", "Something went wrong while logging out.");
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await deleteDoc(doc(db, "users", user.uid, "expenses", expenseId));
    } catch (err) {
      console.error("❌ Failed to delete expense:", err);
      Alert.alert("Delete Error", "Could not delete this expense.");
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp || Date.now());
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const userRef = doc(db, "users", user?.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        setName(data.name || user?.displayName || "User");
        setBalance(data.balance || 0);
        setTotalExpenses(data.totalExpenses || 0);
      }
    } catch (error) {
      console.error("Failed to refresh data:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const navigateToProfile = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("Profile", { user });
  };

  const renderExpenseItem = ({ item, index }) => {
    const category = item.category || "Other";
    const categoryColor = CATEGORIES[category]?.color || "#8A8A8A";
    const categoryIcon = CATEGORIES[category]?.icon || "dot-circle";
    
    const translateY = fadeAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [50, 0],
    });
    
    const opacity = fadeAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });
    
    return (
      <Animated.View
        style={[
          styles.expenseItem,
          {
            opacity,
            transform: [{ translateY }],
            borderLeftColor: categoryColor,
            borderLeftWidth: 4,
            backgroundColor: COLORS.card,
          },
        ]}
      >
        <View style={styles.expenseIconContainer}>
          <View style={[styles.categoryIcon, { backgroundColor: categoryColor }]}>
            <FontAwesome5 name={categoryIcon} size={16} color="#fff" />
          </View>
        </View>
        
        <View style={styles.expenseDetails}>
          <Text style={[styles.expenseText, { color: COLORS.text }]}>₹{parseFloat(item.amount).toLocaleString()}</Text>
          <Text style={[styles.expenseCategory, { color: COLORS.text }]}>{category}</Text>
          <Text style={[styles.expenseDesc, { color: COLORS.subtext }]}>{item.description || "No description"}</Text>
          <Text style={styles.expenseDate}>{formatDate(item.date)}</Text>
        </View>
        
        <View style={styles.expenseActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: `${COLORS.primary}20` }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate("EditExpense", { user, expense: item });
            }}
          >
            <MaterialIcons name="edit" size={18} color={COLORS.primary} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: `${COLORS.danger}20` }]}
            onPress={() => handleDeleteExpense(item.id)}
          >
            <MaterialIcons name="delete" size={18} color={COLORS.danger} />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [180, 100],
    extrapolate: "clamp",
  });
  
  useEffect(() => {
    scrollY.addListener(({ value }) => {
      if (value > 60) {
        Animated.timing(balanceOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }).start();
      } else {
        Animated.timing(balanceOpacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }).start();
      }
    });
    
    return () => {
      scrollY.removeAllListeners();
    };
  }, []);

  const addBtnPosition = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 40],
    extrapolate: "clamp",
  });
  
  const translateXTabIndicator = tabIndicatorPosition.interpolate({
    inputRange: [0, 1],
    outputRange: [0, screenWidth / 2],
  });

  if (loading) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor: COLORS.background }]}>
        <StatusBar barStyle={COLORS.statusBar} backgroundColor={COLORS.background} />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 10, fontWeight: "500", color: COLORS.text }}>
          Loading your financial overview...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
      <StatusBar barStyle={COLORS.statusBar} backgroundColor={COLORS.primary} />
      
      <Animated.View style={[styles.header, { height: headerHeight }]}>
        <LinearGradient
          colors={[COLORS.gradientStart, COLORS.gradientEnd]}
          style={styles.gradient}
        >
          <View style={styles.headerContent}>
            <View style={styles.userInfo}>
              <Text style={styles.welcome}>Welcome, {"\n"}{name} 👋</Text>
            </View>
            
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.profileButton} onPress={navigateToProfile}>
                <Ionicons name="person-circle-outline" size={26} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <MaterialIcons name="logout" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
          
          <Animated.View style={[styles.balanceContainer, { opacity: balanceOpacity }]}>
            <Text style={styles.balanceAmount}>{"\n"}💰 Balance: ₹{balance.toLocaleString()}</Text>
            <Text style={styles.expenseTotal}>🧾 Total Expenses: ₹{totalExpenses.toLocaleString()}</Text>
          </Animated.View>
        </LinearGradient>
      </Animated.View>
      
      <View style={[styles.tabContainer, { backgroundColor: COLORS.card }]}>
        <Animated.View
          style={[
            styles.tabIndicator,
            {
              transform: [{ translateX: translateXTabIndicator }],
              backgroundColor: `${COLORS.primary}20`,
              position: "absolute",
              height: "80%",
              width: "50%",
              borderRadius: 20,
              zIndex: 0,
            },
          ]}
        />
        
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => {
            Haptics.selectionAsync();
            setActiveTab("overview");
          }}
        >
          <Ionicons
            name="stats-chart"
            size={20}
            color={activeTab === "overview" ? COLORS.primary : COLORS.subtext}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === "overview" ? COLORS.primary : COLORS.subtext },
            ]}
          >
            Overview
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => {
            Haptics.selectionAsync();
            setActiveTab("expenses");
          }}
        >
          <Ionicons
            name="receipt"
            size={20}
            color={activeTab === "expenses" ? COLORS.primary : COLORS.subtext}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === "expenses" ? COLORS.primary : COLORS.subtext },
            ]}
          >
            Expenses
          </Text>
        </TouchableOpacity>
      </View>
      
      {activeTab === "overview" ? (
        <Animated.ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              progressBackgroundColor={COLORS.card}
              tintColor={COLORS.primary}
            />
          }
        >
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: COLORS.card }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate("AddExpense", { user });
              }}
            >
              <View style={[styles.actionIcon, { backgroundColor: "#FF6B6B" }]}>
                <Ionicons name="add-circle" size={24} color="#fff" />
              </View>
              <Text style={[styles.actionText, { color: COLORS.text }]}>Add Expense</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: COLORS.card }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate("Scanner", { user });
              }}
            >
              <View style={[styles.actionIcon, { backgroundColor: "#4ECDC4" }]}>
                <Ionicons name="scan" size={24} color="#fff" />
              </View>
              <Text style={[styles.actionText, { color: COLORS.text }]}>Scan Receipt</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: COLORS.card }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate("TransactionHistory", { user });
              }}
            >
              <View style={[styles.actionIcon, { backgroundColor: "#FFD166" }]}>
                <Ionicons name="time" size={24} color="#fff" />
              </View>
              <Text style={[styles.actionText, { color: COLORS.text }]}>History</Text>
            </TouchableOpacity>
          </View>
          
          <View style={[styles.summaryContainer, { backgroundColor: COLORS.card }]}>
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Spending Breakdown</Text>
            {categoryData.length > 0 ? (
              <View style={styles.chartContainer}>
                <PieChart
                  data={categoryData}
                  width={screenWidth - 48}
                  height={220}
                  chartConfig={{
                    backgroundColor: COLORS.card,
                    backgroundGradientFrom: COLORS.card,
                    backgroundGradientTo: COLORS.card,
                    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  }}
                  accessor="amount"
                  backgroundColor="transparent"
                  paddingLeft="0"
                  absolute
                />
              </View>
            ) : (
              <View style={styles.noDataContainer}>
                <Ionicons name="pie-chart-outline" size={50} color={COLORS.subtext} />
                <Text style={[styles.noDataText, { color: COLORS.subtext }]}>No expense data to show</Text>
              </View>
            )}
            {categoryData.map((category, index) => (
              <View key={index} style={[styles.categoryItem, { borderBottomColor: COLORS.border }]}>
                <View style={styles.categoryLeft}>
                  <View style={[styles.categoryDot, { backgroundColor: category.color }]}>
                    <FontAwesome5 name={category.icon} size={12} color="#fff" />
                  </View>
                  <Text style={[styles.categoryName, { color: COLORS.text }]}>{category.name}</Text>
                </View>
                <View style={styles.categoryRight}>
                  <Text style={[styles.categoryAmount, { color: COLORS.text }]}>₹{category.amount.toLocaleString()}</Text>
                  <Text style={[styles.categoryPercentage, { color: COLORS.subtext }]}>{category.percentage}%</Text>
                </View>
              </View>
            ))}
          </View>
          
          <View style={[styles.summaryContainer, { backgroundColor: COLORS.card, marginTop: 16 }]}>
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Spending Trends</Text>
            {spendingTrends.length > 0 ? (
              <View style={styles.chartContainer}>
                <LineChart
                  data={{
                    labels: spendingTrends.map((trend) => trend.label),
                    datasets: [{ data: spendingTrends.map((trend) => trend.value) }],
                  }}
                  width={screenWidth - 48}
                  height={220}
                  chartConfig={{
                    backgroundColor: COLORS.card,
                    backgroundGradientFrom: COLORS.card,
                    backgroundGradientTo: COLORS.card,
                    color: (opacity = 1) => COLORS.primary,
                    labelColor: (opacity = 1) => COLORS.text,
                    style: { borderRadius: 16 },
                  }}
                  bezier
                  style={{ marginVertical: 8, borderRadius: 16 }}
                />
              </View>
            ) : (
              <View style={styles.noDataContainer}>
                <Ionicons name="trending-up" size={50} color={COLORS.subtext} />
                <Text style={[styles.noDataText, { color: COLORS.subtext }]}>No spending trends to show</Text>
              </View>
            )}
          </View>
          
          <View style={[styles.recentExpenses, { backgroundColor: COLORS.card }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Recent Expenses</Text>
              <TouchableOpacity onPress={() => setActiveTab("expenses")}>
                <Text style={[styles.seeAllText, { color: COLORS.primary }]}>See All</Text>
              </TouchableOpacity>
            </View>
            
            {expenses.slice(0, 3).map((item, index) => (
              <View key={item.id}>{renderExpenseItem({ item, index })}</View>
            ))}
            
            {expenses.length === 0 && (
              <View style={styles.noDataContainer}>
                <Ionicons name="receipt-outline" size={50} color={COLORS.subtext} />
                <Text style={[styles.noDataText, { color: COLORS.subtext }]}>No expenses yet</Text>
                <TouchableOpacity
                  style={[styles.addFirstButton, { backgroundColor: `${COLORS.primary}20` }]}
                  onPress={() => navigation.navigate("AddExpense", { user })}
                >
                  <Text style={[styles.addFirstButtonText, { color: COLORS.primary }]}>Add your first expense</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Animated.ScrollView>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(item) => item.id}
          renderItem={renderExpenseItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.expenseList}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              progressBackgroundColor={COLORS.card}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.noDataContainer}>
              <Ionicons name="receipt-outline" size={50} color={COLORS.subtext} />
              <Text style={[styles.noDataText, { color: COLORS.subtext }]}>No expenses yet</Text>
              <TouchableOpacity
                style={[styles.addFirstButton, { backgroundColor: `${COLORS.primary}20` }]}
                onPress={() => navigation.navigate("AddExpense", { user })}
              >
                <Text style={[styles.addFirstButtonText, { color: COLORS.primary }]}>Add your first expense</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
      
      <Animated.View
        style={[
          styles.floatingButton,
          {
            transform: [{ translateY: addBtnPosition }, { scale: addButtonScale }],
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: COLORS.primary }]}
          activeOpacity={0.8}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            Animated.sequence([
              Animated.timing(addButtonScale, {
                toValue: 0.9,
                duration: 100,
                useNativeDriver: true,
              }),
              Animated.timing(addButtonScale, {
                toValue: 1,
                duration: 100,
                useNativeDriver: true,
              }),
            ]).start();
            navigation.navigate("AddExpense", { user });
          }}
        >
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    width: "100%",
    overflow: "hidden",
  },
  gradient: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 44,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userInfo: {
    flex: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  welcome: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 2,
  },
  email: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
  },
  profileButton: {
    padding: 8,
    marginRight: 6,
  },
  logoutButton: {
    padding: 8,
  },
  balanceContainer: {
    marginTop: -7,
  },
  balanceAmount: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
  },
  expenseTotal: {
    fontSize: 17,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.8)",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    borderRadius: 20,
    marginHorizontal: 12,
    marginTop: 5,
    height: 50,
    justifyContent: "space-around",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 20,
  },
  tabText: {
    marginLeft: 6,
    fontWeight: "500",
    color: "#888",
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  actionCard: {
    width: "30%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#555",
    textAlign: "center",
  },
  summaryContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6C63FF",
  },
  chartContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  categoryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  categoryLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  categoryName: {
    fontSize: 14,
    color: "#333",
  },
  categoryRight: {
    alignItems: "flex-end",
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  categoryPercentage: {
    fontSize: 12,
    color: "#888",
  },
  recentExpenses: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 80,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  expenseIconContainer: {
    marginRight: 12,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  expenseDetails: {
    flex: 1,
  },
  expenseText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  expenseCategory: {
    fontSize: 14,
    fontWeight: "500",
    color: "#555",
    marginTop: 2,
  },
  expenseDesc: {
    fontSize: 13,
    color: "#888",
    marginTop: 2,
  },
  expenseDate: {
    fontSize: 12,
    color: "#aaa",
    marginTop: 4,
  },
  expenseActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(108, 99, 255, 0.1)",
    marginLeft: 8,
  },
  deleteButton: {
    backgroundColor: "rgba(255, 82, 82, 0.1)",
  },
  floatingButton: {
    position: "absolute",
    right: 24,
    bottom: 24,
    zIndex: 10,
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#6C63FF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  noDataContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  noDataText: {
    fontSize: 16,
    color: "#888",
    marginTop: 12,
  },
  addFirstButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "rgba(108, 99, 255, 0.1)",
    borderRadius: 8,
  },
  addFirstButtonText: {
    color: "#6C63FF",
    fontWeight: "500",
  },
});

export default MainScreen;