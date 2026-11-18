import { Link, router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../../auth/AuthProvider';
import { PasswordField } from '../../components/auth/PasswordField';
import { Button, Card, colors, Field, Icon, Notice, PageHeader, Screen } from '../../components/ui';
import { apiConfigured } from '../../services/api';

export default function RegisterScreen() {
  const { register, ready, busy, storageError } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const pending = useRef(false);
  const blocked = !ready || busy || submitting;

  async function submit() {
    if (pending.current || blocked) return;
    pending.current = true;
    setSubmitting(true);
    setError('');
    try {
      const result = await register({ name, phone, email, birthDate, password, confirmPassword, acceptedTerms });
      if (!result.ok) { setError(result.error); return; }
      setPassword('');
      setConfirmPassword('');
      router.replace('/');
    } catch {
      setError('Chưa thể tạo tài khoản. Vui lòng thử lại.');
    } finally {
      pending.current = false;
      setSubmitting(false);
    }
  }

  return (
    <Screen style={styles.screen}>
      <PageHeader title="Tạo tài khoản" subtitle="Bắt đầu hồ sơ riêng cho hành trình chăm sóc của bạn." back />
      <Card style={styles.intro}>
        <View style={styles.introIcon}><Icon name="person-add-outline" size={26} /></View>
        <View style={styles.flex}><Text style={styles.introTitle}>Hồ sơ bệnh nhân</Text><Text style={styles.introText}>{apiConfigured ? 'Tạo tài khoản để quản lý hồ sơ và lịch hẹn của bạn tại phòng khám.' : 'Đăng ký tài khoản demo lưu trên thiết bị này.'}</Text></View>
      </Card>
      <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
      <Field label="Họ và tên *" value={name} onChangeText={(value) => { setName(value); setError(''); }} autoComplete="name" autoCapitalize="words" maxLength={80} editable={!blocked} placeholder="Nhập họ tên đầy đủ" />
      <Field label="Số điện thoại *" value={phone} onChangeText={(value) => { setPhone(value); setError(''); }} keyboardType="phone-pad" autoComplete="tel" maxLength={20} editable={!blocked} placeholder="Ví dụ: 0901234567" />
      <Field label="Email (không bắt buộc)" value={email} onChangeText={(value) => { setEmail(value); setError(''); }} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" maxLength={254} editable={!blocked} placeholder="ten@example.com" />
      <Field label="Ngày sinh *" value={birthDate} onChangeText={(value) => { setBirthDate(value); setError(''); }} maxLength={10} editable={!blocked} placeholder="YYYY-MM-DD, ví dụ: 2004-06-17" />
      <Text style={styles.hint}>Nhập theo thứ tự năm-tháng-ngày. {apiConfigured ? 'Số điện thoại và email chưa được xác minh qua OTP.' : 'Số điện thoại và email chưa được xác minh trong bản demo.'}</Text>
      <Text style={styles.sectionTitle}>Thông tin đăng nhập</Text>
      <PasswordField label="Mật khẩu *" value={password} onChangeText={(value) => { setPassword(value); setError(''); }} mode="new-password" editable={!blocked} />
      <Text style={styles.hint}>{apiConfigured ? 'Dùng từ 8 đến 72 ký tự. Mật khẩu chứa chữ có dấu có thể đạt giới hạn sớm hơn.' : 'Dùng từ 8 đến 128 ký tự.'} Bạn có thể đăng nhập lại bằng số điện thoại hoặc email đã đăng ký.</Text>
      <PasswordField label="Nhập lại mật khẩu *" value={confirmPassword} onChangeText={(value) => { setConfirmPassword(value); setError(''); }} mode="new-password" editable={!blocked} onSubmitEditing={() => void submit()} />
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={apiConfigured ? 'Đồng ý tạo tài khoản và quản lý thông tin cá nhân' : 'Đồng ý sử dụng tài khoản demo với dữ liệu giả lập'}
        accessibilityState={{ checked: acceptedTerms, disabled: blocked }}
        aria-checked={acceptedTerms}
        aria-disabled={blocked}
        disabled={blocked}
        onPress={() => { setAcceptedTerms((value) => !value); setError(''); }}
        style={[styles.terms, acceptedTerms && styles.termsSelected]}
      >
        <Icon name={acceptedTerms ? 'checkbox' : 'square-outline'} size={25} color={acceptedTerms ? colors.teal : colors.muted} />
        <Text style={styles.termsText}>{apiConfigured ? 'Tôi đồng ý sử dụng thông tin đăng ký để tạo tài khoản bệnh nhân và quản lý hồ sơ, lịch hẹn trong hệ thống.' : 'Tôi hiểu đây là tài khoản demo lưu trên thiết bị và đồng ý dùng dữ liệu giả lập để trải nghiệm đồ án.'}</Text>
      </Pressable>
      {error ? <Notice tone="error">{error}</Notice> : null}
      {storageError ? <Notice tone="error">{storageError}</Notice> : null}
      <Button title="Tạo tài khoản" icon="person-add-outline" onPress={() => void submit()} loading={submitting} disabled={blocked} />
      <View style={styles.signin}>
        <Text style={styles.signinText}>Bạn đã có tài khoản?</Text>
        <Link href="/login" replace asChild><Pressable accessibilityRole="link" disabled={blocked} style={styles.linkArea}><Text style={styles.linkText}>Đăng nhập</Text></Pressable></Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { maxWidth: 480, gap: 18 },
  flex: { flex: 1 },
  intro: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.mint, gap: 13 },
  introIcon: { width: 49, height: 49, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  introTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  introText: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 4 },
  sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: '800', marginTop: 5 },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: -7 },
  terms: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, marginTop: 4 },
  termsSelected: { borderColor: '#98C7B9', backgroundColor: colors.mint },
  termsText: { flex: 1, fontSize: 12, color: colors.ink, lineHeight: 20 },
  signin: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: 5 },
  signinText: { color: colors.muted, fontSize: 13 },
  linkArea: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 5 },
  linkText: { color: colors.teal, fontSize: 13, fontWeight: '800' },
});
