import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7f9',
  },
  headerText: {
    fontSize: 36,
    fontWeight: 'bold',
    marginTop: 50,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 15,
    backgroundColor: '#eaecef',
    overflow: 'hidden',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTabButton: {
    backgroundColor: 'white',
    borderRadius: 15,
  },
  tabText: {
    fontSize: 16,
    color: '#8e8e93',
  },
  activeTabText: {
    color: '#000',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  reactionSection: {
    backgroundColor: 'white',
    borderRadius: 15,
    marginBottom: 20,
    overflow: 'hidden',
  },
  reactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  reactionIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 10,
  },
  criticIndicator: {
    backgroundColor: '#ff3b30',
  },
  sensitivIndicator: {
    backgroundColor: '#ffcc00',
  },
  reactionType: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  foodImagePlaceholder: {
    width: 55,
    height: 55,
    borderRadius: 10,
    backgroundColor: '#f5f5f7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  foodEmoji: {
    fontSize: 28,
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  foodCategory: {
    fontSize: 16,
    color: '#8e8e93',
  },
  arrowIcon: {
    fontSize: 24,
    color: '#c7c7cc',
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    height: 70,
    paddingBottom: 20,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: 20,
    color: '#8e8e93',
    marginBottom: 2,
  },
  activeTabIcon: {
    color: '#007aff',
  },
  tabItemText: {
    fontSize: 12,
    color: '#8e8e93',
  },
  activeTabItemText: {
    color: '#007aff',
  },
});