import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  Dimensions,
  Animated,
  Alert,
  StatusBar,
  SafeAreaView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from 'expo-file-system';
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from "@expo/vector-icons";
import LottieView from "lottie-react-native";

const { width } = Dimensions.get("window");

const ScannerScreen = ({ navigation }) => {
  const [imageUri, setImageUri] = useState(null);
  const [extractedText, setExtractedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [language, setLanguage] = useState("eng"); // Default language is English

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const imageScale = useRef(new Animated.Value(1)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const lottieRef = useRef(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();

    (async () => {
      try {
        const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
        const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!cameraPermission.granted || !mediaPermission.granted) {
          Alert.alert(
            "Permission Required",
            "Camera and gallery access are needed to use this feature.",
            [{ text: "OK" }]
          );
        }
      } catch (error) {
        console.error("Permission Request Error:", error);
        Alert.alert("Error", "Failed to request permissions. Please try again.");
      }
    })();
  }, []);

  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.timing(scanLineAnim, { toValue: 200, duration: 1500, useNativeDriver: true })
      ).start();
      lottieRef.current?.play();
    } else {
      scanLineAnim.setValue(0);
      if (lottieRef.current && !scanComplete) {
        lottieRef.current.reset();
      }
    }
  }, [loading]);

  useEffect(() => {
    if (scanComplete) {
      Animated.spring(imageScale, { toValue: 0.8, friction: 3, useNativeDriver: true }).start();
    } else {
      imageScale.setValue(1);
    }
  }, [scanComplete]);

  const toggleImageOptions = () => {
    setShowImageOptions(!showImageOptions);
    Animated.spring(buttonScale, {
      toValue: showImageOptions ? 1 : 0.9,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  const switchLanguage = (lang) => {
    setLanguage(lang);
    Alert.alert("Language Switched", `OCR will now use ${lang === "eng" ? "English" : "Tamil"}.`);
  };

  const pickImage = async () => {
    try {
      setShowImageOptions(false);
      const permission = await ImagePicker.getMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission Denied",
          "Gallery access is required. Please enable it in settings.",
          [{ text: "OK" }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setImageUri(result.assets[0].uri);
        setScanComplete(false);
        processImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Pick Image Error:", error);
      Alert.alert(
        "Error",
        "Failed to pick image from gallery. Ensure expo-image-picker is correctly configured and try again."
      );
    }
  };

  const takePhoto = async () => {
    try {
      setShowImageOptions(false);
      const permission = await ImagePicker.getCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission Denied",
          "Camera access is required. Please enable it in settings.",
          [{ text: "OK" }]
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setImageUri(result.assets[0].uri);
        setScanComplete(false);
        processImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Take Photo Error:", error);
      Alert.alert(
        "Error",
        "Failed to capture photo. Ensure expo-image-picker is correctly configured and try again."
      );
    }
  };

  const processImage = async (uri) => {
    setLoading(true);
    setExtractedText("");

    try {
      const filePath = uri.startsWith("file://") ? uri : `file://${uri}`;
      const content = await FileSystem.readAsStringAsync(path);
      if (!fileExists) {
        throw new Error("Image file does not exist at the specified path.");
      }

      const text = await TesseractOcr.recognize(filePath, language, {
        whitelist: "", // Optional: Restrict characters if needed
        blacklist: "", // Optional: Exclude characters if needed
      });

      if (!text) {
        throw new Error("No text detected in the image.");
      }

      console.log("Extracted Text:", text);

      setTimeout(() => {
        setExtractedText(text);
        setScanComplete(true);
        Animated.sequence([
          Animated.spring(imageScale, { toValue: 0.9, friction: 3, useNativeDriver: true }),
          Animated.spring(imageScale, { toValue: 0.8, friction: 5, useNativeDriver: true }),
        ]).start();
        lottieRef.current?.play(30, 120);
      }, 500);
    } catch (error) {
      console.error("OCR Error:", error.message);
      let errorMessage = "Failed to process the image. Please try again.";
      if (error.message.includes("No text")) {
        errorMessage = "No readable text was detected in the image. Try a clearer image.";
      } else if (error.message.includes("file")) {
        errorMessage = "Image file access error. Ensure the image is valid and accessible.";
      }
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const saveExpense = () => {
    Animated.sequence([
      Animated.spring(imageScale, { toValue: 0.7, friction: 3, useNativeDriver: true }),
      Animated.spring(imageScale, { toValue: 0.8, friction: 3, useNativeDriver: true }),
    ]).start();

    Alert.alert(
      "Success!",
      "Receipt data has been processed. Would you like to add it to your expenses?",
      [
        {
          text: "Yes, Add Expense",
          onPress: () =>
            navigation.navigate("AddExpense", { initialData: parseExtractedText(extractedText) }),
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const parseExtractedText = (text) => {
    const lines = text.split("\n").filter((line) => line.trim());
    let amount = 0;
    let date = new Date().toISOString().split("T")[0];
    let description = "";

    lines.forEach((line) => {
      const amountMatch = line.match(/₹?(\d+\.?\d*)/);
      if (amountMatch) amount = parseFloat(amountMatch[1]);

      const dateMatch = line.match(/(\d{2}-\d{2}-\d{4}|\d{4}-\d{2}-\d{2})/);
      if (dateMatch) date = dateMatch[1].replace(/(\d{2})-(\d{2})-(\d{4})/, "$3-$2-$1");

      if (!description && line.length > 5) description = line;
    });

    return { amount, date, description: description || "Scanned Receipt" };
  };

  const retryScanning = () => {
    setImageUri(null);
    setExtractedText("");
    setScanComplete(false);
    toggleImageOptions();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={["#1a2151", "#233876", "#2a4598"]}
        style={styles.background}
      />
      <Animated.View
        style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => navigation?.goBack?.()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Receipt Scanner</Text>
        <View style={styles.languageSelector}>
          <TouchableOpacity
            style={[styles.languageButton, language === "eng" && styles.activeLanguage]}
            onPress={() => switchLanguage("eng")}
          >
            <Text style={styles.languageText}>EN</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.languageButton, language === "tam" && styles.activeLanguage]}
            onPress={() => switchLanguage("tam")}
          >
            <Text style={styles.languageText}>TA</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={[
            styles.card,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: imageUri ? imageScale : 1 }] },
          ]}
        >
          {!imageUri ? (
            <View style={styles.placeholderContainer}>
              <LottieView
                ref={lottieRef}
                source={require("../../assets/animations/receipt-scan.json")}
                style={styles.lottieScanner}
                autoPlay={false}
                loop={false}
              />
              <Text style={styles.placeholderText}>
                Take a photo or upload an image of your receipt
              </Text>
            </View>
          ) : (
            <View style={styles.imageContainer}>
              <Image source={{ uri: imageUri }} style={styles.receiptImage} />
              {loading && (
                <View style={styles.scanOverlay}>
                  <Animated.View
                    style={[styles.scanLine, { transform: [{ translateY: scanLineAnim }] }]}
                  />
                  <LottieView
                    ref={lottieRef}
                    source={require("../../assets/animations/scanning.json")}
                    style={styles.lottieProcessing}
                    loop={true}
                  />
                  <Text style={styles.scanningText}>Processing receipt...</Text>
                </View>
              )}
              {scanComplete && (
                <View style={styles.successOverlay}>
                  <LottieView
                    source={require("../../assets/animations/check-success.json")}
                    style={styles.lottieSuccess}
                    autoPlay
                    loop={false}
                  />
                </View>
              )}
            </View>
          )}
        </Animated.View>

        {extractedText ? (
          <Animated.View
            style={[styles.resultCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
          >
            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>Extracted Data</Text>
              <TouchableOpacity style={styles.editButton}>
                <MaterialCommunityIcons name="pencil-outline" size={20} color="#233876" />
              </TouchableOpacity>
            </View>
            <View style={styles.textResult}>
              <ScrollView style={styles.textScroll} nestedScrollEnabled>
                <Text style={styles.extractedText}>{extractedText}</Text>
              </ScrollView>
            </View>
            <View style={styles.highlightedItems}>
              <Text style={styles.highlightTitle}>AI detected the following:</Text>
              <View style={styles.detectedItem}>
                <FontAwesome5 name="store" size={16} color="#233876" />
                <Text style={styles.detectedText}>
                  Store: {extractedText.split("\n")[0] || "Unknown"}
                </Text>
              </View>
              <View style={styles.detectedItem}>
                <FontAwesome5 name="calendar-alt" size={16} color="#233876" />
                <Text style={styles.detectedText}>Date: {new Date().toLocaleDateString()}</Text>
              </View>
              <View style={styles.detectedItem}>
                <FontAwesome5 name="dollar-sign" size={16} color="#233876" />
                <Text style={styles.detectedText}>
                  Total: $
                  {extractedText.match(/total[\s\S]*?(\d+\.\d{2})/i)?.[1] ||
                    extractedText.match(/\$\s*(\d+\.\d{2})/)?.[1] ||
                    "0.00"}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.saveButton} onPress={saveExpense} activeOpacity={0.8}>
              <LinearGradient
                colors={["#233876", "#2a4598", "#3d57b9"]}
                style={styles.saveGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.saveText}>Save to Expenses</Text>
                <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        ) : null}
      </ScrollView>

      {!scanComplete && (
        <Animated.View style={[styles.fabContainer, { transform: [{ scale: buttonScale }] }]}>
          {showImageOptions ? (
            <View style={styles.fabOptions}>
              <TouchableOpacity style={[styles.fabOption, styles.cameraOption]} onPress={takePhoto}>
                <LinearGradient colors={["#233876", "#3d57b9"]} style={styles.fabOptionGradient}>
                  <MaterialCommunityIcons name="camera" size={22} color="#fff" />
                </LinearGradient>
                <Text style={styles.fabOptionText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.fabOption, styles.galleryOption]} onPress={pickImage}>
                <LinearGradient colors={["#233876", "#3d57b9"]} style={styles.fabOptionGradient}>
                  <MaterialCommunityIcons name="image" size={22} color="#fff" />
                </LinearGradient>
                <Text style={styles.fabOptionText}>Gallery</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          <TouchableOpacity
            style={styles.fab}
            onPress={imageUri ? retryScanning : toggleImageOptions}
            activeOpacity={0.8}
          >
            <LinearGradient colors={["#233876", "#2a4598", "#3d57b9"]} style={styles.fabGradient}>
              {imageUri ? (
                <MaterialCommunityIcons name="refresh" size={24} color="#fff" />
              ) : (
                <MaterialCommunityIcons
                  name={showImageOptions ? "close" : "plus"}
                  size={24}
                  color="#fff"
                />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafe" },
  background: { position: "absolute", left: 0, right: 0, top: 0, height: 200 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: "600", color: "#fff" },
  infoButton: { padding: 8 },
  languageSelector: {
    flexDirection: "row",
    alignItems: "center",
  },
  languageButton: {
    padding: 6,
    marginLeft: 8,
    borderRadius: 12,
    backgroundColor: "#e0e0e0",
  },
  activeLanguage: {
    backgroundColor: "#233876",
  },
  languageText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "600",
  },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 100 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginTop: 16,
    marginBottom: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  placeholderContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 40 },
  lottieScanner: { width: 200, height: 200 },
  placeholderText: {
    fontSize: 16,
    color: "#5f6481",
    textAlign: "center",
    marginTop: 16,
    paddingHorizontal: 16,
  },
  imageContainer: { position: "relative", borderRadius: 12, overflow: "hidden", alignItems: "center" },
  receiptImage: { width: "100%", height: 300, borderRadius: 12, resizeMode: "cover" },
  scanOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  scanLine: { position: "absolute", left: 0, right: 0, height: 2, backgroundColor: "#4fc3f7", opacity: 0.8 },
  lottieProcessing: { width: 120, height: 120 },
  scanningText: { color: "#fff", fontSize: 16, fontWeight: "500", marginTop: 16 },
  successOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  lottieSuccess: { width: 60, height: 60 },
  resultCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  resultTitle: { fontSize: 16, fontWeight: "600", color: "#233876" },
  editButton: { padding: 8 },
  textResult: { backgroundColor: "#f5f7ff", borderRadius: 8, padding: 12, maxHeight: 120 },
  textScroll: { flex: 1 },
  extractedText: { fontSize: 14, color: "#5f6481", lineHeight: 20 },
  highlightedItems: { marginTop: 16 },
  highlightTitle: { fontSize: 14, fontWeight: "500", color: "#233876", marginBottom: 8 },
  detectedItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f7ff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  detectedText: { fontSize: 14, color: "#5f6481", marginLeft: 12 },
  saveButton: { marginTop: 16, borderRadius: 12, overflow: "hidden" },
  saveGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  saveText: { fontSize: 16, fontWeight: "600", color: "#fff", marginRight: 8 },
  fabContainer: { position: "absolute", right: 16, bottom: 24, alignItems: "flex-end" },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: "#233876",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  fabOptions: { flexDirection: "row", marginBottom: 16 },
  fabOption: { alignItems: "center", marginHorizontal: 8 },
  fabOptionGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  fabOptionText: { fontSize: 12, color: "#233876", marginTop: 4 },
});

export default ScannerScreen;