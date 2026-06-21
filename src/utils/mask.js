/** Mask an Aadhaar number for API responses, e.g. "123412341234" -> "XXXX-XXXX-1234". */
export function maskAadhaar(value) {
  if (!value) return value;
  const digits = String(value).replace(/\D/g, "");
  if (digits.length < 4) return "XXXX";
  return `XXXX-XXXX-${digits.slice(-4)}`;
}
