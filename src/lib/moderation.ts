// Text moderation module for VFC Kids
// Applies content filtering for chat messages and comments

// Banned words list (Spanish insults, profanity, threats, explicit)
const BANNED_PATTERNS = [
  // Insultos comunes
  /puta/gi, /puto/gi, /mierda/gi, /joder/gi, /coño/gi, /cojones/gi,
  /gilipollas/gi, /idiota/gi, /imbecil/gi, /subnormal/gi, /retrasado/gi,
  /maricón/gi, /maricon/gi, /marica/gi, /bollera/gi, /zorra/gi,
  /cabrón/gi, /cabron/gi, /hijoputa/gi, /hijo\s*de\s*puta/gi,
  /p[u4]t[a@]/gi, /m[i1]erd[a@]/gi, // Leetspeak
  
  // Blasfemias
  /hostia/gi, /mecagoen/gi, /me\s*cago\s*en/gi,
  
  // Violencia/amenazas
  /te\s*mato/gi, /te\s*voy\s*a\s*matar/gi, /violencia/gi, /muere/gi,
  /suicidate/gi, /suicídate/gi, /matate/gi, /mátate/gi,
  
  // Sexual explícito
  /follar/gi, /sexo/gi, /porno/gi, /desnudo/gi,
  
  // Bullying
  /gordo/gi, /gorda/gi, /feo/gi, /fea/gi, /tonto/gi, /estupido/gi,
  /estúpido/gi, /perdedor/gi, /fracasado/gi, /inutil/gi, /inútil/gi,
  
  // Datos personales patterns
  /\b\d{9}\b/g, // Phone numbers (9 digits)
  /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, // Phone patterns
  
  // URLs/links
  /https?:\/\/[^\s]+/gi,
  /www\.[^\s]+/gi,
  /\.(com|es|net|org|io|app|dev|xyz|club)[^\s]*/gi,
];

// Leetspeak normalization map
const LEETSPEAK_MAP: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '@': 'a',
  '$': 's',
  '!': 'i',
  '(': 'c',
};

// Remove diacritics/accents
function removeDiacritics(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Normalize leetspeak
function normalizeLeetspeak(text: string): string {
  return text.split('').map(char => LEETSPEAK_MAP[char] || char).join('');
}

// Remove separators used to camouflage words (p.u.t.a, p-u-t-a, p_u_t_a)
function removeSeparators(text: string): string {
  return text.replace(/[.\-_*+\s]+(?=[a-zA-Z])/g, '');
}

// Collapse multiple spaces
function collapseSpaces(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export interface ModerationResult {
  isAllowed: boolean;
  reason?: string;
  originalText: string;
  normalizedText: string;
}

/**
 * Moderates text content for inappropriate language
 * Returns whether the text is allowed and the reason if blocked
 */
export function moderateText(text: string): ModerationResult {
  if (!text || text.trim().length === 0) {
    return {
      isAllowed: true,
      originalText: text,
      normalizedText: ''
    };
  }

  // Normalize the text for detection
  let normalized = text.toLowerCase();
  normalized = removeDiacritics(normalized);
  normalized = collapseSpaces(normalized);
  normalized = normalizeLeetspeak(normalized);
  
  // Also check with separators removed
  const withoutSeparators = removeSeparators(normalized);
  
  // Check against banned patterns
  for (const pattern of BANNED_PATTERNS) {
    if (pattern.test(normalized) || pattern.test(withoutSeparators)) {
      // Reset regex lastIndex
      pattern.lastIndex = 0;
      return {
        isAllowed: false,
        reason: 'Lenguaje no permitido. Reformula el mensaje.',
        originalText: text,
        normalizedText: normalized
      };
    }
    // Reset regex lastIndex for next iteration
    pattern.lastIndex = 0;
  }

  // Check for spaced-out bad words (p u t a)
  const spacedPatterns = [
    /p\s*u\s*t\s*[ao]/gi,
    /m\s*i\s*e\s*r\s*d\s*a/gi,
    /j\s*o\s*d\s*e\s*r/gi,
    /c\s*o\s*ñ\s*o/gi,
    /g\s*i\s*l\s*i/gi,
    /i\s*d\s*i\s*o\s*t\s*a/gi,
  ];

  for (const pattern of spacedPatterns) {
    if (pattern.test(normalized)) {
      pattern.lastIndex = 0;
      return {
        isAllowed: false,
        reason: 'Lenguaje no permitido. Reformula el mensaje.',
        originalText: text,
        normalizedText: normalized
      };
    }
    pattern.lastIndex = 0;
  }

  return {
    isAllowed: true,
    originalText: text,
    normalizedText: normalized
  };
}

/**
 * Quick check if text contains banned content
 */
export function isTextAllowed(text: string): boolean {
  return moderateText(text).isAllowed;
}
