/**
 * Parser for Moroccan Pseudo-code
 * Converts tokens into a linear list of instructions for easy step-by-step execution.
 */

import { TokenType } from './Tokenizer';

export function parse(tokens) {
    let current = 0;
    const instructions = [];
    const labels = {}; // For jumps
    const jumpsToResolve = []; // List of { index, label } to resolve later

    function peek() {
        return tokens[current];
    }

    function advance() {
        if (current < tokens.length) current++;
        return tokens[current - 1];
    }

    function match(type, value) {
        const token = peek();
        if (token.type === type && (!value || token.value === value)) {
            advance();
            return true;
        }
        return false;
    }

    function consume(type, message) {
        if (peek().type === type) return advance();
        throw new Error(`${message} at line ${peek().line}`);
    }

    // Expression Parser (Simple recursive descent)
    function expression() {
        return logicOr();
    }

    function logicOr() {
        let expr = logicAnd();
        while (match(TokenType.OPERATOR, 'OU') || match(TokenType.OPERATOR, 'OUEX') || match(TokenType.OPERATOR, 'XOR')) {
            const operator = tokens[current - 1].value;
            const right = logicAnd();
            expr = { type: 'BINARY', operator, left: expr, right };
        }
        return expr;
    }

    function logicAnd() {
        let expr = equality();
        while (match(TokenType.OPERATOR, 'ET')) {
            const operator = tokens[current - 1].value;
            const right = equality();
            expr = { type: 'BINARY', operator, left: expr, right };
        }
        return expr;
    }

    function equality() {
        let expr = comparison();
        while (match(TokenType.OPERATOR, '=') || match(TokenType.OPERATOR, '==') ||
            match(TokenType.OPERATOR, '<>') || match(TokenType.OPERATOR, '!=') ||
            match(TokenType.OPERATOR, '=!') || match(TokenType.OPERATOR, '≠')) {
            const operator = tokens[current - 1].value;
            const right = comparison();
            expr = { type: 'BINARY', operator, left: expr, right };
        }
        return expr;
    }

    function comparison() {
        let expr = term();
        while (match(TokenType.OPERATOR, '>') || match(TokenType.OPERATOR, '<') ||
            match(TokenType.OPERATOR, '>=') || match(TokenType.OPERATOR, '<=')) {
            const operator = tokens[current - 1].value;
            const right = term();
            expr = { type: 'BINARY', operator, left: expr, right };
        }
        return expr;
    }

    function term() {
        let expr = factor();
        while (match(TokenType.OPERATOR, '+') || match(TokenType.OPERATOR, '-')) {
            const operator = tokens[current - 1].value;
            const right = factor();
            expr = { type: 'BINARY', operator, left: expr, right };
        }
        return expr;
    }

    function factor() {
        let expr = power();
        while (match(TokenType.OPERATOR, '*') || match(TokenType.OPERATOR, '/') || match(TokenType.OPERATOR, 'MOD') || match(TokenType.OPERATOR, '%')) {
            const operator = tokens[current - 1].value;
            const right = power();
            expr = { type: 'BINARY', operator, left: expr, right };
        }
        return expr;
    }

    function power() {
        let expr = unary();
        while (match(TokenType.OPERATOR, '**') || match(TokenType.OPERATOR, '^')) {
            const operator = tokens[current - 1].value;
            const right = unary();
            expr = { type: 'BINARY', operator, left: expr, right };
        }
        return expr;
    }

    function unary() {
        if (match(TokenType.OPERATOR, '-') || match(TokenType.OPERATOR, 'NON')) {
            const operator = tokens[current - 1].value;
            const right = unary();
            return { type: 'UNARY', operator, right };
        }
        return primary();
    }

    function primary() {
        if (match(TokenType.NUMBER)) return { type: 'LITERAL', value: tokens[current - 1].value };
        if (match(TokenType.STRING)) return { type: 'LITERAL', value: tokens[current - 1].value };

        // Boolean literals
        if (match(TokenType.KEYWORD, 'VRAI')) return { type: 'LITERAL', value: true };
        if (match(TokenType.KEYWORD, 'FAUX')) return { type: 'LITERAL', value: false };

        if (match(TokenType.IDENTIFIER)) {
            const name = tokens[current - 1].value;
            // Check for Array Access T[i]
            if (match(TokenType.PUNCTUATION, '[')) {
                const index = expression();
                consume(TokenType.PUNCTUATION, ']', "Expect ']' after array index");
                return { type: 'ARRAY_ACCESS', name, index };
            }
            // Check for function call (currently only LIRE can be called as function)
            if (match(TokenType.PUNCTUATION, '(')) {
                consume(TokenType.PUNCTUATION, ')', "Expect ')' after function call");
                // For now, treat it as special LIRE call
                if (name.toUpperCase() === 'LIRE') {
                    return { type: 'LIRE_CALL' };
                }
            }
            return { type: 'VARIABLE', name };
        }

        // Accept KEYWORD tokens as variables (excluding reserved types and statement keywords)
        const currentToken = peek();
        if (currentToken.type === TokenType.KEYWORD) {
            // List of keywords that should NOT be treated as variables
            const reservedKeywords = [
                'ENTIER', 'REEL', 'CHAINE', 'BOOLEEN', 'TABLEAU',
                'DEBUT', 'FIN', 'CONST', 'VAR',
                'SI', 'ALORS', 'SINON', 'FINSI', 'SINONSI',
                'POUR', 'FAIRE', 'FINPOUR', 'PAS', 'ALLANT',
                'TANTQUE', 'FINTANTQUE', 'TANT_QUE', 'QUE',
                'REPETER', 'JUSQU\'A', 'JUSQUA',
                'ECRIRE', 'LIRE',
                'SELON', 'FINSELON', 'CAS', 'DEFAUT', 'PARMI', 'PAR',
                'VRAI', 'FAUX'  // Already handled above as literals
            ];

            if (!reservedKeywords.includes(currentToken.value)) {
                advance(); // Consume the keyword
                const name = currentToken.value;

                // Check for Array Access
                if (match(TokenType.PUNCTUATION, '[')) {
                    const index = expression();
                    consume(TokenType.PUNCTUATION, ']', "Expect ']' after array index");
                    return { type: 'ARRAY_ACCESS', name, index };
                }

                return { type: 'VARIABLE', name };
            }
        }

        if (match(TokenType.PUNCTUATION, '(')) {
            const expr = expression();
            consume(TokenType.PUNCTUATION, ')', "Expect ')' after expression.");
            return expr;
        }

        throw new Error(`Unexpected token: ${peek().value} at line ${peek().line}`);
    }

    // Statement Parsers
    function statement() {
        const token = peek();

        // VAR section - allow multiple declaration lines
        if (match(TokenType.KEYWORD, 'VAR')) {
            // Keep parsing variable declarations until we hit DEBUT, CONST, VAR (new statement), or other keywords
            while (!check(TokenType.KEYWORD, 'DEBUT') &&
                !check(TokenType.KEYWORD, 'CONST') &&
                !check(TokenType.KEYWORD, 'VAR') &&  // Stop at another VAR statement
                !isAtEnd()) {

                // Check if next token is an identifier (start of a declaration line)
                if (peek().type === TokenType.IDENTIFIER) {
                    // CRITICAL FIX: Check if this identifier is followed by an assignment (←, <-, =)
                    // If so, it's the start of the program logic, NOT a variable declaration.
                    // We need to peek TWO tokens ahead.
                    const nextNext = peekNext();
                    if (nextNext && nextNext.type === TokenType.OPERATOR &&
                        (['←', '<-', '='].includes(nextNext.value))) {
                        break; // It's an assignment, exit VAR section
                    }
                    varDeclaration();
                } else if (peek().type === TokenType.KEYWORD &&
                    !['DEBUT', 'CONST', 'VAR', 'ECRIRE', 'LIRE', 'SI', 'POUR', 'TANTQUE', 'TANT', 'TANT_QUE', 'REPETER', 'SELON', 'CAS'].includes(peek().value)) {
                    // Allow keywords used as variable names if they aren't reserved statements
                    varDeclaration();
                } else {
                    break; // Not a declaration line, exit VAR section
                }
            }
            return;
        }
        if (match(TokenType.KEYWORD, 'CONST')) {
            constDeclaration();
            return;
        }
        if (match(TokenType.KEYWORD, 'ECRIRE')) {
            printStatement();
            return;
        }
        if (match(TokenType.KEYWORD, 'LIRE')) {
            readStatement();
            return;
        }
        if (match(TokenType.KEYWORD, 'SI')) {
            ifStatement();
            return;
        }
        if (match(TokenType.KEYWORD, 'CAS')) {
            casParmiStatement();
            return;
        }
        if (match(TokenType.KEYWORD, 'SELON')) {
            switchStatement();
            return;
        }
        if (match(TokenType.KEYWORD, 'TANTQUE') || match(TokenType.KEYWORD, 'TANT') || match(TokenType.KEYWORD, 'TANT_QUE')) {
            // Handle TANT QUE (two words) or TANT_QUE (with underscore)
            if (token.value === 'TANT') {
                consume(TokenType.KEYWORD, 'QUE', "Expect 'QUE' after 'TANT'");
            }
            whileStatement();
            return;
        }
        if (match(TokenType.KEYWORD, 'POUR')) {
            forStatement();
            return;
        }
        if (match(TokenType.KEYWORD, 'REPETER')) {
            repeatStatement();
            return;
        }
        if (match(TokenType.IDENTIFIER)) {
            assignmentStatement();
            return;
        }

        // Skip other keywords or unknown tokens for now to avoid crashes, or error
        advance();
    }

    function varDeclaration() {
        // Handle empty VAR block (e.g. VAR followed immediately by DEBUT)
        if (check(TokenType.KEYWORD, 'DEBUT') || check(TokenType.KEYWORD, 'CONST')) {
            return;
        }

        // VAR x, y : ENTIER
        // VAR T : TABLEAU[1..5] D'ENTIER
        // VAR arr[1..10] : ENTIER <- 0  (NEW: array syntax after name)
        const vars = [];
        let isArrayDecl = false;
        let arrayStartExpr = null;
        let arrayEndExpr = null;

        do {
            let nameToken = peek();
            let name;

            // Allow keywords to be used as variable names (e.g. A, B, DE)
            // This is common in pseudo-code (e.g. VAR A, B : ENTIER)
            if (nameToken.type === TokenType.KEYWORD) {
                // Check if it's a reserved type keyword which we shouldn't allow as var name
                if (['ENTIER', 'REEL', 'CHAINE', 'BOOLEEN', 'TABLEAU', 'DEBUT', 'FIN', 'CONST'].includes(nameToken.value)) {
                    throw new Error(`Cannot use reserved keyword '${nameToken.value}' as variable name`);
                }
                advance(); // Consume keyword as identifier
                name = nameToken.value;
            } else {
                name = consume(TokenType.IDENTIFIER, "Expect variable name").value;
            }

            // Check for array syntax immediately after variable name: VAR arr[1..10] : TYPE
            if (check(TokenType.PUNCTUATION, '[')) {
                if (vars.length > 0) {
                    throw new Error("Cannot declare multiple variables on one line when using array bracket syntax (e.g., VAR a, b[1..10] : ENTIER is not allowed).");
                }
                advance(); // consume '['

                const firstExpr = expression();

                // Check if it's range syntax (start..end) or single value (size)
                if (match(TokenType.PUNCTUATION, '.')) {
                    // Range syntax: arr[1..5]
                    consume(TokenType.PUNCTUATION, '.', "Expect '..' range");
                    arrayStartExpr = firstExpr;
                    arrayEndExpr = expression();
                } else {
                    // Single value syntax: arr[MAX] or arr[5]
                    // Assume starts at 1, ends at firstExpr
                    arrayStartExpr = { type: 'LITERAL', value: 1 };
                    arrayEndExpr = firstExpr;
                }

                consume(TokenType.PUNCTUATION, ']', "Expect ']' after array range");
                isArrayDecl = true;
            }

            vars.push(name);
        } while (match(TokenType.PUNCTUATION, ','));

        consume(TokenType.PUNCTUATION, ':', "Expect ':' after variable names");

        // If we already detected array syntax (VAR arr[1..10] : TYPE)
        if (isArrayDecl) {
            // Just get the type
            const type = consume(TokenType.KEYWORD, "Expect type after ':'").value;

            // Check for initialization: VAR array[range] : TYPE <- value
            let initValue = null;
            if (match(TokenType.OPERATOR, '←') || match(TokenType.OPERATOR, '<-')) {
                initValue = expression();
            }

            instructions.push({
                type: 'DECLARE_ARRAY',
                names: vars,
                varType: type,
                startExpr: arrayStartExpr,
                endExpr: arrayEndExpr,
                initValue,
                line: tokens[current - 1].line
            });
            return;
        }

        // Check for TABLEAU keyword or Tableau identifier (case-insensitive)
        const nextToken = peek();
        const isTableauKeyword = nextToken.type === TokenType.KEYWORD && nextToken.value === 'TABLEAU';
        const isTableauIdentifier = nextToken.type === TokenType.IDENTIFIER && nextToken.value.toUpperCase() === 'TABLEAU';

        if (isTableauKeyword || isTableauIdentifier) {
            // Consume the TABLEAU keyword or Tableau identifier
            advance();

            // TABLEAU[start..end] D'TYPE or TABLEAU[size] D'TYPE or Tableau[...] : TYPE
            consume(TokenType.PUNCTUATION, '[', "Expect '[' after TABLEAU");

            const firstExpr = expression();

            let startExpr, endExpr;

            // Check if it's range syntax (start..end) or single value (size)
            if (match(TokenType.PUNCTUATION, '.')) {
                // Range syntax: TABLEAU[1..5]
                consume(TokenType.PUNCTUATION, '.', "Expect '..' range");
                startExpr = firstExpr;
                endExpr = expression();
            } else {
                // Single value syntax: TABLEAU[MAX] or TABLEAU[5]
                // Assume starts at 1, ends at firstExpr
                startExpr = { type: 'LITERAL', value: 1 };
                endExpr = firstExpr;
            }

            consume(TokenType.PUNCTUATION, ']', "Expect ']' after range");

            // Handle type after array: D'TYPE or : TYPE or just TYPE
            let type = 'ENTIER'; // Default

            // Check for : TYPE syntax (alternative) - must come first
            if (match(TokenType.PUNCTUATION, ':')) {
                // After :, expect a type keyword
                const typeToken = peek();
                if (typeToken.type === TokenType.KEYWORD &&
                    ['ENTIER', 'REEL', 'CHAINE', 'BOOLEEN'].includes(typeToken.value)) {
                    type = advance().value;
                } else {
                    throw new Error("Expect type (ENTIER, REEL, CHAINE, BOOLEEN) after ':' in array declaration");
                }
            } else if (match(TokenType.KEYWORD, "D'ENTIER")) {
                type = 'ENTIER';
            } else if (match(TokenType.KEYWORD, "D'REEL")) {
                type = 'REEL';
            } else if (match(TokenType.KEYWORD, "D'CHAINE")) {
                type = 'CHAINE';
            } else if (match(TokenType.KEYWORD, "D'BOOLEEN")) {
                type = 'BOOLEEN';
            } else if (match(TokenType.KEYWORD, "DE")) {
                type = consume(TokenType.KEYWORD, "Expect type after DE").value;
            } else {
                // Just consume type directly if present
                const nextToken = peek();
                if (nextToken.type === TokenType.KEYWORD &&
                    ['ENTIER', 'REEL', 'CHAINE', 'BOOLEEN'].includes(nextToken.value)) {
                    type = advance().value;
                }
            }

            // Check for initialization: VAR array[range] : TYPE <- value
            let initValue = null;
            if (match(TokenType.OPERATOR, '←') || match(TokenType.OPERATOR, '<-')) {
                initValue = expression();
            }

            instructions.push({
                type: 'DECLARE_ARRAY',
                names: vars,
                varType: type,
                startExpr,
                endExpr,
                initValue,
                line: tokens[current - 1].line
            });
        } else {
            const type = consume(TokenType.KEYWORD, "Expect type").value;

            // Check for initialization: VAR name : TYPE <- value
            let initValue = null;
            if (match(TokenType.OPERATOR, '←') || match(TokenType.OPERATOR, '<-')) {
                initValue = expression();
            }

            instructions.push({
                type: 'DECLARE',
                names: vars,
                varType: type,
                initValue,
                line: tokens[current - 1].line
            });
        }
    }

    function constDeclaration() {
        // CONST PI = 3.14 or CONST PI ← 3.14 or CONST name : TYPE <- value
        const name = consume(TokenType.IDENTIFIER, "Expect constant name").value;

        // Check for optional type annotation: CONST name : TYPE <- value
        let varType = null;
        if (match(TokenType.PUNCTUATION, ':')) {
            varType = consume(TokenType.KEYWORD, "Expect type after ':'").value;
        }

        if (!match(TokenType.OPERATOR, '=') && !match(TokenType.OPERATOR, '←') && !match(TokenType.OPERATOR, '<-')) {
            throw new Error("Expect '=' or '←' after constant name");
        }
        const value = expression();
        instructions.push({ type: 'CONST', name, value, varType, line: tokens[current - 1].line });
    }

    function printStatement() {
        consume(TokenType.PUNCTUATION, '(', "Expect '(' after ECRIRE");
        const args = [];
        if (!check(TokenType.PUNCTUATION, ')')) {
            do {
                args.push(expression());
            } while (match(TokenType.PUNCTUATION, ','));
        }
        consume(TokenType.PUNCTUATION, ')', "Expect ')' after arguments");

        // If no args OR single empty string, it's a newline
        const isNewline = args.length === 0 || (args.length === 1 && args[0].type === 'LITERAL' && args[0].value === "");
        instructions.push({ type: 'PRINT', args: isNewline ? [] : args, newline: isNewline, line: tokens[current - 1].line });
    }

    function readStatement() {
        // LIRE(x) - x can be an identifier or a keyword used as variable name
        const line = tokens[current - 1].line;
        consume(TokenType.PUNCTUATION, '(', "Expect '(' after LIRE");

        // Accept both IDENTIFIER and KEYWORD tokens (like varDeclaration does)
        let name;
        const nameToken = peek();
        if (nameToken.type === TokenType.KEYWORD) {
            // Check if it's a reserved type keyword which shouldn't be used as var name
            if (['ENTIER', 'REEL', 'CHAINE', 'BOOLEEN', 'TABLEAU', 'DEBUT', 'FIN', 'CONST'].includes(nameToken.value)) {
                throw new Error(`Cannot use reserved keyword '${nameToken.value}' as variable name`);
            }
            advance(); // Consume keyword as identifier
            name = nameToken.value;
        } else {
            name = consume(TokenType.IDENTIFIER, "Expect variable name").value;
        }

        consume(TokenType.PUNCTUATION, ')', "Expect ')' after variable name");
        instructions.push({ type: 'READ', name, line });
    }

    function assignmentStatement() {
        // x = expr OR x <- expr
        const name = tokens[current - 1].value;
        const line = tokens[current - 1].line;
        let index = null;

        // Check for Array Assignment T[i] = ...
        if (match(TokenType.PUNCTUATION, '[')) {
            index = expression();
            consume(TokenType.PUNCTUATION, ']', "Expect ']' after array index");
        }

        if (match(TokenType.OPERATOR, '=') || match(TokenType.OPERATOR, '<-') || match(TokenType.OPERATOR, '←')) {
            const value = expression();
            if (index) {
                instructions.push({ type: 'ASSIGN_ARRAY', name, index, value, line });
            } else {
                instructions.push({ type: 'ASSIGN', name, value, line });
            }
        } else {
            throw new Error(`Expect assignment after identifier ${name} at line ${line}`);
        }
    }

    function ifStatement() {
        // SI condition ALORS ... [SINON SI condition ALORS ...] [SINON ...] FINSI
        const line = tokens[current - 1].line;

        const exitJumps = [];

        // 1. IF block
        let condition = expression();
        consume(TokenType.KEYWORD, 'ALORS', "Expect 'ALORS' after condition");

        let jumpToNextBranch = instructions.length;
        instructions.push({ type: 'JUMP_IF_FALSE', condition, target: null, line });

        while (!check(TokenType.KEYWORD, 'SINON') && !check(TokenType.KEYWORD, 'SINONSI') && !check(TokenType.KEYWORD, 'FINSI') && !isAtEnd()) {
            statement();
        }

        exitJumps.push(instructions.length);
        instructions.push({ type: 'JUMP', target: null, line }); // Jump to end

        // Patch jump to next branch
        instructions[jumpToNextBranch].target = instructions.length;

        // 2. SINON SI / SINONSI blocks
        while (match(TokenType.KEYWORD, 'SINONSI') || (check(TokenType.KEYWORD, 'SINON') && peekNext().type === TokenType.KEYWORD && peekNext().value === 'SI')) {
            if (peek().value === 'SINON') {
                advance(); // consume SINON
                advance(); // consume SI
            }

            condition = expression();
            consume(TokenType.KEYWORD, 'ALORS', "Expect 'ALORS' after condition");

            jumpToNextBranch = instructions.length;
            instructions.push({ type: 'JUMP_IF_FALSE', condition, target: null, line });

            while (!check(TokenType.KEYWORD, 'SINON') && !check(TokenType.KEYWORD, 'SINONSI') && !check(TokenType.KEYWORD, 'FINSI') && !isAtEnd()) {
                statement();
            }

            exitJumps.push(instructions.length);
            instructions.push({ type: 'JUMP', target: null, line }); // Jump to end

            // Patch jump to next branch
            instructions[jumpToNextBranch].target = instructions.length;
        }

        // 3. SINON block
        if (match(TokenType.KEYWORD, 'SINON')) {
            while (!check(TokenType.KEYWORD, 'FINSI') && !isAtEnd()) {
                statement();
            }
        }

        consume(TokenType.KEYWORD, 'FINSI', "Expect 'FINSI'");

        // Patch all exit jumps
        const endIndex = instructions.length;
        exitJumps.forEach(index => {
            instructions[index].target = endIndex;
        });
    }

    function switchStatement() {
        // SELON expr [FAIRE] : value1 : stmt1 value2 : stmt2 SINON : default FINSELON
        const line = tokens[current - 1].line;
        const switchExpr = expression();

        // Optional FAIRE
        match(TokenType.KEYWORD, 'FAIRE');

        // Optional colon after SELON expr
        match(TokenType.PUNCTUATION, ':');

        const cases = [];
        let defaultCase = null;

        // Parse cases until FINSELON
        while (!check(TokenType.KEYWORD, 'FINSELON') && !isAtEnd()) {
            if (match(TokenType.KEYWORD, 'SINON')) {
                // Default case
                match(TokenType.PUNCTUATION, ':');
                const defaultStart = instructions.length;

                // Parse statements until FINSELON
                while (!check(TokenType.KEYWORD, 'FINSELON') && !isAtEnd()) {
                    statement();
                }

                defaultCase = defaultStart;
                break;
            } else {
                // Regular case: value : statement(s)
                const caseValue = expression();
                consume(TokenType.PUNCTUATION, ':', "Expect ':' after case value");

                const caseStart = instructions.length;

                // Parse one statement or until next case/SINON/FINSELON
                // We need to be careful here - in the compact syntax, each case is one statement
                // But we should support multiple statements too
                statement();

                cases.push({ value: caseValue, target: caseStart });
            }
        }

        consume(TokenType.KEYWORD, 'FINSELON', "Expect 'FINSELON'");

        // Now generate jump table
        // For each case, evaluate and compare with switchExpr
        const endJumps = [];
        const switchCheckStart = instructions.length;

        // Rearrange: we need to check each case first, then jump to appropriate code
        // This is complex - let's use a simpler approach:
        // Generate if-else chain
        for (let i = 0; i < cases.length; i++) {
            const caseCheck = {
                type: 'BINARY',
                operator: '=',
                left: switchExpr,
                right: cases[i].value
            };

            const jumpIfMatch = instructions.length;
            instructions.push({ type: 'JUMP_IF_TRUE', condition: caseCheck, target: cases[i].target, line });
        }

        // If no case matched, jump to default or end
        if (defaultCase !== null) {
            instructions.push({ type: 'JUMP', target: defaultCase, line });
        } else {
            const endJump = instructions.length;
            instructions.push({ type: 'JUMP', target: null, line });
            endJumps.push(endJump);
        }

        // Patch end jumps
        const endIndex = instructions.length;
        endJumps.forEach(index => {
            instructions[index].target = endIndex;
        });
    }

    function casParmiStatement() {
        // CAS N PARMI
        //     1 : Ecrire("Lundi")
        //     1,3,5 : Ecrire("31 jours")  // Support multiple values
        //     PAR DEFAUT : Ecrire("Invalide")
        // FIN CAS
        const line = tokens[current - 1].line;
        const switchExpr = expression();

        consume(TokenType.KEYWORD, 'PARMI', "Expect 'PARMI' after CAS expression");

        const exitJumps = [];

        // Parse case values until PAR or FIN
        while (!check(TokenType.KEYWORD, 'PAR') && !check(TokenType.KEYWORD, 'FIN') && !isAtEnd()) {
            // Parse comma-separated case values
            const caseValues = [];
            do {
                caseValues.push(expression());
            } while (match(TokenType.PUNCTUATION, ','));

            consume(TokenType.PUNCTUATION, ':', "Expect ':' after case value(s)");

            // Create combined condition with OR for multiple values
            let condition;
            if (caseValues.length === 1) {
                condition = {
                    type: 'BINARY',
                    operator: '=',
                    left: switchExpr,
                    right: caseValues[0]
                };
            } else {
                // Build OR chain: (expr = val1) OU (expr = val2) OU ...
                condition = {
                    type: 'BINARY',
                    operator: '=',
                    left: switchExpr,
                    right: caseValues[0]
                };
                for (let i = 1; i < caseValues.length; i++) {
                    const nextCondition = {
                        type: 'BINARY',
                        operator: '=',
                        left: switchExpr,
                        right: caseValues[i]
                    };
                    condition = {
                        type: 'BINARY',
                        operator: 'OU',
                        left: condition,
                        right: nextCondition
                    };
                }
            }

            const jumpIfFalse = instructions.length;
            instructions.push({ type: 'JUMP_IF_FALSE', condition, target: null, line });

            // Parse one statement (usually one line like Ecrire)
            statement();

            const exitJump = instructions.length;
            instructions.push({ type: 'JUMP', target: null, line });
            exitJumps.push(exitJump);

            // Patch the jump if false to next case
            instructions[jumpIfFalse].target = instructions.length;
        }

        // Handle PAR DEFAUT
        if (match(TokenType.KEYWORD, 'PAR')) {
            consume(TokenType.KEYWORD, 'DEFAUT', "Expect 'DEFAUT' after 'PAR'");
            consume(TokenType.PUNCTUATION, ':', "Expect ':' after PAR DEFAUT");

            // Parse default statement
            statement();
        }

        // Consume FIN CAS
        consume(TokenType.KEYWORD, 'FIN', "Expect 'FIN CAS'");
        consume(TokenType.KEYWORD, 'CAS', "Expect 'CAS' after 'FIN'");

        // Patch all exit jumps
        const endIndex2 = instructions.length;
        exitJumps.forEach(index => {
            instructions[index].target = endIndex2;
        });
    }

    // Helper to peek next token
    function peekNext() {
        if (current + 1 >= tokens.length) return { type: TokenType.EOF };
        return tokens[current + 1];
    }

    function whileStatement() {
        // TANTQUE condition FAIRE ... FINTANTQUE
        // TANT QUE condition FAIRE ... FIN TANT QUE
        // Already consumed TANTQUE or TANT+QUE
        const line = tokens[current - 1].line;
        const loopStartIndex = instructions.length;

        const condition = expression();
        // FAIRE is optional in some dialects, but let's check
        match(TokenType.KEYWORD, 'FAIRE');

        const jumpToEndIndex = instructions.length;
        instructions.push({ type: 'JUMP_IF_FALSE', condition, target: null, line });

        while (!check(TokenType.KEYWORD, 'FINTANTQUE') &&
            !(check(TokenType.KEYWORD, 'FIN') && peekNext().value === 'TANT') &&
            !isAtEnd()) {
            statement();
        }

        // Consume FINTANTQUE or FIN TANT QUE
        if (match(TokenType.KEYWORD, 'FINTANTQUE')) {
            // Single word version
        } else if (match(TokenType.KEYWORD, 'FIN')) {
            // Multi-word version: FIN TANT QUE
            consume(TokenType.KEYWORD, 'TANT', "Expect 'TANT' after 'FIN'");
            consume(TokenType.KEYWORD, 'QUE', "Expect 'QUE' after 'TANT'");
        } else {
            throw new Error("Expect 'FINTANTQUE' or 'FIN TANT QUE' at line " + peek().line);
        }

        instructions.push({ type: 'JUMP', target: loopStartIndex, line });
        instructions[jumpToEndIndex].target = instructions.length;
    }

    function repeatStatement() {
        // REPETER ... JUSQU'A condition
        const loopStartIndex = instructions.length;

        // Check for JUSQU'A (Keyword), JUSQUA (Keyword), or JUSQUA (Identifier - fallback)
        const isJusqua = () =>
            check(TokenType.KEYWORD, "JUSQU'A") ||
            check(TokenType.KEYWORD, "JUSQUA") ||
            (check(TokenType.IDENTIFIER, "JUSQUA"));

        while (!isJusqua() && !isAtEnd()) {
            statement();
        }

        if (isJusqua()) {
            advance(); // Consume the token (whether keyword or identifier)
            const condition = expression();
            // Jump back if condition is FALSE (Repeat UNTIL condition is true)
            // So we loop if condition is FALSE.
            instructions.push({ type: 'JUMP_IF_FALSE', condition, target: loopStartIndex, line: tokens[current - 1].line });
        } else {
            throw new Error("Expect 'JUSQU'A' after REPETER block");
        }
    }

    function forStatement() {
        // POUR i DE start A end [PAS DE step] FAIRE ... FINPOUR
        // POUR i ← start JUSQU'À end FAIRE
        const line = tokens[current - 1].line;
        const varName = consume(TokenType.IDENTIFIER, "Expect variable name").value;

        let startExpr, endExpr, stepExpr;
        let operator = '<='; // Default for ascending

        // Check for ← or ALLANT or DE
        if (match(TokenType.OPERATOR, '←') || match(TokenType.OPERATOR, '<-')) {
            // POUR i ← start ...
            startExpr = expression();

            if (match(TokenType.KEYWORD, "JUSQU'A")) {
                // POUR i ← start JUSQU'À end (Auto direction)
                endExpr = expression();
                stepExpr = null; // Auto-detect
            } else if (match(TokenType.KEYWORD, 'A')) {
                // POUR i ← start A end (Standard loop)
                endExpr = expression();
                stepExpr = { type: 'LITERAL', value: 1 };
                if (match(TokenType.KEYWORD, 'PAS')) {
                    if (match(TokenType.KEYWORD, 'DE')) {
                        // consume DE
                    }
                    stepExpr = expression();
                }
            } else {
                throw new Error("Expect 'A' or 'JUSQU'À' after start value in loop");
            }
        } else {
            // POUR i ALLANT? DE? start A end [PAS DE step]
            if (match(TokenType.KEYWORD, 'ALLANT')) {
                // Skip ALLANT
            }

            // Optional DE
            if (match(TokenType.KEYWORD, 'DE')) {
                // consumed
            }

            startExpr = expression();
            consume(TokenType.KEYWORD, 'A', "Expect 'A' after start value");
            endExpr = expression();

            stepExpr = { type: 'LITERAL', value: 1 };
            if (match(TokenType.KEYWORD, 'PAS')) {
                if (match(TokenType.KEYWORD, 'DE')) {
                    // consume DE
                }
                stepExpr = expression();
            }
        }

        match(TokenType.KEYWORD, 'FAIRE');

        // Init: i = start
        instructions.push({ type: 'ASSIGN', name: varName, value: startExpr, line });

        const loopStartIndex = instructions.length;

        // If stepExpr is null (JUSQU'À syntax), we need to determine step at runtime
        if (stepExpr === null) {
            // Add a FOR_LOOP_AUTO instruction that handles this
            instructions.push({
                type: 'FOR_LOOP_SETUP',
                varName,
                startExpr,
                endExpr,
                line
            });

            const jumpToEndIndex = instructions.length;
            instructions.push({ type: 'FOR_LOOP_CHECK', varName, target: null, line });

            const breakJumps = [];
            const continueJumps = [];

            while (!check(TokenType.KEYWORD, 'FINPOUR') && !isAtEnd()) {
                if (match(TokenType.KEYWORD, 'BREAK')) {
                    const breakInstructionIndex = instructions.length;
                    instructions.push({ type: 'JUMP', target: null, line });
                    breakJumps.push(breakInstructionIndex);
                } else if (match(TokenType.KEYWORD, 'CONTINUE')) {
                    const continueInstructionIndex = instructions.length;
                    instructions.push({ type: 'JUMP', target: null, line });
                    continueJumps.push(continueInstructionIndex);
                } else {
                    statement();
                }
            }

            consume(TokenType.KEYWORD, 'FINPOUR', "❌ ERREUR : 'FINPOUR' manquant.\n👉 Solution : Vérifiez que chaque boucle POUR a son FINPOUR correspondant.");

            const incrementInstructionIndex = instructions.length;
            instructions.push({ type: 'FOR_LOOP_INCREMENT', varName, line });

            instructions.push({ type: 'JUMP', target: loopStartIndex, line });
            instructions[jumpToEndIndex].target = instructions.length;

            const loopEndIndex = instructions.length;
            breakJumps.forEach(index => {
                instructions[index].target = loopEndIndex;
            });
            continueJumps.forEach(index => {
                instructions[index].target = incrementInstructionIndex;
            });
        } else {
            // Standard FOR loop with explicit step
            // Use FOR_LOOP_SETUP to handle direction at runtime
            instructions.push({
                type: 'FOR_LOOP_SETUP',
                varName,
                startExpr,
                endExpr,
                stepExpr, // Pass the explicit step
                line
            });

            const jumpToEndIndex = instructions.length;
            instructions.push({ type: 'FOR_LOOP_CHECK', varName, target: null, line });

            const breakJumps = [];
            const continueJumps = [];

            while (!check(TokenType.KEYWORD, 'FINPOUR') && !isAtEnd()) {
                if (match(TokenType.KEYWORD, 'BREAK')) {
                    const breakInstructionIndex = instructions.length;
                    instructions.push({ type: 'JUMP', target: null, line });
                    breakJumps.push(breakInstructionIndex);
                } else if (match(TokenType.KEYWORD, 'CONTINUE')) {
                    const continueInstructionIndex = instructions.length;
                    instructions.push({ type: 'JUMP', target: null, line });
                    continueJumps.push(continueInstructionIndex);
                } else {
                    statement();
                }
            }

            consume(TokenType.KEYWORD, 'FINPOUR', "❌ ERREUR : 'FINPOUR' manquant.\n👉 Solution : Vérifiez que chaque boucle POUR a son FINPOUR correspondant.");

            const incrementInstructionIndex = instructions.length;
            instructions.push({ type: 'FOR_LOOP_INCREMENT', varName, line });

            instructions.push({ type: 'JUMP', target: loopStartIndex, line });
            instructions[jumpToEndIndex].target = instructions.length;

            const loopEndIndex = instructions.length;
            breakJumps.forEach(index => {
                instructions[index].target = loopEndIndex;
            });
            continueJumps.forEach(index => {
                instructions[index].target = incrementInstructionIndex;
            });
        }
    }

    // Helpers
    function check(type, value) {
        if (isAtEnd()) return false;
        const token = peek();
        return token.type === type && (!value || token.value === value);
    }

    function isAtEnd() {
        return peek().type === TokenType.EOF;
    }

    // Main parse loop
    while (!isAtEnd()) {
        const token = peek();
        if (token.type === TokenType.KEYWORD && (token.value === 'ALGORITHME' || token.value === 'PROGRAMME')) {
            advance(); // Eat ALGORITHME/PROGRAMME
            if (peek().type === TokenType.IDENTIFIER) {
                advance(); // Eat Name
            }
        } else if (token.type === TokenType.KEYWORD && (token.value === 'DEBUT' || token.value === 'FIN')) {
            advance();
        } else {
            statement();
        }
    }

    return instructions;
}
