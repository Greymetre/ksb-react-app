import { StyleSheet } from 'react-native';
import { colors } from '../../utils/Colors';
import { rw } from '../../utils/responsive';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgColor,
  },
  hero: {
    backgroundColor: colors.blue,
    paddingHorizontal: rw(20),
    paddingTop: 22,
    paddingBottom: 26,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarWrap: {
    height: 92,
    width: 92,
    borderRadius: 46,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    height: 92,
    width: 92,
    borderRadius: 46,
    position: 'absolute',
  },
  avatarBusy: {
    position: 'absolute',
    height: 92,
    width: 92,
    borderRadius: 46,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    height: 30,
    width: 30,
    borderRadius: 15,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.blue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroText: {
    flex: 1,
    gap: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  card: {
    backgroundColor: colors.white,
    marginHorizontal: rw(16),
    marginTop: 14,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  cardTitle: {
    paddingTop: 12,
    paddingBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowLabel: {
    width: '42%',
  },
  rowValue: {
    flex: 1,
  },
  loading: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },
  sheetRow: {
    minHeight: 50,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF0F5',
  },
});
