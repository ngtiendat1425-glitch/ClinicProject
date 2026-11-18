export type Department = {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  services: string[];
  doctorIds: string[];
  supportsOnline: boolean;
  kind: 'clinical' | 'support';
};

// Configurable demo catalog; this is not a claim about a real clinic's scope.
export const departments: Department[] = [
  {
    id: 'cardiology', name: 'Tim mạch', icon: 'heart-outline', color: '#FCE8E4',
    description: 'Khám và theo dõi các vấn đề về sức khỏe tim mạch theo lịch hẹn.',
    services: ['Khám chuyên khoa Tim mạch', 'Theo dõi sức khỏe tim mạch', 'Tư vấn kết quả khám'],
    doctorIds: ['1'], supportsOnline: true, kind: 'clinical',
  },
  {
    id: 'pediatrics', name: 'Nhi khoa', icon: 'happy-outline', color: '#E9F1FC',
    description: 'Chuyên khoa dành cho sức khỏe, sự phát triển và việc chăm sóc trẻ em.',
    services: ['Khám chuyên khoa Nhi', 'Theo dõi sự phát triển của trẻ', 'Tư vấn chăm sóc trẻ'],
    doctorIds: ['2'], supportsOnline: true, kind: 'clinical',
  },
  {
    id: 'dermatology', name: 'Da liễu', icon: 'flower-outline', color: '#F3EAF8',
    description: 'Khám các vấn đề về da và trao đổi về kế hoạch chăm sóc phù hợp.',
    services: ['Khám chuyên khoa Da liễu', 'Theo dõi tình trạng da', 'Tư vấn chăm sóc da'],
    doctorIds: ['3'], supportsOnline: true, kind: 'clinical',
  },
  {
    id: 'internal-medicine', name: 'Nội tổng quát', icon: 'medical-outline', color: '#FCEFD9',
    description: 'Thăm khám tổng quát, tiếp nhận thông tin sức khỏe và hướng dẫn theo dõi.',
    services: ['Khám Nội tổng quát', 'Theo dõi sức khỏe định kỳ', 'Tư vấn kết quả khám'],
    doctorIds: ['4'], supportsOnline: true, kind: 'clinical',
  },
  {
    id: 'ent', name: 'Tai Mũi Họng', icon: 'ear-outline', color: '#E7F1F5',
    description: 'Thăm khám chuyên khoa các vấn đề liên quan đến tai, mũi và họng tại phòng khám.',
    services: ['Khám Tai Mũi Họng', 'Tái khám chuyên khoa', 'Trao đổi kết quả thăm khám'],
    doctorIds: ['5'], supportsOnline: false, kind: 'clinical',
  },
  {
    id: 'dentistry', name: 'Răng Hàm Mặt', icon: 'sparkles-outline', color: '#E7F4ED',
    description: 'Khám răng, hàm, mặt và trao đổi kế hoạch chăm sóc răng miệng trực tiếp.',
    services: ['Khám Răng Hàm Mặt', 'Kiểm tra sức khỏe răng miệng', 'Tái khám nha khoa'],
    doctorIds: ['6'], supportsOnline: false, kind: 'clinical',
  },
  {
    id: 'ophthalmology', name: 'Mắt', icon: 'eye-outline', color: '#E8EFFC',
    description: 'Khám chuyên khoa mắt và theo dõi sức khỏe thị giác tại phòng khám.',
    services: ['Khám chuyên khoa Mắt', 'Kiểm tra thị lực theo chỉ định', 'Tái khám chuyên khoa'],
    doctorIds: ['7'], supportsOnline: false, kind: 'clinical',
  },
  {
    id: 'obstetrics-gynecology', name: 'Sản Phụ khoa', icon: 'female-outline', color: '#FBE8F0',
    description: 'Thăm khám và tư vấn các nội dung thuộc chuyên khoa sản, phụ khoa theo lịch hẹn.',
    services: ['Khám Sản Phụ khoa', 'Tái khám theo lịch hẹn', 'Tư vấn chuyên khoa'],
    doctorIds: ['8'], supportsOnline: true, kind: 'clinical',
  },
  {
    id: 'musculoskeletal', name: 'Cơ Xương Khớp', icon: 'body-outline', color: '#F8EEDC',
    description: 'Khám, theo dõi các vấn đề thuộc cơ, xương, khớp và trao đổi kết quả.',
    services: ['Khám Cơ Xương Khớp', 'Theo dõi vận động', 'Tư vấn kết quả khám'],
    doctorIds: ['9'], supportsOnline: true, kind: 'clinical',
  },
  {
    id: 'neurology', name: 'Thần kinh', icon: 'bulb-outline', color: '#ECE8F8',
    description: 'Thăm khám chuyên khoa thần kinh và theo dõi theo kế hoạch của bác sĩ.',
    services: ['Khám chuyên khoa Thần kinh', 'Tái khám chuyên khoa', 'Tư vấn kết quả khám'],
    doctorIds: ['10'], supportsOnline: true, kind: 'clinical',
  },
  {
    id: 'gastroenterology', name: 'Tiêu hóa', icon: 'restaurant-outline', color: '#FBECDD',
    description: 'Khám và tư vấn chuyên khoa các vấn đề thuộc hệ tiêu hóa.',
    services: ['Khám chuyên khoa Tiêu hóa', 'Tái khám chuyên khoa', 'Trao đổi kết quả khám'],
    doctorIds: ['11'], supportsOnline: true, kind: 'clinical',
  },
  {
    id: 'respiratory', name: 'Hô hấp', icon: 'cloud-outline', color: '#E5F1F5',
    description: 'Thăm khám chuyên khoa hô hấp và theo dõi sức khỏe theo lịch hẹn.',
    services: ['Khám chuyên khoa Hô hấp', 'Theo dõi sức khỏe hô hấp', 'Tư vấn kết quả khám'],
    doctorIds: ['12'], supportsOnline: true, kind: 'clinical',
  },
  {
    id: 'endocrinology', name: 'Nội tiết', icon: 'water-outline', color: '#E9EEF9',
    description: 'Khám chuyên khoa nội tiết, theo dõi định kỳ và trao đổi kết quả.',
    services: ['Khám chuyên khoa Nội tiết', 'Tái khám định kỳ', 'Tư vấn kết quả xét nghiệm theo chỉ định'],
    doctorIds: ['13'], supportsOnline: true, kind: 'clinical',
  },
  {
    id: 'urology', name: 'Tiết niệu', icon: 'flask-outline', color: '#E7F2E9',
    description: 'Thăm khám chuyên khoa tiết niệu và tư vấn theo lịch hẹn với bác sĩ.',
    services: ['Khám chuyên khoa Tiết niệu', 'Tái khám chuyên khoa', 'Trao đổi kết quả khám'],
    doctorIds: ['14'], supportsOnline: true, kind: 'clinical',
  },
  {
    id: 'general-surgery', name: 'Ngoại tổng quát', icon: 'medkit-outline', color: '#F8E7E5',
    description: 'Tiếp nhận thăm khám ngoại khoa trực tiếp và trao đổi kế hoạch theo dõi.',
    services: ['Khám Ngoại tổng quát', 'Tái khám sau điều trị theo hẹn', 'Trao đổi kế hoạch thăm khám'],
    doctorIds: ['15'], supportsOnline: false, kind: 'clinical',
  },
  {
    id: 'nutrition', name: 'Dinh dưỡng', icon: 'nutrition-outline', color: '#F0F3DF',
    description: 'Trao đổi về nhu cầu dinh dưỡng và theo dõi kế hoạch do bác sĩ phụ trách.',
    services: ['Khám và tư vấn Dinh dưỡng', 'Theo dõi kế hoạch dinh dưỡng', 'Tư vấn trực tuyến theo hẹn'],
    doctorIds: ['16'], supportsOnline: true, kind: 'clinical',
  },
  {
    id: 'psychology', name: 'Tâm lý', icon: 'chatbubbles-outline', color: '#F0E9F6',
    description: 'Đặt lịch trao đổi cá nhân và theo dõi nội dung tư vấn trong không gian riêng tư.',
    services: ['Tư vấn Tâm lý theo lịch hẹn', 'Trao đổi trực tuyến', 'Theo dõi buổi tư vấn'],
    doctorIds: ['17'], supportsOnline: true, kind: 'clinical',
  },
  {
    id: 'rehabilitation', name: 'Phục hồi chức năng', icon: 'walk-outline', color: '#E4F0EE',
    description: 'Thăm khám trực tiếp, đánh giá chức năng vận động và theo dõi theo lịch hẹn.',
    services: ['Khám Phục hồi chức năng', 'Đánh giá vận động theo chỉ định', 'Tái khám theo kế hoạch'],
    doctorIds: ['18'], supportsOnline: false, kind: 'clinical',
  },
  {
    id: 'traditional-medicine', name: 'Y học cổ truyền', icon: 'leaf-outline', color: '#E9F1DF',
    description: 'Khám chuyên khoa y học cổ truyền trực tiếp tại phòng khám.',
    services: ['Khám Y học cổ truyền', 'Tái khám theo lịch hẹn', 'Trao đổi kế hoạch chăm sóc'],
    doctorIds: ['19'], supportsOnline: false, kind: 'clinical',
  },
  {
    id: 'health-check', name: 'Khám sức khỏe', icon: 'clipboard-outline', color: '#E4EDF8',
    description: 'Đăng ký khám sức khỏe trực tiếp theo gói dịch vụ minh họa của phòng khám.',
    services: ['Khám sức khỏe tổng quát', 'Khám theo gói minh họa', 'Trao đổi kết quả sau khám'],
    doctorIds: ['20'], supportsOnline: false, kind: 'clinical',
  },
  {
    id: 'laboratory', name: 'Xét nghiệm', icon: 'flask-outline', color: '#F3ECFB',
    description: 'Dịch vụ hỗ trợ thăm khám được thực hiện theo chỉ định của bác sĩ.',
    services: ['Tiếp nhận chỉ định xét nghiệm', 'Hướng dẫn chuẩn bị theo chỉ định', 'Trả kết quả cho bác sĩ phụ trách'],
    doctorIds: [], supportsOnline: false, kind: 'support',
  },
  {
    id: 'imaging', name: 'Chẩn đoán hình ảnh', icon: 'scan-outline', color: '#E7EFF8',
    description: 'Dịch vụ chẩn đoán hình ảnh hỗ trợ bác sĩ trong quá trình thăm khám theo chỉ định.',
    services: ['Tiếp nhận chỉ định chẩn đoán hình ảnh', 'Hướng dẫn thực hiện tại phòng khám', 'Chuyển kết quả đến bác sĩ phụ trách'],
    doctorIds: [], supportsOnline: false, kind: 'support',
  },
];

export function getDepartment(id: string | undefined) {
  return departments.find((department) => department.id === id);
}
