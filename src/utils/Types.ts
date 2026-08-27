import { StyleProp, TextStyle } from "react-native";

export type ParamList = {
  HomeScreen: {
    from: string | any;
  }
};

export type TopTabNameProps = {
  focused: boolean;
  tabName: string;
};

export type RootStackParamList = {
  LoginScreen: undefined;
  SignUpScreen: undefined;
  AccountPendingScreen: undefined;
  CustomerDetails: undefined;
  TourPlanPage: undefined;
  ForceUpdateScreen: undefined;
  CreatePlan: undefined;
  BottomTab: undefined;
  CustomerList: undefined;
  AddCustomer:undefined;
  AttendanceReport:undefined;
  ExpenseReport:undefined;
  UserActivityPage:undefined;
  ProductCatalogue:undefined;
  SubmitOrder:undefined;
  AddNewExpense:undefined;
  AttendanceScreen:undefined;
  AddSecondaryCustomer:undefined;
  VisitReport:undefined;
  CustomerActivity: { entityId: number | string; entityType?: string; customerName?: string } | undefined;
  RetailerLoyalty: { retailerId: number | string; customerName?: string } | undefined;
  RetailerSchemeDetail: { retailerId: number | string; schemeId: number | string; schemeName?: string } | undefined;
  LoyaltyMenu: undefined;
  LoyaltyNewInvoice: { invoice?: any } | undefined;
  UserTourList:undefined;
  BeatCustomerList:undefined;
  OrderHistoryDetailsScreen:undefined
  Reports:undefined
  OrderListDetails:undefined
  IndividualPage:undefined
  AttendanceViewAllScreen:undefined
  TargetArchieViewAllScreen:undefined
  RetailersPerformanceViewAllScreen:undefined
  ActivityForm: {id?: number; type: 'nukkad'|'retailer'|'farmer'|'influencer'; readOnly?: boolean};
  ActivitySummary: undefined;
  MyProfile: undefined;
};

export type AppTextProps = {
  size?: number,
  color?: string,
  family?: 'InterBlack' | 'InterBold' | 'InterExtraBold' | 'InterExtraLight' | 'InterLight' | "InterMedium" | 'InterRegular' | 'InterSemiBold' | 'InterThin'
  align?: 'left' | 'center' | 'right' | 'justify'
  transform?: 'capitalize' | 'lowercase' | 'uppercase' | 'none'
  numLines?: number
  children?: React.ReactNode | React.ReactNode[]
  testID?: string,
  animateValue?: any,
  customColor?: string,
  spacing?: number | string | any,
  horizontal?: number | string | any,
  underlineColor?: string,
  underline?: 'underline' | 'line-through' | 'none' | 'underline line-through'
  textDecorationStyle?: 'dashed' | 'dotted' | 'solid' | 'double'
  onPress?: () => void,
  handleTextLayout?: (e: any) => void,
  dotMode?: 'head' | 'tail' | 'middle' | 'clip'
  width?: number | string | any
  maxWidth?: number | string | any
  opacity?: number | string | any
  lineHeight?: number | string | any
  fontStyle?: any
  style?: StyleProp<TextStyle>;
}

export type loginParmas ={
  username: any
  password: any
  app_version?: any
  device_name?: any
  device_type?: any
  unique_id?: any
}

export type signupParmas ={
  name: any
  mobile: any
  email: any
  password: any
}
