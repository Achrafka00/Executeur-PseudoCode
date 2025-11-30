import { TokenType } from './Tokenizer';

export function lint(tokens) {
    const suggestions = [];

    tokens.forEach(token => {
        // Check for lowercase keywords
        if (token.type === TokenType.KEYWORD) {
            // Check if original value is not uppercase
            if (token.originalValue && token.originalValue !== token.value) {
                suggestions.push({
                    line: token.line,
                    message: `Suggestion: Préférez "${token.value}" en majuscules plutôt que "${token.originalValue}".`,
                    type: 'style'
                });
            }
        }

        // Check identifiers for special characters
        if (token.type === TokenType.IDENTIFIER) {
            // User forbids special chars like 'é' or '$'
            // Tokenizer allows À-ÿ.
            if (/[^a-zA-Z0-9_]/.test(token.value)) {
                suggestions.push({
                    line: token.line,
                    message: `Suggestion: Évitez les caractères spéciaux dans "${token.value}". Utilisez des lettres sans accents, chiffres et underscores.`,
                    type: 'warning'
                });
            }
        }
    });

    return suggestions;
}
