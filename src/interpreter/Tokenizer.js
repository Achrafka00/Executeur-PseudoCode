/**
 * Tokenizer for Moroccan Pseudo-code
 */

export const TokenType = {
  KEYWORD: 'KEYWORD',
  IDENTIFIER: 'IDENTIFIER',
  NUMBER: 'NUMBER',
  STRING: 'STRING',
  OPERATOR: 'OPERATOR',
  PUNCTUATION: 'PUNCTUATION',
  EOF: 'EOF',
  NEWLINE: 'NEWLINE'
};

const KEYWORDS = new Set([
  'ALGORITHME', 'PROGRAMME', 'VAR', 'CONST', 'DEBUT', 'FIN',
  'SI', 'ALORS', 'SINON', 'FINSI', 'SINONSI',
  'SELON', 'FINSELON', 'CAS', 'DEFAUT',
  'POUR', 'DE', 'A', 'FAIRE', 'FINPOUR', 'PAS', 'ALLANT',
  'TANTQUE', 'FINTANTQUE', 'TANT', 'QUE', 'REPETER', "JUSQU'A",
  'ECRIRE', 'LIRE', 'CONTINUE', 'BREAK', 'SORTIR',
  'ENTIER', 'REEL', 'CHAINE', 'BOOLEEN', 'TABLEAU',
  "D'ENTIER", "D'REEL", "D'CHAINE", "D'BOOLEEN" // Handle D'Type style
]);

const OPERATORS = new Set(['+', '-', '*', '/', '=', '<', '>', '<=', '>=', '<>', '==', 'ET', 'OU', 'NON', 'XOR', 'OUEX', 'MOD', '%', '<-', '←', '**', '^']);

export function tokenize(source) {
  const tokens = [];
  let current = 0;
  let line = 1;

  while (current < source.length) {
    let char = source[current];

    // Whitespace
    if (/\s/.test(char)) {
      if (char === '\n') {
        // tokens.push({ type: TokenType.NEWLINE, line }); // Don't emit NEWLINE tokens
        line++;
      }
      current++;
      continue;
    }

    // Comments (//)
    if (char === '/' && source[current + 1] === '/') {
      while (current < source.length && source[current] !== '\n') {
        current++;
      }
      continue;
    }

    // Numbers
    if (/[0-9]/.test(char)) {
      let value = '';
      while (current < source.length && /[0-9.]/.test(source[current])) {
        value += source[current];
        current++;
      }
      tokens.push({ type: TokenType.NUMBER, value: parseFloat(value), line });
      continue;
    }

    // Strings
    if (char === '"' || char === "'") {
      // Special handling for D'Type or JUSQU'A which might start with ' if we aren't careful?
      // Actually JUSQU'A starts with J.
      // But D'ENTIER starts with D.
      // If we are here, char is ' or ".
      // If it is ' and the previous token was an identifier ending in D? 
      // No, the identifier loop handles that.
      // So here it is a string literal.
      let quote = char;
      let value = '';
      current++; // Skip opening quote
      while (current < source.length && source[current] !== quote) {
        value += source[current];
        current++;
      }
      current++; // Skip closing quote
      tokens.push({ type: TokenType.STRING, value, line });
      continue;
    }

    // Identifiers and Keywords
    if (/[a-zA-Z_À-ÿ]/.test(char)) {
      let value = '';
      while (current < source.length && /[a-zA-Z0-9_À-ÿ''\'']/.test(source[current])) {
        // Handle JUSQU'A and D'ENTIER special cases where ' is inside
        if (/[''\'']/.test(source[current])) {
          // Check if it's a valid apostrophe usage
          const upperVal = value.toUpperCase();
          if (upperVal === "JUSQU" || upperVal === "D") {
            value += "'";
            current++;
            continue;
          }
          // Otherwise it might be start of string? 
          // But we are in identifier loop. 
          // If we hit ' and it's not special, we should probably stop?
          // But the regex `/[a-zA-Z0-9_À-ÿ']/` includes '.
          // So we consume it.
          // Let's assume ' inside word is part of word if allowed.
        }
        value += source[current];
        current++;
      }

      const upperValue = value.toUpperCase();
      // Normalize accents: JUSQU'A -> JUSQU'A (standardize)
      const normalizedValue = upperValue.replace(/JUSQU['']A/g, "JUSQU'A");

      if (KEYWORDS.has(normalizedValue)) {
        tokens.push({ type: TokenType.KEYWORD, value: normalizedValue, originalValue: value, line });
      } else if (OPERATORS.has(normalizedValue)) { // ET, OU, NON, MOD
        tokens.push({ type: TokenType.OPERATOR, value: normalizedValue, originalValue: value, line });
      } else {
        tokens.push({ type: TokenType.IDENTIFIER, value, originalValue: value, line });
      }
      continue;
    }

    // Operators and Punctuation
    // Check for 2-char operators: <=, >=, <>, <-, ==, **
    if (current + 1 < source.length) {
      const twoChar = char + source[current + 1];
      if (['<=', '>=', '<>', '<-', '==', '**'].includes(twoChar)) {
        tokens.push({ type: TokenType.OPERATOR, value: twoChar, line });
        current += 2;
        continue;
      }
    }

    if (OPERATORS.has(char)) {
      tokens.push({ type: TokenType.OPERATOR, value: char, line });
      current++;
      continue;
    }

    if ([',', ':', '(', ')', '[', ']', '.'].includes(char)) {
      tokens.push({ type: TokenType.PUNCTUATION, value: char, line });
      current++;
      continue;
    }

    // Unknown character
    console.warn(`Unknown character: ${char} at line ${line}`);
    current++;
  }

  tokens.push({ type: TokenType.EOF, line });
  return tokens;
}
