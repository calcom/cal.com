import React from 'react';
import { View, Text } from 'react-native';

export default function More() {
  return (
    <View className="flex-1 items-center justify-center bg-white p-5">
      <Text className="mb-2 text-2xl font-bold text-gray-800">More</Text>
      <Text className="text-center text-base text-gray-500">
        Settings, profile, and additional options
      </Text>
    </View>
  );
}