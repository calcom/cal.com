import React from "react";
import { TouchableOpacity, Text, Alert, Platform } from "react-native";
import { useAuth } from "../contexts/AuthContext";

interface LogoutButtonProps {
  className?: string;
  variant?: "default" | "destructive" | "ghost";
}

export function LogoutButton({ className = "", variant = "default" }: LogoutButtonProps) {
  const { logout } = useAuth();

  const getButtonStyles = () => {
    switch (variant) {
      case "destructive":
        return "bg-red-600 py-2 px-4 rounded-lg";
      case "ghost":
        return "py-2 px-4";
      default:
        return "bg-gray-600 py-2 px-4 rounded-lg";
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
      Alert.alert("Error", "Failed to sign out. Please try again.");
    }
  };

  return (
    <TouchableOpacity
      onPress={handleLogout}
      className={`${getButtonStyles()} ${className}`}
      style={Platform.OS === "web" ? { cursor: "pointer" } : undefined}
      activeOpacity={0.7}
    >
      <Text className="font-medium text-gray-900">Sign Out</Text>
    </TouchableOpacity>
  );
}

export default LogoutButton;
