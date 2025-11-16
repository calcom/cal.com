import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Header } from "../../components/Header";

interface MoreMenuItem {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  href?: string;
  onPress?: () => void;
}

export default function More() {
  const router = useRouter();

  const menuItems: MoreMenuItem[] = [
    {
      name: "Profile",
      icon: "person-outline",
      href: "/profile",
    },
    {
      name: "Apps",
      icon: "grid-outline",
      onPress: () => {
        console.log("Apps pressed");
        // TODO: Navigate to apps page when implemented
      },
    },
    {
      name: "Routing",
      icon: "git-branch-outline",
      onPress: () => {
        console.log("Routing pressed");
        // TODO: Navigate to routing page when implemented
      },
    },
    {
      name: "Workflows",
      icon: "flash-outline",
      onPress: () => {
        console.log("Workflows pressed");
        // TODO: Navigate to workflows page when implemented
      },
    },
    {
      name: "Insights",
      icon: "bar-chart-outline",
      onPress: () => {
        console.log("Insights pressed");
        // TODO: Navigate to insights page when implemented
      },
    },
  ];

  return (
    <View className="flex-1 bg-[#f8f9fa]">
      <Header />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="bg-white border border-[#E5E5EA] rounded-lg overflow-hidden">
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.name}
              onPress={item.href ? () => router.push(item.href!) : item.onPress}
              className={`bg-white active:bg-[#F8F9FA] flex-row items-center justify-between px-5 py-5 ${
                index < menuItems.length - 1 ? "border-b border-[#E5E5EA]" : ""
              }`}
            >
              <View className="flex-row items-center flex-1">
                <Ionicons name={item.icon} size={20} color="#333" />
                <Text className="text-base font-semibold text-[#333] ml-3">{item.name}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}