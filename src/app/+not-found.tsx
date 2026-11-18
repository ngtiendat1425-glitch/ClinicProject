import { router } from 'expo-router';
import { Button, EmptyState, Screen } from '../components/ui';

export default function NotFound() {
  return <Screen><EmptyState title="Không tìm thấy trang" message="Liên kết này không còn khả dụng. Bạn có thể quay về trang chủ."
    action={<Button title="Về trang chủ" onPress={() => router.replace('/')} />} /></Screen>;
}
