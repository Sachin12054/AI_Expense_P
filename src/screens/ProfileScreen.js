import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
} from "react-native";
import { getAuth, signOut, updateProfile, onAuthStateChanged } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import LottieView from "lottie-react-native";
import { LineChart } from "react-native-chart-kit";
import { useNavigation } from "@react-navigation/native";
import { addExpense, updateBalance, fetchAIInsights } from "../services/expenseService";

const { width } = Dimensions.get("window");

const ProfileScreen = ({ route }) => {
  const { user } = route.params;
  const navigation = useNavigation();
  const [userData, setUserData] = useState({
    name: user.name || user.displayName || "",
    email: user.email || "",
    createdAt: user.createdAt ? (user.createdAt.toDate ? user.createdAt.toDate().toLocaleDateString() : new Date(user.metadata.creationTime).toLocaleDateString()) : "",
    profilePhoto: user.profilePhoto || null,
    monthlySavings: [],
    spendingCategories: [],
    recentTransactions: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [tempName, setTempName] = useState(user.name || user.displayName || "");
  const [currentBalance, setCurrentBalance] = useState(user.balance || 0);
  const [totalExpenses, setTotalExpenses] = useState(user.totalExpenses || 0);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceAction, setBalanceAction] = useState("add");

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const avatarSize = useRef(new Animated.Value(100)).current;
  const balanceScaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && firebaseUser.uid === user.uid) {
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.spring(slideAnim, { toValue: 0, friction: 8, useNativeDriver: true }),
          Animated.spring(scaleAnim, { toValue: 1, friction: 6, useNativeDriver: true }),
        ]).start();

        await fetchUserProfile(firebaseUser);
      } else {
        navigation.navigate("Login");
      }
    });

    return () => unsubscribe();
  }, [user.uid]);

  const fetchUserProfile = async (user) => {
    setIsLoading(true);
    const db = getFirestore();
    const userId = user.uid;

    try {
      const userRef = doc(db, "users", userId);

      // Real-time listener for user data
      const unsubscribeUser = onSnapshot(userRef, (userSnap) => {
        if (userSnap.exists()) {
          const data = userSnap.data();
          setCurrentBalance(data.balance || 0);
          setTotalExpenses(data.totalExpenses || 0);
          setUserData((prev) => ({
            ...prev,
            name: data.name || user.displayName || "Guest",
            email: data.email || user.email || "No email",
            createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toLocaleDateString() : data.createdAt) : 
                      new Date(user.metadata.creationTime).toLocaleDateString(),
            profilePhoto: data.profilePhoto || user.photoURL || null,
          }));
          setTempName(data.name || user.displayName || "Guest");
        }
      });

      // Real-time listener for expenses
      const expensesRef = collection(db, "users", userId, "expenses");
      const expensesQuery = query(expensesRef, orderBy("date", "desc"), limit(5));
      const unsubscribeExpenses = onSnapshot(expensesQuery, (snapshot) => {
        const allExpenses = [];
        snapshot.forEach((doc) => allExpenses.push({ id: doc.id, ...doc.data() }));

        // Process recent transactions
        const recentTransactionsData = allExpenses
          .slice(0, 5)
          .map((doc) => ({
            id: doc.id,
            title: doc.description || doc.category,
            amount: -parseFloat(doc.amount) || 0,
            date: doc.date ? doc.date.toDate().toISOString().split("T")[0] : "N/A",
            category: doc.category || "Uncategorized",
          }));

        // Process spending categories
        const categoryAmounts = {};
        let totalSpent = 0;
        allExpenses.forEach((doc) => {
          const amount = parseFloat(doc.amount) || 0;
          const category = doc.category || "Uncategorized";
          categoryAmounts[category] = (categoryAmounts[category] || 0) + amount;
          totalSpent += amount;
        });

        const colors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"];
        const spendingCategoriesData = Object.keys(categoryAmounts).map((category, index) => ({
          name: category,
          percentage: totalSpent > 0 ? Math.round((categoryAmounts[category] / totalSpent) * 100) : 0,
          color: colors[index % colors.length],
        }));

        // Process monthly savings trend
        const monthlyExpenses = {};
        allExpenses.forEach((doc) => {
          if (doc.date) {
            const date = doc.date.toDate();
            const month = date.toLocaleString("default", { month: "short" });
            monthlyExpenses[month] = (monthlyExpenses[month] || 0) + (parseFloat(doc.amount) || 0);
          }
        });

        const assumedMonthlyIncome = 5000;
        const monthlySavingsData = [];
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const recentMonths = months.slice(-6);
        recentMonths.forEach((month) => {
          const expenses = monthlyExpenses[month] || 0;
          const savings = Math.max(0, assumedMonthlyIncome - expenses + currentBalance);
          monthlySavingsData.push({ month, amount: savings });
        });

        setUserData((prev) => ({
          ...prev,
          monthlySavings: monthlySavingsData,
          spendingCategories: spendingCategoriesData,
          recentTransactions: recentTransactionsData,
        }));
      });

      return () => {
        unsubscribeUser();
        unsubscribeExpenses();
      };
    } catch (error) {
      console.error("Error fetching user profile:", error);
      Alert.alert("Error", "Failed to load profile data.");
      setUserData({
        name: user?.displayName || "Guest",
        email: user?.email || "No email",
        createdAt: new Date(user?.metadata?.creationTime || Date.now()).toLocaleDateString(),
        profilePhoto: user?.photoURL || null,
        monthlySavings: [],
        spendingCategories: [],
        recentTransactions: [],
      });
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) fetchUserProfile(user);
  };

  const handleLogout = async () => {
    const auth = getAuth();
    try {
      await signOut(auth);
      navigation.navigate("Login");
    } catch (error) {
      console.error("Error signing out:", error);
      Alert.alert("Error", "Failed to sign out.");
    }
  };

  const handleUpdateProfile = async () => {
    const auth = getAuth();
    const db = getFirestore();
    const user = auth.currentUser;
    if (user) {
      try {
        await updateProfile(user, { displayName: tempName });
        const userRef = doc(db, "users", user.uid);
        await setDoc(userRef, { name: tempName, updatedAt: new Date() }, { merge: true });
        setUserData({ ...userData, name: tempName });
        setEditMode(false);
        Alert.alert("Success", "Profile updated successfully!");
      } catch (error) {
        console.error("Error updating profile:", error);
        Alert.alert("Error", "Failed to update profile.");
      }
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission Required", "Please allow access to your photo library");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      Animated.sequence([
        Animated.timing(avatarSize, { toValue: 110, duration: 150, useNativeDriver: false }),
        Animated.timing(avatarSize, { toValue: 100, duration: 150, useNativeDriver: false }),
      ]).start();
      setUserData({ ...userData, profilePhoto: result.assets[0].uri });
      Alert.alert("Success", "Profile photo updated!");
    }
  };

  const toggleExpanded = () => {
    Animated.timing(rotateAnim, {
      toValue: expanded ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    setExpanded(!expanded);
  };

  const rotateDegree = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const getSavingsChartData = () => {
    if (userData.monthlySavings.length === 0) {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
      return { labels: months, datasets: [{ data: months.map(() => 0) }] };
    }
    return {
      labels: userData.monthlySavings.map((item) => item.month),
      datasets: [{ data: userData.monthlySavings.map((item) => item.amount) }],
    };
  };

  const handleUpdateBalance = async () => {
    if (!balanceAmount || isNaN(Number(balanceAmount)) || Number(balanceAmount) <= 0) {
      Alert.alert("Invalid Input", "Please enter a valid amount greater than zero.");
      return;
    }

    const auth = getAuth();
    const user = auth.currentUser;
    const amountValue = Number(balanceAmount);
    const adjustment = balanceAction === "add" ? amountValue : -amountValue;

    if (user) {
      try {
        const newBalance = await updateBalance(user.uid, adjustment);
        setCurrentBalance(newBalance);
        Animated.sequence([
          Animated.timing(balanceScaleAnim, { toValue: 1.2, duration: 200, useNativeDriver: true }),
          Animated.timing(balanceScaleAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();

        setBalanceAmount("");
        setShowBalanceModal(false);
        fetchUserProfile(user);

        Alert.alert("Success", `Balance ${balanceAction === "add" ? "added" : "withdrawn"} successfully!`);
      } catch (error) {
        console.error("Error updating balance:", error);
        Alert.alert("Error", "Failed to update balance.");
      }
    }
  };

  const openBalanceModal = (action) => {
    setBalanceAction(action);
    setBalanceAmount("");
    setShowBalanceModal(true);
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <LottieView
          source={require("../../assets/loading-animation.json")}
          style={styles.loadingAnimation}
          autoPlay
          loop
        />
        <Text style={styles.loadingText}>Loading your profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#6200EE"]} />}
    >
      <Animated.View
        style={[
          styles.container,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] },
        ]}
      >
        <View style={styles.gradientHeader}>
          <TouchableOpacity style={styles.settingsButton} onPress={() => navigation.navigate("Settings")}>
            <Ionicons name="settings-outline" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.profileTopSection}>
            <TouchableOpacity onPress={pickImage}>
              <Animated.View style={{ width: avatarSize, height: avatarSize }}>
                {userData.profilePhoto ? (
                  <Image source={{ uri: userData.profilePhoto }} style={styles.avatar} />
                ) : (
                  <Image
                    source={{ uri: `https://api.dicebear.com/6.x/initials/svg?seed=${userData.name}` }}
                    style={styles.avatar}
                  />
                )}
                <View style={styles.editAvatarIcon}>
                  <Ionicons name="camera" size={16} color="#fff" />
                </View>
              </Animated.View>
            </TouchableOpacity>
            {editMode ? (
              <View style={styles.editNameContainer}>
                <TextInput
                  style={styles.nameInput}
                  value={tempName}
                  onChangeText={setTempName}
                  autoFocus
                />
                <View style={styles.editButtonsRow}>
                  <TouchableOpacity style={styles.editButton} onPress={() => setEditMode(false)}>
                    <Ionicons name="close" size={18} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.editButton, styles.saveButton]} onPress={handleUpdateProfile}>
                    <Ionicons name="checkmark" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.nameContainer}>
                <Text style={styles.nameText}>{userData.name}</Text>
                <TouchableOpacity style={styles.editNameButton} onPress={() => setEditMode(true)}>
                  <Ionicons name="pencil-outline" size={18} color="#6200EE" />
                </TouchableOpacity>
              </View>
            )}
            <Text style={styles.emailText}>{userData.email}</Text>
            <Text style={styles.joinedText}>
              <Ionicons name="calendar-outline" size={14} color="#fff" /> Joined: {userData.createdAt}
            </Text>
          </View>
        </View>

        <Animated.View style={[styles.statsCard, { transform: [{ translateX: slideAnim }] }]}>
          <View style={styles.balanceSection}>
            <Text style={styles.balanceLabel}>Current Balance</Text>
            <Animated.Text
              style={[styles.balanceValue, { transform: [{ scale: balanceScaleAnim }] }]}
            >
              ₹{currentBalance.toFixed(2)}
            </Animated.Text>
            <TouchableOpacity
              style={styles.updateBalanceButton}
              onPress={() => setShowBalanceModal(true)}
            >
              <Ionicons name="pencil-outline" size={16} color="#fff" />
              <Text style={styles.updateBalanceText}>Update Balance</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>₹{totalExpenses.toFixed(2)}</Text>
              <Text style={styles.statLabel}>Total Expenses</Text>
            </View>
          </View>
        </Animated.View>

        <Modal visible={showBalanceModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Update Balance</Text>
              <View style={styles.modalToggle}>
                <TouchableOpacity
                  style={[styles.toggleButton, balanceAction === "add" && styles.toggleButtonActive]}
                  onPress={() => setBalanceAction("add")}
                >
                  <Text style={styles.toggleText}>Add</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleButton, balanceAction === "subtract" && styles.toggleButtonActive]}
                  onPress={() => setBalanceAction("subtract")}
                >
                  <Text style={styles.toggleText}>Withdraw</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.modalInput}
                value={balanceAmount}
                onChangeText={setBalanceAmount}
                placeholder="Enter amount"
                keyboardType="numeric"
                placeholderTextColor="#888"
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowBalanceModal(false)}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalButton} onPress={handleUpdateBalance}>
                  <Text style={styles.modalButtonText}>Update</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Savings Trend</Text>
            <TouchableOpacity onPress={() => navigation.navigate("SavingsDetail")}>
              <Text style={styles.cardAction}>See Details</Text>
            </TouchableOpacity>
          </View>
          {userData.monthlySavings.length > 0 ? (
            <LineChart
              data={getSavingsChartData()}
              width={width - 64}
              height={220}
              chartConfig={{
                backgroundColor: "#ffffff",
                backgroundGradientFrom: "#ffffff",
                backgroundGradientTo: "#ffffff",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(98, 0, 238, ${opacity})`,
                style: { borderRadius: 16 },
                propsForDots: { r: "6", strokeWidth: "2", stroke: "#6200EE" },
              }}
              bezier
              style={styles.chart}
            />
          ) : (
            <View style={styles.noDataContainer}>
              <MaterialCommunityIcons name="chart-line" size={48} color="#ccc" />
              <Text style={styles.noDataText}>No savings data available</Text>
              <TouchableOpacity
                style={styles.addDataButton}
                onPress={() => navigation.navigate("AddExpense", { user })}
              >
                <Text style={styles.addDataText}>Add Expenses to Track</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Spending Breakdown</Text>
            <TouchableOpacity onPress={() => navigation.navigate("ExpenseAnalysis")}>
              <Text style={styles.cardAction}>Full Analysis</Text>
            </TouchableOpacity>
          </View>
          {userData.spendingCategories.length > 0 ? (
            <View style={styles.categoriesContainer}>
              {userData.spendingCategories.map((category, index) => (
                <View key={index} style={styles.categoryItem}>
                  <View style={styles.categoryHeader}>
                    <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                    <Text style={styles.categoryName}>{category.name}</Text>
                    <Text style={styles.categoryPercentage}>{category.percentage}%</Text>
                  </View>
                  <View style={styles.percentageBarContainer}>
                    <View
                      style={[
                        styles.percentageBar,
                        { width: `${category.percentage}%`, backgroundColor: category.color },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.noDataContainer}>
              <MaterialCommunityIcons name="chart-pie" size={48} color="#ccc" />
              <Text style={styles.noDataText}>No expense categories yet</Text>
              <TouchableOpacity
                style={styles.addDataButton}
                onPress={() => navigation.navigate("AddExpense", { user })}
              >
                <Text style={styles.addDataText}>Add Your First Expense</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Recent Transactions</Text>
            <TouchableOpacity style={styles.expandButton} onPress={toggleExpanded}>
              <Animated.View style={{ transform: [{ rotate: rotateDegree }] }}>
                <Ionicons name="chevron-down" size={24} color="#6200EE" />
              </Animated.View>
            </TouchableOpacity>
          </View>
          {userData.recentTransactions.length > 0 ? (
            <View>
              {userData.recentTransactions.slice(0, expanded ? undefined : 2).map((transaction) => (
                <TouchableOpacity
                  key={transaction.id}
                  style={styles.transactionItem}
                  onPress={() => navigation.navigate("TransactionDetail", { id: transaction.id })}
                >
                  <View style={styles.transactionIcon}>
                    <MaterialCommunityIcons
                      name="arrow-up-bold-circle"
                      size={32}
                      color="#F44336"
                    />
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionTitle}>{transaction.title}</Text>
                    <Text style={styles.transactionCategory}>{transaction.category}</Text>
                  </View>
                  <View style={styles.transactionAmount}>
                    <Text style={[styles.amountText, { color: "#F44336" }]}>
                      ₹{Math.abs(transaction.amount).toFixed(2)}
                    </Text>
                    <Text style={styles.dateText}>{transaction.date}</Text>
                  </View>
                </TouchableOpacity>
              ))}
              {userData.recentTransactions.length > 2 && (
                <TouchableOpacity
                  style={styles.viewAllButton}
                  onPress={() => navigation.navigate("AllTransactions")}
                >
                  <Text style={styles.viewAllText}>View All Transactions</Text>
                  <Ionicons name="arrow-forward" size={16} color="#6200EE" />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.noDataContainer}>
              <MaterialCommunityIcons name="currency-usd-off" size={48} color="#ccc" />
              <Text style={styles.noDataText}>No transactions yet</Text>
              <TouchableOpacity
                style={styles.addDataButton}
                onPress={() => navigation.navigate("AddExpense", { user })}
              >
                <Text style={styles.addDataText}>Record Your First Transaction</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate("AddExpense", { user })}>
            <View style={styles.actionIcon}>
              <Ionicons name="add-circle" size={24} color="#fff" />
            </View>
            <Text style={styles.actionText}>Add Expense</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate("AIInsight", { user })}>
            <View style={styles.actionIcon}>
              <MaterialCommunityIcons name="brain" size={24} color="#fff" />
            </View>
            <Text style={styles.actionText}>AI Insights</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#E53935" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, backgroundColor: "#F5F7FA" },
  container: { flex: 1, alignItems: "center", paddingBottom: 24 },
  gradientHeader: {
    width: "100%",
    backgroundColor: "#6200EE",
    paddingTop: 40,
    paddingBottom: 30,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 40,
    alignItems: "center",
    position: "relative",
  },
  settingsButton: { position: "absolute", top: 40, right: 20, padding: 8 },
  profileTopSection: { alignItems: "center" },
  avatar: { width: "100%", height: "100%", borderRadius: 50, borderWidth: 3, borderColor: "#fff" },
  editAvatarIcon: {
    position: "absolute",
    right: 0,
    bottom: 0,
    backgroundColor: "#6200EE",
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  nameContainer: { flexDirection: "row", alignItems: "center", marginTop: 16 },
  nameText: { fontSize: 24, fontWeight: "700", color: "#fff", marginRight: 8 },
  editNameButton: {
    backgroundColor: "#fff",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  editNameContainer: { marginTop: 16, alignItems: "center" },
  nameInput: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: 200,
    fontSize: 18,
    marginBottom: 8,
  },
  editButtonsRow: { flexDirection: "row", justifyContent: "center" },
  editButton: {
    backgroundColor: "#E53935",
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 5,
  },
  saveButton: { backgroundColor: "#4CAF50" },
  emailText: { fontSize: 16, color: "rgba(255, 255, 255, 0.8)", marginTop: 4 },
  joinedText: { fontSize: 14, color: "rgba(255, 255, 255, 0.7)", marginTop: 8 },
  statsCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginVertical: 16,
    marginHorizontal: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  balanceSection: { alignItems: "center", marginBottom: 16 },
  balanceLabel: { fontSize: 16, color: "#666", marginBottom: 8, fontWeight: "500" },
  balanceValue: { fontSize: 36, fontWeight: "bold", color: "#2ecc71", marginBottom: 10 },
  updateBalanceButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#6200EE",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  updateBalanceText: { color: "#fff", fontSize: 14, fontWeight: "600", marginLeft: 6 },
  statsRow: { flexDirection: "row", justifyContent: "space-around", alignItems: "center" },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 20, fontWeight: "700", color: "#333" },
  statLabel: { fontSize: 12, color: "#666", marginTop: 4 },
  statDivider: { width: 1, height: 40, backgroundColor: "#ddd" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    width: "90%",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: "600", color: "#333" },
  cardAction: { fontSize: 14, color: "#6200EE", fontWeight: "500" },
  chart: { marginVertical: 8, borderRadius: 16 },
  noDataContainer: { alignItems: "center", justifyContent: "center", padding: 24 },
  noDataText: { marginTop: 8, color: "#888", fontSize: 16 },
  addDataButton: {
    marginTop: 12,
    backgroundColor: "#6200EE",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  addDataText: { color: "#fff", fontSize: 14, fontWeight: "500" },
  categoriesContainer: { marginVertical: 8 },
  categoryItem: { marginBottom: 12 },
  categoryHeader: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  categoryDot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  categoryName: { flex: 1, fontSize: 14, color: "#333" },
  categoryPercentage: { fontSize: 14, fontWeight: "600", color: "#333" },
  percentageBarContainer: { height: 8, backgroundColor: "#f0f0f0", borderRadius: 4, overflow: "hidden" },
  percentageBar: { height: "100%", borderRadius: 4 },
  expandButton: { padding: 4 },
  transactionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  transactionIcon: { marginRight: 12 },
  transactionDetails: { flex: 1 },
  transactionTitle: { fontSize: 16, fontWeight: "500", color: "#333" },
  transactionCategory: { fontSize: 12, color: "#666", marginTop: 2 },
  transactionAmount: { alignItems: "flex-end" },
  amountText: { fontSize: 16, fontWeight: "600" },
  dateText: { fontSize: 12, color: "#888", marginTop: 2 },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginTop: 4,
  },
  viewAllText: { fontSize: 14, color: "#6200EE", fontWeight: "500", marginRight: 4 },
  actionsContainer: { flexDirection: "row", justifyContent: "space-between", width: "90%", marginVertical: 8 },
  actionButton: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    flex: 1,
    marginHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  actionIcon: {
    backgroundColor: "#6200EE",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  actionText: { fontSize: 12, color: "#333", fontWeight: "500" },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "#E53935",
    borderRadius: 8,
    marginTop: 24,
  },
  logoutText: { color: "#E53935", fontWeight: "600", marginLeft: 8 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F5F7FA" },
  loadingAnimation: { width: 120, height: 120 },
  loadingText: { marginTop: 16, fontSize: 16, color: "#666" },
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: "80%",
    alignItems: "center",
    elevation: 5,
  },
  modalTitle: { fontSize: 20, fontWeight: "600", color: "#333", marginBottom: 16 },
  modalToggle: { flexDirection: "row", marginBottom: 16 },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#6200EE",
    borderRadius: 8,
    marginHorizontal: 4,
  },
  toggleButtonActive: { backgroundColor: "#6200EE" },
  toggleText: { fontSize: 14, color: "#6200EE", fontWeight: "500" },
  modalInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtons: { flexDirection: "row", justifyContent: "space-between", width: "100%" },
  modalButton: {
    flex: 1,
    backgroundColor: "#6200EE",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 4,
  },
  cancelButton: { backgroundColor: "#E53935" },
  modalButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});

export default ProfileScreen;