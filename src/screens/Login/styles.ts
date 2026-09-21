import { StyleSheet } from "react-native";
import { colors, BRAND_GRADIENT } from '../../utils/Colors';
import { SCREEN_HEIGHT } from "../../utils/misc";
import { rw } from "../../utils/responsive";
import { fonts } from "../../utils/typography";

export const styles = StyleSheet.create({
    // A warm light top, so the logo shows in its own colours; the form sheet below is white.
    container: {
        flex: 1,
        backgroundColor: 'transparent'
    },
    logoView:{
        height: SCREEN_HEIGHT * 0.4
    },
    subContainer:{
        flex: 1,
        backgroundColor: colors.white,
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        paddingTop: 46,
        borderTopWidth: 3,
        borderColor: colors.orange,
        shadowColor: '#7A2E0A',
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: -4 },
        elevation: 6
    },
    logo:{
        height: 55,
        width: "100%",
    },
    ksbLogo:{
        height: 42,
        width: 140,
        marginTop: 20
    },
    center:{
        justifyContent:"center",
        alignItems: 'center',
    },
    inputCollectionView:{
        marginTop: 32,
        paddingHorizontal: rw(30),
        gap: 4
    },
    input:{
        height: 49,
        width: "100%",
        borderWidth: 1,
        borderColor: "#CBD5E0",
        paddingHorizontal: rw(15),
        borderRadius: 4,
        fontFamily: fonts.InterMedium,
        fontSize: 16,
        color: colors.black
    },
    buttonView:{
        backgroundColor: colors.primary, experimental_backgroundImage: BRAND_GRADIENT,
        width:'100%',
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 6,
        marginTop: 10
    },
});
