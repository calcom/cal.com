import React, { useState } from "react";
import { TouchableOpacity, Text, Alert, Platform } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { LogoutConfirmModal } from "./LogoutConfirmModal";

interface LogoutButtonProps {
  className?: string;
  variant?: "default" | "destructive" | "ghost";
}

export function LogoutButton({ className = "" }: LogoutButtonProps) {
  const { logout } = useAuth();
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleLogoutPress = () => {
    if (Platform.OS === "web") {
      setShowConfirmModal(true);
    } else {
      // Mobile: use Alert.alert
      Alert.alert("Sign Out", "Are you sure you want to sign out?", [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: performLogout,
        },
      ]);
    }
  };

  const performLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
      if (Platform.OS === "web") {
        window.alert("Failed to sign out. Please try again.");
      } else {
        Alert.alert("Error", "Failed to sign out. Please try again.");
      }
    }
  };

  const handleConfirmLogout = () => {
    setShowConfirmModal(false);
    performLogout();
  };

  const handleCancelLogout = () => {
    setShowConfirmModal(false);
  };

  return (
    <>
      <TouchableOpacity
        onPress={handleLogoutPress}
        className={`"px-4 rounded-lg" bg-gray-600 py-2 ${className}`}
        style={Platform.OS === "web" ? { cursor: "pointer" } : undefined}
        activeOpacity={0.7}
      >
        <Text className="font-medium text-gray-900">Sign Out</Text>
      </TouchableOpacity>

      <LogoutConfirmModal
        visible={showConfirmModal}
        onConfirm={handleConfirmLogout}
        onCancel={handleCancelLogout}
      />
    </>
  );
}

export default LogoutButton;
