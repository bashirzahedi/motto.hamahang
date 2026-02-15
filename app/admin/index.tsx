import { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Modal, ScrollView, Platform } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, fonts } from '../../lib/theme';
import { DatePicker, formatDateShort } from '../../components/admin/DatePicker';
import { useAdminData } from '../../hooks/useAdminData';
import { useAdminAuth } from '../../lib/adminAuth';

type IconName = keyof typeof Ionicons.glyphMap;

const MOBILE_BREAKPOINT = 768;

/** Subtract days from a YYYY-MM-DD string. Pure UTC math, no timezone logic. */
function subtractDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - days);
  const yy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

type DateFilter = 'today' | 'week' | 'all' | 'custom';

interface CityDay {
  city: string;
  date: string;
  visitor_count: number;
}

export default function DashboardPage() {
  return <Dashboard />;
}

function Dashboard() {
  const { isSuperAdmin } = useAdminAuth();
  const isMobile = useIsMobile();
  const [stats, setStats] = useState({
    totalSlangs: 0,
    activeSlangs: 0,
    totalSuggestions: 0,
    activeCities: 0,
  });
  const [serverToday, setServerToday] = useState('');

  // Daily presence
  const [presenceData, setPresenceData] = useState<CityDay[]>([]);
  const [presenceLoading, setPresenceLoading] = useState(true);
  const [filter, setFilter] = useState<DateFilter>('today');
  const [customDate, setCustomDate] = useState('');

  // Confirm dialog
  const [dialog, setDialog] = useState({ visible: false, title: '', message: '', cityDate: '' });
  const dialogResolveRef = useRef<((confirmed: boolean) => void) | null>(null);

  const showConfirm = (title: string, message: string) => {
    return new Promise<boolean>((resolve) => {
      dialogResolveRef.current = resolve;
      setDialog({ visible: true, title, message, cityDate: '' });
    });
  };

  const handleDialogClose = (confirmed: boolean) => {
    setDialog((d) => ({ ...d, visible: false }));
    dialogResolveRef.current?.(confirmed);
    dialogResolveRef.current = null;
  };

  // Fetch server date + stats — with safety timeout & visibility re-fetch
  const { loading } = useAdminData(async () => {
    const { data: dateData } = await supabase.rpc('get_server_date');
    const today = typeof dateData === 'string' ? dateData : '';
    setServerToday(today);

    const [slangsRes, suggestionsRes, presenceRes] = await Promise.all([
      supabase.from('slangs').select('id, is_active'),
      supabase.from('suggestions').select('id'),
      today
        ? supabase.from('daily_presence').select('city').eq('date', today)
        : Promise.resolve({ data: [] }),
    ]);

    const slangs = slangsRes.data || [];
    const uniqueCities = new Set((presenceRes.data || []).map((r: any) => r.city));
    setStats({
      totalSlangs: slangs.length,
      activeSlangs: slangs.filter((s: any) => s.is_active).length,
      totalSuggestions: suggestionsRes.data?.length || 0,
      activeCities: uniqueCities.size,
    });
  });

  const fetchPresence = useCallback(async () => {
    try {
      if (!serverToday) return;

      let query = supabase.from('daily_presence').select('city, date');

      if (filter === 'today') {
        query = query.eq('date', serverToday);
      } else if (filter === 'week') {
        query = query.gte('date', subtractDays(serverToday, 7));
      } else if (filter === 'custom' && customDate) {
        query = query.eq('date', customDate);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Group by city+date client-side
      const groups = new Map<string, CityDay>();
      for (const row of data || []) {
        const key = `${row.city}-${row.date}`;
        const existing = groups.get(key);
        if (existing) {
          existing.visitor_count++;
        } else {
          groups.set(key, { city: row.city, date: row.date, visitor_count: 1 });
        }
      }

      const sorted = Array.from(groups.values()).sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.visitor_count - a.visitor_count;
      });

      setPresenceData(sorted);
    } catch (error) {
      console.error('Error fetching presence:', error);
    } finally {
      setPresenceLoading(false);
    }
  }, [filter, customDate, serverToday]);

  useEffect(() => {
    setPresenceLoading(true);
    fetchPresence();
  }, [fetchPresence]);

  // Re-fetch presence when Safari tab resumes from suspension
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const handler = () => {
      if (document.visibilityState === 'visible' && serverToday) {
        fetchPresence();
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [fetchPresence, serverToday]);

  const deletePresence = async (city: string, date: string) => {
    const confirmed = await showConfirm('Delete Record', `Delete all data for ${city} on ${formatDateShort(date)}?`);
    if (!confirmed) return;
    try {
      const { error } = await supabase
        .from('daily_presence')
        .delete()
        .eq('city', city)
        .eq('date', date);
      if (error) throw error;
      fetchPresence();
    } catch (error) {
      console.error('Error deleting presence:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.textMuted} />
      </View>
    );
  }

  const STAT_CARDS: { value: number; label: string; icon: IconName; color: string }[] = [
    { value: stats.totalSlangs, label: 'Total Slogans', icon: 'list-outline', color: '#3b82f6' },
    { value: stats.activeSlangs, label: 'Active Slogans', icon: 'checkmark-circle-outline', color: '#22c55e' },
    { value: stats.totalSuggestions, label: 'Total Suggestions', icon: 'bulb-outline', color: '#8b5cf6' },
    { value: stats.activeCities, label: 'Active Cities Today', icon: 'location-outline', color: '#ef4444' },
  ];

  const FilterButton = ({ value, label }: { value: DateFilter; label: string }) => (
    <Pressable
      onPress={() => {
        setFilter(value);
        if (value !== 'custom') setCustomDate('');
      }}
      style={[styles.filterBtn, filter === value && styles.filterBtnActive]}
    >
      <Text style={[styles.filterBtnText, filter === value && styles.filterBtnTextActive]}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.containerContent}>
      {/* Stats grid */}
      <View style={[styles.statsGrid, isMobile && styles.statsGridMobile]}>
        {STAT_CARDS.map((stat) => (
          <View key={stat.label} style={[styles.statCard, isMobile && styles.statCardMobile]}>
            <View style={styles.statHeader}>
              <Ionicons name={stat.icon} size={18} color={stat.color} />
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
            <Text style={[styles.statValue, { color: stat.color }, isMobile && styles.statValueMobile]}>
              {stat.value.toLocaleString('en')}
            </Text>
          </View>
        ))}
      </View>

      {/* Daily presence section */}
      <View style={[styles.sectionHeader, isMobile && styles.sectionHeaderMobile]}>
        <Text style={styles.sectionTitle}>Daily Presence Stats</Text>
        <View style={styles.filterRow}>
          <FilterButton value="today" label="Today" />
          <FilterButton value="week" label="This Week" />
          <FilterButton value="all" label="All" />
          <DatePicker
            max={serverToday}
            value={customDate}
            isActive={filter === 'custom'}
            onSelect={(val) => {
              setCustomDate(val);
              setFilter('custom');
            }}
          />
        </View>
      </View>

      {presenceLoading && presenceData.length === 0 ? (
        <View style={styles.peaksLoading}>
          <ActivityIndicator size="small" color={colors.textMuted} />
        </View>
      ) : presenceData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="file-tray-outline" size={36} color={colors.textDim} />
          <Text style={styles.emptyText}>No data recorded yet</Text>
        </View>
      ) : (
        <View style={styles.presenceGrid}>
          {presenceData.map((item) => (
            <View key={`${item.city}-${item.date}`} style={styles.presenceCard}>
              <View style={styles.presenceMain}>
                <View style={styles.presenceInfo}>
                  <Text style={styles.cityName}>{item.city}</Text>
                  <Text style={styles.dateText}>{formatDateShort(item.date)}</Text>
                </View>
                <View style={styles.presenceCount}>
                  <Text style={styles.presenceValue}>{item.visitor_count.toLocaleString('en')}</Text>
                  <Text style={styles.presenceLabel}>users</Text>
                </View>
              </View>
              {isSuperAdmin && (
                <Pressable onPress={() => deletePresence(item.city, item.date)} style={styles.deleteBtn}>
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>
      )}

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
              <Pressable style={styles.dialogBtnDestructive} onPress={() => handleDialogClose(true)}>
                <Text style={styles.dialogBtnDestructiveText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
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

  // ── Stats ──
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  statsGridMobile: {
    gap: 10,
  },
  statCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    minWidth: 180,
    flexGrow: 1,
    flexBasis: '30%',
  },
  statCardMobile: {
    flexBasis: '46%',
    minWidth: 0,
    padding: 14,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  statLabel: {
    fontSize: fonts.sizes.sm,
    color: colors.textMuted,
  },
  statValue: {
    fontSize: 36,
    fontWeight: fonts.weights.bold,
    color: colors.text,
  },
  statValueMobile: {
    fontSize: 28,
  },

  // ── Section ──
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeaderMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 10,
  },
  sectionTitle: {
    fontSize: fonts.sizes.lg,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
  },
  filterBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterBtnActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  filterBtnText: {
    color: colors.textMuted,
    fontSize: fonts.sizes.xs,
  },
  filterBtnTextActive: {
    color: colors.bg,
    fontWeight: fonts.weights.medium,
  },

  // ── Empty ──
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  emptyText: {
    color: colors.textDim,
    fontSize: fonts.sizes.sm,
  },
  peaksLoading: {
    padding: 32,
    alignItems: 'center',
  },

  // ── Presence cards ──
  presenceGrid: {
    gap: 10,
  },
  presenceCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  presenceMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 20,
  },
  presenceInfo: {
    flex: 1,
  },
  cityName: {
    fontSize: fonts.sizes.md,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  dateText: {
    fontSize: fonts.sizes.xs,
    color: colors.textDim,
  },
  presenceCount: {
    alignItems: 'center',
  },
  presenceValue: {
    fontSize: fonts.sizes.xl,
    fontWeight: fonts.weights.bold,
    color: '#3b82f6',
  },
  presenceLabel: {
    fontSize: fonts.sizes.xs,
    color: colors.textDim,
  },
  deleteBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    backgroundColor: colors.destructive,
    marginStart: 12,
  },
  deleteBtnText: {
    color: colors.destructiveText,
    fontSize: fonts.sizes.xs,
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
  dialogBtnDestructive: {
    backgroundColor: colors.destructive,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: radius.md,
  },
  dialogBtnDestructiveText: {
    color: colors.destructiveText,
    fontSize: fonts.sizes.sm,
  },
});
