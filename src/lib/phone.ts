export const DEFAULT_DIAL_CODE = "+91";

export const COUNTRY_DIAL_CODES: { name: string; dial: string }[] = [
  { name: "India", dial: "+91" },
  { name: "Australia", dial: "+61" },
  { name: "Bangladesh", dial: "+880" },
  { name: "Brazil", dial: "+55" },
  { name: "China", dial: "+86" },
  { name: "France", dial: "+33" },
  { name: "Germany", dial: "+49" },
  { name: "Indonesia", dial: "+62" },
  { name: "Ireland", dial: "+353" },
  { name: "Italy", dial: "+39" },
  { name: "Japan", dial: "+81" },
  { name: "Kenya", dial: "+254" },
  { name: "Kuwait", dial: "+965" },
  { name: "Malaysia", dial: "+60" },
  { name: "Mexico", dial: "+52" },
  { name: "Nepal", dial: "+977" },
  { name: "Netherlands", dial: "+31" },
  { name: "New Zealand", dial: "+64" },
  { name: "Nigeria", dial: "+234" },
  { name: "Oman", dial: "+968" },
  { name: "Pakistan", dial: "+92" },
  { name: "Philippines", dial: "+63" },
  { name: "Poland", dial: "+48" },
  { name: "Portugal", dial: "+351" },
  { name: "Qatar", dial: "+974" },
  { name: "Saudi Arabia", dial: "+966" },
  { name: "Singapore", dial: "+65" },
  { name: "South Africa", dial: "+27" },
  { name: "South Korea", dial: "+82" },
  { name: "Spain", dial: "+34" },
  { name: "Sri Lanka", dial: "+94" },
  { name: "Sweden", dial: "+46" },
  { name: "Switzerland", dial: "+41" },
  { name: "Thailand", dial: "+66" },
  { name: "United Arab Emirates", dial: "+971" },
  { name: "United Kingdom", dial: "+44" },
  { name: "United States / Canada", dial: "+1" },
  { name: "Vietnam", dial: "+84" },
];

const DIAL_BY_LENGTH = [...COUNTRY_DIAL_CODES].sort(
  (a, b) => b.dial.length - a.dial.length,
);

/** Strip to E.164. Bare 10-digit Indian mobiles become +91. */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10 && /^[6-9]/.test(digits)) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (hasPlus && digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;
  return null;
}

export function composePhone(dial: string, national: string): string {
  let local = national.replace(/\D/g, "");
  if (!local) return "";
  const prefix = (dial.startsWith("+") ? dial : `+${dial}`).replace(/[^\d+]/g, "");
  const dialDigits = prefix.replace(/\D/g, "");
  if (local.startsWith("0")) local = local.replace(/^0+/, "");
  if (dialDigits && local.startsWith(dialDigits) && local.length > dialDigits.length) {
    local = local.slice(dialDigits.length);
  }
  if (!local) return "";
  return `${prefix}${local}`;
}

export function splitPhone(raw: string | null | undefined): {
  dial: string;
  national: string;
} {
  const normalized = normalizePhone(raw);
  if (!normalized) {
    return { dial: DEFAULT_DIAL_CODE, national: "" };
  }

  for (const country of DIAL_BY_LENGTH) {
    if (normalized.startsWith(country.dial)) {
      return {
        dial: country.dial,
        national: normalized.slice(country.dial.length),
      };
    }
  }

  return { dial: DEFAULT_DIAL_CODE, national: normalized.replace(/^\+/, "") };
}
