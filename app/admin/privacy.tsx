import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { supabase } from '../../lib/supabase';
import RichTextEditor from '../../components/admin/RichTextEditor';
import { colors, radius, spacing, fonts } from '../../lib/theme';
import { PageGuard } from '../../components/admin/PageGuard';
import { useAdminData } from '../../hooks/useAdminData';

export default function AdminPrivacyPageGuarded() {
  return <PageGuard pageKey="privacy"><AdminPrivacyPage /></PageGuard>;
}

function AdminPrivacyPage() {
  const [content, setContent] = useState('');
  const [contentEn, setContentEn] = useState('');
  const [saving, setSaving] = useState(false);
  const [rowId, setRowId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchPrivacy = async () => {
    const { data, error } = await supabase
      .from('privacy_page')
      .select('*')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (data) {
      setContent(data.content || '');
      setContentEn(data.content_en || '');
      setRowId(data.id);
    }
  };

  const { loading } = useAdminData(fetchPrivacy);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (rowId) {
        const { error } = await supabase
          .from('privacy_page')
          .update({ content, content_en: contentEn, updated_at: new Date().toISOString() })
          .eq('id', rowId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('privacy_page')
          .insert({ content, content_en: contentEn })
          .select()
          .single();
        if (error) throw error;
        if (data) setRowId(data.id);
      }
      showToast('Content saved successfully', 'success');
    } catch (err: any) {
      console.error('Error saving privacy:', err);
      showToast('Error saving content', 'error');
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
          This content is displayed on the Privacy Policy page in the app
        </Text>
      </View>

      {/* Form card */}
      <View style={styles.card}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Persian Content</Text>
          <RichTextEditor
            value={content}
            onChange={setContent}
            placeholder="Enter privacy policy content..."
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>English Content</Text>
          <RichTextEditor
            value={contentEn}
            onChange={setContentEn}
            placeholder="Enter privacy policy content in English..."
          />
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
  formGroup: {
    marginBottom: 24,
  },
  label: {
    color: colors.text,
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.medium,
    marginBottom: spacing.sm,
    textAlign: 'left',
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
