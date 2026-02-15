import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAdminAuth } from '../../lib/adminAuth';
import { colors, radius, spacing, fonts } from '../../lib/theme';

interface PageGuardProps {
  pageKey: string;
  children: React.ReactNode;
}

export function PageGuard({ pageKey, children }: PageGuardProps) {
  const { canAccessPage, loading } = useAdminAuth();

  if (loading) return null;

  if (!canAccessPage(pageKey)) {
    return (
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <Ionicons name="lock-closed-outline" size={32} color={colors.textDim} />
        </View>
        <Text style={styles.title}>Access Denied</Text>
        <Text style={styles.text}>You do not have permission to view this page.</Text>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['2xl'],
    gap: 12,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: fonts.sizes.xl,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
  },
  text: {
    fontSize: fonts.sizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
