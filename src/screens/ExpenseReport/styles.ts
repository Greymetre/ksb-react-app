import { StyleSheet } from "react-native";
import { colors } from "../../utils/Colors";
import { rw } from "../../utils/responsive";

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.offWHite
    },
    row: {
        flexDirection: "row",
        alignItems: "center"
    },
    filterRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
    },
    UserBox: {
        flex: 1,
        height: 48,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "rgba(203, 213, 224, 1)",
        backgroundColor: "rgba(57, 82, 153, 0.07)",
        paddingHorizontal: 14,
        gap: 8,
    },
    // Holds two lines - the month range and the exact dates - so it needs more
    // room than the single-line pickers above it.
    dateTimeBox: {
        minHeight: 58,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "rgba(203, 213, 224, 1)",
        backgroundColor: "rgba(57, 82, 153, 0.07)",
        paddingHorizontal: 14,
        paddingVertical: 9,
        marginTop: 12,
    },
    calenderICon: {
        height: 32,
        width: 32,
        backgroundColor: 'white',
        borderColor: "#CBD5E0",
        borderWidth: 1,
        borderRadius: 16,
        overflow: 'hidden',
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    approveSubmitBox: {
        marginVertical: 15,
        height: 74,
        borderRadius: 10,
        backgroundColor: 'white',
        paddingHorizontal: 10,
        justifyContent: 'space-between',
    },
    approveView: {
        gap: 10
    },
    fab: {
        position: 'absolute',
        bottom: 40,
        right: 20,
        height: 60,
        width: 60,
        borderRadius: 30,
        backgroundColor: colors.blue,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
    },
    circle: {
        height: 29,
        width: 29,
        borderRadius: 15,
        borderColor: '#339D4F',
        borderWidth: 2,
        padding: 6
    },
    circleInner: {

        backgroundColor: 'transparent',
        height: 18,
        width: 18,
        borderRadius: 12,
        overflow:'hidden'
    },
    todayContainer: {
        marginTop: rw(16),
    },
    todayInput: {
        height: rw(45),
        borderWidth: 1,
        borderColor: '#CBD5E0',
        borderRadius: rw(8),
        paddingHorizontal: rw(12),
        marginTop: rw(12),
        backgroundColor: '#FFFFFF',
        textAlignVertical: 'top',
    },
    submit: {
        paddingHorizontal: 15,
        height: 34,
        borderRadius: 6,
        backgroundColor: colors.blue,
    },
    listItem: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 15,
        marginBottom: 10
    },
    line: {
        width: "100%",
        height: 1,
        backgroundColor: "#D9D9D9",
        marginVertical: 16
    },
    firstPunchIN: {
        flex: 0.32,
        gap: 8
    },
    modalcontainer: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        flex: 1
    },
    modalheader: {
        height: 61,
        backgroundColor: colors.blue,
        width: "100%",
        overflow: 'hidden',
        zIndex: 10,
        marginTop: -14,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        justifyContent: 'center',
        paddingHorizontal: 20

    },
    mainOCntainer: {
        width: "86%",
        paddingTop: 20,
        paddingHorizontal: 20,
        backgroundColor: colors.white
    },
    buttonView: {
        backgroundColor: colors.blue,
        width: '100%',
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 6,
        marginTop: 10
    },
    firstViewModal: {
        flex: 0.55,
        gap: 4
    },
    approveRejectView: {
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 28,
        marginBottom: 20
    },
    selectUser: {
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(203, 213, 224, 1)",
        backgroundColor: 'rgba(57, 82, 153, 0.07)',
        height: 48,
        marginTop: 12,
        paddingHorizontal: 14
    },
    detailOverlay: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    detailBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.55)',
    },
    // The card sizes to its content and only scrolls once it would outgrow the screen.
    detailCard: {
        width: '100%',
        maxHeight: '86%',
        backgroundColor: colors.white,
        borderRadius: 16,
        overflow: 'hidden',
    },
    detailHeader: {
        height: 52,
        backgroundColor: colors.blue,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 18,
    },
    detailClose: {
        height: 36,
        width: 36,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    detailBody: {
        padding: 18,
        gap: 14,
    },
    detailCell: {
        flex: 1,
        gap: 3,
    },
    viewerContainer: {
        flex: 1,
        backgroundColor: 'black',
    },
    viewerClose: {
        height: 50,
        width: 50,
        alignSelf: 'flex-end',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
        zIndex: 2,
    },
    attachmentRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 4,
    },
    attachmentThumb: {
        height: 84,
        width: 84,
        borderRadius: 8,
        backgroundColor: '#EEF1F6',
    },
    attachmentDoc: {
        height: 84,
        width: 84,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#CBD5E0',
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
    },
    // Opens directly under the date filter instead of floating at a screen corner,
    // which is where an iOS picker renders when it has no container of its own.
    calendarPanel: {
        marginTop: 10,
        backgroundColor: colors.white,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        padding: 12,
        gap: 10,
    },
    presetChip: {
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#CBD5E0',
        backgroundColor: colors.white,
        paddingHorizontal: 12,
        height: 32,
        justifyContent: 'center',
    },
    presetChipOn: {
        backgroundColor: colors.blue,
        borderColor: colors.blue,
    },
    rangeChip: {
        flex: 1,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#CBD5E0',
        backgroundColor: '#F7FAFC',
        paddingVertical: 8,
        paddingHorizontal: 12,
        gap: 2,
    },
    rangeChipOn: {
        backgroundColor: colors.blue,
        borderColor: colors.blue,
    },
    inlineCalendar: {
        alignSelf: 'stretch',
    },
    rangeDone: {
        alignSelf: 'flex-end',
        backgroundColor: colors.blue,
        borderRadius: 8,
        paddingHorizontal: 22,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    summaryStrip: {
        marginTop: 14,
        gap: 10,
        backgroundColor: 'white',
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 10,
        justifyContent: 'space-between',
    },
    summaryCell: {
        flex: 1,
        gap: 3,
    },
    summaryDivider: {
        width: 1,
        height: 30,
        backgroundColor: '#E2E8F0',
    },
    loadMore: {
        paddingHorizontal: 18,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.blue,
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        paddingHorizontal: 28,
    },
    selectSheet: {
        backgroundColor: 'white',
        borderRadius: 14,
        padding: 16,
        maxHeight: '75%',
    },
    selectRow: {
        minHeight: 46,
        justifyContent: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#EDF0F5',
    },
    done:{
        backgroundColor: colors.blue,
        paddingHorizontal: 6,
        height: 45,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
});