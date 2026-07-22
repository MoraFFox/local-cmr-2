/**
 * Phone formatting utilities.
 *
 * Handles both Arabic (٠-٩) and English (0-9) digits and formats Egyptian
 * phone numbers in a friendly, readable way.
 */

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const ENGLISH_DIGITS = "0123456789";
const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

/**
 * Convert Arabic/Persian digits to English digits.
 */
export const toEnglishDigits = (value: string): string => {
  let result = "";
  for (const char of value) {
    const arabicIndex = ARABIC_DIGITS.indexOf(char);
    if (arabicIndex !== -1) {
      result += ENGLISH_DIGITS[arabicIndex];
      continue;
    }
    const persianIndex = PERSIAN_DIGITS.indexOf(char);
    if (persianIndex !== -1) {
      result += ENGLISH_DIGITS[persianIndex];
      continue;
    }
    result += char;
  }
  return result;
};

/**
 * Strip everything except digits from a phone string.
 */
export const stripNonDigits = (value: string): string =>
  toEnglishDigits(value).replace(/\D/g, "");

const formatMobileNational = (digits: string): string => {
  // digits starts with 01... (11 digits total when complete)
  const part1 = digits.slice(0, 4);
  const part2 = digits.slice(4, 7);
  const part3 = digits.slice(7, 11);
  return [part1, part2, part3].filter(Boolean).join(" ");
};

const formatMobileInternational = (digits: string): string => {
  // digits starts with 20... (12 digits total when complete)
  const part1 = digits.slice(0, 2);
  const part2 = digits.slice(2, 5);
  const part3 = digits.slice(5, 8);
  const part4 = digits.slice(8, 12);
  return [part1, part2, part3, part4].filter(Boolean).join(" ");
};

/**
 * Format a string as an Egyptian phone number.
 *
 * Rules:
 * - Arabic/Persian digits are normalized to English digits.
 * - International numbers starting with +20/0020 are formatted as
 *   "+20 1XX XXX XXXX" or "00 20 1XX XXX XXXX".
 * - National mobile numbers starting with 01 are formatted as
 *   "01XX XXX XXXX".
 * - Land-line numbers (starting with 0, not 01) are formatted as
 *   "0X XXXX XXXX".
 * - Other numbers fall back to the legacy XXXX-XXX-XXXX grouping.
 */
export const formatEgyptianPhone = (value: string): string => {
  if (!value) return "";

  // Preserve a leading + or 00 prefix before stripping digits.
  const hasPlusPrefix = value.trimStart().startsWith("+");
  const hasDoubleZeroPrefix = value.trimStart().startsWith("00");

  let digits = stripNonDigits(value);
  if (!digits) return "";

  // International form: +20 ...
  if (hasPlusPrefix && digits.startsWith("20")) {
    return `+${formatMobileInternational(digits)}`;
  }

  // International form: 0020 ...
  if (hasDoubleZeroPrefix && digits.startsWith("20")) {
    return `00 ${formatMobileInternational(digits)}`;
  }

  // National mobile: 01XXXXXXXXX
  if (digits.startsWith("01") && digits.length <= 11) {
    return formatMobileNational(digits);
  }

  // Landline / other Egyptian numbers: 0X XXXX XXXX
  if (digits.startsWith("0") && digits.length <= 10) {
    const area = digits.slice(0, 2);
    const rest = digits.slice(2);
    if (!rest) return area;
    const chunks = rest.match(/.{1,4}/g) || [rest];
    return `${area} ${chunks.join(" ")}`;
  }

  // Fallback to legacy 4-3-4 grouping.
  const match = digits.match(/^(\d{0,4})(\d{0,3})(\d{0,4})$/);
  if (match) {
    return [match[1], match[2], match[3]].filter(Boolean).join("-");
  }

  return digits;
};

/**
 * Legacy alias used by existing contact handlers in FormWizardView.
 */
export const formatPhoneNumber = formatEgyptianPhone;
