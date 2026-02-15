import { useState, useRef } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Modal } from 'react-native';
import { supabase, type ExternalLink } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, fonts } from '../../lib/theme';
import { PageGuard } from '../../components/admin/PageGuard';
import { useAdminData } from '../../hooks/useAdminData';

interface DialogState {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
}

interface LinkFormData {
  title: string;
  title_en: string;
  subtitle: string;
  subtitle_en: string;
  url: string;
  icon: string;
  is_visible: boolean;
}

const defaultForm: LinkFormData = {
  title: '',
  title_en: '',
  subtitle: '',
  subtitle_en: '',
  url: '',
  icon: 'link-outline',
  is_visible: true,
};

export default function LinksPageGuarded() {
  return <PageGuard pageKey="links"><LinksPage /></PageGuard>;
}

function LinksPage() {
  const [links, setLinks] = useState<ExternalLink[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingLink, setEditingLink] = useState<ExternalLink | null>(null);
  const [formData, setFormData] = useState<LinkFormData>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Confirm dialog
  const [dialog, setDialog] = useState<DialogState>({ visible: false, title: '', message: '' });
  const dialogResolveRef = useRef<((confirmed: boolean) => void) | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const showConfirm = (title: string, message: string, opts?: { confirmLabel?: string; destructive?: boolean }) => {
    return new Promise<boolean>((resolve) => {
      dialogResolveRef.current = resolve;
      setDialog({ visible: true, title, message, confirmLabel: opts?.confirmLabel, destructive: opts?.destructive });
    });
  };

  const handleDialogClose = (confirmed: boolean) => {
    setDialog((d) => ({ ...d, visible: false }));
    dialogResolveRef.current?.(confirmed);
    dialogResolveRef.current = null;
  };

  const fetchLinks = async () => {
    const { data, error } = await supabase
      .from('external_links')
      .select('*')
      .order('order_index', { ascending: true });
    if (error) throw error;
    setLinks(data || []);
  };

  const { loading } = useAdminData(fetchLinks);

  const openAddModal = () => {
    setEditingLink(null);
    setFormData(defaultForm);
    setShowModal(true);
  };

  const openEditModal = (link: ExternalLink) => {
    setEditingLink(link);
    setFormData({
      title: link.title,
      title_en: link.title_en,
      subtitle: link.subtitle,
      subtitle_en: link.subtitle_en,
      url: link.url,
      icon: link.icon,
      is_visible: link.is_visible,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingLink(null);
    setFormData(defaultForm);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.url.trim()) {
      showToast('Title and URL are required', 'error');
      return;
    }

    setSaving(true);
    try {
      if (editingLink) {
        const { error } = await supabase
          .from('external_links')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingLink.id);
        if (error) throw error;
      } else {
        const { data: rows } = await supabase
          .from('external_links')
          .select('order_index')
          .order('order_index', { ascending: false })
          .limit(1);
        const nextIndex = (rows?.[0]?.order_index ?? 0) + 1;
        const { error } = await supabase.from('external_links').insert({
          ...formData,
          order_index: nextIndex,
        });
        if (error) throw error;
      }
      closeModal();
      fetchLinks();
      showToast(editingLink ? 'Link updated' : 'Link added', 'success');
    } catch (error: any) {
      console.error('Error saving link:', error);
      showToast('Error saving link', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleVisibility = async (link: ExternalLink) => {
    try {
      const { error } = await supabase
        .from('external_links')
        .update({ is_visible: !link.is_visible })
        .eq('id', link.id);
      if (error) throw error;
      fetchLinks();
    } catch (error) {
      console.error('Error toggling visibility:', error);
    }
  };

  const deleteLink = async (id: string) => {
    const confirmed = await showConfirm('Delete Link', 'Are you sure you want to delete this link?', { confirmLabel: 'Delete', destructive: true });
    if (!confirmed) return;
    try {
      const { error } = await supabase.from('external_links').delete().eq('id', id);
      if (error) throw error;
      fetchLinks();
      showToast('Link deleted', 'success');
    } catch (error) {
      console.error('Error deleting link:', error);
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
    <View style={styles.container}>
      {/* Toast */}
      {toast && (
        <View style={[styles.toast, toast.type === 'success' ? styles.toastSuccess : styles.toastError]}>
          <Text style={styles.toastIcon}>{toast.type === 'success' ? '✓' : '✕'}</Text>
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}

      {/* Description */}
      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
        <Text style={styles.infoText}>
          External links displayed in the "More" section. Icons are from Ionicons.
        </Text>
      </View>

      {/* Toolbar */}
      <View style={styles.toolbarRow}>
        <Text style={styles.countText}>{links.length} links</Text>
        <Pressable style={styles.btnPrimary} onPress={openAddModal}>
          <Text style={styles.btnPrimaryText}>+ New Link</Text>
        </Pressable>
      </View>

      {/* Links list */}
      {links.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="link-outline" size={36} color={colors.textDim} />
          <Text style={styles.emptyText}>No links added yet</Text>
        </View>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {links.map((link) => (
            <View key={link.id} style={styles.card}>
              <View style={[styles.cardStatusBar, link.is_visible ? styles.cardStatusActive : styles.cardStatusInactive]} />
              <View style={styles.cardInner}>
                <View style={styles.cardHeader}>
                  <View style={styles.headerBadges}>
                    <View style={[styles.badge, link.is_visible ? styles.badgeActive : styles.badgeInactive]}>
                      <Text style={[styles.badgeText, link.is_visible ? styles.badgeTextActive : styles.badgeTextInactive]}>
                        {link.is_visible ? 'Visible' : 'Hidden'}
                      </Text>
                    </View>
                    <View style={[styles.badge, styles.badgeIcon]}>
                      <Text style={styles.badgeText}>{link.icon}</Text>
                    </View>
                  </View>
                  <Text style={styles.cardDate}>#{link.order_index}</Text>
                </View>

                <Text style={styles.cardTitle}>{link.title}</Text>
                {link.title_en ? <Text style={styles.cardTitleEn}>{link.title_en}</Text> : null}
                <Text style={styles.cardSubtitle}>{link.subtitle}</Text>
                <Text style={styles.cardUrl}>{link.url}</Text>

                <View style={styles.cardDivider} />

                <View style={styles.cardActions}>
                  <Pressable style={styles.actionBtn} onPress={() => openEditModal(link)}>
                    <Text style={styles.actionBtnText}>Edit</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionBtn, link.is_visible && styles.actionBtnWarn]}
                    onPress={() => toggleVisibility(link)}
                  >
                    <Text style={[styles.actionBtnText, link.is_visible && styles.actionBtnWarnText]}>
                      {link.is_visible ? 'Hide' : 'Show'}
                    </Text>
                  </Pressable>
                  <Pressable style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => deleteLink(link.id)}>
                    <Text style={styles.actionBtnDangerText}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Add/Edit Modal */}
      <Modal visible={showModal} transparent animationType="fade" onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={closeModal} />
          <View style={styles.modalContent} pointerEvents="auto">
            <Text style={styles.modalTitle}>
              {editingLink ? 'Edit Link' : 'New Link'}
            </Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Persian Title *</Text>
              <TextInput
                style={[styles.input, styles.inputRTL]}
                value={formData.title}
                onChangeText={(title) => setFormData({ ...formData, title })}
                placeholder="e.g. Graphics for Iran"
                placeholderTextColor={colors.textDim}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>English Title</Text>
              <TextInput
                style={styles.input}
                value={formData.title_en}
                onChangeText={(title_en) => setFormData({ ...formData, title_en })}
                placeholder="e.g. Graphics for Iran"
                placeholderTextColor={colors.textDim}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Persian Description</Text>
              <TextInput
                style={[styles.input, styles.inputRTL]}
                value={formData.subtitle}
                onChangeText={(subtitle) => setFormData({ ...formData, subtitle })}
                placeholder="Short description..."
                placeholderTextColor={colors.textDim}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>English Description</Text>
              <TextInput
                style={styles.input}
                value={formData.subtitle_en}
                onChangeText={(subtitle_en) => setFormData({ ...formData, subtitle_en })}
                placeholder="Short description..."
                placeholderTextColor={colors.textDim}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>URL *</Text>
              <TextInput
                style={styles.input}
                value={formData.url}
                onChangeText={(url) => setFormData({ ...formData, url })}
                placeholder="https://example.com"
                placeholderTextColor={colors.textDim}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Icon (Ionicons)</Text>
              <TextInput
                style={styles.input}
                value={formData.icon}
                onChangeText={(icon) => setFormData({ ...formData, icon })}
                placeholder="link-outline"
                placeholderTextColor={colors.textDim}
                autoCapitalize="none"
              />
              <Text style={styles.hint}>e.g. color-palette-outline, globe-outline, link-outline</Text>
            </View>

            <Pressable
              style={styles.switchRow}
              onPress={() => setFormData({ ...formData, is_visible: !formData.is_visible })}
            >
              <Text style={styles.switchLabel}>Show in App</Text>
              <View style={[styles.toggleTrack, formData.is_visible && styles.toggleTrackActive]}>
                <View style={[styles.toggleThumb, formData.is_visible && styles.toggleThumbActive]} />
              </View>
            </Pressable>

            <View style={styles.modalActions}>
              <Pressable style={[styles.modalBtn, styles.modalBtnOutline]} onPress={closeModal}>
                <Text style={styles.modalBtnOutlineText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnPrimary, saving && styles.btnDisabled]}
                onPress={handleSubmit}
                disabled={saving}
              >
                <Text style={styles.modalBtnPrimaryText}>
                  {saving ? 'Saving...' : 'Save'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirm dialog */}
      <Modal visible={dialog.visible} transparent animationType="fade" onRequestClose={() => handleDialogClose(false)}>
        <Pressable style={styles.dialogOverlay} onPress={() => handleDialogClose(false)}>
          <View style={styles.dialogContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.dialogTitle}>{dialog.title}</Text>
            <Text style={styles.dialogMessage}>{dialog.message}</Text>
            <View style={styles.dialogActions}>
              <Pressable style={styles.dialogBtnOutline} onPress={() => handleDialogClose(false)}>
                <Text style={styles.dialogBtnOutlineText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.dialogBtnPrimary, dialog.destructive && styles.dialogBtnDestructive]}
                onPress={() => handleDialogClose(true)}
              >
                <Text style={[styles.dialogBtnPrimaryText, dialog.destructive && styles.dialogBtnDestructiveText]}>
                  {dialog.confirmLabel || 'Confirm'}
                </Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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

  // ── Info box ──
  infoBox: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.15)',
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  infoText: {
    color: colors.textMuted,
    fontSize: fonts.sizes.xs,
    textAlign: 'left',
    lineHeight: 20,
    flex: 1,
  },

  // ── Toolbar ──
  toolbarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  countText: {
    color: colors.textDim,
    fontSize: fonts.sizes.sm,
  },

  // ── List ──
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 40,
    gap: 12,
  },

  // ── Cards ──
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardStatusBar: {
    height: 3,
  },
  cardStatusActive: {
    backgroundColor: '#22c55e',
  },
  cardStatusInactive: {
    backgroundColor: colors.border,
  },
  cardInner: {
    padding: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.full,
  },
  badgeActive: {
    backgroundColor: colors.success,
  },
  badgeInactive: {
    backgroundColor: colors.border,
  },
  badgeIcon: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeText: {
    fontSize: fonts.sizes.xs,
    fontWeight: fonts.weights.medium,
    color: colors.textDim,
  },
  badgeTextActive: {
    color: colors.successText,
  },
  badgeTextInactive: {
    color: colors.textDim,
  },
  cardDate: {
    color: colors.textDim,
    fontSize: fonts.sizes.xs,
  },
  cardTitle: {
    fontSize: fonts.sizes.lg,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    textAlign: 'left',
    marginBottom: 2,
  },
  cardTitleEn: {
    fontSize: fonts.sizes.sm,
    color: colors.textMuted,
    textAlign: 'left',
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: fonts.sizes.sm,
    color: colors.textMuted,
    textAlign: 'left',
    marginBottom: 6,
  },
  cardUrl: {
    fontSize: fonts.sizes.xs,
    color: '#8b5cf6',
    marginBottom: 14,
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 14,
  },

  // ── Card actions ──
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.md,
  },
  actionBtnText: {
    color: colors.text,
    fontSize: fonts.sizes.xs,
  },
  actionBtnWarn: {
    borderColor: colors.warning,
  },
  actionBtnWarnText: {
    color: colors.warningText,
  },
  actionBtnDanger: {
    borderColor: colors.destructive,
  },
  actionBtnDangerText: {
    color: colors.destructiveText,
    fontSize: fonts.sizes.xs,
  },

  // ── Empty ──
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
    gap: 12,
  },
  emptyText: {
    color: colors.textDim,
    fontSize: fonts.sizes.sm,
  },

  // ── Primary button ──
  btnPrimary: {
    backgroundColor: colors.text,
    paddingVertical: 10,
    paddingHorizontal: 16,
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

  // ── Form ──
  formGroup: {
    marginBottom: spacing.lg,
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
    paddingHorizontal: 12,
    color: colors.text,
    fontSize: fonts.sizes.sm,
  },
  inputRTL: {
    textAlign: 'right',
  },
  hint: {
    color: colors.textDim,
    fontSize: fonts.sizes.xs,
    marginTop: 4,
    textAlign: 'left',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: spacing.xl,
    gap: 12,
  },
  switchLabel: {
    color: colors.textMuted,
    fontSize: fonts.sizes.sm,
  },

  // ── Toggle ──
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

  // ── Modal ──
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 1,
  },
  modalContent: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing['2xl'],
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 2,
  },
  modalTitle: {
    fontSize: fonts.sizes.xl,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    textAlign: 'left',
    marginBottom: spacing.xl,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalBtn: {
    minWidth: 100,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: radius.md,
  },
  modalBtnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalBtnOutlineText: {
    color: colors.text,
    fontSize: fonts.sizes.sm,
  },
  modalBtnPrimary: {
    backgroundColor: colors.text,
  },
  modalBtnPrimaryText: {
    color: colors.bg,
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.medium,
  },

  // ── Dialog ──
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  dialogContent: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing['2xl'],
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dialogTitle: {
    fontSize: fonts.sizes.lg,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  dialogMessage: {
    fontSize: fonts.sizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  dialogBtnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: radius.md,
  },
  dialogBtnOutlineText: {
    color: colors.text,
    fontSize: fonts.sizes.sm,
  },
  dialogBtnPrimary: {
    backgroundColor: colors.text,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: radius.md,
  },
  dialogBtnPrimaryText: {
    color: colors.bg,
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.medium,
  },
  dialogBtnDestructive: {
    backgroundColor: colors.destructive,
  },
  dialogBtnDestructiveText: {
    color: colors.destructiveText,
  },
});
