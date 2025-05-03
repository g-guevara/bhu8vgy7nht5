// app/screens/TestScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { styles } from '../styles/TestStyles';
import { ApiService } from '../services/api';
import { useToast } from '../utils/ToastContext';
import { sampleProducts } from '../data/productData';

interface DayItem {
  day: string;
  date: number;
  selected?: boolean;
}

interface TestItem {
  _id: string;
  userID: string;
  itemID: string;
  startDate: string;
  finishDate: string;
  completed: boolean;
  result: 'Critic' | 'Sensitive' | 'Safe' | null;
}

interface HistoryItem {
  date: string;
  name: string;
  status: 'Critic' | 'Safe';
  notes?: string;
}

export default function TestScreen() {
  const [selectedDate, setSelectedDate] = useState(16);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTests, setActiveTests] = useState<TestItem[]>([]);
  const { showToast } = useToast();

  // Datos de ejemplo para el calendario
  const calendarDays: DayItem[] = [
    { day: 'Sun', date: 10 },
    { day: 'Mon', date: 11 },
    { day: 'Tue', date: 12 },
    { day: 'Wed', date: 13 },
    { day: 'Thu', date: 14 },
    { day: 'Fri', date: 15 },
    { day: 'Sat', date: 16, selected: true },
  ];

  // Datos de ejemplo para el historial
  const historyItems: HistoryItem[] = [
    {
      date: '3 Jun 2024',
      name: 'Milk',
      status: 'Critic',
      notes: 'without notes',
    },
    {
      date: '12 Oct 2024',
      name: 'Blueberry',
      status: 'Safe',
      notes: 'Nota sobre el ítem uno un ouno. uno uno uno uno uno. un oun ou. no uosdfijasldf alsfidifj...',
    },
  ];

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    setLoading(true);
    try {
      const tests = await ApiService.getTests();
      // Only show tests that are not completed
      const active = tests.filter((test: TestItem) => !test.completed);
      setActiveTests(active);
    } catch (error: any) {
      console.error('Error fetching tests:', error);
      showToast('Failed to load tests', 'error');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTests();
    setRefreshing(false);
  };

  const handleFinishTest = async (testId: string) => {
    try {
      await ApiService.completeTest(testId, null);
      showToast('Test completed successfully', 'success');
      // Refresh the test list
      fetchTests();
    } catch (error: any) {
      console.error('Error completing test:', error);
      showToast('Failed to complete test', 'error');
    }
  };

  const formatRemainingTime = (test: TestItem) => {
    const now = new Date();
    const finishDate = new Date(test.finishDate);
    const diffTime = finishDate.getTime() - now.getTime();
    
    if (diffTime <= 0) return '0 days, 0 hours';
    
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    return `${diffDays} days, ${diffHours} hours`;
  };

  const getProductName = (productId: string) => {
    // Look up the product name from the sampleProducts array
    const product = sampleProducts.find(p => p.code === productId);
    
    if (product) {
      return product.product_name;
    }
    
    // Fallback if product not found
    return `Product ${productId.substring(0, 8)}...`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.headerText}>Test</Text>

        {/* Calendar */}
        <View style={styles.calendarContainer}>
          {calendarDays.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.dayItem}
              onPress={() => setSelectedDate(item.date)}
            >
              <Text style={styles.dayText}>{item.day}</Text>
              {item.date === selectedDate ? (
                <View style={styles.dateCircle}>
                  <Text style={[styles.dateText, styles.selectedDateText]}>
                    {item.date}
                  </Text>
                </View>
              ) : (
                <Text style={styles.dateText}>{item.date}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Active Tests Section */}
        <Text style={styles.sectionTitle}>Current tests</Text>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : activeTests.length > 0 ? (
          activeTests.map((test, index) => (
            <View key={test._id} style={styles.currentTestContainer}>
              <Text style={styles.currentTestTitle}>
                Finish on {new Date(test.finishDate).toLocaleDateString()}
              </Text>
              <Text style={styles.currentTestSubtitle}>
                {formatRemainingTime(test)} remain
              </Text>
              <Text style={styles.productName}>
                Product: {getProductName(test.itemID)}
              </Text>
              <TouchableOpacity 
                style={styles.finishButton}
                onPress={() => handleFinishTest(test._id)}
              >
                <Text style={styles.finishButtonText}>Finish →</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No active tests</Text>
            <Text style={styles.emptySubtext}>
              Start a test from a product page
            </Text>
          </View>
        )}

        {/* History */}
        <View style={styles.historyContainer}>
          <Text style={[styles.sectionTitle, { marginTop: 0 }]}>History</Text>
          {historyItems.map((item, index) => (
            <View key={index} style={styles.historyItem}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyDate}>{item.date}</Text>
                <Text style={[
                  styles.historyStatus,
                  item.status === 'Critic' ? styles.criticStatus : styles.safeStatus
                ]}>
                  {item.status}
                </Text>
              </View>
              <Text style={styles.historyItemName}>{item.name}</Text>
              {item.notes && (
                <Text style={styles.historyNotes}>{item.notes}</Text>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}