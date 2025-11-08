import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AvailabilityScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Availability</Text>
      <Text style={styles.subtitle}>Set your working hours and schedule preferences</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
  },
});