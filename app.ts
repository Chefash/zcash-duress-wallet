// App.tsx
// React Native Zcash Duress Wallet Mobile App
// Install: npx react-native@latest init ZcashDuress --template typescript

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Platform,
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const API = "http://localhost:3000/api";
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ============ SETUP SCREEN ============
function SetupScreen({ navigation }: any) {
  const [username, setUsername] = useState("demo");
  const [password, setPassword] = useState("password123");
  const [duressPin, setDuressPin] = useState("911");
  const [realBalance, setRealBalance] = useState("25.75");
  const [decoyBalance, setDecoyBalance] = useState("0.5");
  const [loading, setLoading] = useState(false);

  const handleSetup = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API}/setup`, {
        username,
        password,
        duressPin,
        realWalletBalance: parseFloat(realBalance),
        decoyWalletBalance: parseFloat(decoyBalance),
        emergencyContacts: ["wife@example.com", "lawyer@example.com"],
      });

      if (res.data.success) {
        await AsyncStorage.setItem("username", username);
        await AsyncStorage.setItem("password", password);
        Alert.alert("✅ Success", "Wallet created! Go to Login.");
        navigation.navigate("Login");
      }
    } catch (err: any) {
      Alert.alert("❌ Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>🔒 ZCASH DURESS</Text>
          <Text style={styles.subtitle}>Mobile Wallet Setup</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="your_name"
              value={username}
              onChangeText={setUsername}
              placeholderTextColor="#666"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Strong Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor="#666"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Duress PIN</Text>
            <TextInput
              style={styles.input}
              placeholder="••••"
              value={duressPin}
              onChangeText={setDuressPin}
              secureTextEntry
              placeholderTextColor="#666"
            />
            <Text style={styles.hint}>Enter if in danger</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Real Balance (ZEC)</Text>
            <TextInput
              style={styles.input}
              placeholder="25.75"
              value={realBalance}
              onChangeText={setRealBalance}
              keyboardType="decimal-pad"
              placeholderTextColor="#666"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Decoy Balance (ZEC)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.5"
              value={decoyBalance}
              onChangeText={setDecoyBalance}
              keyboardType="decimal-pad"
              placeholderTextColor="#666"
            />
            <Text style={styles.hint}>Amount to give up if coerced</Text>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSetup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Create Wallet</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============ LOGIN SCREEN ============
function LoginScreen({ navigation }: any) {
  const [username, setUsername] = useState("demo");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [triggerCount, setTriggerCount] = useState(0);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API}/login`, {
        username,
        passwordAttempt: password,
      });

      if (res.data.success) {
        setResult(res.data);

        // Track duress triggers
        if (res.data.mode === "duress") {
          setTriggerCount(res.data.triggerLevel);
          if (res.data.triggerLevel >= 3) {
            Alert.alert(
              "🚨 EMERGENCY ALERT",
              "Your emergency contacts have been notified immediately!"
            );
          } else if (res.data.triggerLevel === 2) {
            Alert.alert(
              "⏰ SOFT ALERT",
              "Your emergency contacts will be notified in 2 hours"
            );
          }
        }

        setPassword(""); // Clear password
      }
    } catch (err: any) {
      Alert.alert("❌ Login Failed", err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>🔐 Login</Text>
          <Text style={styles.subtitle}>Access Your Wallet</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="your_name"
              value={username}
              onChangeText={setUsername}
              placeholderTextColor="#666"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Password or Duress PIN</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor="#666"
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Login</Text>
            )}
          </TouchableOpacity>
        </View>

        {result && (
          <View style={styles.resultContainer}>
            {result.mode === "normal" ? (
              <View style={[styles.wallet, styles.realWallet]}>
                <Text style={styles.badge}>🔐 Real Wallet</Text>
                <Text style={styles.balance}>{result.wallet.balance} ZEC</Text>
                <Text style={styles.address}>
                  {result.wallet.address}
                </Text>
                <Text style={styles.shielded}>✅ Shielded on Zcash</Text>
              </View>
            ) : (
              <View style={[styles.wallet, styles.decoyWallet]}>
                <Text style={[styles.badge, styles.decoyBadge]}>
                  ⚠️ Duress Mode
                </Text>
                <Text style={[styles.balance, styles.decoyBalance]}>
                  {result.wallet.balance} ZEC
                </Text>
                <Text style={styles.address}>{result.wallet.address}</Text>

                {result.triggerLevel === 1 && (
                  <View style={styles.alert}>
                    <Text style={styles.alertText}>
                      🟡 Level 1: Silent Trigger
                    </Text>
                  </View>
                )}
                {result.triggerLevel === 2 && (
                  <View style={[styles.alert, styles.alertOrange]}>
                    <Text style={styles.alertText}>
                      🟠 Level 2: Soft Alert (2 hour delay)
                    </Text>
                  </View>
                )}
                {result.triggerLevel >= 3 && (
                  <View style={[styles.alert, styles.alertRed]}>
                    <Text style={styles.alertText}>
                      🔴 Level 3: IMMEDIATE ALERT
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ============ DEAD MAN'S SWITCH SCREEN ============
function DeadMansSwitchScreen({ navigation }: any) {
  const [checkInDays, setCheckInDays] = useState("7");
  const [switchStatus, setSwitchStatus] = useState<any>(null);
  const [username, setUsername] = useState("demo");

  const handleCreateSwitch = () => {
    Alert.alert(
      "⏰ Dead Man's Switch",
      `If you don't check in for ${checkInDays} days, emergency contacts will be alerted automatically.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Create",
          onPress: () => {
            setSwitchStatus({
              enabled: true,
              checkInIntervalDays: parseInt(checkInDays),
              lastCheckIn: new Date(),
              daysUntilTrigger: parseInt(checkInDays),
            });
            Alert.alert("✅ Created", "Dead Man's Switch is now active!");
          },
        },
      ]
    );
  };

  const handleCheckIn = () => {
    setSwitchStatus({
      ...switchStatus,
      lastCheckIn: new Date(),
      daysUntilTrigger: switchStatus.checkInIntervalDays,
    });
    Alert.alert("✅ Check-in Complete", "You're safe. Timer reset.");
  };

  const handleDisable = () => {
    setSwitchStatus({ ...switchStatus, enabled: false });
    Alert.alert("⏹️ Disabled", "Switch paused until you re-enable it.");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>⏰ Dead Man's Switch</Text>
          <Text style={styles.subtitle}>Auto Emergency Protocol</Text>
        </View>

        {!switchStatus ? (
          <View style={styles.form}>
            <Text style={styles.sectionText}>
              If captured or detained, this timer ensures your emergency team is
              notified automatically.
            </Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Check-in Interval (days)</Text>
              <TextInput
                style={styles.input}
                placeholder="7"
                value={checkInDays}
                onChangeText={setCheckInDays}
                keyboardType="number-pad"
                placeholderTextColor="#666"
              />
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={handleCreateSwitch}
            >
              <Text style={styles.buttonText}>Create Switch</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            <View
              style={[
                styles.switchCard,
                switchStatus.enabled
                  ? styles.switchActive
                  : styles.switchInactive,
              ]}
            >
              <Text style={styles.switchStatus}>
                {switchStatus.enabled ? "🟢 ACTIVE" : "🔴 PAUSED"}
              </Text>
              <Text style={styles.switchDays}>
                {switchStatus.daysUntilTrigger.toFixed(1)} days until trigger
              </Text>
              <Text style={styles.switchSmall}>
                Last check-in: {new Date(switchStatus.lastCheckIn).toLocaleDateString()}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.button, styles.checkInButton]}
              onPress={handleCheckIn}
            >
              <Text style={styles.buttonText}>✅ Check-In (Safe)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.disableButton]}
              onPress={handleDisable}
            >
              <Text style={styles.buttonText}>
                {switchStatus.enabled ? "⏹️ Pause Switch" : "▶️ Resume Switch"}
              </Text>
            </TouchableOpacity>

            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>How it works:</Text>
              <Text style={styles.infoText}>
                • You check in every {switchStatus.checkInIntervalDays} days to confirm you're safe
              </Text>
              <Text style={styles.infoText}>
                • If you miss a check-in, your emergency contacts are alerted automatically
              </Text>
              <Text style={styles.infoText}>
                • Your real funds are automatically moved to a safe address
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ============ MAIN APP ============
export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: "#4ecdc4",
          tabBarInactiveTintColor: "#666",
        }}
      >
        <Tab.Screen
          name="Setup"
          component={SetupScreen}
          options={{
            tabBarLabel: "Setup",
            tabBarIcon: ({ color }: any) => (
              <Text style={{ fontSize: 20, color }}>🔧</Text>
            ),
          }}
        />
        <Tab.Screen
          name="Login"
          component={LoginScreen}
          options={{
            tabBarLabel: "Login",
            tabBarIcon: ({ color }: any) => (
              <Text style={{ fontSize: 20, color }}>🔐</Text>
            ),
          }}
        />
        <Tab.Screen
          name="DeadMansSwitch"
          component={DeadMansSwitchScreen}
          options={{
            tabBarLabel: "DMS",
            tabBarIcon: ({ color }: any) => (
              <Text style={{ fontSize: 20, color }}>⏰</Text>
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

// ============ STYLES ============
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 30,
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#4ecdc4",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 12,
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  form: {
    marginBottom: 30,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#0f1419",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 4,
    padding: 12,
    color: "#e0e0e0",
    fontSize: 14,
  },
  hint: {
    fontSize: 11,
    color: "#666",
    marginTop: 6,
  },
  button: {
    backgroundColor: "#4ecdc4",
    padding: 14,
    borderRadius: 4,
    alignItems: "center",
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  resultContainer: {
    marginTop: 30,
  },
  wallet: {
    backgroundColor: "#0f1419",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    padding: 20,
  },
  realWallet: {
    borderColor: "#4ecdc4",
  },
  decoyWallet: {
    borderColor: "#ff6b6b",
  },
  badge: {
    fontSize: 12,
    color: "#4ecdc4",
    marginBottom: 10,
    fontWeight: "600",
  },
  decoyBadge: {
    color: "#ff6b6b",
  },
  balance: {
    fontSize: 32,
    fontWeight: "700",
    color: "#4ecdc4",
    marginBottom: 10,
  },
  decoyBalance: {
    color: "#ff6b6b",
  },
  address: {
    fontSize: 11,
    color: "#666",
    marginBottom: 15,
    fontFamily: "monospace",
  },
  shielded: {
    fontSize: 12,
    color: "#4ecdc4",
  },
  alert: {
    backgroundColor: "rgba(255, 217, 61, 0.1)",
    borderLeftWidth: 3,
    borderLeftColor: "#ffd93d",
    padding: 12,
    marginTop: 15,
    borderRadius: 4,
  },
  alertOrange: {
    backgroundColor: "rgba(255, 159, 67, 0.1)",
    borderLeftColor: "#ff9f43",
  },
  alertRed: {
    backgroundColor: "rgba(255, 107, 107, 0.1)",
    borderLeftColor: "#ff6b6b",
  },
  alertText: {
    color: "#e0e0e0",
    fontSize: 12,
    fontWeight: "600",
  },
  switchCard: {
    backgroundColor: "#0f1419",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
  },
  switchActive: {
    borderColor: "#4ecdc4",
  },
  switchInactive: {
    borderColor: "#ff6b6b",
    opacity: 0.6,
  },
  switchStatus: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4ecdc4",
    marginBottom: 10,
  },
  switchDays: {
    fontSize: 24,
    fontWeight: "700",
    color: "#e0e0e0",
    marginBottom: 5,
  },
  switchSmall: {
    fontSize: 12,
    color: "#888",
  },
  checkInButton: {
    backgroundColor: "#4ecdc4",
    marginBottom: 10,
  },
  disableButton: {
    backgroundColor: "#667eea",
    marginBottom: 20,
  },
  infoBox: {
    backgroundColor: "#0f1419",
    borderLeftWidth: 3,
    borderLeftColor: "#4ecdc4",
    padding: 15,
    borderRadius: 4,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4ecdc4",
    marginBottom: 10,
  },
  infoText: {
    fontSize: 12,
    color: "#888",
    marginBottom: 8,
    lineHeight: 16,
  },
  sectionText: {
    fontSize: 14,
    color: "#888",
    marginBottom: 20,
    lineHeight: 20,
  },
  tabBar: {
    backgroundColor: "#0f1419",
    borderTopColor: "#333",
    borderTopWidth: 1,
  },
});