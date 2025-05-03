// app/components/Test/TestCalendar.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styles } from '../../styles/TestStyles';

interface DayItem {
  day: string;
  date: number;
  selected?: boolean;
}

interface TestCalendarProps {
  calendarDays: DayItem[];
  selectedDate: number;
  setSelectedDate: (date: number) => void;
}

const TestCalendar: React.FC<TestCalendarProps> = ({ 
  calendarDays, 
  selectedDate, 
  setSelectedDate 
}) => {
  return (
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
  );
};

export default TestCalendar;