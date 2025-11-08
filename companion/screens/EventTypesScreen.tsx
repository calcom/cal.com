import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator, 
  Alert,
  TouchableOpacity,
  RefreshControl 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CalComAPIService, EventType } from '../services/calcom';

export default function EventTypesScreen() {
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEventTypes = async () => {
    try {
      console.log('🎯 EventTypesScreen: Starting fetch...');
      setError(null);
      
      const data = await CalComAPIService.getEventTypes();
      
      console.log('🎯 EventTypesScreen: Data received:', data);
      console.log('🎯 EventTypesScreen: Data type:', typeof data);
      console.log('🎯 EventTypesScreen: Data is array:', Array.isArray(data));
      console.log('🎯 EventTypesScreen: Data length:', data?.length);
      
      if (Array.isArray(data)) {
        setEventTypes(data);
        console.log('🎯 EventTypesScreen: State updated with', data.length, 'event types');
      } else {
        console.log('🎯 EventTypesScreen: Data is not an array, setting empty array');
        setEventTypes([]);
      }
    } catch (err) {
      console.error('🎯 EventTypesScreen: Error fetching event types:', err);
      setError('Failed to load event types. Please check your API key and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      console.log('🎯 EventTypesScreen: Fetch completed, loading set to false');
    }
  };

  useEffect(() => {
    console.log('🎯 EventTypesScreen: Component mounted, starting fetch...');
    fetchEventTypes();
  }, []);

  useEffect(() => {
    console.log('🎯 EventTypesScreen: State changed - loading:', loading, 'error:', error, 'eventTypes count:', eventTypes.length);
  }, [loading, error, eventTypes]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEventTypes();
  };

  const handleEventTypePress = (eventType: EventType) => {
    Alert.alert(
      eventType.title,
      `${eventType.description || 'No description'}\n\nDuration: ${eventType.length} minutes`,
      [{ text: 'OK' }]
    );
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const renderEventType = ({ item }: { item: EventType }) => (
    <TouchableOpacity 
      style={styles.eventTypeCard} 
      onPress={() => handleEventTypePress(item)}
    >
      <View style={styles.eventTypeHeader}>
        <Text style={styles.eventTypeTitle}>{item.title}</Text>
        <Text style={styles.eventTypeDuration}>{formatDuration(item.length)}</Text>
      </View>
      
      {item.description && (
        <Text style={styles.eventTypeDescription} numberOfLines={2}>
          {item.description}
        </Text>
      )}
      
      <View style={styles.eventTypeFooter}>
        <View style={styles.eventTypeInfo}>
          {item.price && item.price > 0 && (
            <Text style={styles.eventTypePrice}>
              {item.currency || '$'}{item.price}
            </Text>
          )}
          {item.requiresConfirmation && (
            <View style={styles.confirmationBadge}>
              <Text style={styles.confirmationText}>Requires Confirmation</Text>
            </View>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#000000" />
        <Text style={styles.loadingText}>Loading event types...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={64} color="#FF3B30" />
        <Text style={styles.errorTitle}>Unable to load event types</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchEventTypes}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (eventTypes.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="calendar-outline" size={64} color="#666" />
        <Text style={styles.emptyTitle}>No event types found</Text>
        <Text style={styles.emptyText}>Create your first event type in Cal.com</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={eventTypes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderEventType}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  listContainer: {
    padding: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    color: '#333',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#000000',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    color: '#333',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  eventTypeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventTypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventTypeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  eventTypeDuration: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
    backgroundColor: '#000000',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  eventTypeDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  eventTypeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventTypeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventTypePrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34C759',
  },
  confirmationBadge: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  confirmationText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#fff',
  },
});