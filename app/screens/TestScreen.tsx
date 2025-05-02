import React, { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { styles } from '../styles/TestStyles';

interface DayItem {
  day: string;
  date: number;
  selected?: boolean;
}

interface HistoryItem {
  date: string;
  name: string;
  status: 'Critic' | 'Safe';
  notes?: string;
}

export default function TestScreen() {
  const [selectedDate, setSelectedDate] = useState(16);

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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
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

        {/* Current Test */}
        <Text style={styles.sectionTitle}>Current test</Text>
        <View style={styles.currentTestContainer}>
          <Text style={styles.currentTestTitle}>Finish in 19 of February</Text>
          <Text style={styles.currentTestSubtitle}>2 days, 23 hours remain</Text>
          <Text style={styles.productName}>Product: Peanut</Text>
          <TouchableOpacity style={styles.finishButton}>
            <Text style={styles.finishButtonText}>Finish →</Text>
          </TouchableOpacity>
        </View>

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