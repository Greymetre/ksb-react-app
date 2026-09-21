
/* AAROH brand, from the logo: its orange is the app's main colour (headers, buttons, active
   states), its amber-to-red is the header gradient, and its navy is kept for accents in text.
   `blue` keeps its name because 300+ screens read it; it is the brand orange now. */
export const colors = {
  black: "#000000",
  white: "#fff",
  // The VRiDDHi (Loyalty) app's palette: its brown-gold ramp for everything the brand colour
  // fills, its navy for text. `blue` keeps its name because 300+ screens read it.
  blue: "#8A5A08",
  primary: "#8A5A08",
  primaryDark: "#744A07",
  lightBlue: "#B1780F",
  orange: "#8A5A08",
  lightOrange: "#B1780F",
  amber: "#F5A623",
  gold: "#FFD54A",
  ember: "#744A07",
  orangeSoft: "#FAF0DD",
  goldSoft: "#FFF7D6",
  navy: "#11325B",
  navy2: "#173C68",
  gray: "#718096",
  bgColor: "#f1f1f3",
  offWHite:"#F2F2F4"
};

/** The brand gradient (same stops as gradients.brand) as a style value, for any View: buttons,
 *  chips, selected states and coloured cards. The brand colour is the fallback underneath it. */
export const BRAND_GRADIENT = 'linear-gradient(135deg, #744A07 0%, #8A5A08 35%, #B1780F 70%, #C99518 100%)';

export const gradients = {
  // VRiDDHi's main ramp: deep brown through to gold.
  brand: ["#744A07", "#8A5A08", "#B1780F", "#C99518"],
  stops: [0, 0.35, 0.7, 1],
};


export const graySteps = 8
// latest grey color to change all screens background and top bar
export function grayStep(step: number, alpha: number = 1.0): string {
  if (step > graySteps) {
    console.warn(
      `function getGray called with step greater than configured steps. Using ${graySteps} instead.`,
    )
    step = graySteps
  } else if (step < 0) {
    console.warn(
      'function getGray called with step less than zero. Using 0 instead.',
    )
    step = 0
  }
  return `hsla(0, 0%, ${(1 / graySteps) * 100 * (graySteps - step)}%, ${alpha})`
  // return latestGrey
}

// export const black1212 = '#121212'
// export const grey9898 = '#989898'