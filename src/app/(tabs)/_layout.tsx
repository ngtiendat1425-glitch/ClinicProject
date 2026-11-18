import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, Icon } from '../../components/ui';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return <Tabs screenOptions={{
    headerShown: false, tabBarActiveTintColor: colors.teal, tabBarInactiveTintColor: colors.muted,
    tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.line, height: 70 + insets.bottom,
      paddingTop: 6, paddingBottom: Math.max(6, insets.bottom) },
    tabBarItemStyle: { paddingVertical: 2 },
    tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
  }}>
    <Tabs.Screen name="index" options={{ title: 'Trang chủ', tabBarIcon: ({ color, focused }) => <Icon name={focused ? 'home' : 'home-outline'} color={color} /> }} />
    <Tabs.Screen name="doctors" options={{ title: 'Bác sĩ', tabBarIcon: ({ color, focused }) => <Icon name={focused ? 'medkit' : 'medkit-outline'} color={color} /> }} />
    <Tabs.Screen name="appointments" options={{ title: 'Lịch hẹn', tabBarIcon: ({ color, focused }) => <Icon name={focused ? 'calendar' : 'calendar-outline'} color={color} /> }} />
    <Tabs.Screen name="profile" options={{ title: 'Cá nhân', tabBarIcon: ({ color, focused }) => <Icon name={focused ? 'person-circle' : 'person-circle-outline'} color={color} /> }} />
  </Tabs>;
}
