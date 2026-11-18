import { Link, router } from 'expo-router';
import { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../../auth/AuthProvider';
import { PasswordField } from '../../components/auth/PasswordField';
import { Button, Card, colors, Field, Icon, Notice, PageHeader, Screen } from '../../components/ui';
import { apiConfigured, isDemoEnabled } from '../../services/api';

export default function LoginScreen() {
  const { login, enterDemo, ready, busy, storageError } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [action, setAction] = useState<'login' | 'demo' | null>(null);
  const pending = useRef(false);
  const blocked = !ready || busy || action !== null;

  async function submit(kind: 'login' | 'demo') {
    if (pending.current || blocked) return;
    pending.current = true;
    setAction(kind);
    setError('');
    try {
      const result = kind === 'login' ? await login({ identifier, password }) : await enterDemo();
      if (!result.ok) { setError(result.error); return; }
      setPassword('');
      router.replace('/');
    } catch {
      setError('Chưa thể mở tài khoản. Vui lòng thử lại.');
    } finally {
      pending.current = false;
      setAction(null);
    }
  }

  return (
    <Screen style={styles.screen}>
      <View style={styles.brand}>
        <View style={styles.mark}><Icon name="add" size={30} color={colors.white} /></View>
        <Text style={styles.brandName}>an tâm<Text style={styles.brandDot}>.</Text></Text>
      </View>
      <View style={styles.demoBadge}><Icon name={apiConfigured ? 'medical-outline' : 'flask-outline'} size={15} /><Text style={styles.demoLabel}>{apiConfigured ? 'TÀI KHOẢN PHÒNG KHÁM' : 'TÀI KHOẢN DEMO TRÊN THIẾT BỊ'}</Text></View>
      <PageHeader title="Chào bạn trở lại" subtitle="Đăng nhập để quản lý hồ sơ và lịch hẹn của bạn." />
      <Card style={styles.form}>
        <Field
          label="Số điện thoại hoặc email"
          value={identifier}
          onChangeText={(value) => { setIdentifier(value); setError(''); }}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          importantForAutofill="yes"
          editable={!blocked}
          maxLength={254}
          placeholder="Nhập số điện thoại hoặc email"
          returnKeyType="next"
        />
        <PasswordField label="Mật khẩu" value={password} onChangeText={(value) => { setPassword(value); setError(''); }} mode="current-password" editable={!blocked} onSubmitEditing={() => void submit('login')} />
        {error ? <Notice tone="error">{error}</Notice> : null}
        {storageError ? <Notice tone="error">{storageError}</Notice> : null}
        <Button title="Đăng nhập" onPress={() => void submit('login')} loading={action === 'login'} disabled={blocked} icon="arrow-forward-outline" />
      </Card>
      <View style={styles.signup}>
        <Text style={styles.secondaryText}>Bạn chưa có tài khoản?</Text>
        <Link href="/register" asChild>
          <Pressable accessibilityRole="link" disabled={blocked} style={styles.linkArea}><Text style={styles.linkText}>Đăng ký</Text></Pressable>
        </Link>
      </View>
      {isDemoEnabled ? <>
        <View style={styles.divider}><View style={styles.line} /><Text style={styles.dividerText}>hoặc khám phá trước</Text><View style={styles.line} /></View>
        <Button title="Tiếp tục trải nghiệm" variant="secondary" icon="leaf-outline" onPress={() => void submit('demo')} loading={action === 'demo'} disabled={blocked} />
        <Text style={styles.exploreText}>Xem dữ liệu minh họa và thử quy trình đặt lịch với hồ sơ demo có sẵn.</Text>
      </> : null}
      <Notice>{apiConfigured
        ? Platform.OS === 'web' ? 'Hồ sơ và lịch hẹn được quản lý trong tài khoản của bạn. Trên trình duyệt, vui lòng đăng nhập lại sau khi tải lại hoặc đóng trang.' : 'Đăng nhập tài khoản để truy cập hồ sơ riêng và theo dõi lịch hẹn với phòng khám.'
        : 'Tài khoản chỉ hoạt động trên thiết bị này. Hãy sử dụng thông tin giả lập khi trải nghiệm đồ án.'}</Notice>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { maxWidth: 480, paddingTop: 35, gap: 20 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 5 },
  mark: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.teal },
  brandName: { color: colors.ink, fontSize: 29, fontWeight: '800', letterSpacing: -1 },
  brandDot: { color: colors.teal },
  demoBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', maxWidth: '100%', backgroundColor: colors.mint, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10 },
  demoLabel: { color: colors.teal, fontSize: 12, fontWeight: '800', letterSpacing: 0.3, flexShrink: 1 },
  form: { gap: 20, padding: 20 },
  signup: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, flexWrap: 'wrap' },
  secondaryText: { color: colors.muted, fontSize: 13 },
  linkArea: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 5 },
  linkText: { color: colors.teal, fontSize: 13, fontWeight: '800' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  line: { flex: 1, height: 1, backgroundColor: colors.line },
  dividerText: { color: colors.muted, fontSize: 12 },
  exploreText: { color: colors.muted, fontSize: 12, lineHeight: 20, textAlign: 'center', marginTop: -7 },
});
