import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerText: {
    fontSize: 36,
    fontWeight: 'bold',
    marginTop: 50,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  calendarContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E5E5',
    paddingVertical: 10,
  },
  dayItem: {
    alignItems: 'center',
    padding: 5,
  },
  dayText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  dateCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedDateText: {
    color: '#fff',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  currentTestContainer: {
    backgroundColor: '#E8F0FF',
    marginHorizontal: 20,
    marginBottom: 30,
    borderRadius: 15,
    padding: 20,
  },
  currentTestTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  currentTestSubtitle: {
    fontSize: 16,
    color: '#444',
    marginBottom: 8,
  },
  productName: {
    fontSize: 14,
    color: '#666',
  },
  finishButton: {
    position: 'absolute',
    right: 20,
    top: 20,
    bottom: 20,
    justifyContent: 'center',
  },
  finishButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  historyItem: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyDate: {
    fontSize: 14,
    color: '#666',
  },
  historyItemName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  historyStatus: {
    fontSize: 16,
    fontWeight: '500',
  },
  criticStatus: {
    color: '#FF3B30',
  },
  safeStatus: {
    color: '#34C759',
  },
  historyNotes: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  historyContainer: {
    backgroundColor: '#F5F5F7',
    paddingTop: 20,
    paddingBottom: 20,
    marginTop: 10,
  },
  scrollView: {
    flex: 1,
  },
});