import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { InsuranceCard, InsuranceInput } from '../../records/types';
import { useRecords } from '../../records/RecordsProvider';
import { useClinic } from '../../state/ClinicProvider';
import { Button, colors, Field, Notice } from '../ui';
import { AttachmentField, useAttachmentDraft } from './AttachmentField';

export function InsuranceEditor({ card, onClose, onSaved }: { card: InsuranceCard | null; onClose: () => void; onSaved: () => void }) {
  const { patient } = useClinic();
  const { saveInsurance } = useRecords();
  const [input, setInput] = useState<Omit<InsuranceInput, 'attachment'>>({
    number: card?.number ?? '', holderName: card?.holderName ?? patient.name,
    birthDate: card?.birthDate ?? patient.birthDate, registrationPlace: card?.registrationPlace ?? '',
    validFrom: card?.validFrom ?? '', validTo: card?.validTo ?? '',
  });
  const draft = useAttachmentDraft(card?.attachment);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  function change(field: keyof typeof input, value: string) { setInput(current => ({ ...current, [field]: value })); setError(''); }
  async function save() {
    if (busy) return;
    setBusy(true);
    draft.beginSave();
    const result = await saveInsurance({ ...input, attachment: draft.attachment });
    draft.finishSave(result.ok);
    setBusy(false);
    if (!result.ok) { setError(result.error); return; }
    onSaved();
  }
  return <View style={styles.form}>
    <Field label="Mã số BHYT *" value={input.number} onChangeText={value => change('number', value)} autoCapitalize="characters" autoCorrect={false} maxLength={20} placeholder="10 chữ số hoặc mã cũ 15 ký tự" />
    <Text style={styles.hint}>Chấp nhận mã 10 chữ số hoặc mã cũ gồm 2 chữ cái và 13 chữ số. Chỉ kiểm tra định dạng; chưa tra cứu BHXH.</Text>
    <Field label="Họ tên trên thẻ *" value={input.holderName} onChangeText={value => change('holderName', value)} maxLength={100} autoCapitalize="words" />
    <Field label="Ngày sinh * (YYYY-MM-DD)" value={input.birthDate} onChangeText={value => change('birthDate', value)} placeholder="2003-05-20" maxLength={10} autoCorrect={false} />
    <Field label="Nơi đăng ký khám ban đầu *" value={input.registrationPlace} onChangeText={value => change('registrationPlace', value)} placeholder="Tên cơ sở khám ghi trên thẻ" maxLength={200} />
    <Field label="Có giá trị từ * (YYYY-MM-DD)" value={input.validFrom} onChangeText={value => change('validFrom', value)} placeholder="2026-01-01" maxLength={10} autoCorrect={false} />
    <Field label="Có giá trị đến * (YYYY-MM-DD)" value={input.validTo} onChangeText={value => change('validTo', value)} placeholder="2026-12-31" maxLength={10} autoCorrect={false} />
    <AttachmentField value={draft.attachment} onChange={draft.change} />
    {error ? <Notice tone="error">{error}</Notice> : null}
    <Button title="Lưu thông tin BHYT" icon="save-outline" onPress={() => { void save(); }} loading={busy} />
    <Button title="Hủy chỉnh sửa" variant="secondary" onPress={onClose} disabled={busy} />
  </View>;
}
const styles = StyleSheet.create({ form: { gap: 17 }, hint: { color: colors.muted, fontSize: 12, lineHeight: 19 } });
