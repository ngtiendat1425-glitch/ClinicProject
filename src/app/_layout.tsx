import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ClinicProvider, useClinic } from '../state/ClinicProvider';
import { Button, colors } from '../components/ui';
import { AuthProvider, useAuth } from '../auth/AuthProvider';
import { RecordsProvider, useRecords } from '../records/RecordsProvider';
import { RemoteClinicProvider } from '../state/RemoteClinicProvider';
import { apiConfigured } from '../services/api';
import { CatalogProvider, useCatalog } from '../state/CatalogProvider';

function Navigation() {
  const { ready, storageError } = useClinic();
  const records = useRecords();
  const catalog = useCatalog();
  const { account } = useAuth();
  if (!ready || !records.ready || !catalog.ready) return <View style={styles.loading}>
    <ActivityIndicator size="large" color={colors.teal} />
    <Text style={styles.loadingText}>Đang mở hồ sơ của bạn…</Text>
  </View>;
  if (account && catalog.error) return <View style={styles.loading}>
    <Text style={styles.errorText}>{catalog.error}</Text><Button title="Tải lại danh mục" onPress={catalog.reload} />
  </View>;
  return <View style={styles.container}>
    {!!(storageError || records.storageError) && <View accessibilityLiveRegion="polite" style={styles.error}>
      <Text style={styles.errorText}>{storageError || records.storageError}</Text>
    </View>}
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}>
      <Stack.Protected guard={!account} redirectTo="/">
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={!!account} redirectTo="/login">
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="doctor/[id]" />
        <Stack.Screen name="book/[id]" />
        <Stack.Screen name="appointment/[id]" />
        <Stack.Screen name="consultation/[id]" />
        <Stack.Screen name="departments/index" />
        <Stack.Screen name="departments/[id]" />
        <Stack.Screen name="profile-edit" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="history" />
        <Stack.Screen name="insurance" />
        <Stack.Screen name="health-certificates/index" />
        <Stack.Screen name="health-certificates/new" />
        <Stack.Screen name="health-certificates/[id]" />
      </Stack.Protected>
      <Stack.Screen name="support" />
      <Stack.Screen name="+not-found" />
    </Stack>
  </View>;
}

export default function RootLayout() {
  return <SafeAreaProvider><AuthProvider><StatusBar style="dark" /><SessionData /></AuthProvider></SafeAreaProvider>;
}

function SessionData() {
  const { ready, account, isDemo } = useAuth();
  if (!ready) return <View style={styles.loading}><ActivityIndicator size="large" color={colors.teal} /></View>;
  const content = <RecordsProvider key={account?.id ?? 'signed-out'} accountId={account?.id ?? 'signed-out'} enabled={!!account} isDemo={isDemo}>
    <Navigation />
  </RecordsProvider>;
  const patientData = apiConfigured && account && !isDemo ? <RemoteClinicProvider key={account.id} initialPatient={account.patient}>{content}</RemoteClinicProvider>
    : <ClinicProvider key={account?.id ?? 'signed-out'} accountId={account?.id ?? 'signed-out'} initialPatient={account?.patient}
      enabled={!!account} isDemo={isDemo}>{content}</ClinicProvider>;
  return <CatalogProvider key={account?.id ?? 'signed-out'} enabled={!!account} remote={apiConfigured && !isDemo}>{patientData}</CatalogProvider>;
}
const styles = StyleSheet.create({
  container: { flex: 1 }, loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas, gap: 16 },
  loadingText: { color: colors.teal, fontSize: 14 }, error: { backgroundColor: '#FCEDEB', padding: 12 },
  errorText: { color: colors.red, fontSize: 13, textAlign: 'center' },
});
