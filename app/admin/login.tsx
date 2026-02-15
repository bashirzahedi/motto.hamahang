import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAdminAuth } from '../../lib/adminAuth';
import { colors, radius, spacing, fonts } from '../../lib/theme';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAdminAuth();

  const handleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      router.replace('/admin');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Brand */}
        <View style={styles.brandRow}>
          <Text style={styles.brandIcon}>⚡</Text>
        </View>

        <Text style={styles.title}>Sign in to Admin Panel</Text>
        <Text style={styles.subtitle}>Enter your credentials to access the admin panel</Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorIcon}>✕</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.formGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholder="name@example.com"
            placeholderTextColor={colors.textDim}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            placeholder="••••••••"
            placeholderTextColor={colors.textDim}
          />
        </View>

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: 32,
    width: '100%',
    maxWidth: 400,
  },

  // ── Brand ──
  brandRow: {
    alignItems: 'center',
    marginBottom: 24,
  },
  brandIcon: {
    fontSize: 40,
  },

  // ── Headings ──
  title: {
    fontSize: fonts.sizes['2xl'],
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fonts.sizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 28,
  },

  // ── Error ──
  errorBox: {
    backgroundColor: 'rgba(127, 29, 29, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(127, 29, 29, 0.3)',
    padding: 14,
    borderRadius: radius.lg,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorIcon: {
    color: colors.destructiveText,
    fontSize: 14,
    fontWeight: fonts.weights.bold,
  },
  errorText: {
    color: colors.destructiveText,
    fontSize: fonts.sizes.sm,
    flex: 1,
  },

  // ── Form ──
  formGroup: {
    marginBottom: 18,
  },
  label: {
    color: colors.text,
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.medium,
    marginBottom: spacing.sm,
    textAlign: 'left',
  },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: colors.text,
    fontSize: fonts.sizes.sm,
  },

  // ── Button ──
  button: {
    backgroundColor: colors.text,
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  buttonDisabled: {
    backgroundColor: colors.bgMuted,
  },
  buttonText: {
    color: colors.bg,
    textAlign: 'center',
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.medium,
  },
});
