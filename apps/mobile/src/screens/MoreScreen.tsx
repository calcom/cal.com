import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from "react-native";

import ApiService from "../services/api";

export default function MoreScreen() {
  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await ApiService.clearApiKey();
          Alert.alert("Signed Out", "Please restart the app to sign in again.");
        },
      },
    ]);
  };

  const handleTestConnection = async () => {
    try {
      const result = await ApiService.testConnection();
      if (result.success) {
        Alert.alert("Success", "API connection is working correctly");
      } else {
        Alert.alert("Error", `API connection failed: ${result.error}`);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to test connection");
    }
  };

  const menuItems = [
    {
      title: "Test API Connection",
      icon: "wifi-outline",
      onPress: handleTestConnection,
    },
    {
      title: "About",
      icon: "information-circle-outline",
      onPress: () => Alert.alert("About", "Cal.com Mobile App\nVersion 1.0.0"),
    },
    {
      title: "Sign Out",
      icon: "log-out-outline",
      onPress: handleLogout,
      destructive: true,
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="person-circle-outline" size={80} color="#007AFF" />
        <Text style={styles.headerTitle}>Cal.com Mobile</Text>
        <Text style={styles.headerSubtitle}>Manage your scheduling on the go</Text>
      </View>

      <View style={styles.menuSection}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.menuItem, index === menuItems.length - 1 && styles.lastMenuItem]}
            onPress={item.onPress}>
            <View style={styles.menuItemContent}>
              <Ionicons
                name={item.icon as keyof typeof Ionicons.glyphMap}
                size={24}
                color={item.destructive ? "#ff4444" : "#007AFF"}
              />
              <Text style={[styles.menuItemText, item.destructive && styles.destructiveText]}>
                {item.title}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#fff",
    alignItems: "center",
    padding: 30,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 15,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#666",
    marginTop: 5,
    textAlign: "center",
  },
  menuSection: {
    backgroundColor: "#fff",
    marginHorizontal: 15,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  menuItemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuItemText: {
    fontSize: 16,
    color: "#333",
    marginLeft: 15,
  },
  destructiveText: {
    color: "#ff4444",
  },
});
