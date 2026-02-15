import { useState, useRef } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Modal } from 'react-native';
import { Redirect } from 'expo-router';
import { useAdminAuth, getSupabaseAccessToken, type AdminUser } from '../../lib/adminAuth';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, fonts } from '../../lib/theme';
import { useAdminData } from '../../hooks/useAdminData';

const PAGE_OPTIONS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'slangs', label: 'Slogans' },
  { key: 'notice', label: 'Notice' },
  { key: 'about', label: 'About' },
  { key: 'privacy', label: 'Privacy' },
  { key: 'links', label: 'Links' },
];

interface DialogState {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
}

interface CreateForm {
  email: string;
  password: string;
  display_name: string;
  is_super_admin: boolean;
  allowed_pages: string[];
}

interface EditForm {
  display_name: string;
  is_super_admin: boolean;
  allowed_pages: string[];
  is_active: boolean;
}

const emptyCreateForm: CreateForm = {
  email: '',
  password: '',
  display_name: '',
  is_super_admin: false,
  allowed_pages: [],
};

export default function UsersPage() {
  const { isSuperAdmin, user } = useAdminAuth();

  if (!isSuperAdmin) {
    return <Redirect href="/admin" />;
  }

  return <UsersContent currentUserId={user?.id} />;
}

function UsersContent({ currentUserId }: { currentUserId?: string }) {
  const { refetchAdmin } = useAdminAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [saving, setSaving] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [createForm, setCreateForm] = useState<CreateForm>(emptyCreateForm);
  const [editForm, setEditForm] = useState<EditForm>({
    display_name: '',
    is_super_admin: false,
    allowed_pages: [],
    is_active: true,
  });

  // Confirm dialog
  const [dialog, setDialog] = useState<DialogState>({ visible: false, title: '', message: '' });
  const dialogResolveRef = useRef<((v: boolean) => void) | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  const showConfirm = (title: string, message: string, opts?: { confirmLabel?: string; destructive?: boolean }) => {
    return new Promise<boolean>((resolve) => {
      dialogResolveRef.current = resolve;
      setDialog({ visible: true, title, message, ...opts });
    });
  };

  const handleDialogClose = (confirmed: boolean) => {
    setDialog({ visible: false, title: '', message: '' });
    dialogResolveRef.current?.(confirmed);
    dialogResolveRef.current = null;
  };

  const API_BASE = process.env.EXPO_PUBLIC_API_URL || '';

  const fetchUsers = async () => {
    const token = await getSupabaseAccessToken();
    const res = await fetch(`${API_BASE}/api/admin/list-users`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const { users: data } = await res.json();
      if (data) setUsers(data as AdminUser[]);
    }
  };

  const { loading } = useAdminData(fetchUsers);

  const apiCall = async (url: string, body: Record<string, unknown>) => {
    const token = await getSupabaseAccessToken();
    const res = await fetch(`${API_BASE}${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Request failed');
    }

    return res.json();
  };

  const handleCreate = async () => {
    if (!createForm.email.trim() || !createForm.password.trim()) {
      showToast('Email and password are required', 'error');
      return;
    }
    if (createForm.password.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }

    setSaving(true);
    try {
      await apiCall('/api/admin/create-user', createForm);
      setShowCreateModal(false);
      setCreateForm(emptyCreateForm);
      fetchUsers();
      showToast('User created successfully', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error creating user';
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (user: AdminUser) => {
    setEditingUser(user);
    setEditForm({
      display_name: user.display_name,
      is_super_admin: user.is_super_admin,
      allowed_pages: [...user.allowed_pages],
      is_active: user.is_active,
    });
  };

  const handleEdit = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      await apiCall('/api/admin/update-user', {
        id: editingUser.id,
        ...editForm,
      });
      setEditingUser(null);
      fetchUsers();
      refetchAdmin();
      showToast('User updated successfully', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error updating user';
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user: AdminUser) => {
    if (user.user_id === currentUserId) {
      showToast('Cannot delete your own account', 'error');
      return;
    }

    const confirmed = await showConfirm(
      'Delete User',
      `Are you sure you want to delete ${user.email}? This will also delete their authentication account.`,
      { confirmLabel: 'Delete', destructive: true },
    );
    if (!confirmed) return;

    try {
      await apiCall('/api/admin/delete-user', { user_id: user.user_id });
      fetchUsers();
      showToast('User deleted', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error deleting user';
      showToast(message, 'error');
    }
  };

  const togglePage = (pages: string[], page: string) => {
    return pages.includes(page)
      ? pages.filter(p => p !== page)
      : [...pages, page];
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
        <View style={[styles.toast, toast.type === 'error' && styles.toastError]}>
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.toolbarRow}>
        <Text style={styles.countText}>{users.length} admin users</Text>
        <Pressable style={styles.btnPrimary} onPress={() => { setCreateForm(emptyCreateForm); setShowCreateModal(true); }}>
          <Text style={styles.btnPrimaryText}>+ New User</Text>
        </Pressable>
      </View>

      {/* Users list */}
      {users.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={36} color={colors.textDim} />
          <Text style={styles.emptyText}>No admin users yet</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {users.map((user) => (
            <View key={user.id} style={[styles.userCard, !user.is_active && styles.userCardInactive]}>
              <View style={styles.userCardHeader}>
                <View style={styles.userAvatar}>
                  <Text style={styles.userAvatarText}>
                    {user.email.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.userCardInfo}>
                  <Text style={styles.userCardEmail}>{user.email}</Text>
                  {user.display_name ? (
                    <Text style={styles.userCardName}>{user.display_name}</Text>
                  ) : null}
                </View>
                <View style={styles.headerBadges}>
                  <View style={[styles.badge, user.is_super_admin ? styles.badgeSuper : styles.badgeRegular]}>
                    <Text style={[styles.badgeText, user.is_super_admin ? styles.badgeSuperText : styles.badgeRegularText]}>
                      {user.is_super_admin ? 'Super Admin' : 'Admin'}
                    </Text>
                  </View>
                  {!user.is_active && (
                    <View style={[styles.badge, styles.badgeInactive]}>
                      <Text style={styles.badgeInactiveText}>Disabled</Text>
                    </View>
                  )}
                </View>
              </View>

              {!user.is_super_admin && user.allowed_pages.length > 0 && (
                <View style={styles.pagesRow}>
                  {user.allowed_pages.map(page => (
                    <View key={page} style={styles.pageChip}>
                      <Text style={styles.pageChipText}>{page}</Text>
                    </View>
                  ))}
                </View>
              )}
              {!user.is_super_admin && user.allowed_pages.length === 0 && (
                <Text style={styles.noPages}>No page access assigned</Text>
              )}

              <View style={styles.cardActions}>
                <Pressable style={styles.actionBtn} onPress={() => openEditModal(user)}>
                  <Text style={styles.actionBtnText}>Edit</Text>
                </Pressable>
                {user.user_id !== currentUserId && (
                  <Pressable style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => handleDelete(user)}>
                    <Text style={styles.actionBtnDangerText}>Delete</Text>
                  </Pressable>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Create Modal */}
      <Modal visible={showCreateModal} transparent animationType="fade" onRequestClose={() => setShowCreateModal(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowCreateModal(false)} />
          <View style={styles.modalContent} pointerEvents="auto">
            <Text style={styles.modalTitle}>New Admin User</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={styles.input}
                value={createForm.email}
                onChangeText={(email) => setCreateForm({ ...createForm, email })}
                placeholder="user@example.com"
                placeholderTextColor={colors.textDim}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Password *</Text>
              <TextInput
                style={styles.input}
                value={createForm.password}
                onChangeText={(password) => setCreateForm({ ...createForm, password })}
                placeholder="Min 6 characters"
                placeholderTextColor={colors.textDim}
                secureTextEntry
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Display Name</Text>
              <TextInput
                style={styles.input}
                value={createForm.display_name}
                onChangeText={(display_name) => setCreateForm({ ...createForm, display_name })}
                placeholder="Optional"
                placeholderTextColor={colors.textDim}
              />
            </View>

            <Pressable
              style={styles.switchRow}
              onPress={() => setCreateForm({ ...createForm, is_super_admin: !createForm.is_super_admin })}
            >
              <Text style={styles.switchLabel}>Super Admin</Text>
              <View style={[styles.toggleTrack, createForm.is_super_admin && styles.toggleTrackActive]}>
                <View style={[styles.toggleThumb, createForm.is_super_admin && styles.toggleThumbActive]} />
              </View>
            </Pressable>

            {!createForm.is_super_admin && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Page Access</Text>
                <View style={styles.checkboxGrid}>
                  {PAGE_OPTIONS.map(opt => {
                    const checked = createForm.allowed_pages.includes(opt.key);
                    return (
                      <Pressable
                        key={opt.key}
                        style={[styles.checkbox, checked && styles.checkboxChecked]}
                        onPress={() => setCreateForm({
                          ...createForm,
                          allowed_pages: togglePage(createForm.allowed_pages, opt.key),
                        })}
                      >
                        <Ionicons
                          name={checked ? 'checkbox' : 'square-outline'}
                          size={18}
                          color={checked ? '#a78bfa' : colors.textDim}
                        />
                        <Text style={[styles.checkboxLabel, checked && styles.checkboxLabelChecked]}>
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={styles.modalActions}>
              <Pressable style={[styles.modalBtn, styles.modalBtnOutline]} onPress={() => setShowCreateModal(false)}>
                <Text style={styles.modalBtnOutlineText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnPrimary, saving && styles.btnDisabled]}
                onPress={handleCreate}
                disabled={saving}
              >
                <Text style={styles.modalBtnPrimaryText}>
                  {saving ? 'Creating...' : 'Create'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={!!editingUser} transparent animationType="fade" onRequestClose={() => setEditingUser(null)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setEditingUser(null)} />
          <View style={styles.modalContent} pointerEvents="auto">
            <Text style={styles.modalTitle}>Edit Admin User</Text>
            <Text style={styles.modalSubtitle}>{editingUser?.email}</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Display Name</Text>
              <TextInput
                style={styles.input}
                value={editForm.display_name}
                onChangeText={(display_name) => setEditForm({ ...editForm, display_name })}
                placeholder="Optional"
                placeholderTextColor={colors.textDim}
              />
            </View>

            <Pressable
              style={styles.switchRow}
              onPress={() => setEditForm({ ...editForm, is_super_admin: !editForm.is_super_admin })}
            >
              <Text style={styles.switchLabel}>Super Admin</Text>
              <View style={[styles.toggleTrack, editForm.is_super_admin && styles.toggleTrackActive]}>
                <View style={[styles.toggleThumb, editForm.is_super_admin && styles.toggleThumbActive]} />
              </View>
            </Pressable>

            <Pressable
              style={styles.switchRow}
              onPress={() => setEditForm({ ...editForm, is_active: !editForm.is_active })}
            >
              <Text style={styles.switchLabel}>Active</Text>
              <View style={[styles.toggleTrack, editForm.is_active && styles.toggleTrackActive]}>
                <View style={[styles.toggleThumb, editForm.is_active && styles.toggleThumbActive]} />
              </View>
            </Pressable>

            {!editForm.is_super_admin && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Page Access</Text>
                <View style={styles.checkboxGrid}>
                  {PAGE_OPTIONS.map(opt => {
                    const checked = editForm.allowed_pages.includes(opt.key);
                    return (
                      <Pressable
                        key={opt.key}
                        style={[styles.checkbox, checked && styles.checkboxChecked]}
                        onPress={() => setEditForm({
                          ...editForm,
                          allowed_pages: togglePage(editForm.allowed_pages, opt.key),
                        })}
                      >
                        <Ionicons
                          name={checked ? 'checkbox' : 'square-outline'}
                          size={18}
                          color={checked ? '#a78bfa' : colors.textDim}
                        />
                        <Text style={[styles.checkboxLabel, checked && styles.checkboxLabelChecked]}>
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={styles.modalActions}>
              <Pressable style={[styles.modalBtn, styles.modalBtnOutline]} onPress={() => setEditingUser(null)}>
                <Text style={styles.modalBtnOutlineText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnPrimary, saving && styles.btnDisabled]}
                onPress={handleEdit}
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

      {/* Confirm Dialog */}
      <Modal visible={dialog.visible} transparent animationType="fade" onRequestClose={() => handleDialogClose(false)}>
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogContent}>
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
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerContent: {
    paddingBottom: 48,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: fonts.sizes.sm,
  },

  // -- Toast --
  toast: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: '#166534',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    zIndex: 100,
  },
  toastError: {
    backgroundColor: '#991b1b',
  },
  toastText: {
    color: '#fff',
    fontSize: fonts.sizes.sm,
    textAlign: 'center',
  },

  // -- Toolbar --
  toolbarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  countText: {
    color: colors.textMuted,
    fontSize: fonts.sizes.sm,
  },
  btnPrimary: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.md,
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.medium,
  },

  // -- Empty --
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

  // -- List --
  list: {
    gap: 12,
  },
  userCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userCardInactive: {
    opacity: 0.5,
  },
  userCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: fonts.weights.semibold,
  },
  userCardInfo: {
    flex: 1,
  },
  userCardEmail: {
    color: colors.text,
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.medium,
  },
  userCardName: {
    color: colors.textMuted,
    fontSize: fonts.sizes.xs,
    marginTop: 2,
  },
  headerBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: fonts.weights.medium,
  },
  badgeSuper: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  badgeSuperText: {
    color: '#a78bfa',
  },
  badgeRegular: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  badgeRegularText: {
    color: '#93c5fd',
  },
  badgeInactive: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  badgeInactiveText: {
    color: '#fca5a5',
    fontSize: 11,
    fontWeight: fonts.weights.medium,
  },

  // -- Pages --
  pagesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  pageChip: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pageChipText: {
    color: colors.textMuted,
    fontSize: 11,
  },
  noPages: {
    color: colors.textDim,
    fontSize: fonts.sizes.xs,
    fontStyle: 'italic',
    marginBottom: 12,
  },

  // -- Card Actions --
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 12,
  },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  actionBtnText: {
    color: colors.text,
    fontSize: fonts.sizes.xs,
  },
  actionBtnDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  actionBtnDangerText: {
    color: '#fca5a5',
    fontSize: fonts.sizes.xs,
  },

  // -- Modal --
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
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
  },
  modalContent: {
    backgroundColor: '#18181b',
    borderRadius: radius.xl,
    padding: spacing['2xl'],
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: fonts.sizes.xl,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    textAlign: 'left',
    marginBottom: spacing.sm,
  },
  modalSubtitle: {
    fontSize: fonts.sizes.sm,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: spacing.lg,
  },
  modalBtn: {
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
    backgroundColor: '#8b5cf6',
  },
  modalBtnPrimaryText: {
    color: '#fff',
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.medium,
  },
  btnDisabled: {
    opacity: 0.5,
  },

  // -- Form --
  formGroup: {
    marginBottom: spacing.md,
  },
  label: {
    color: colors.textMuted,
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingVertical: 4,
  },
  switchLabel: {
    color: colors.text,
    fontSize: fonts.sizes.sm,
  },
  toggleTrack: {
    width: 40,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#3f3f46',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleTrackActive: {
    backgroundColor: '#8b5cf6',
  },
  toggleThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#71717a',
  },
  toggleThumbActive: {
    backgroundColor: '#fff',
    alignSelf: 'flex-end',
  },

  // -- Checkboxes --
  checkboxGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    minWidth: '45%',
  },
  checkboxChecked: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  checkboxLabel: {
    color: colors.textMuted,
    fontSize: fonts.sizes.sm,
  },
  checkboxLabelChecked: {
    color: colors.text,
  },

  // -- Dialog --
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  dialogContent: {
    backgroundColor: '#18181b',
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
    marginBottom: spacing.sm,
  },
  dialogMessage: {
    fontSize: fonts.sizes.sm,
    color: colors.textMuted,
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  dialogBtnOutline: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dialogBtnOutlineText: {
    color: colors.text,
    fontSize: fonts.sizes.sm,
  },
  dialogBtnPrimary: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    backgroundColor: '#8b5cf6',
  },
  dialogBtnPrimaryText: {
    color: '#fff',
    fontSize: fonts.sizes.sm,
  },
  dialogBtnDestructive: {
    backgroundColor: colors.destructive,
  },
  dialogBtnDestructiveText: {
    color: colors.destructiveText,
  },
});
