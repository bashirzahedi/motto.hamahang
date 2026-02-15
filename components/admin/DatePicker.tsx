import { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, fonts } from '../../lib/theme';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const MONTHS_SHORT = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec',
];
const WEEKDAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

/** Format YYYY-MM-DD → "13 Feb 2026" */
export function formatDateShort(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  const month = MONTHS_SHORT[Number(m) - 1];
  return month ? `${Number(d)} ${month} ${y}` : dateStr;
}

/** Parse YYYY-MM-DD → { year, month (0-based), day } */
function parse(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return { year: y, month: m - 1, day: d };
}

/** Format year, month (0-based), day → YYYY-MM-DD */
function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

interface DatePickerProps {
  /** Currently selected date as YYYY-MM-DD, or '' for none */
  value: string;
  /** Maximum selectable date as YYYY-MM-DD */
  max?: string;
  /** Called with YYYY-MM-DD when a date is picked */
  onSelect: (date: string) => void;
  /** Whether the button appears active/highlighted */
  isActive?: boolean;
  /** Button label when no date is selected */
  placeholder?: string;
}

export function DatePicker({
  value,
  max,
  onSelect,
  isActive = false,
  placeholder = 'Pick date',
}: DatePickerProps) {
  const [open, setOpen] = useState(false);

  // Calendar starts at the selected date's month, or today, or max
  const initial = value
    ? parse(value)
    : max
      ? parse(max)
      : { year: new Date().getFullYear(), month: new Date().getMonth(), day: new Date().getDate() };

  const [viewYear, setViewYear] = useState(initial.year);
  const [viewMonth, setViewMonth] = useState(initial.month);

  // Reset calendar view when opening
  useEffect(() => {
    if (open) {
      const start = value
        ? parse(value)
        : max
          ? parse(max)
          : { year: new Date().getFullYear(), month: new Date().getMonth(), day: 0 };
      setViewYear(start.year);
      setViewMonth(start.month);
    }
  }, [open]);

  const maxParsed = max ? parse(max) : null;

  const isDisabled = (year: number, month: number, day: number) => {
    if (!maxParsed) return false;
    const d = toDateStr(year, month, day);
    return d > max!;
  };

  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const nextDisabled = maxParsed
    ? viewYear > maxParsed.year || (viewYear === maxParsed.year && viewMonth >= maxParsed.month)
    : false;

  const selectDay = (day: number) => {
    onSelect(toDateStr(viewYear, viewMonth, day));
    setOpen(false);
  };

  const days = daysInMonth(viewYear, viewMonth);
  const startDay = firstDayOfWeek(viewYear, viewMonth);
  const label = value ? formatDateShort(value) : placeholder;

  // Build calendar grid
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);

  const selectedStr = value || '';

  return (
    <>
      {/* Trigger button */}
      <Pressable
        onPress={() => setOpen(true)}
        style={[s.trigger, isActive && s.triggerActive]}
      >
        <Ionicons
          name="calendar-outline"
          size={13}
          color={isActive ? colors.text : colors.textMuted}
        />
        <Text style={[s.triggerText, isActive && s.triggerTextActive]}>
          {label}
        </Text>
      </Pressable>

      {/* Calendar dropdown as a modal */}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={s.overlay} onPress={() => setOpen(false)}>
          <View style={s.calendar} onStartShouldSetResponder={() => true}>
            {/* Header: month navigation */}
            <View style={s.header}>
              <Pressable onPress={goToPrevMonth} style={s.navBtn} hitSlop={8}>
                <Ionicons name="chevron-back" size={16} color={colors.text} />
              </Pressable>
              <Text style={s.monthLabel}>
                {MONTHS[viewMonth]} {viewYear}
              </Text>
              <Pressable
                onPress={goToNextMonth}
                style={[s.navBtn, nextDisabled && s.navBtnDisabled]}
                disabled={nextDisabled}
                hitSlop={8}
              >
                <Ionicons name="chevron-forward" size={16} color={nextDisabled ? colors.textDim : colors.text} />
              </Pressable>
            </View>

            {/* Weekday labels */}
            <View style={s.weekRow}>
              {WEEKDAYS.map((wd) => (
                <Text key={wd} style={s.weekDay}>{wd}</Text>
              ))}
            </View>

            {/* Day grid */}
            <View style={s.grid}>
              {cells.map((day, i) => {
                if (day === null) {
                  return <View key={`e-${i}`} style={s.cell} />;
                }
                const dateStr = toDateStr(viewYear, viewMonth, day);
                const disabled = isDisabled(viewYear, viewMonth, day);
                const selected = dateStr === selectedStr;
                const isToday = maxParsed && dateStr === max;

                return (
                  <Pressable
                    key={dateStr}
                    onPress={() => !disabled && selectDay(day)}
                    style={[
                      s.cell,
                      selected && s.cellSelected,
                      isToday && !selected && s.cellToday,
                    ]}
                    disabled={disabled}
                  >
                    <Text style={[
                      s.dayText,
                      disabled && s.dayTextDisabled,
                      selected && s.dayTextSelected,
                    ]}>
                      {day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Footer actions */}
            <View style={s.footer}>
              {value ? (
                <Pressable
                  onPress={() => { onSelect(''); setOpen(false); }}
                  style={s.clearBtn}
                >
                  <Text style={s.clearBtnText}>Clear</Text>
                </Pressable>
              ) : <View />}
              <Pressable onPress={() => setOpen(false)} style={s.closeBtn}>
                <Text style={s.closeBtnText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const CELL_SIZE = 36;

const s = StyleSheet.create({
  // Trigger button
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'transparent',
    gap: 6,
  },
  triggerActive: {
    backgroundColor: '#27272a',
    borderColor: '#fafafa',
  },
  triggerText: {
    fontSize: fonts.sizes.xs,
    color: colors.textMuted,
  },
  triggerTextActive: {
    color: colors.text,
  },

  // Modal overlay
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },

  // Calendar card
  calendar: {
    backgroundColor: '#18181b',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    width: 300,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  navBtn: {
    padding: 6,
    borderRadius: radius.sm,
  },
  navBtnDisabled: {
    opacity: 0.3,
  },
  monthLabel: {
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
  },

  // Weekdays
  weekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekDay: {
    width: CELL_SIZE,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: fonts.weights.medium,
    color: colors.textDim,
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: CELL_SIZE / 2,
  },
  cellSelected: {
    backgroundColor: '#8b5cf6',
  },
  cellToday: {
    borderWidth: 1,
    borderColor: colors.textDim,
  },

  // Day text
  dayText: {
    fontSize: 13,
    color: colors.text,
  },
  dayTextDisabled: {
    color: '#3f3f46',
  },
  dayTextSelected: {
    color: '#fff',
    fontWeight: fonts.weights.semibold,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  clearBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
  },
  clearBtnText: {
    color: colors.destructiveText,
    fontSize: fonts.sizes.xs,
  },
  closeBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
  },
  closeBtnText: {
    color: colors.textMuted,
    fontSize: fonts.sizes.xs,
  },
});
