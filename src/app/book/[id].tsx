import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BookingReview } from '../../components/booking/BookingReview';
import { BookingInsurance } from '../../components/booking/BookingInsurance';
import { HealthCheckPurposePicker } from '../../components/booking/HealthCheckPurposePicker';
import { BookingSchedule, ServicePicker } from '../../components/booking/BookingSchedule';
import { Avatar, Button, Card, colors, EmptyState, Field, Icon, Notice, PageHeader, Screen } from '../../components/ui';
import { bookingDays, formatMoney, getAvailableTimes, validateBooking, type HealthCheckPurpose, type ServiceType } from '../../data/clinic';
import { useCatalog } from '../../state/CatalogProvider';
import { useNow } from '../../hooks/useNow';
import { useClinic } from '../../state/ClinicProvider';
import { useRecords } from '../../records/RecordsProvider';
import { useAvailableTimes } from '../../hooks/useAvailableTimes';

export default function BookingScreen() {
  const params = useLocalSearchParams<{ id: string; service?: string; date?: string; purpose?: HealthCheckPurpose }>();
  const { getDoctor, isRemote } = useCatalog();
  const doctor = getDoctor(Array.isArray(params.id) ? params.id[0] : params.id);
  const { patient, appointments, bookAppointment, ready } = useClinic();
  const { insurance } = useRecords();
  const [attachInsurance, setAttachInsurance] = useState(false);
  const [purpose, setPurpose] = useState<HealthCheckPurpose>(['employment', 'study', 'driving', 'other'].includes(params.purpose ?? '') ? params.purpose! : 'employment');
  const days = useMemo(() => bookingDays(14), []);
  const [date, setDate] = useState(days.find((day) => day.date === params.date)?.date ?? days[0]?.date ?? '');
  const [service, setService] = useState<ServiceType>(params.service === 'online' && doctor?.supportsOnline !== false ? 'online' : 'in-person');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const clock = useNow();
  const submitted = useRef(false);
  const availability = useAvailableTimes(doctor?.id ?? '', date, service, appointments, clock);
  const slots = availability.slots;
  const insuranceSnapshot = attachInsurance && insurance ? { cardId: insurance.id, number: insurance.number, holderName: insurance.holderName,
    registrationPlace: insurance.registrationPlace, validFrom: insurance.validFrom, validTo: insurance.validTo, verification: 'unverified' as const } : undefined;

  const selectedTime = slots.includes(time) ? time : '';
  const showingReview = reviewing && !!selectedTime;
  const slotUnavailable = !!time && !selectedTime;

  if (!doctor) {
    return <Screen><PageHeader title="Đặt lịch khám" back /><EmptyState icon="calendar-outline" title="Không tìm thấy bác sĩ" message="Hồ sơ này không còn khả dụng. Hãy chọn bác sĩ khác để đặt lịch." action={<Button title="Tìm bác sĩ" onPress={() => router.replace('/doctors')} />} /></Screen>;
  }

  const fee = service === 'online' ? Math.round(doctor.fee * 0.8) : doctor.fee;
  const duration = service === 'online' ? 20 : doctor.durationMinutes;

  function review() {
    if (!date || !selectedTime) { setError('Bạn cần chọn ngày và khung giờ khám.'); return; }
    if (!reason.trim() || reason.trim().length < 5) { setError('Vui lòng mô tả lý do khám ít nhất 5 ký tự.'); return; }
    const invalid = !isRemote && validateBooking({ doctorId: doctor!.id, service, date, time, reason, insurance: insuranceSnapshot,
      ...(doctor!.id === '20' ? { healthCheckPurpose: purpose } : {}) }, appointments);
    if (invalid) { setError(invalid); return; }
    if (!isRemote && !getAvailableTimes(doctor!.id, date, service, appointments).includes(time)) {
      setTime(''); setError('Khung giờ này không còn khả dụng. Vui lòng chọn giờ khác.'); return;
    }
    setError('');
    setReviewing(true);
  }

  async function submit() {
    if (submitted.current || !doctor) return;
    submitted.current = true;
    setSubmitting(true);
    const result = await bookAppointment({ doctorId: doctor.id, service, date, time, reason: reason.trim(), insurance: insuranceSnapshot,
      ...(doctor.id === '20' ? { healthCheckPurpose: purpose } : {}) });
    if (!result.ok) {
      submitted.current = false;
      setSubmitting(false);
      setError(result.error);
      setReviewing(false);
      setTime('');
      return;
    }
    if (result.id) router.replace({ pathname: '/appointment/[id]', params: { id: result.id, success: '1' } });
    else router.replace('/appointments');
  }

  return (
      <Screen>
        <PageHeader title={showingReview ? 'Kiểm tra lịch hẹn' : 'Đặt lịch khám'} subtitle={showingReview ? 'Xem lại thông tin trước khi gửi yêu cầu' : 'Chọn thời gian phù hợp với bạn'} back />
        <View style={styles.progress}>
          <View style={styles.step}><View style={styles.stepCircle}><Text style={styles.stepNumber}>{showingReview ? '✓' : '1'}</Text></View><Text style={styles.stepLabel}>Thông tin khám</Text></View>
          <View style={styles.progressLine} />
          <View style={styles.step}><View style={[styles.stepCircle, !showingReview && styles.inactiveStep]}><Text style={[styles.stepNumber, !showingReview && styles.inactiveNumber]}>2</Text></View><Text style={[styles.stepLabel, !showingReview && styles.inactiveLabel]}>Xác nhận</Text></View>
        </View>

        <Card style={styles.doctorCard}>
          <Avatar doctor={doctor} size={58} />
          <View style={styles.flex}><Text style={styles.doctorName}>{doctor.title} {doctor.name}</Text><Text style={styles.doctorSpecialty}>{doctor.specialty}</Text><Text style={styles.meta}>{doctor.experience} năm kinh nghiệm</Text></View>
        </Card>

        {showingReview ? (
          <BookingReview patientName={patient.name} service={service} date={date} time={time} duration={duration} reason={reason} />
        ) : (
          <>
            <ServicePicker doctor={doctor} value={service} onChange={(value) => { setService(value); setTime(''); setError(''); setReviewing(false); }} />
            {doctor.id === '20' && <HealthCheckPurposePicker value={purpose} onChange={setPurpose} />}
            {availability.loading && <Notice>Đang kiểm tra lịch trống từ máy chủ…</Notice>}
            {availability.error && <Notice tone="error">{availability.error}</Notice>}
            <BookingSchedule days={days} date={date} time={selectedTime} slots={slots}
              onDateChange={(value) => { setDate(value); setTime(''); setError(''); setReviewing(false); }}
              onTimeChange={(value) => { setTime(value); setError(''); setReviewing(false); }} />

            <Card style={styles.section}>
              <View style={styles.patientHeading}><Icon name="person-outline" size={19} color={colors.teal} /><Text style={styles.sectionTitle}>Người khám</Text></View>
              <Text style={styles.patientName}>{patient.name}</Text><Text style={styles.meta}>{patient.phone || 'Chưa có số điện thoại'}</Text>
              <Pressable accessibilityRole="button" style={styles.editProfile} onPress={() => router.push('/profile-edit')}><Text style={styles.editLabel}>Cập nhật hồ sơ</Text><Icon name="chevron-forward" size={15} color={colors.teal} /></Pressable>
            </Card>
            <BookingInsurance selected={attachInsurance && !!insurance} onChange={setAttachInsurance} />
            <View style={styles.section}>
              <Field label="4. Lý do khám *" placeholder="Mô tả vấn đề bạn muốn trao đổi với bác sĩ…" multiline numberOfLines={4} maxLength={1000} value={reason} onChangeText={(value) => { setReason(value); setError(''); }} style={styles.reasonInput} textAlignVertical="top" />
              <Text style={styles.counter}>{reason.length}/1000 ký tự</Text>
            </View>
          </>
        )}

        {error || slotUnavailable ? <Notice tone="error">{error || 'Khung giờ vừa chọn không còn khả dụng. Vui lòng chọn giờ khác.'}</Notice> : null}
        <View style={styles.total}><View><Text style={styles.meta}>Phí dịch vụ dự kiến</Text><Text style={styles.price}>{formatMoney(fee)}</Text></View><Text style={styles.duration}>{duration} phút / buổi</Text></View>
        {showingReview && insuranceSnapshot && <Notice>Đính kèm BHYT •••• {insuranceSnapshot.number.slice(-4)} — chưa xác minh, phí chưa trừ BHYT.</Notice>}
        <Button title={showingReview ? 'Gửi yêu cầu đặt lịch' : 'Tiếp tục'} icon={showingReview ? 'checkmark-circle-outline' : 'arrow-forward'} onPress={() => showingReview ? void submit() : review()} loading={submitting} disabled={!ready || submitting || availability.loading} />
        {showingReview ? <View style={styles.editButton}><Button title="Chỉnh sửa thông tin" variant="secondary" onPress={() => { setReviewing(false); setError(''); }} disabled={submitting} /></View> : null}
        <Text style={styles.footerNote}>Chưa thu phí trên ứng dụng. Lịch hẹn có hiệu lực sau khi được xác nhận.</Text>
      </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  progress: { flexDirection: 'row', alignItems: 'center', marginBottom: 22, gap: 10 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepCircle: { width: 27, height: 27, borderRadius: 14, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' },
  stepNumber: { fontSize: 13, color: colors.white, fontWeight: '800' },
  stepLabel: { fontSize: 12, fontWeight: '700', color: colors.teal },
  inactiveStep: { backgroundColor: colors.line }, inactiveNumber: { color: colors.muted }, inactiveLabel: { color: colors.muted },
  progressLine: { flex: 1, height: 1, backgroundColor: colors.line },
  doctorCard: { flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 24 },
  doctorName: { fontSize: 16, fontWeight: '800', color: colors.ink }, doctorSpecialty: { fontSize: 13, fontWeight: '600', color: colors.teal, marginTop: 4 },
  meta: { fontSize: 12, color: colors.muted, marginTop: 4, lineHeight: 18 },
  section: { marginBottom: 24 }, sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.ink },
  patientHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }, patientName: { fontSize: 15, fontWeight: '700', color: colors.ink },
  editProfile: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', minHeight: 44, gap: 4 }, editLabel: { fontSize: 12, fontWeight: '700', color: colors.teal },
  reasonInput: { minHeight: 114 }, counter: { color: colors.muted, fontSize: 12, textAlign: 'right', marginTop: 7 },
  total: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 18, paddingTop: 15, borderTopWidth: 1, borderTopColor: colors.line, gap: 10 }, price: { fontSize: 24, fontWeight: '800', color: colors.ink, marginTop: 3 }, duration: { fontSize: 12, color: colors.muted },
  editButton: { marginTop: 10 }, footerNote: { color: colors.muted, fontSize: 12, lineHeight: 19, textAlign: 'center', marginTop: 14, marginBottom: 8 },
});
