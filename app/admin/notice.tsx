import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native';
import { supabase, type Notice } from '../../lib/supabase';
import { colors, radius, spacing, fonts } from '../../lib/theme';
import { PageGuard } from '../../components/admin/PageGuard';
import { useAdminData } from '../../hooks/useAdminData';

export default function NoticePageGuarded() {
  return <PageGuard pageKey="notice"><NoticePage /></PageGuard>;
}

function NoticePage() {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [saving, setSaving] = useState(false);
  const [text, setText] = useState('');
  const [textEn, setTextEn] = useState('');
  const [isVisible, setIsVisible] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchNotice = async () => {
    const { data, error } = await supabase
      .from('notices')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    if (data && data.length > 0) {
      setNotice(data[0]);
      setText(data[0].text);
      setTextEn(data[0].text_en || '');
      setIsVisible(data[0].is_visible);
    } else {
      setNotice(null);
      setText('');
      setIsVisible(true);
    }
  };

  const { loading } = useAdminData(fetchNotice);

  const handleSave = async () => {
    setSaving(true);

    try {
      if (notice) {
        const { error } = await supabase
          .from('notices')
          .update({
            text,
            text_en: textEn,
            is_visible: isVisible,
            updated_at: new Date().toISOString(),
          })
          .eq('id', notice.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('notices')
          .insert({
            text,
            text_en: textEn,
            is_visible: isVisible,
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setNotice(data);
        }
      }

      await fetchNotice();
      showToast('Notice saved successfully', 'success');
    } catch (error: any) {
      console.error('Error saving notice:', error);
      showToast('Error saving notice', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.containerContent}>
      {/* Toast */}
      {toast && (
        <View style={[styles.toast, toast.type === 'success' ? styles.toastSuccess : styles.toastError]}>
          <Text style={styles.toastIcon}>{toast.type === 'success' ? '✓' : '✕'}</Text>
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}

      {/* Description */}
      <View style={styles.descBox}>
        <Text style={styles.descIcon}>ℹ️</Text>
        <Text style={styles.descText}>
          This notice is displayed at the top of the slogans list
        </Text>
      </View>

      {/* Form card */}
      <View style={styles.card}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Persian Text</Text>
          <TextInput
            style={[styles.input, styles.textarea, { textAlign: 'right' }]}
            value={text}
            onChangeText={setText}
            placeholder="Enter notice text..."
            placeholderTextColor={colors.textDim}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>English Text</Text>
          <TextInput
            style={[styles.input, styles.textarea, { textAlign: 'left' }]}
            value={textEn}
            onChangeText={setTextEn}
            placeholder="Enter notice text in English..."
            placeholderTextColor={colors.textDim}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.visibilityRow}>
          <Pressable
            style={styles.switchRow}
            onPress={() => setIsVisible(!isVisible)}
          >
            <Text style={styles.switchLabel}>Show Notice</Text>
            <View style={[styles.toggleTrack, isVisible && styles.toggleTrackActive]}>
              <View style={[styles.toggleThumb, isVisible && styles.toggleThumbActive]} />
            </View>
          </Pressable>

          <View style={[styles.statusBadge, isVisible ? styles.statusVisible : styles.statusHidden]}>
            <Text style={[styles.statusText, isVisible ? styles.statusTextVisible : styles.statusTextHidden]}>
              {isVisible ? 'Visible' : 'Hidden'}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={[styles.btnPrimary, saving && styles.btnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.btnPrimaryText}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Preview */}
      {isVisible && text ? (
        <View style={styles.previewSection}>
          <Text style={styles.previewTitle}>Preview</Text>
          <View style={styles.previewNotice}>
            <Text style={styles.previewText}>{text}</Text>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    color: colors.textMuted,
  },

  // ── Description ──
  descBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.15)',
    borderRadius: radius.lg,
    padding: 14,
  },
  descIcon: {
    fontSize: 16,
  },
  descText: {
    fontSize: fonts.sizes.sm,
    color: colors.textMuted,
    flex: 1,
  },

  // ── Card ──
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    marginBottom: 24,
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 20,
  },
  formGroup: {
    marginBottom: 20,
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
    paddingVertical: 10,
    paddingHorizontal: 14,
    color: colors.text,
    fontSize: fonts.sizes.sm,
    textAlign: 'left',
  },
  textarea: {
    minHeight: 120,
    lineHeight: 24,
  },

  // ── Visibility ──
  visibilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  switchLabel: {
    color: colors.textMuted,
    fontSize: fonts.sizes.sm,
  },
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.border,
    justifyContent: 'center',
    padding: 2,
  },
  toggleTrackActive: {
    backgroundColor: '#22c55e',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.textDim,
  },
  toggleThumbActive: {
    backgroundColor: colors.text,
    alignSelf: 'flex-end',
  },
  statusBadge: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: radius.full,
  },
  statusVisible: {
    backgroundColor: colors.success,
  },
  statusHidden: {
    backgroundColor: colors.border,
  },
  statusText: {
    fontSize: fonts.sizes.xs,
    fontWeight: fonts.weights.medium,
  },
  statusTextVisible: {
    color: colors.successText,
  },
  statusTextHidden: {
    color: colors.textDim,
  },

  // ── Actions ──
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  btnPrimary: {
    backgroundColor: colors.text,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: radius.md,
  },
  btnPrimaryText: {
    color: colors.bg,
    fontWeight: fonts.weights.medium,
    fontSize: fonts.sizes.sm,
  },
  btnDisabled: {
    backgroundColor: colors.bgMuted,
  },

  // ── Preview ──
  previewSection: {
    marginTop: 8,
  },
  previewTitle: {
    fontSize: fonts.sizes.md,
    fontWeight: fonts.weights.medium,
    color: colors.textMuted,
    marginBottom: 12,
  },
  previewNotice: {
    backgroundColor: 'rgba(234, 179, 8, 0.08)',
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.15)',
  },
  previewText: {
    fontSize: fonts.sizes.md,
    color: '#fef08a',
    textAlign: 'left',
    lineHeight: 26,
  },

  // ── Toast ──
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    borderRadius: radius.lg,
    marginBottom: 20,
  },
  toastSuccess: {
    backgroundColor: 'rgba(22, 101, 52, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(22, 101, 52, 0.3)',
  },
  toastError: {
    backgroundColor: 'rgba(127, 29, 29, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(127, 29, 29, 0.3)',
  },
  toastIcon: {
    fontSize: 16,
    color: colors.text,
  },
  toastText: {
    color: colors.text,
    fontSize: fonts.sizes.sm,
  },
});
