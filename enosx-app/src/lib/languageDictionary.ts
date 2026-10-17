/**
 * ENOSX AI language dictionary.
 *
 * This is a routing and terminology dictionary for response preferences. It does
 * not replace the underlying model or claim complete coverage of every dialect.
 */
export const ENOSX_LANGUAGES = [
  "English",
  "Kiswahili",
  "French",
  "German",
  "Luhya",
  "Nandi",
  "Latin",
  "Hebrew",
] as const;

export type EnosxLanguage = (typeof ENOSX_LANGUAGES)[number];

export const ENOSX_LANGUAGE_DICTIONARY: Record<EnosxLanguage, {
  nativeName: string;
  instruction: string;
  locale?: string;
}> = {
  English: {
    nativeName: "English",
    instruction: "Use clear, natural English unless another language is requested.",
    locale: "en",
  },
  Kiswahili: {
    nativeName: "Kiswahili",
    instruction: "Use standard Kiswahili; preserve technical names and explain specialist terms when useful.",
    locale: "sw",
  },
  French: {
    nativeName: "Français",
    instruction: "Use natural standard French and preserve names, code, and technical identifiers.",
    locale: "fr",
  },
  German: {
    nativeName: "Deutsch",
    instruction: "Use natural standard German and preserve names, code, and technical identifiers.",
    locale: "de",
  },
  Luhya: {
    nativeName: "Luhya",
    instruction: "Use Luhya when the user specifies a preferred variety; ask which variety only when it materially affects accuracy.",
  },
  Nandi: {
    nativeName: "Nandi",
    instruction: "Use Nandi when reasonably possible and be transparent if a dialect or specialist term is uncertain.",
  },
  Latin: {
    nativeName: "Latina",
    instruction: "Use readable Latin and preserve modern technical names when a precise classical equivalent is unclear.",
    locale: "la",
  },
  Hebrew: {
    nativeName: "עברית",
    instruction: "Use natural Hebrew, preserve code and names, and retain right-to-left readability where supported.",
    locale: "he",
  },
};

export const ENOSX_LANGUAGE_PROMPT = ENOSX_LANGUAGES
  .map((language) => `- ${language}: ${ENOSX_LANGUAGE_DICTIONARY[language].instruction}`)
  .join("\n");
