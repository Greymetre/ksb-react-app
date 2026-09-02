import * as React from 'react';
import Svg, { SvgProps, Path } from 'react-native-svg';

/** Tray with an arrow coming down into it - the usual "save this file" mark. */
const ICDownload = (props: SvgProps) => (
  <Svg fill="none" viewBox="0 0 24 24" {...props}>
    <Path
      stroke={props.stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 3v11m0 0 4-4m-4 4-4-4"
    />
    <Path
      stroke={props.stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 16v2a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-2"
    />
  </Svg>
);

export default ICDownload;
