

import { Platform, StyleSheet } from "react-native";
import { rw } from "../../utils/responsive";
import { colors } from "../../utils/Colors";

export const styles = StyleSheet.create({
    container: {
        flex: 1
    },
    sectionContent: {
        backgroundColor: '#fff',
        paddingHorizontal: rw(10),
        paddingVertical: rw(10),
        marginTop: rw(4),
        borderRadius: 8,
        shadowOffset: { width: 4, height: 5 },
        shadowColor: Platform.OS == "ios" ? 'rgba(0,0,0,0.03)' : 'rgba(0,0,0,0.1)',
        shadowOpacity: 1,
        shadowRadius: 5,
        elevation: 8,
    },
    row: {
        flexDirection: "row",
        alignItems: "center"
    },
    UserBox: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#CBD5E0",
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 14,
        marginVertical:10
    },
    uploadBox: {
        height: 69,
        width: 150,
        borderWidth: 2,
        borderColor: 'rgba(57, 82, 153, 1)',
        borderStyle: 'dashed',
        backgroundColor: 'rgba(57, 82, 153, 0.1)',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection:'row',
        gap: 6,
        marginTop: rw(14),
        marginHorizontal:5
    },
    input: {
        flex: 1,
        height: 46,
        color: '#000000',
        fontSize: 14,
        padding: 0,
    },
    calendarPanel: {
        marginBottom: 10,
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        padding: 12,
        gap: 10,
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
    readOnlyBox: {
        backgroundColor: '#F4F6FA',
    },
    existingRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    existingItem: {
        height: 76,
        width: 76,
    },
    existingThumb: {
        height: 76,
        width: 76,
        borderRadius: 8,
        backgroundColor: '#EEF1F6',
    },
    existingDoc: {
        borderWidth: 1,
        borderColor: '#CBD5E0',
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
    },
    existingRemove: {
        position: 'absolute',
        top: -6,
        right: -6,
        height: 22,
        width: 22,
        borderRadius: 11,
        backgroundColor: '#C25050',
        alignItems: 'center',
        justifyContent: 'center',
    },
    noticeBox: {
        backgroundColor: '#FDECEC',
        borderRadius: 8,
        padding: 12,
        gap: 4,
        marginBottom: 4,
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
    buttonView: {
        backgroundColor: colors.blue,
        width: '100%',
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 6,
        marginTop: 15,
        marginBottom:50
    },
})