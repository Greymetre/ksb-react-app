/**
 * A mobile number is ten digits and nothing else.
 *
 * keyboardType="phone-pad" is not enough on its own: it still offers + * # and ,
 * on iOS, and any keyboard can paste arbitrary text. Every mobile field runs its
 * input through here so the value can never hold anything but digits, and can
 * never grow past ten.
 */
export const toMobileDigits = (text: string) => String(text ?? '').replace(/\D/g, '').slice(0, 10);

/** True only for a complete ten-digit number. */
export const isValidMobile = (value?: string | null) => /^\d{10}$/.test(String(value ?? ''));
