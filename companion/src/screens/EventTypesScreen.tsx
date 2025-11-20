import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getEventTypes } from '../services/calApi';
import { EventType } from '../types/eventType';

export default function EventTypesScreen() {
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEventTypes();
  }, []);

  const fetchEventTypes = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getEventTypes();
      setEventTypes(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch event types');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#292929" />
        <Text style={styles.loadingText}>Loading event types...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#dc2626" />
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.errorHint}>
          Please configure your Cal.com API key in the app settings.
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchEventTypes}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Event Types</Text>
        {eventTypes.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#9ca3af" />
            <Text style={styles.emptyText}>No event types found</Text>
            <Text style={styles.emptyHint}>
              Create your first event type on cal.com
            </Text>
          </View>
        ) : (
          <View style={styles.eventTypesList}>
            {eventTypes.map((eventType) => (
              <View key={eventType.id} style={styles.eventTypeCard}>
                <View style={styles.eventTypeHeader}>
                  <Ionicons name="link" size={20} color="#292929" />
                  <Text style={styles.eventTypeTitle}>{eventType.title}</Text>
                </View>
                <Text style={styles.eventTypeSlug}>/{eventType.slug}</Text>
                <View style={styles.eventTypeDetails}>
                  <View style={styles.detailItem}>
                    <Ionicons name="time-outline" size={16} color="#6b7280" />
                    <Text style={styles.detailText}>{eventType.length} min</Text>
                  </View>
                  {eventType.description && (
                    <Text style={styles.eventTypeDescription} numberOfLines={2}>
                      {eventType.description}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f9fafb',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#111827',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#dc2626',
    textAlign: 'center',
    fontWeight: '600',
  },
  errorHint: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#292929',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  emptyHint: {
    marginTop: 4,
    fontSize: 14,
    color: '#6b7280',
  },
  eventTypesList: {
    gap: 12,
  },
  eventTypeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  eventTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  eventTypeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  eventTypeSlug: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  eventTypeDetails: {
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#6b7280',
  },
  eventTypeDescription: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
});
