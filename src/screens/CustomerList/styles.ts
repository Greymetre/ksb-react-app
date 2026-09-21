import { StyleSheet } from "react-native";
import { colors, BRAND_GRADIENT } from '../../utils/Colors';
import { rw } from "../../utils/responsive";
import { fonts } from "../../utils/typography";

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent'
    },
    row: {
        flexDirection: "row",
        alignItems: "center"
    },
     center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: rw(100)
    },
    // The list below is flex: 1, so without flexShrink: 0 the chip row gets squeezed to a
    // sliver and the chip text is cut; the chips keep a fixed height for the same reason.
    kycChipScroll: {
        flexGrow: 0,
        flexShrink: 0,
        height: 36,
        marginBottom: 12,
    },
    kycChipRow: {
        gap: 8,
        paddingRight: 8,
        alignItems: 'center',
    },
    kycChip: {
        height: 36,
        justifyContent: 'center',
        paddingHorizontal: 14,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "rgba(203, 213, 224, 1)",
        backgroundColor: "rgba(138, 90, 8, 0.07)",
    },
    kycChipActive: {
        backgroundColor: colors.primary, experimental_backgroundImage: BRAND_GRADIENT,
        borderColor: colors.blue,
    },
    UserBox: {
        flex: 0.5,
        height: 48,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "rgba(203, 213, 224, 1)",
        backgroundColor: "rgba(138, 90, 8, 0.07)",
        paddingHorizontal: 14
    },
    textInputMainView: {
        backgroundColor: colors.primary, experimental_backgroundImage: BRAND_GRADIENT,
        padding: rw(2),
        marginTop: rw(20),
        alignItems: "center",
        paddingVertical: rw(1.2),
        paddingHorizontal: rw(10),
        borderRadius: 8,
        flexDirection: "row",
        height: 45,
    },
    listContainer: {
        paddingVertical: rw(12),
    },
    textInput: {
        marginHorizontal: rw(6),
        paddingVertical: 0,
        flex: 1,
        fontSize: 16,
        fontFamily: fonts.InterRegular,
        color: colors.white,
    },
    icon:{
        
    },
});