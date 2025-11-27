import React from "react";
import { TouchableOpacity, Text, Alert } from "react-native";
import { useAuth } from "../contexts/AuthContext";

interface LogoutButtonProps {
  className?: string;
  variant?: "default" | "destructive" | "ghost";
}

export function LogoutButton({ className = "", variant = "default" }: LogoutButtonProps) {
  const { logout, isUsingOAuth } = useAuth();

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

  const getTextStyles = () => {
    switch (variant) {
      case "destructive":
        return "text-white font-medium";
      case "ghost":
        return "text-blue-600 font-medium";
      default:
        return "text-white font-medium";
    }
  };

  const handleLogout = () => {
    const authMethod = isUsingOAuth ? "OAuth" : "API key";

    Alert.alert(
      "Sign Out",
      `Are you sure you want to sign out? You'll need to authenticate again using ${authMethod}.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error("Logout error:", error);
              Alert.alert("Error", "Failed to sign out. Please try again.");
            }
          },
        },
      ]
    );
  };

  return (
    <TouchableOpacity onPress={handleLogout} className={`${getButtonStyles()} ${className}`}>
      <Text className={getTextStyles()}>Sign Out</Text>
    </TouchableOpacity>
  );
}

export default LogoutButton;
