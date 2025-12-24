/**
 * NetworkStatusBanner Component
 *
 * Shows a minimal, classy popup when the device is offline.
 * - Shows popup when going offline
 * - Auto-dismisses when internet comes back
 * - Shows again on next disconnect
 */

import React, { useEffect, useState, useRef } from "react";
import { View, Text, TouchableOpacity, Modal, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";

export function NetworkStatusBanner() {
  const [showModal, setShowModal] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Simple refs to track state
  const previousOfflineRef = useRef<boolean | null>(null);
  const userDismissedRef = useRef(false);

  const checkIfOffline = (state: NetInfoState): boolean => {
    if (state.isConnected === false) return true;
    if (state.isInternetReachable === false) return true;
    return false;
  };

  useEffect(() => {
    const handleNetworkChange = (state: NetInfoState) => {
      const currentlyOffline = checkIfOffline(state);
      const wasOffline = previousOfflineRef.current;

      // Transition: Online → Offline (only show if user hasn't dismissed)
      if (currentlyOffline && wasOffline === false && !userDismissedRef.current) {
        setShowModal(true);
      }

      // Transition: Offline → Online
      if (!currentlyOffline && wasOffline === true) {
        setShowModal(false); // Auto-dismiss
        userDismissedRef.current = false; // Reset for next offline event
      }

      previousOfflineRef.current = currentlyOffline;
    };

    // Get initial state
    NetInfo.fetch().then((state) => {
      const offline = checkIfOffline(state);
      previousOfflineRef.current = offline;
      if (offline) {
        setShowModal(true);
      }
    });

    // Listen for changes
    const unsubscribe = NetInfo.addEventListener(handleNetworkChange);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (showModal) {
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [showModal, fadeAnim]);

  const handleDismiss = () => {
    userDismissedRef.current = true;
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setShowModal(false);
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
