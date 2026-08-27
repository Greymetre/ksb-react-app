import React, { useMemo, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import AppText from '../../components/AppText/AppText';
import { colors } from '../../utils/Colors';
import { datePickerStyles as styles } from './styles';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

type Props = {
  visible: boolean;
  value: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
  title?: string;
};

/**
 * A month at a time, and nothing after today.
 *
 * The platform picker renders inline on iOS and lands on top of whatever is behind it,
 * and its "maximum date" only greys the spinner rather than saying anything. An invoice
 * cannot be dated into the future, so future days here are drawn plainly dead: not
 * pressable, and the arrow that would walk into next month is disabled too.
 */
const DatePickerModal = ({ visible, value, onSelect, onClose, title = 'Invoice date' }: Props) => {
  const today = startOfDay(new Date());
  const [cursor, setCursor] = useState(new Date(value.getFullYear(), value.getMonth(), 1));

  // Reopening should start on the month of whatever is currently chosen.
  React.useEffect(() => {
    if (visible) setCursor(new Date(value.getFullYear(), value.getMonth(), 1));
  }, [visible, value]);

  const days = useMemo(() => {
    const firstWeekday = new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay();
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = Array(firstWeekday).fill(null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), day));
    }
    return cells;
  }, [cursor]);

  const atCurrentMonth =
    cursor.getFullYear() === today.getFullYear() && cursor.getMonth() === today.getMonth();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={event => event.stopPropagation()}>
          <AppText size={12} family="InterSemiBold" color="black" opacity={0.45}>{title.toUpperCase()}</AppText>

          <View style={styles.monthRow}>
            <Pressable
              hitSlop={12}
              style={styles.arrow}
              onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
              <AppText size={18} color="black" opacity={0.6}>‹</AppText>
            </Pressable>

            <AppText size={16} family="InterSemiBold" color="black">
              {`${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`}
            </AppText>

            <Pressable
              hitSlop={12}
              disabled={atCurrentMonth}
              style={[styles.arrow, atCurrentMonth && styles.arrowDisabled]}
              onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
              <AppText size={18} color="black" opacity={atCurrentMonth ? 0.2 : 0.6}>›</AppText>
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAYS.map((day, index) => (
              <View key={`${day}-${index}`} style={styles.cell}>
                <AppText size={11} family="InterSemiBold" color="black" opacity={0.35}>{day}</AppText>
              </View>
            ))}
          </View>

          <View style={styles.grid}>
            {days.map((day, index) => {
              if (!day) return <View key={`blank-${index}`} style={styles.cell} />;
              const future = day.getTime() > today.getTime();
              const selected = sameDay(day, value);
              const isToday = sameDay(day, today);
              return (
                <Pressable
                  key={day.toISOString()}
                  disabled={future}
                  style={styles.cell}
                  onPress={() => {
                    onSelect(day);
                    onClose();
                  }}>
                  <View style={[styles.day, selected && styles.daySelected, !selected && isToday && styles.dayToday]}>
                    <AppText
                      size={13.5}
                      family={selected ? 'InterSemiBold' : 'InterMedium'}
                      color={selected ? 'white' : 'black'}
                      opacity={selected ? 1 : future ? 0.22 : 0.8}>
                      {String(day.getDate())}
                    </AppText>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.footer}>
            <Pressable onPress={onClose} hitSlop={10}>
              <AppText size={13} family="InterSemiBold" color="black" opacity={0.5}>Cancel</AppText>
            </Pressable>
            <Pressable
              hitSlop={10}
              onPress={() => {
                onSelect(today);
                onClose();
              }}>
              <AppText size={13} family="InterSemiBold" customColor={colors.blue}>Today</AppText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default DatePickerModal;
