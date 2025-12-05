/**
 * NetworkStatusBanner Component
 *
 * Shows a minimal, classy popup when the device is offline.
 */

import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Modal, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";

export function NetworkStatusBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [hasBeenDismissed, setHasBeenDismissed] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    // Check initial network state
    NetInfo.fetch().then((state: NetInfoState) => {
      const offline = !state.isConnected || !state.isInternetReachable;
      setIsOffline(offline);
      if (offline && !hasBeenDismissed) {
        setShowModal(true);
      }
    });

    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const offline = !state.isConnected || !state.isInternetReachable;

      if (offline && !isOffline && !hasBeenDismissed) {
        setShowModal(true);
      }

      if (!offline && isOffline) {
        setHasBeenDismissed(false);
      }

      setIsOffline(offline);
    });

    return () => unsubscribe();
  }, [isOffline, hasBeenDismissed]);

  useEffect(() => {
    if (showModal) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [showModal, fadeAnim]);

  const handleDismiss = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setShowModal(false);
      setHasBeenDismissed(true);
    });
  };

  if (!showModal) return null;

  return (
    <Modal transparent visible={showModal} animationType="none" onRequestClose={handleDismiss}>
      <Animated.View
        style={{ opacity: fadeAnim }}
        className="flex-1 items-center justify-center bg-black/40 px-8"
      >
        <View className="w-full max-w-xs items-center rounded-2xl bg-white px-6 py-8">
          <Ionicons name="cloud-offline-outline" size={36} color="#292929" />
          <Text className="mt-4 text-lg font-semibold text-gray-900">You're offline</Text>
          <Text className="mt-2 text-center text-sm leading-5 text-gray-500">
            The internet left the chat. Don't panic! You can still browse around.
          </Text>
          <TouchableOpacity
            onPress={handleDismiss}
            className="mt-6 rounded-full bg-gray-900 px-8 py-3 active:bg-gray-700"
          >
            <Text className="text-sm font-medium text-white">Cool, got it</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

export default NetworkStatusBanner;
