import type { AppointmentStatus, Doctor, ServiceType } from './types';
import { departments } from './departments';

type DemoDoctorInput = Pick<Doctor, 'id' | 'name' | 'specialty' | 'experience' | 'fee' | 'initials' | 'color'> & {
  supportsOnline: boolean;
};

function demoDoctor(input: DemoDoctorInput): Doctor {
  return {
    ...input, title: 'BS.', rating: 4.8, reviewCount: 48, durationMinutes: 30,
    bio: `Hồ sơ bác sĩ ${input.specialty} minh họa. Bạn có thể xem dịch vụ, chọn thời gian và gửi yêu cầu đặt lịch trong bản trải nghiệm.`,
    education: [`Thông tin chuyên môn ${input.specialty} minh họa cho đồ án`],
    languages: ['Tiếng Việt'],
  };
}

// All names, qualifications, ratings and encounters are illustrative demo data.
export const doctors: Doctor[] = [
  {
    id: '1', name: 'Nguyễn Minh Anh', title: 'BS. CKI', specialty: 'Tim mạch',
    experience: 12, rating: 4.9, reviewCount: 128, fee: 250000, durationMinutes: 30,
    initials: 'MA', color: '#DDEFEA',
    bio: 'Đồng hành cùng bạn trong việc theo dõi sức khỏe tim mạch. Bác sĩ chú trọng lắng nghe, giải thích dễ hiểu và xây dựng kế hoạch theo dõi phù hợp với từng người.',
    education: ['Bác sĩ chuyên khoa I – Tim mạch', '12 năm kinh nghiệm khám và theo dõi ngoại trú'],
    languages: ['Tiếng Việt', 'Tiếng Anh'],
  },
  {
    id: '2', name: 'Trần Hoàng Nam', title: 'BS. CKI', specialty: 'Nhi khoa',
    experience: 9, rating: 4.8, reviewCount: 96, fee: 200000, durationMinutes: 30,
    initials: 'HN', color: '#FCE9D9',
    bio: 'Quan tâm đến sức khỏe và sự phát triển của trẻ. Phong cách thăm khám nhẹ nhàng, dành thời gian giải đáp thắc mắc và hướng dẫn chăm sóc sau buổi khám.',
    education: ['Bác sĩ chuyên khoa I – Nhi khoa', '9 năm kinh nghiệm chăm sóc sức khỏe trẻ em'],
    languages: ['Tiếng Việt'],
  },
  {
    id: '3', name: 'Lê Thu Hà', title: 'ThS. BS', specialty: 'Da liễu',
    experience: 8, rating: 4.9, reviewCount: 112, fee: 220000, durationMinutes: 30,
    initials: 'TH', color: '#E9E4F6',
    bio: 'Tư vấn và thăm khám các vấn đề về da với cách tiếp cận gần gũi, rõ ràng. Hướng dẫn chăm sóc phù hợp với tình trạng và thói quen sinh hoạt của bạn.',
    education: ['Thạc sĩ – Da liễu', '8 năm kinh nghiệm khám và tư vấn da liễu'],
    languages: ['Tiếng Việt', 'Tiếng Anh'],
  },
  {
    id: '4', name: 'Phạm Quang Huy', title: 'BS. CKI', specialty: 'Nội tổng quát',
    experience: 10, rating: 4.8, reviewCount: 87, fee: 200000, durationMinutes: 30,
    initials: 'QH', color: '#E2ECF9',
    bio: 'Hỗ trợ kiểm tra sức khỏe tổng quát và theo dõi các vấn đề sức khỏe thường gặp. Luôn dành thời gian tìm hiểu nhu cầu và giải thích kế hoạch chăm sóc cho người bệnh.',
    education: ['Bác sĩ chuyên khoa I – Nội tổng quát', '10 năm kinh nghiệm thăm khám ngoại trú'],
    languages: ['Tiếng Việt'],
  },
  ...[
    { id: '5', name: 'Đỗ Thanh Bình', specialty: 'Tai Mũi Họng', experience: 9, fee: 220000, initials: 'TB', color: '#E7F1F5', supportsOnline: false },
    { id: '6', name: 'Vũ Ngọc Mai', specialty: 'Răng Hàm Mặt', experience: 8, fee: 250000, initials: 'NM', color: '#E7F4ED', supportsOnline: false },
    { id: '7', name: 'Bùi Đức Long', specialty: 'Mắt', experience: 11, fee: 220000, initials: 'ĐL', color: '#E8EFFC', supportsOnline: false },
    { id: '8', name: 'Hoàng Thảo Linh', specialty: 'Sản Phụ khoa', experience: 10, fee: 250000, initials: 'TL', color: '#FBE8F0', supportsOnline: true },
    { id: '9', name: 'Phan Minh Tuấn', specialty: 'Cơ Xương Khớp', experience: 12, fee: 250000, initials: 'MT', color: '#F8EEDC', supportsOnline: true },
    { id: '10', name: 'Đặng Thu Trang', specialty: 'Thần kinh', experience: 9, fee: 250000, initials: 'TT', color: '#ECE8F8', supportsOnline: true },
    { id: '11', name: 'Đinh Quốc Bảo', specialty: 'Tiêu hóa', experience: 10, fee: 220000, initials: 'QB', color: '#FBECDD', supportsOnline: true },
    { id: '12', name: 'Trịnh Hồng Nhung', specialty: 'Hô hấp', experience: 8, fee: 220000, initials: 'HN', color: '#E5F1F5', supportsOnline: true },
    { id: '13', name: 'Lương Việt Dũng', specialty: 'Nội tiết', experience: 11, fee: 250000, initials: 'VD', color: '#E9EEF9', supportsOnline: true },
    { id: '14', name: 'Ngô Thanh Sơn', specialty: 'Tiết niệu', experience: 9, fee: 220000, initials: 'TS', color: '#E7F2E9', supportsOnline: true },
    { id: '15', name: 'Hà Minh Đức', specialty: 'Ngoại tổng quát', experience: 12, fee: 250000, initials: 'MĐ', color: '#F8E7E5', supportsOnline: false },
    { id: '16', name: 'Cao Bảo Ngọc', specialty: 'Dinh dưỡng', experience: 7, fee: 200000, initials: 'BN', color: '#F0F3DF', supportsOnline: true },
    { id: '17', name: 'Tạ Khánh An', specialty: 'Tâm lý', experience: 8, fee: 300000, initials: 'KA', color: '#F0E9F6', supportsOnline: true },
    { id: '18', name: 'Lý Hoài Phong', specialty: 'Phục hồi chức năng', experience: 10, fee: 220000, initials: 'HP', color: '#E4F0EE', supportsOnline: false },
    { id: '19', name: 'Mai Diệu Hương', specialty: 'Y học cổ truyền', experience: 11, fee: 200000, initials: 'DH', color: '#E9F1DF', supportsOnline: false },
    { id: '20', name: 'Tô Anh Khoa', specialty: 'Khám sức khỏe', experience: 9, fee: 300000, initials: 'AK', color: '#E4EDF8', supportsOnline: false },
  ].map(demoDoctor),
];

export const specialties = ['Tất cả', ...departments.filter(department => department.kind === 'clinical').map(department => department.name)];
export const statusLabels: Record<AppointmentStatus, string> = {
  pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', completed: 'Đã hoàn thành',
  cancelled: 'Đã hủy', expired: 'Hết hạn giữ chỗ',
};
export const serviceLabels: Record<ServiceType, string> = {
  'in-person': 'Khám trực tiếp', online: 'Tư vấn trực tuyến',
};

export function getDoctor(id: string | undefined) {
  return doctors.find((doctor) => doctor.id === id);
}

export function normalizeSearch(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
}

