// app/screens/TestScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { styles } from '../styles/TestStyles';
import { ApiService } from '../services/api';
import { useToast } from '../utils/ToastContext';
import TestCalendar from '../components/Test/TestCalendar';
import TestItem from '../components/Test/TestItem';

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
  const calendarDays = [
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.headerText}>Test</Text>

        {/* Calendar Component */}
        <TestCalendar 
          calendarDays={calendarDays}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
        />

        {/* Active Tests Section */}
        <Text style={styles.sectionTitle}>Current tests</Text>
        
        <TestItem 
          activeTests={activeTests}
          loading={loading}
          handleFinishTest={handleFinishTest}
        />

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