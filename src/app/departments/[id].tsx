import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DoctorCard } from '../../components/DoctorCard';
import { DepartmentServices } from '../../components/departments/DepartmentServices';
import { Button, Card, colors, EmptyState, Icon, Notice, PageHeader, Screen, type IconName } from '../../components/ui';
import type { Doctor, ServiceType } from '../../data/types';
import { useCatalog } from '../../state/CatalogProvider';

export default function DepartmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getDepartment, getDoctor, ready, error, reload, isRemote } = useCatalog();
  const department = getDepartment(id);
  const [mode, setMode] = useState<ServiceType>('in-person');
  if (!ready || error) return <Screen>
    <PageHeader title="Chi tiết khoa" back />
    {!ready ? <Text style={s.copy}>Đang tải thông tin khoa…</Text> : <EmptyState icon="cloud-offline-outline"
      title="Chưa tải được thông tin khoa" message={error!} action={<Button title="Thử lại" onPress={reload} />} />}
  </Screen>;
  if (!department) return <Screen>
    <PageHeader title="Chi tiết khoa" back />
    <EmptyState title="Không tìm thấy khoa" message="Vui lòng chọn một khoa trong danh mục hiện có."
      action={<Button title="Xem danh mục khoa" onPress={() => router.replace('/departments')} />} />
  </Screen>;

  const isSupport = department.kind === 'support';
  const service = department.supportsOnline ? mode : 'in-person';
  const departmentDoctors = department.doctorIds.map(id => getDoctor(id))
    .filter((doctor): doctor is Doctor => Boolean(doctor))
    .filter(doctor => service === 'in-person' || doctor.supportsOnline !== false);
  return <Screen>
    <PageHeader title={department.name} back />
    <Card style={s.hero}>
      <View style={[s.icon, { backgroundColor: department.color }]}><Icon name={department.icon as IconName} size={38} /></View>
      <Text style={s.eyebrow}>{isSupport ? 'KHOA CẬN LÂM SÀNG' : 'CHUYÊN KHOA KHÁM & TƯ VẤN'}</Text>
      <Text style={s.description}>{department.description}</Text>
      <View style={s.tag}><Icon name={isSupport ? 'document-text-outline' : 'calendar-outline'} size={17} />
        <Text style={s.tagText}>{isSupport ? 'Tiếp nhận theo chỉ định' : `${departmentDoctors.length} bác sĩ${isRemote ? '' : ' minh họa'} · Đặt lịch theo giờ`}</Text>
      </View>
    </Card>
    <DepartmentServices services={department.services} />
    {isSupport ? <>
      <Card>
        <Text accessibilityRole="header" style={s.heading}>Cách tiếp nhận dịch vụ</Text>
        <Text style={s.copy}>Các dịch vụ của khoa được thực hiện theo chỉ định sau buổi khám. Bác sĩ phụ trách và bộ phận tiếp nhận sẽ hướng dẫn thời gian, nội dung chuẩn bị và nơi thực hiện.</Text>
        <Notice>{isRemote ? 'Dịch vụ cận lâm sàng được tiếp nhận theo chỉ định; chưa có đặt khung giờ riêng trên ứng dụng.' : 'Bản demo chưa cung cấp đặt khung giờ riêng cho dịch vụ cận lâm sàng.'}</Notice>
        <Button title="Tìm bác sĩ để đặt khám" icon="search-outline" onPress={() => router.push('/doctors')} />
        <Button title="Xem hướng dẫn phòng khám" variant="secondary" onPress={() => router.push('/support')} />
      </Card>
    </> : <>
      <Text accessibilityRole="header" style={s.heading}>Chọn hình thức khám</Text>
      {department.supportsOnline ? <View style={s.modes}>
        {(['in-person', 'online'] as const).map(item => <Pressable key={item} accessibilityRole="button"
          accessibilityState={{ selected: service === item }} aria-pressed={service === item}
          style={[s.mode, service === item && s.selectedMode]} onPress={() => setMode(item)}>
          <Icon name={item === 'online' ? 'videocam-outline' : 'medical-outline'} size={22} />
          <Text style={[s.modeText, service === item && s.selectedText]}>{item === 'online' ? 'Tư vấn trực tuyến' : 'Khám trực tiếp'}</Text>
        </Pressable>)}
      </View> : <Notice>Khoa này tiếp nhận khám trực tiếp{isRemote ? '.' : ' trong cấu hình demo.'}</Notice>}
      <View style={s.doctorHeading}><Text accessibilityRole="header" style={s.heading}>Bác sĩ tại khoa</Text>
        <Text style={s.doctorCount}>{departmentDoctors.length} bác sĩ</Text></View>
      {departmentDoctors.map(doctor => <DoctorCard key={doctor.id} doctor={doctor} service={service} />)}
      {!departmentDoctors.length && <EmptyState title={service === 'online' ? 'Chưa có bác sĩ tư vấn trực tuyến' : 'Đang cập nhật bác sĩ'}
        message={service === 'online' ? 'Bạn có thể chuyển sang khám trực tiếp để xem bác sĩ tại khoa.' : 'Danh sách bác sĩ của khoa chưa có trong cấu hình hiện tại.'} />}
      {!!departmentDoctors.length && <Button title="Tìm lịch theo ngày" variant="secondary" icon="calendar-outline"
        onPress={() => router.push({ pathname: '/doctors', params: { specialty: department.name, service } })} />}
    </>}
    <Text style={s.disclaimer}>{isRemote ? 'Thông tin khoa, dịch vụ và bác sĩ được cập nhật từ máy chủ phòng khám.' : 'Thông tin khoa, dịch vụ và hồ sơ bác sĩ là dữ liệu minh họa. Danh mục có thể cấu hình theo phòng khám.'}</Text>
  </Screen>;
}

const s = StyleSheet.create({
  hero: { alignItems: 'center', paddingVertical: 25 }, icon: { width: 88, height: 88, borderRadius: 27, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  eyebrow: { color: colors.teal, fontSize: 11, fontWeight: '700', letterSpacing: .7, textAlign: 'center' },
  description: { fontSize: 15, lineHeight: 24, color: colors.muted, textAlign: 'center' },
  tag: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, padding: 10, borderRadius: 12, backgroundColor: colors.mint },
  tagText: { flexShrink: 1, color: colors.teal, fontSize: 12, lineHeight: 18, fontWeight: '600', textAlign: 'center' },
  heading: { fontSize: 17, lineHeight: 24, fontWeight: '700', color: colors.ink },
  copy: { fontSize: 14, lineHeight: 23, color: colors.muted }, modes: { flexDirection: 'row', gap: 10 },
  mode: { flex: 1, minHeight: 84, alignItems: 'center', justifyContent: 'center', padding: 10, gap: 8,
    borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  selectedMode: { borderColor: '#80BAAA', backgroundColor: colors.mint },
  modeText: { fontSize: 13, fontWeight: '600', color: colors.muted, textAlign: 'center', lineHeight: 19 }, selectedText: { color: colors.teal },
  doctorHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  doctorCount: { fontSize: 13, color: colors.muted },
  disclaimer: { fontSize: 12, lineHeight: 20, color: colors.muted, textAlign: 'center' },
});
