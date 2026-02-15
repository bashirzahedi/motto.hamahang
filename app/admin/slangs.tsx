import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Modal } from 'react-native';
import { supabase, type Slang, type Suggestion } from '../../lib/supabase';
import { calculateChantDuration } from '../../lib/chantDuration';
import { useSloganVote } from '../../hooks/useSloganVote';
import { useAdminData } from '../../hooks/useAdminData';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, fonts } from '../../lib/theme';
import { PageGuard } from '../../components/admin/PageGuard';

type Tab = 'slangs' | 'suggestions';

interface DialogState {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
}

interface SlangFormData {
  text: string;
  repeat_count: number;
  seconds_per: number;
  is_active: boolean;
}

interface SuggestionFormData {
  text: string;
  repeat_count: number;
  seconds_per: number;
}

const defaultSlangForm: SlangFormData = {
  text: '',
  repeat_count: 3,
  seconds_per: 5,
  is_active: true,
};

export default function SlangsPageGuarded() {
  return <PageGuard pageKey="slangs"><SlangsPage /></PageGuard>;
}

function SlangsPage() {
  const [tab, setTab] = useState<Tab>('slangs');

  // Slangs state
  const [slangs, setSlangs] = useState<Slang[]>([]);
  const [_loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSlang, setEditingSlang] = useState<Slang | null>(null);
  const [formData, setFormData] = useState<SlangFormData>(defaultSlangForm);
  const [saving, setSaving] = useState(false);
  const [sortBy, setSortBy] = useState<'active' | 'newest' | 'most_votes'>('newest');
  const { votes } = useSloganVote();
  const [votingEnabled, setVotingEnabled] = useState(true);
  const [votingSaving, setVotingSaving] = useState(false);
  const [weightedEnabled, setWeightedEnabled] = useState(true);
  const [weightedSaving, setWeightedSaving] = useState(false);

  // Suggestions state
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [sugLoading, setSugLoading] = useState(true);
  const [showSugModal, setShowSugModal] = useState(false);
  const [editingSuggestion, setEditingSuggestion] = useState<Suggestion | null>(null);
  const [sugFormData, setSugFormData] = useState<SuggestionFormData>({ text: '', repeat_count: 3, seconds_per: 5 });
  const [sugSaving, setSugSaving] = useState(false);

  // Confirm/alert dialog
  const [dialog, setDialog] = useState<DialogState>({ visible: false, title: '', message: '' });
  const dialogResolveRef = useRef<((confirmed: boolean) => void) | null>(null);

  const showConfirm = (title: string, message: string, opts?: { confirmLabel?: string; destructive?: boolean }) => {
    return new Promise<boolean>((resolve) => {
      dialogResolveRef.current = resolve;
      setDialog({ visible: true, title, message, confirmLabel: opts?.confirmLabel, destructive: opts?.destructive });
    });
  };

  const showAlert = (title: string, message: string) => {
    return new Promise<boolean>((resolve) => {
      dialogResolveRef.current = resolve;
      setDialog({ visible: true, title, message, confirmLabel: 'OK', destructive: false });
    });
  };

  const handleDialogClose = (confirmed: boolean) => {
    setDialog((d) => ({ ...d, visible: false }));
    dialogResolveRef.current?.(confirmed);
    dialogResolveRef.current = null;
  };

  // --- Slangs logic ---

  const getNetVotes = useCallback((id: string) => {
    const v = votes.get(id);
    return (v?.likes ?? 0) - (v?.dislikes ?? 0);
  }, [votes]);

  const sortedSlangs = useMemo(() => {
    const sorted = [...slangs];
    switch (sortBy) {
      case 'active':
        sorted.sort((a, b) => {
          const aActive = a.is_active ? 1 : 0;
          const bActive = b.is_active ? 1 : 0;
          return bActive - aActive || getNetVotes(b.id) - getNetVotes(a.id);
        });
        break;
      case 'newest':
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'most_votes':
        sorted.sort((a, b) => getNetVotes(b.id) - getNetVotes(a.id));
        break;
    }
    return sorted;
  }, [slangs, sortBy, votes, getNetVotes]);

  const fetchSlangs = async () => {
    try {
      const { data, error } = await supabase
        .from('slangs')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSlangs(data || []);
    } catch (error) {
      console.error('Error fetching slangs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVotingSetting = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'voting_enabled')
        .single();
      if (!error && data) setVotingEnabled(data.value === true);
    } catch {}
  };

  const fetchWeightedSetting = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'weighted_selection_enabled')
        .single();
      if (!error && data) setWeightedEnabled(data.value === true);
    } catch {}
  };

  const toggleVoting = async () => {
    const msg = votingEnabled
      ? 'The vote button will be hidden for all users.'
      : 'Users will be able to vote again.';
    const confirmed = await showConfirm(
      votingEnabled ? 'Disable Voting' : 'Enable Voting',
      msg,
      { confirmLabel: votingEnabled ? 'Disable' : 'Enable', destructive: votingEnabled },
    );
    if (!confirmed) return;

    const newValue = !votingEnabled;
    setVotingSaving(true);
    setVotingEnabled(newValue);
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert(
          { key: 'voting_enabled', value: newValue, updated_at: new Date().toISOString() },
          { onConflict: 'key' },
        );
      if (error) throw error;
    } catch {
      setVotingEnabled(!newValue);
    } finally {
      setVotingSaving(false);
    }
  };

  const toggleWeighted = async () => {
    const msg = weightedEnabled
      ? 'All active slogans will have equal chance of being selected.'
      : 'Slogans with more votes will appear more often.';
    const confirmed = await showConfirm(
      weightedEnabled ? 'Disable Weighted Selection' : 'Enable Weighted Selection',
      msg,
      { confirmLabel: weightedEnabled ? 'Disable' : 'Enable', destructive: weightedEnabled },
    );
    if (!confirmed) return;

    const newValue = !weightedEnabled;
    setWeightedSaving(true);
    setWeightedEnabled(newValue);
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert(
          { key: 'weighted_selection_enabled', value: newValue, updated_at: new Date().toISOString() },
          { onConflict: 'key' },
        );
      if (error) throw error;
    } catch {
      setWeightedEnabled(!newValue);
    } finally {
      setWeightedSaving(false);
    }
  };

  const openAddModal = () => {
    setEditingSlang(null);
    setFormData(defaultSlangForm);
    setShowModal(true);
  };

  const openEditModal = (slang: Slang) => {
    setEditingSlang(slang);
    setFormData({
      text: slang.text,
      repeat_count: slang.repeat_count,
      seconds_per: slang.seconds_per,
      is_active: slang.is_active,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingSlang(null);
    setFormData(defaultSlangForm);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      if (editingSlang) {
        const { error } = await supabase
          .from('slangs')
          .update(formData)
          .eq('id', editingSlang.id);
        if (error) throw error;
      } else {
        const { data: rows } = await supabase
          .from('slangs')
          .select('order_index')
          .order('order_index', { ascending: false })
          .limit(1);
        const nextIndex = (rows?.[0]?.order_index ?? 0) + 1;
        const { error } = await supabase.from('slangs').insert({
          ...formData,
          order_index: nextIndex,
        });
        if (error) throw error;
      }
      closeModal();
      fetchSlangs();
    } catch (error: any) {
      console.error('Error saving slang:', error);
      const msg = error?.message || JSON.stringify(error);
      showAlert('Error', 'Error saving slogan:\n' + msg);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (slang: Slang) => {
    try {
      const { error } = await supabase
        .from('slangs')
        .update({ is_active: !slang.is_active })
        .eq('id', slang.id);
      if (error) throw error;
      fetchSlangs();
    } catch (error) {
      console.error('Error toggling slang:', error);
    }
  };

  const toggleAdminOverride = async (slang: Slang) => {
    try {
      const turningOff = slang.admin_override;
      const update: Record<string, unknown> = { admin_override: !slang.admin_override };
      if (turningOff) {
        const v = votes.get(slang.id);
        const likes = v?.likes ?? 0;
        const dislikes = v?.dislikes ?? 0;
        const hasVotes = likes > 0 || dislikes > 0;
        update.is_active = hasVotes && (likes - dislikes) >= 0;
      }
      const { error } = await supabase.from('slangs').update(update).eq('id', slang.id);
      if (error) throw error;
      fetchSlangs();
    } catch (error) {
      console.error('Error toggling admin override:', error);
    }
  };

  const deleteSlang = async (id: string) => {
    const confirmed = await showConfirm('Delete Slogan', 'Are you sure you want to delete this slogan?', { confirmLabel: 'Delete', destructive: true });
    if (!confirmed) return;
    try {
      const { error } = await supabase.from('slangs').delete().eq('id', id);
      if (error) throw error;
      fetchSlangs();
    } catch (error) {
      console.error('Error deleting slang:', error);
    }
  };

  // --- Suggestions logic ---

  const fetchSuggestions = async () => {
    try {
      const { data, error } = await supabase
        .from('suggestions')
        .select('*')
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      setSuggestions(data || []);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setSugLoading(false);
    }
  };

  const deleteSuggestion = async (id: string) => {
    const confirmed = await showConfirm('Delete Suggestion', 'Are you sure you want to delete this suggestion?', { confirmLabel: 'Delete', destructive: true });
    if (!confirmed) return;
    try {
      const { error } = await supabase.from('suggestions').delete().eq('id', id);
      if (error) throw error;
      fetchSuggestions();
    } catch (error) {
      console.error('Error deleting suggestion:', error);
    }
  };

  const openSugEditModal = (suggestion: Suggestion) => {
    setEditingSuggestion(suggestion);
    setSugFormData({
      text: suggestion.text,
      repeat_count: suggestion.repeat_count,
      seconds_per: suggestion.seconds_per,
    });
    setShowSugModal(true);
  };

  const closeSugModal = () => {
    setShowSugModal(false);
    setEditingSuggestion(null);
    setSugFormData({ text: '', repeat_count: 3, seconds_per: 5 });
  };

  const handleSugSubmit = async () => {
    if (!editingSuggestion) return;
    setSugSaving(true);
    try {
      const { error } = await supabase
        .from('suggestions')
        .update({
          text: sugFormData.text,
          repeat_count: sugFormData.repeat_count,
          seconds_per: sugFormData.seconds_per,
        })
        .eq('id', editingSuggestion.id);
      if (error) throw error;
      closeSugModal();
      fetchSuggestions();
    } catch (error) {
      console.error('Error updating suggestion:', error);
      showAlert('Error', 'Error updating suggestion');
    } finally {
      setSugSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  };

  // --- Init (with safety timeout + visibility re-fetch) ---

  const { loading } = useAdminData(async () => {
    await Promise.all([fetchSlangs(), fetchVotingSetting(), fetchWeightedSetting(), fetchSuggestions()]);
  });

  // --- Loading ---

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // --- Card components ---

  const SlangCard = ({ slang }: { slang: Slang }) => {
    const voteInfo = votes.get(slang.id);
    const likes = voteInfo?.likes ?? 0;
    const dislikes = voteInfo?.dislikes ?? 0;
    return (
      <View style={styles.card}>
        {/* Status bar at top */}
        <View style={[styles.cardStatusBar, slang.is_active ? styles.cardStatusActive : styles.cardStatusInactive]} />

        <View style={styles.cardInner}>
          <View style={styles.cardHeader}>
            <View style={styles.headerBadges}>
              <View style={[styles.badge, slang.is_active ? styles.badgeActive : styles.badgeInactive]}>
                <Text style={[styles.badgeText, slang.is_active ? styles.badgeTextActive : styles.badgeTextInactive]}>
                  {slang.is_active ? 'Active' : 'Inactive'}
                </Text>
              </View>
              <View style={[styles.badge, styles.badgeVote]}>
                <Text style={[styles.badgeText, { color: '#86efac' }]}>{likes}</Text>
                <Text style={[styles.badgeText, { color: colors.bgMuted, marginHorizontal: 4 }]}>|</Text>
                <Text style={[styles.badgeText, { color: colors.destructiveText }]}>{dislikes}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.cardText}>{slang.text}</Text>

          <View style={styles.cardMeta}>
            <View style={styles.metaChip}>
              <Text style={styles.metaText}>{slang.repeat_count} repeats</Text>
            </View>
            <View style={styles.metaChip}>
              <Text style={styles.metaText}>{slang.seconds_per} sec</Text>
            </View>
            <View style={styles.metaChip}>
              <Text style={styles.metaText}>{slang.repeat_count * slang.seconds_per}s total</Text>
            </View>
          </View>

          <View style={styles.cardDivider} />

          <Pressable style={styles.overrideRow} onPress={() => toggleAdminOverride(slang)}>
            <Text style={styles.overrideLabel}>Manual Override</Text>
            <View style={[styles.toggleTrack, slang.admin_override && styles.toggleTrackActive]}>
              <View style={[styles.toggleThumb, slang.admin_override && styles.toggleThumbActive]} />
            </View>
          </Pressable>

          <View style={styles.cardActions}>
            <Pressable style={styles.actionBtn} onPress={() => openEditModal(slang)}>
              <Text style={styles.actionBtnText}>Edit</Text>
            </Pressable>
            {slang.admin_override && (
              <Pressable
                style={[styles.actionBtn, slang.is_active && styles.actionBtnWarn]}
                onPress={() => toggleActive(slang)}
              >
                <Text style={[styles.actionBtnText, slang.is_active && styles.actionBtnWarnText]}>
                  {slang.is_active ? 'Deactivate' : 'Activate'}
                </Text>
              </Pressable>
            )}
            <Pressable style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => deleteSlang(slang.id)}>
              <Text style={styles.actionBtnDangerText}>Delete</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  const SuggestionCard = ({ suggestion }: { suggestion: Suggestion }) => (
    <View style={styles.card}>
      <View style={styles.cardInner}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardDate}>{formatDate(suggestion.submitted_at)}</Text>
        </View>

        <Text style={styles.cardText}>{suggestion.text}</Text>

        <View style={styles.cardMeta}>
          <View style={styles.metaChip}>
            <Text style={styles.metaText}>{suggestion.repeat_count} repeats</Text>
          </View>
          <View style={styles.metaChip}>
            <Text style={styles.metaText}>{suggestion.seconds_per} sec</Text>
          </View>
          <View style={styles.metaChip}>
            <Text style={styles.metaText}>{suggestion.repeat_count * suggestion.seconds_per}s total</Text>
          </View>
        </View>

        {suggestion.notes ? (
          <View style={styles.notesBox}>
            <Text style={styles.notesText}>{suggestion.notes}</Text>
          </View>
        ) : null}

        <View style={styles.cardActions}>
          <Pressable style={styles.actionBtn} onPress={() => openSugEditModal(suggestion)}>
            <Text style={styles.actionBtnText}>Edit</Text>
          </Pressable>
          <Pressable style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => deleteSuggestion(suggestion.id)}>
            <Text style={styles.actionBtnDangerText}>Delete</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  // --- Render ---

  return (
    <View style={styles.container}>
      {/* Tab bar */}
      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tabBtn, tab === 'slangs' && styles.tabBtnActive]}
          onPress={() => setTab('slangs')}
        >
          <Text style={[styles.tabBtnText, tab === 'slangs' && styles.tabBtnTextActive]}>
            Slogans ({slangs.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, tab === 'suggestions' && styles.tabBtnActive]}
          onPress={() => setTab('suggestions')}
        >
          <Text style={[styles.tabBtnText, tab === 'suggestions' && styles.tabBtnTextActive]}>
            Suggestions ({suggestions.length})
          </Text>
        </Pressable>
      </View>

      {tab === 'slangs' ? (
        <>
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
            <Text style={styles.infoText}>Active/inactive status is automatically determined by user votes. You can override it manually.</Text>
          </View>

          <View style={styles.toolbarRow}>
            <View style={styles.sortRow}>
              {(['newest', 'most_votes', 'active'] as const).map((key) => {
                const labels = { newest: 'Newest', most_votes: 'Most Votes', active: 'Active' };
                return (
                  <Pressable
                    key={key}
                    onPress={() => setSortBy(key)}
                    style={[styles.sortChip, sortBy === key && styles.sortChipActive]}
                  >
                    <Text style={[styles.sortChipText, sortBy === key && styles.sortChipTextActive]}>
                      {labels[key]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.toolbarActions}>
              <Pressable style={styles.votingToggle} onPress={toggleWeighted} disabled={weightedSaving}>
                <Text style={styles.votingLabel}>Weighted</Text>
                <View style={[styles.toggleTrack, weightedEnabled && styles.toggleTrackActive]}>
                  <View style={[styles.toggleThumb, weightedEnabled && styles.toggleThumbActive]} />
                </View>
              </Pressable>
              <Pressable style={styles.votingToggle} onPress={toggleVoting} disabled={votingSaving}>
                <Text style={styles.votingLabel}>Voting</Text>
                <View style={[styles.toggleTrack, votingEnabled && styles.toggleTrackActive]}>
                  <View style={[styles.toggleThumb, votingEnabled && styles.toggleThumbActive]} />
                </View>
              </Pressable>
              <Pressable style={styles.btnPrimary} onPress={openAddModal}>
                <Text style={styles.btnPrimaryText}>+ New Slogan</Text>
              </Pressable>
            </View>
          </View>

          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {sortedSlangs.map((slang) => (
              <SlangCard key={slang.id} slang={slang} />
            ))}
          </ScrollView>
        </>
      ) : (
        <>
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
            <Text style={styles.infoText}>Suggestions are automatically added to the slogans list and activated/deactivated by user votes.</Text>
          </View>

          {sugLoading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Loading...</Text>
            </View>
          ) : suggestions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="file-tray-outline" size={36} color={colors.textDim} />
              <Text style={styles.emptyText}>No suggestions found</Text>
            </View>
          ) : (
            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {suggestions.map((suggestion) => (
                <SuggestionCard key={suggestion.id} suggestion={suggestion} />
              ))}
            </ScrollView>
          )}
        </>
      )}

      {/* Slang modal */}
      <Modal visible={showModal} transparent animationType="fade" onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={closeModal} />
          <View style={styles.modalContent} pointerEvents="auto">
            <Text style={styles.modalTitle}>
              {editingSlang ? 'Edit Slogan' : 'New Slogan'}
            </Text>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Slogan Text</Text>
              <TextInput
                style={[styles.input, styles.inputRTL]}
                value={formData.text}
                onChangeText={(text) => setFormData({
                  ...formData,
                  text,
                  seconds_per: calculateChantDuration(text)
                })}
                placeholderTextColor={colors.textDim}
                multiline
                selectTextOnFocus
              />
            </View>
            <View style={styles.formRow}>
              <View style={styles.formGroupSmall}>
                <Text style={styles.label}>Repeats</Text>
                <TextInput
                  style={styles.input}
                  value={String(formData.repeat_count)}
                  onChangeText={(text) => setFormData({ ...formData, repeat_count: parseInt(text) || 1 })}
                  keyboardType="numeric"
                  placeholderTextColor={colors.textDim}
                  selectTextOnFocus
                />
              </View>
              <View style={styles.formGroupSmall}>
                <Text style={styles.label}>Seconds</Text>
                <TextInput
                  style={styles.input}
                  value={String(formData.seconds_per)}
                  onChangeText={(text) => setFormData({ ...formData, seconds_per: parseInt(text) || 1 })}
                  keyboardType="numeric"
                  placeholderTextColor={colors.textDim}
                  selectTextOnFocus
                />
              </View>
            </View>
            <Pressable
              style={styles.switchRow}
              onPress={() => setFormData({ ...formData, is_active: !formData.is_active })}
            >
              <Text style={styles.switchLabel}>Active</Text>
              <View style={[styles.toggleTrack, formData.is_active && styles.toggleTrackActive]}>
                <View style={[styles.toggleThumb, formData.is_active && styles.toggleThumbActive]} />
              </View>
            </Pressable>
            <View style={styles.durationHintBox}>
              <Text style={styles.durationHint}>
                Duration: {formData.repeat_count * formData.seconds_per} seconds
              </Text>
            </View>
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

      {/* Confirm/Alert dialog */}
      <Modal visible={dialog.visible} transparent animationType="fade" onRequestClose={() => handleDialogClose(false)}>
        <Pressable style={styles.dialogOverlay} onPress={() => handleDialogClose(false)}>
          <View style={styles.dialogContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.dialogTitle}>{dialog.title}</Text>
            <Text style={styles.dialogMessage}>{dialog.message}</Text>
            <View style={styles.dialogActions}>
              {dialog.confirmLabel !== 'OK' && (
                <Pressable style={styles.dialogBtnOutline} onPress={() => handleDialogClose(false)}>
                  <Text style={styles.dialogBtnOutlineText}>Cancel</Text>
                </Pressable>
              )}
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

      {/* Suggestion modal */}
      <Modal visible={showSugModal} transparent animationType="fade" onRequestClose={closeSugModal}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={closeSugModal} />
          <View style={styles.modalContent} pointerEvents="auto">
            <Text style={styles.modalTitle}>Edit Suggestion</Text>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Slogan Text</Text>
              <TextInput
                style={[styles.input, styles.inputRTL]}
                value={sugFormData.text}
                onChangeText={(text) => setSugFormData({
                  ...sugFormData,
                  text,
                  seconds_per: calculateChantDuration(text)
                })}
                placeholderTextColor={colors.textDim}
                multiline
                selectTextOnFocus
              />
            </View>
            <View style={styles.formRow}>
              <View style={styles.formGroupSmall}>
                <Text style={styles.label}>Repeats</Text>
                <TextInput
                  style={styles.input}
                  value={String(sugFormData.repeat_count)}
                  onChangeText={(text) => setSugFormData({ ...sugFormData, repeat_count: parseInt(text) || 1 })}
                  keyboardType="numeric"
                  placeholderTextColor={colors.textDim}
                  selectTextOnFocus
                />
              </View>
              <View style={styles.formGroupSmall}>
                <Text style={styles.label}>Seconds</Text>
                <TextInput
                  style={styles.input}
                  value={String(sugFormData.seconds_per)}
                  onChangeText={(text) => setSugFormData({ ...sugFormData, seconds_per: parseInt(text) || 1 })}
                  keyboardType="numeric"
                  placeholderTextColor={colors.textDim}
                  selectTextOnFocus
                />
              </View>
            </View>
            <View style={styles.durationHintBox}>
              <Text style={styles.durationHint}>
                Duration: {sugFormData.repeat_count * sugFormData.seconds_per} seconds
              </Text>
            </View>
            <View style={styles.modalActions}>
              <Pressable style={[styles.modalBtn, styles.modalBtnOutline]} onPress={closeSugModal}>
                <Text style={styles.modalBtnOutlineText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnPrimary, sugSaving && styles.btnDisabled]}
                onPress={handleSugSubmit}
                disabled={sugSaving}
              >
                <Text style={styles.modalBtnPrimaryText}>
                  {sugSaving ? 'Saving...' : 'Save'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
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

  // ── Tabs ──
  tabRow: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radius.md,
    position: 'relative',
  },
  tabBtnActive: {
    backgroundColor: colors.bgHover,
  },
  tabBtnText: {
    color: colors.textDim,
    fontSize: fonts.sizes.sm,
  },
  tabBtnTextActive: {
    color: colors.text,
    fontWeight: fonts.weights.semibold,
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
    flexWrap: 'wrap',
    gap: 10,
  },
  sortRow: {
    flexDirection: 'row',
    gap: 6,
  },
  toolbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  votingToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  votingLabel: {
    color: colors.textMuted,
    fontSize: fonts.sizes.xs,
  },
  sortChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortChipActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  sortChipText: {
    fontSize: fonts.sizes.xs,
    color: colors.textDim,
  },
  sortChipTextActive: {
    color: colors.bg,
    fontWeight: fonts.weights.semibold,
  },
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
  badgeVote: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: fonts.sizes.xs,
    fontWeight: fonts.weights.medium,
  },
  badgeTextActive: {
    color: colors.successText,
  },
  badgeTextInactive: {
    color: colors.textDim,
  },
  cardText: {
    fontSize: fonts.sizes.lg,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    textAlign: 'left',
    marginBottom: 14,
    lineHeight: 30,
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginBottom: 14,
  },
  metaChip: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  cardDate: {
    color: colors.textDim,
    fontSize: fonts.sizes.xs,
  },
  metaText: {
    color: colors.textDim,
    fontSize: fonts.sizes.xs,
  },
  notesBox: {
    backgroundColor: 'rgba(234, 179, 8, 0.08)',
    borderRadius: radius.md,
    padding: 10,
    marginBottom: 14,
  },
  notesText: {
    color: '#eab308',
    fontSize: fonts.sizes.xs,
    textAlign: 'left',
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 14,
  },
  overrideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginBottom: 14,
  },
  overrideLabel: {
    color: colors.textMuted,
    fontSize: fonts.sizes.xs,
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
    maxWidth: 480,
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
  formGroup: {
    marginBottom: spacing.lg,
  },
  formGroupSmall: {
    flex: 1,
    marginHorizontal: 4,
  },
  formRow: {
    flexDirection: 'row',
    marginHorizontal: -4,
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: spacing.lg,
    gap: 12,
  },
  switchLabel: {
    color: colors.textMuted,
    fontSize: fonts.sizes.sm,
  },
  durationHintBox: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: radius.md,
    padding: 10,
    marginBottom: spacing.xl,
  },
  durationHint: {
    color: colors.textDim,
    fontSize: fonts.sizes.sm,
    textAlign: 'left',
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
