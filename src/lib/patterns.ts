// Verbosity patterns for static analysis

export interface Pattern {
  name: string;
  category: "article" | "filler" | "pleasantry" | "hedging" | "redundant";
  // For redundant phrases: [match, replacement]
  // For others: regex pattern strings
  patterns: string[] | [string, string][];
  weight: number; // contribution to verbosity score
}

// Word-boundary article patterns
export const ARTICLES: Pattern = {
  name: "Articles",
  category: "article",
  patterns: ["\\ba\\b", "\\ban\\b", "\\bthe\\b"],
  weight: 0.5, // high frequency, low individual impact
};

export const FILLER_WORDS: Pattern = {
  name: "Filler words",
  category: "filler",
  patterns: [
    "\\bjust\\b",
    "\\breally\\b",
    "\\bbasically\\b",
    "\\bactually\\b",
    "\\bsimply\\b",
    "\\bessentially\\b",
    "\\bcertainly\\b",
    "\\bvery\\b",
    "\\bquite\\b",
    "\\brather\\b",
    "\\bsomewhat\\b",
    "\\bpretty\\b",
    "\\bfairly\\b",
    "\\bkind of\\b",
    "\\bsort of\\b",
    "\\ba bit\\b",
    "\\bof course\\b",
    "\\bobviously\\b",
    "\\bclearly\\b",
    "\\bliterally\\b",
    "\\babsolutely\\b",
    "\\bcompletely\\b",
    "\\btotally\\b",
    "\\bentirely\\b",
    "\\bperfectly\\b",
  ],
  weight: 2,
};

export const PLEASANTRIES: Pattern = {
  name: "Pleasantries",
  category: "pleasantry",
  patterns: [
    "I'?d be happy to",
    "I'?d be glad to",
    "Sure!?",
    "Of course!?",
    "Certainly!?",
    "Absolutely!?",
    "Great question",
    "Excellent question",
    "Good question",
    "No problem!?",
    "No worries!?",
    "You'?re welcome",
    "My pleasure",
    "Feel free to",
    "Don'?t hesitate to",
    "Let me help you",
    "I'?m here to help",
    "I understand",
    "I see",
    "I appreciate",
    "Thank you for",
    "Thanks for",
  ],
  weight: 5,
};

export const HEDGING: Pattern = {
  name: "Hedging phrases",
  category: "hedging",
  patterns: [
    "might be worth",
    "could potentially",
    "it seems like",
    "it appears that",
    "it looks like",
    "may or may not",
    "could be considered",
    "might want to",
    "you might consider",
    "you may want to",
    "potentially could",
    "it is possible that",
    "in some cases",
    "in certain cases",
    "depending on the situation",
    "generally speaking",
    "for the most part",
    "to some extent",
    "in a sense",
    "as it were",
    "so to speak",
    "in a way",
  ],
  weight: 4,
};

// Redundant phrases as [match, replacement] tuples
export const REDUNDANT_PHRASES: Pattern = {
  name: "Redundant phrases",
  category: "redundant",
  patterns: [
    ["in order to", "to"],
    ["at this point in time", "now"],
    ["at the present time", "now"],
    ["due to the fact that", "because"],
    ["in spite of the fact that", "although"],
    ["regardless of the fact that", "although"],
    ["in the event that", "if"],
    ["for the purpose of", "to"],
    ["with regard to", "about"],
    ["with respect to", "about"],
    ["in reference to", "about"],
    ["in relation to", "about"],
    ["in terms of", "in"],
    ["on the basis of", "based on"],
    ["on the part of", "by"],
    ["prior to", "before"],
    ["subsequent to", "after"],
    ["in close proximity to", "near"],
    ["a large number of", "many"],
    ["a majority of", "most"],
    ["a wide variety of", "various"],
    ["make a decision", "decide"],
    ["come to a conclusion", "conclude"],
    ["take into consideration", "consider"],
    ["give consideration to", "consider"],
    ["make an attempt", "attempt"],
    ["make use of", "use"],
    ["in the process of", "while"],
    ["in the case of", "for"],
    ["the fact that", "that"],
    ["it is important to note that", "note:"],
    ["it should be noted that", "note:"],
    ["it is worth noting that", "note:"],
    ["needless to say", ""],
    ["as a matter of fact", "in fact"],
    ["at the end of the day", "ultimately"],
    ["first and foremost", "first"],
    ["each and every", "every"],
    ["any and all", "all"],
    ["various different", "various"],
    ["past history", "history"],
    ["future plans", "plans"],
    ["advance planning", "planning"],
    ["completely finished", "finished"],
    ["totally complete", "complete"],
    ["end result", "result"],
    ["end product", "product"],
    ["basic fundamentals", "fundamentals"],
    ["true facts", "facts"],
  ] as [string, string][],
  weight: 3,
};

export const ALL_PATTERNS: Pattern[] = [
  ARTICLES,
  FILLER_WORDS,
  PLEASANTRIES,
  HEDGING,
  REDUNDANT_PHRASES,
];

export interface PatternMatch {
  pattern: string;
  count: number;
  category: Pattern["category"];
  replacement?: string;
}

export interface LintResult {
  score: number; // 0-100, higher = more verbose
  totalMatches: number;
  wordCount: number;
  byCategory: Record<Pattern["category"], PatternMatch[]>;
  suggestions: string[];
}

export function lintText(text: string): LintResult {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const byCategory: Record<Pattern["category"], PatternMatch[]> = {
    article: [],
    filler: [],
    pleasantry: [],
    hedging: [],
    redundant: [],
  };

  let weightedScore = 0;
  let totalMatches = 0;

  for (const pattern of ALL_PATTERNS) {
    if (pattern.category === "redundant") {
      const pairs = pattern.patterns as [string, string][];
      for (const [match, replacement] of pairs) {
        const re = new RegExp(match, "gi");
        const found = text.match(re);
        if (found) {
          const count = found.length;
          totalMatches += count;
          weightedScore += count * pattern.weight;
          byCategory.redundant.push({
            pattern: match,
            count,
            category: "redundant",
            replacement,
          });
        }
      }
    } else {
      const regexes = pattern.patterns as string[];
      for (const p of regexes) {
        const re = new RegExp(p, "gi");
        const found = text.match(re);
        if (found) {
          const count = found.length;
          totalMatches += count;
          weightedScore += count * pattern.weight;
          byCategory[pattern.category].push({
            pattern: p.replace(/\\b/g, ""),
            count,
            category: pattern.category,
          });
        }
      }
    }
  }

  // Score: normalize to 0-100 based on weighted matches per 100 words
  const density = wordCount > 0 ? (weightedScore / wordCount) * 100 : 0;
  // Cap at 100: density of 50+ = max verbose
  const score = Math.min(100, Math.round((density / 50) * 100));

  const suggestions: string[] = [];
  if (byCategory.pleasantry.length > 0) {
    suggestions.push("Remove pleasantries/openers (no impact on content)");
  }
  if (byCategory.hedging.length > 0) {
    suggestions.push("Replace hedging with direct assertions or omit");
  }
  if (byCategory.redundant.length > 0) {
    const top = byCategory.redundant.slice(0, 3);
    for (const m of top) {
      if (m.replacement) {
        suggestions.push(`"${m.pattern}" -> "${m.replacement}"`);
      }
    }
  }
  if (byCategory.filler.length > 0) {
    suggestions.push("Drop filler words (just, really, basically, actually)");
  }

  return { score, totalMatches, wordCount, byCategory, suggestions };
}
