import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, Field, Icon } from '../ui';
import { apiConfigured } from '../../services/api';

type PasswordFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  mode: 'current-password' | 'new-password';
  editable?: boolean;
  onSubmitEditing?: () => void;
};

export function PasswordField({ label, value, onChangeText, mode, editable = true, onSubmitEditing }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.wrapper}>
      <Field
        label={label}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!visible}
        autoComplete={mode}
        autoCapitalize="none"
        autoCorrect={false}
        importantForAutofill="yes"
        maxLength={apiConfigured ? 72 : 128}
        editable={editable}
        placeholder={mode === 'new-password' ? apiConfigured ? 'Ít nhất 8 ký tự' : 'Từ 8 đến 128 ký tự' : 'Nhập mật khẩu của bạn'}
        returnKeyType="done"
        onSubmitEditing={onSubmitEditing}
        style={styles.input}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${visible ? 'Ẩn' : 'Hiện'} ${label.toLowerCase().replace(' *', '')}`}
        aria-pressed={visible}
        disabled={!editable}
        onPress={() => setVisible((current) => !current)}
        style={styles.toggle}
      >
        <Icon name={visible ? 'eye-off-outline' : 'eye-outline'} size={21} color={colors.muted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative' },
  input: { paddingRight: 56 },
  toggle: { position: 'absolute', right: 4, bottom: 3, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
});
