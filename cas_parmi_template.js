
// Temporary file to hold the casParmiStatement function
function casParmiStatement() {
    // CAS N PARMI
    //     1 : Ecrire("Lundi")
    //     2 : Ecrire("Mardi")
    //     PAR DEFAUT : Ecrire("Invalide")
    // FIN CAS
    const line = tokens[current - 1].line;
    const switchExpr = expression();

    consume(TokenType.KEYWORD, 'PARMI', "Expect 'PARMI' after CAS expression");

    const exitJumps = [];

    // Parse case values until PAR or FIN
    while (!check(TokenType.KEYWORD, 'PAR') && !check(TokenType.KEYWORD, 'FIN') && !isAtEnd()) {
        const caseValue = expression();
        consume(TokenType.PUNCTUATION, ':', "Expect ':' after case value");

        // Create condition: switchExpr == caseValue
        const condition = {
            type: 'BINARY',
            operator: '=',
            left: switchExpr,
            right: caseValue
        };

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
    const endIndex = instructions.length;
    exitJumps.forEach(index => {
        instructions[index].target = endIndex;
    });
}
