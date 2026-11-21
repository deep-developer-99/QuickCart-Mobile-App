import React, { useRef, useState } from 'react';
import { Alert, Button, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { quickCartApi } from '../../api/quickCartApi';
import { AppText as Text } from '../../components/AppText';
import { deactivateLocalCart } from '../../services/cartStorage';
import { removeToken } from '../../services/secureStorage';
import { logout } from '../../store/slices/authSlice';
import { store } from '../../store/store';
import { useTheme } from '../../theme/ThemeContext';

// These wire values must match the deletion reasons accepted by the backend.
const reasons = [
  "I don't want to use QuickCart anymore",
  "I'm using a different account",
  "I'm worried about my privacy",
  'You are sending me too many emails/notifications',
  'This app is not working properly',
  'Other',
];

export default function DeleteAccountScreen() {
  const { theme } = useTheme();
  const [reason, setReason] = useState('');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [reauth, setReauth] = useState(false);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [getConfirmation] = quickCartApi.useGetDeletionConfirmationMutation();
  const [deleteAccount] = quickCartApi.useDeleteAccountMutation();

  const signOut = (token: string) => {
    if (store.getState().auth.token !== token) return;
    store.dispatch(logout());
    removeToken(token).catch(() => console.warn('Unable to clear the stored session.'));
  };

  const confirm = async () => {
    const { token, user } = store.getState().auth;
    if (!token || !user || !reason || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      const { confirmationToken } = await getConfirmation().unwrap();
      if (store.getState().auth.token !== token) return;
      const result = await deleteAccount({ reason, feedback: feedback.trim() || undefined, confirmationToken }).unwrap();
      if (!result.success) throw new Error("Deletion was not confirmed.");
      deactivateLocalCart(user.id).catch(() => console.warn('Unable to clear the deactivated cart.'));
      signOut(token);
      Alert.alert('Account deactivated', 'Your QuickCart account has been closed.');
    } catch (requestError) {
      // The shared API handler clears the session and cart on ACCOUNT_INACTIVE.
      if (store.getState().auth.token !== token) return;
      const data = (requestError as { data?: { code?: string; message?: string } } | undefined)?.data;
      setReauth(data?.code === 'REAUTH_REQUIRED');
      setError(data?.message || 'We could not confirm deletion. Please try again.');
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.surface }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.heading, { color: theme.colors.text }]}>Account privacy</Text>
        <Text style={{ color: theme.colors.text }}>
          Closing your account removes access to its order history and saved details.
          Existing orders and payments continue processing. Historical records may be retained.
        </Text>
        <Text style={{ color: theme.colors.text }}>Choose a reason</Text>
        {reasons.map(value => (
          <Pressable
            key={value}
            accessibilityRole="radio"
            accessibilityState={{ checked: reason === value, disabled: busy }}
            disabled={busy}
            onPress={() => setReason(value)}
            style={styles.reason}
          >
            <Text style={{ color: theme.colors.text }}>{reason === value ? '●' : '○'}  {value}</Text>
          </Pressable>
        ))}
        <TextInput
          accessibilityLabel="Optional feedback"
          placeholder="Optional feedback"
          placeholderTextColor={theme.colors.text}
          style={[styles.feedback, { color: theme.colors.text, borderColor: theme.colors.grey150 }]}
          multiline
          maxLength={1000}
          editable={!busy}
          value={feedback}
          onChangeText={setFeedback}
        />
        {error ? <Text accessibilityRole="alert" style={{ color: theme.colors.text }}>{error}</Text> : null}
        {reauth ? (
          <Button title="Sign in again" onPress={() => {
            const token = store.getState().auth.token;
            if (token) signOut(token);
          }} />
        ) : (
          <Button
            title={busy ? 'Processing…' : 'Delete my account'}
            disabled={!reason || busy}
            onPress={() => Alert.alert('Delete your account?', 'A future sign-up creates a fresh account.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: confirm },
            ])}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, gap: 12 },
  heading: { fontSize: 22, fontWeight: '600' },
  reason: { minHeight: 44, justifyContent: 'center' },
  feedback: { borderWidth: 1, borderRadius: 8, minHeight: 80, padding: 10, textAlignVertical: 'top' },
});
