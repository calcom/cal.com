import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";

import ApiService from "../services/api";

interface AuthScreenProps {
  onAuthenticated: () => void;
}

export default function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!apiKey.trim()) {
      Alert.alert("Error", "Please enter your API key");
      return;
    }

    setLoading(true);
    try {
      await ApiService.setApiKey(apiKey.trim());
      const result = await ApiService.testConnection();

      if (result.success) {
        onAuthenticated();
      } else {
        const errorMessage = result.details?.message || result.error || "Invalid API key or connection error";
        Alert.alert("Authentication Failed", errorMessage);
        await ApiService.clearApiKey();
      }
    } catch (error) {
      Alert.alert("Error", "Failed to authenticate. Please check your API key.");
      await ApiService.clearApiKey();
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Cal.com Mobile</Text>
        <Text style={styles.subtitle}>Enter your API key to continue</Text>

        <TextInput
          style={styles.input}
          placeholder="API Key"
          value={apiKey}
          onChangeText={setApiKey}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign In</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    padding: 20,
  },
  content: {
    backgroundColor: "#fff",
    padding: 30,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
    color: "#333",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 30,
    color: "#666",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: "#f9f9f9",
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
