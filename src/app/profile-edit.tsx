import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, colors, Field, Icon, Notice, PageHeader, Screen } from '../components/ui';
import { type Patient } from '../data/clinic';
import { useClinic } from '../state/ClinicProvider';

export default function ProfileEditScreen() {
  const { patient, updatePatient } = useClinic();
  const [draft, setDraft] = useState<Patient>({ ...patient });
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const change = (key: keyof Patient, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setSaved(false);
    setError('');
  };
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (saving) return;
    setSaving(true);
    const result = await updatePatient(draft);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError('');
    setSaved(true);
  };

  return (
    <Screen>
      <PageHeader title="Thông tin cá nhân" subtitle="Cập nhật hồ sơ để chuẩn bị cho buổi khám" back />
      <Card style={styles.intro}>
        <View style={styles.icon}><Icon name="person-outline" size={25} color={colors.teal} /></View>
        <View style={styles.flex}><Text style={styles.introTitle}>Hồ sơ của chính bạn</Text><Text style={styles.introCopy}>Thông tin được dùng cho các lịch hẹn trong ứng dụng.</Text></View>
      </Card>
      <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>
      <Field label="Họ và tên *" value={draft.name} onChangeText={(value) => change('name', value)} autoComplete="name" maxLength={80} placeholder="Nhập họ tên đầy đủ" />
      <Field label="Số điện thoại *" value={draft.phone} onChangeText={(value) => change('phone', value)} keyboardType="phone-pad" autoComplete="tel" maxLength={15} placeholder="Số điện thoại liên hệ" />
      <Field label="Email" value={draft.email} onChangeText={(value) => change('email', value)} keyboardType="email-address" autoCapitalize="none" autoComplete="email" maxLength={150} placeholder="ten@example.com" />
      <Field label="Ngày sinh *" value={draft.birthDate} onChangeText={(value) => change('birthDate', value)} autoCapitalize="none" maxLength={10} placeholder="YYYY-MM-DD, ví dụ: 2004-06-17" />
      <Text style={styles.dateHint}>Nhập theo thứ tự năm-tháng-ngày.</Text>
      <Text style={styles.fieldLabel}>Giới tính</Text>
      <View style={styles.genderRow}>
        {['Nam', 'Nữ', 'Khác', 'Chưa cung cấp'].map((gender) => (
          <Pressable key={gender} accessibilityRole="radio" accessibilityState={{ checked: draft.gender === gender }} aria-checked={draft.gender === gender} onPress={() => change('gender', gender)} style={[styles.gender, draft.gender === gender && styles.genderSelected]}>
            <Text style={[styles.genderLabel, draft.gender === gender && styles.genderLabelSelected]}>{gender}</Text>
            {draft.gender === gender ? <Icon name="checkmark-circle" size={17} color={colors.teal} /> : null}
          </Pressable>
        ))}
      </View>
      <Field label="Địa chỉ" value={draft.address} onChangeText={(value) => change('address', value)} multiline maxLength={300} placeholder="Nhập địa chỉ hiện tại" />
      <Text style={styles.sectionTitle}>Thông tin trước khám</Text>
      <Field label="Dị ứng hoặc lưu ý sức khỏe" value={draft.allergies} onChangeText={(value) => change('allergies', value)} multiline maxLength={500} placeholder="Thông tin bạn muốn bác sĩ lưu ý" />
      <Text style={styles.hint}>Bạn có thể bổ sung thông tin này trước mỗi buổi khám.</Text>
      {error ? <Notice tone="error">{error}</Notice> : null}
      {saved ? <View accessibilityLiveRegion="polite"><Notice>Đã lưu thông tin cá nhân của bạn.</Notice></View> : null}
      <View style={styles.actions}>
        <Button title="Lưu thay đổi" onPress={() => void save()} loading={saving} icon="checkmark-outline" />
        {saved ? <Button title="Trở về hồ sơ" onPress={() => router.back()} variant="secondary" /> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  intro: { flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 4, backgroundColor: colors.mint },
  icon: { width: 49, height: 49, borderRadius: 16, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  introTitle: { fontSize: 14, fontWeight: '800', color: colors.ink },
  introCopy: { fontSize: 12, color: colors.muted, lineHeight: 19, marginTop: 4 },
  sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: '800', marginTop: 22, marginBottom: 16 },
  fieldLabel: { fontSize: 13, color: colors.ink, fontWeight: '700', marginBottom: 10 },
  dateHint: { fontSize: 12, color: colors.muted, marginTop: -5, marginBottom: 18 },
  genderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  gender: { flexGrow: 1, flexBasis: '45%', minHeight: 47, borderWidth: 1, borderColor: colors.line, borderRadius: 12, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  genderSelected: { backgroundColor: colors.mint, borderColor: colors.teal },
  genderLabel: { fontSize: 13, color: colors.muted, fontWeight: '600' },
  genderLabelSelected: { color: colors.teal },
  hint: { fontSize: 12, color: colors.muted, lineHeight: 19, marginTop: -4, marginBottom: 20 },
  actions: { gap: 10, marginTop: 12, marginBottom: 12 },
});
