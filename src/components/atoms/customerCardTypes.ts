/**
 * What the two customer cards actually read off a customer row.
 *
 * The API hands these screens rows straight from the customer master, and the same field
 * arrives under different spellings depending on which endpoint served it - a retailer's
 * phone is `mobile_number` on the secondary-customer list and `mobile` on the primary one.
 * Both spellings are listed here rather than reaching for `any`, so a typo in a card is
 * caught while writing it instead of showing a blank on the phone.
 *
 * Everything is optional: no single endpoint returns all of it.
 */
export interface CustomerCardItem {
  id?: number | string;
  status?: string;

  // Names and pictures
  company?: string;
  legal_name?: string;
  shop_name?: string;
  shop_photo?: string;
  shop_image?: string;
  imageUrl?: any;

  // Where they are
  address?: string;
  address_line?: string;
  shipping_address?: string;
  gps_location?: string;

  // How to reach them
  mobile?: string;
  mobile_number?: string;
  whatsapp_number?: string;
  email?: string | unknown;

  // What kind of customer, spelled four ways across the endpoints
  type?: string;
  customer_type?: string | number;
  customer_type_name?: string;
  customertype_name?: string;
  registration_type?: string;
  distributor_name?: string;

  rating?: string;
  /** The RFM category the server worked out for this retailer, against its own state. */
  rfm_category?: string;

  // The visit this customer is in, if any
  current_visit_is_open?: boolean | number | string;
  last_checkin_id?: string | number;
  last_checkin_date?: any;
  last_checkin_time?: string;
  last_checkout_date?: string;
  last_checkout_time?: string;
}

/**
 * The check-in a card is being shown inside, passed as the `type` prop. Its presence is
 * what tells a card it is the "currently checked in" card rather than a list row.
 */
export interface CurrentCheckin {
  checkin_id?: string | number;
  entity_type?: string;
  entity_details?: CustomerCardItem;
  [key: string]: any;
}
