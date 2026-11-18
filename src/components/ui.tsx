import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
  type ColorValue, type StyleProp, type TextInputProps, type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { type AppointmentStatus, type Doctor, statusLabels } from '../data/clinic';

export const colors = {
  ink: '#173B3C', teal: '#087E78', mint: '#E8F5F1', muted: '#647E7D',
  line: '#E0EAE6', canvas: '#F6F9F8', white: '#FFFFFF', orange: '#C78B44', red: '#B54D46',
};

export type IconName = ComponentProps<typeof Ionicons>['name'];
export function Icon({ name, size = 22, color = colors.teal }: { name: IconName; size?: number; color?: ColorValue }) {
  return <Ionicons name={name} size={size} color={typeof color === 'number' ? colors.teal : color ?? colors.teal} />;
}

export function Screen({ children, scroll = true, style }: {
  children: ReactNode; scroll?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  const contentStyle = [s.content, { paddingBottom: Math.max(28, insets.bottom + 16) }, style];
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={s.safe}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {scroll ? (
          <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false} contentContainerStyle={contentStyle}>
            {children}
          </ScrollView>
        ) : <View style={[...contentStyle, s.flex]}>{children}</View>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function PageHeader({ title, subtitle, back, right }: {
  title: string; subtitle?: string; back?: boolean; right?: ReactNode;
}) {
  return (
    <View style={s.header}>
      {back && <Pressable accessibilityRole="button" accessibilityLabel="Quay lại"
        onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={s.back}>
        <Icon name="arrow-back" />
      </Pressable>}
      <View style={s.flex}>
        <Text accessibilityRole="header" style={s.title}>{title}</Text>
        {!!subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Button({ title, onPress, variant = 'primary', disabled, icon, loading }: {
  title: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean; icon?: IconName; loading?: boolean;
}) {
  const foreground = variant === 'primary' ? colors.white : variant === 'danger' ? colors.red : colors.teal;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || loading, busy: loading }}
      aria-disabled={disabled || loading} aria-busy={loading}
      disabled={disabled || loading} onPress={onPress}
      style={({ pressed }) => [s.button, variant === 'primary' ? s.primary : variant === 'danger' ? s.danger : s.secondary,
        (disabled || loading) && s.disabled, pressed && s.pressed]}>
      {loading ? <ActivityIndicator color={foreground} /> : icon ? <Icon name={icon} size={19} color={foreground} /> : null}
      <Text style={[s.buttonText, { color: foreground }]}>{title}</Text>
    </Pressable>
  );
}

export function Field({ label, error, style, ...props }: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput accessibilityLabel={label} placeholderTextColor="#819591" {...props}
        style={[s.input, props.multiline && s.multiline, !!error && s.inputError, style]} />
      {!!error && <Text accessibilityLiveRegion="polite" style={s.error}>{error}</Text>}
    </View>
  );
}

export function EmptyState({ title, message, icon = 'leaf-outline', action }: {
  title: string; message: string; icon?: IconName; action?: ReactNode;
}) {
  return <Card style={s.empty}>
    <View style={s.emptyIcon}><Icon name={icon} size={30} /></View>
    <Text style={s.emptyTitle}>{title}</Text>
    <Text style={s.emptyMessage}>{message}</Text>
    {action && <View style={s.emptyAction}>{action}</View>}
  </Card>;
}

export function Avatar({ doctor, size = 58 }: { doctor: Doctor; size?: number }) {
  return <View accessibilityLabel={doctor.name} style={[s.avatar, {
    width: size, height: size, borderRadius: size * .31, backgroundColor: doctor.color,
  }]}><Text style={[s.initials, { fontSize: size * .3 }]}>{doctor.initials}</Text></View>;
}

const badgeColors: Record<AppointmentStatus, { background: string; text: string }> = {
  pending: { background: '#FFF3DE', text: '#8C601E' },
  confirmed: { background: colors.mint, text: colors.teal },
  completed: { background: '#EAF0FF', text: '#4A6097' },
  cancelled: { background: '#FCEDEB', text: colors.red },
  expired: { background: '#EDF0EE', text: colors.muted },
};
export function Badge({ status }: { status: AppointmentStatus }) {
  const tone = badgeColors[status];
  return <View style={[s.badge, { backgroundColor: tone.background }]}>
    <Text style={[s.badgeText, { color: tone.text }]}>{statusLabels[status]}</Text>
  </View>;
}

export function Notice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'error' }) {
  return <View accessibilityLiveRegion="polite" style={[s.notice, tone === 'error' && s.errorNotice]}>
    <Icon name={tone === 'error' ? 'alert-circle-outline' : 'information-circle-outline'} size={20}
      color={tone === 'error' ? colors.red : colors.teal} />
    <Text style={[s.noticeText, tone === 'error' && { color: colors.red }]}>{children}</Text>
  </View>;
}

const s = StyleSheet.create({
  flex: { flex: 1 }, safe: { flex: 1, backgroundColor: colors.canvas },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 22, paddingTop: 18, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6, minHeight: 55 },
  back: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 15,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  title: { fontSize: 26, lineHeight: 34, letterSpacing: -.7, color: colors.ink, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 4 },
  card: { padding: 18, backgroundColor: colors.white, borderRadius: 22, borderWidth: 1, borderColor: colors.line, gap: 12 },
  button: { minHeight: 50, borderRadius: 14, paddingHorizontal: 17, paddingVertical: 13,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  primary: { backgroundColor: colors.teal }, secondary: { backgroundColor: colors.mint, borderWidth: 1, borderColor: '#CFE5DB' },
  danger: { backgroundColor: '#FFF3F1', borderWidth: 1, borderColor: '#EFD4D0' },
  buttonText: { fontSize: 14, fontWeight: '700', textAlign: 'center' }, disabled: { opacity: .45 }, pressed: { opacity: .75 },
  field: { gap: 8 }, label: { fontSize: 14, color: colors.ink, fontWeight: '600' },
  input: { minHeight: 50, borderRadius: 13, borderWidth: 1, borderColor: colors.line,
    color: colors.ink, backgroundColor: colors.white, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15 },
  multiline: { minHeight: 110, textAlignVertical: 'top' }, inputError: { borderColor: colors.red },
  error: { color: colors.red, fontSize: 13 }, empty: { alignItems: 'center', paddingVertical: 34 },
  emptyIcon: { padding: 15, backgroundColor: colors.mint, borderRadius: 24 },
  emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptyMessage: { fontSize: 14, lineHeight: 22, color: colors.muted, textAlign: 'center' },
  emptyAction: { marginTop: 6, width: '100%' }, avatar: { justifyContent: 'center', alignItems: 'center' },
  initials: { color: colors.ink, fontWeight: '800' },
  badge: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  notice: { flexDirection: 'row', gap: 9, padding: 14, borderRadius: 14, backgroundColor: colors.mint, alignItems: 'flex-start' },
  errorNotice: { backgroundColor: '#FCEDEB' }, noticeText: { color: colors.teal, fontSize: 13, lineHeight: 20, flex: 1 },
});
