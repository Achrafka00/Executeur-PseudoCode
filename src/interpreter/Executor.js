/**
 * Executor for Moroccan Pseudo-code
 * Executes the list of instructions step-by-step.
 */

export class Executor {
    constructor(instructions, onPrint, onRead) {
        this.instructions = instructions;
        this.variables = {};
        this.output = [];
        this.pc = 0; // Program Counter
        this.onPrint = onPrint; // Callback for ECRIRE
        this.onRead = onRead;   // Callback for LIRE (returns Promise)
        this.status = 'running';   // idle, running, waiting, finished, error
        this.error = null;
        this.stack = []; // For function calls if we had them
        this.loopStack = []; // Track active loops: { type: 'POUR'|'TANTQUE', id: uniqueId, iteration: 0, variables: {} }
        this.inputCallback = null; // Promise resolve for input
    }

    async step() {
        if (this.status !== 'running') return false;

        if (this.pc >= this.instructions.length) {
            this.status = 'finished';
            return false;
        }

        const instruction = this.instructions[this.pc];

        try {
            if (!instruction) {
                this.status = 'finished';
                return false;
            }

            // Update loop stats for current active loops
            if (this.loopStack.length > 0) {
                const currentLoop = this.loopStack[this.loopStack.length - 1];
                // Snapshot variables for this iteration if not already done
                // This is a bit complex to do "per iteration" exactly as requested without cluttering
                // Let's just track iteration count and let UI sample variables.
            }

            switch (instruction.type) {
                case 'DECLARE':
                    // Initialize variables
                    instruction.names.forEach(name => {
                        this.variables[name] = 0; // Default to 0/null
                        this.variables[`__${name}_type`] = instruction.varType;
                    });
                    this.pc++;
                    break;

                case 'DECLARE_ARRAY':
                    // Initialize array
                    instruction.names.forEach(name => {
                        const start = this.evaluate(instruction.startExpr);
                        const end = this.evaluate(instruction.endExpr);
                        const size = end - start + 1;
                        this.variables[name] = new Array(size).fill(0);
                        this.variables[`__${name}_start`] = start; // Store start index
                    });
                    this.pc++;
                    break;

                case 'CONST':
                    // Initialize constant
                    const constValue = this.evaluate(instruction.value);
                    this.variables[instruction.name] = constValue;
                    this.pc++;
                    break;

                case 'ASSIGN':
                    const value = this.evaluate(instruction.value);
                    this.variables[instruction.name] = value;
                    this.pc++;
                    break;

                case 'ASSIGN_ARRAY':
                    // Array assignment T[i] = value
                    const arrayValue = this.evaluate(instruction.value);
                    const arrayIndex = this.evaluate(instruction.index);
                    const startIndex = this.variables[`__${instruction.name}_start`] || 0;
                    const actualIndex = arrayIndex - startIndex;
                    if (!this.variables[instruction.name] || !Array.isArray(this.variables[instruction.name])) {
                        throw new Error(`'${instruction.name}' is not an array`);
                    }
                    this.variables[instruction.name][actualIndex] = arrayValue;
                    this.pc++;
                    break;

                case 'PRINT':
                    const args = instruction.args.map(arg => this.evaluate(arg));
                    if (instruction.newline) {
                        // ECRIRE() or ECRIRE("") - newline only
                        this.onPrint('', true);
                    } else {
                        // ECRIRE(...) with args - print inline (no auto newline)
                        this.onPrint(args.join(' '), false);
                    }
                    this.pc++;
                    break;

                case 'READ':
                    this.status = 'waiting';
                    const input = await this.onRead(instruction.name);
                    // Try to parse number if possible
                    const num = parseFloat(input);
                    this.variables[instruction.name] = isNaN(num) ? input : num;
                    this.status = 'running';
                    this.pc++;
                    break;

                case 'FOR_LOOP_SETUP':
                    // Setup for auto-direction loop (JUSQU'À syntax)
                    const start = this.variables[instruction.varName];
                    const end = this.evaluate(instruction.endExpr);
                    const step = start <= end ? 1 : -1;
                    this.variables[`__${instruction.varName}_end`] = end;
                    this.variables[`__${instruction.varName}_step`] = step;
                    this.pc++;
                    break;

                case 'FOR_LOOP_CHECK':
                    // Check loop condition based on auto-detected direction
                    const currentVal = this.variables[instruction.varName];
                    const targetEnd = this.variables[`__${instruction.varName}_end`];
                    const loopStep = this.variables[`__${instruction.varName}_step`];

                    let shouldContinue = loopStep > 0 ? (currentVal <= targetEnd) : (currentVal >= targetEnd);

                    if (!shouldContinue) {
                        this.pc = instruction.target;
                    } else {
                        this.pc++;
                    }
                    break;

                case 'FOR_LOOP_INCREMENT':
                    // Increment based on auto-detected step
                    const incrementStep = this.variables[`__${instruction.varName}_step`];
                    this.variables[instruction.varName] += incrementStep;
                    this.pc++;
                    break;

                case 'JUMP':
                    this.pc = instruction.target;
                    break;

                case 'JUMP_IF_FALSE':
                    const condition = this.evaluate(instruction.condition);
                    if (!condition) {
                        this.pc = instruction.target;
                    } else {
                        this.pc++;
                    }
                    break;

                case 'JUMP_IF_TRUE':
                    const conditionTrue = this.evaluate(instruction.condition);
                    if (conditionTrue) {
                        this.pc = instruction.target;
                    } else {
                        this.pc++;
                    }
                    break;

                default:
                    throw new Error(`Unknown instruction type: ${instruction.type}`);
            }
        } catch (err) {
            this.status = 'error';
            const line = this.instructions[this.pc]?.line;
            this.error = line ? `Error at line ${line}: ${err.message}` : err.message;
            return false;
        }

        if (this.pc >= this.instructions.length) {
            this.status = 'finished';
            return true;
        }

        return true;
    }

    evaluate(expr) {
        if (expr.type === 'LITERAL') return expr.value;
        if (expr.type === 'VARIABLE') {
            if (!(expr.name in this.variables)) {
                throw new Error(`❌ ERREUR : La variable '${expr.name}' est utilisée avant déclaration.\n👉 Solution : Ajoutez ${expr.name} : ENTIER dans la section VAR.`);
            }
            return this.variables[expr.name];
        }

        if (expr.type === 'ARRAY_ACCESS') {
            if (!(expr.name in this.variables)) {
                throw new Error(`Array '${expr.name}' not defined.`);
            }
            const arrayIndex = this.evaluate(expr.index);
            const startIndex = this.variables[`__${expr.name}_start`] || 0;
            const actualIndex = arrayIndex - startIndex;
            if (!Array.isArray(this.variables[expr.name])) {
                throw new Error(`'${expr.name}' is not an array`);
            }
            return this.variables[expr.name][actualIndex];
        }

        if (expr.type === 'LIRE_CALL') {
            // LIRE() called as expression - need to handle async
            // This is tricky because evaluate is not async
            // We'll need to store pending input state
            throw new Error("LIRE() as expression not yet fully supported in async context. Use x ← LIRE() in assignment.");
        }

        if (expr.type === 'BINARY') {
            const left = this.evaluate(expr.left);
            const right = this.evaluate(expr.right);

            switch (expr.operator) {
                case '+': return left + right;
                case '-': return left - right;
                case '*':
                    // Handle string * number (repetition or conditional display)
                    if (typeof left === 'string' && typeof right === 'number') {
                        return right === 0 ? '' : left.repeat(Math.max(0, Math.floor(right)));
                    }
                    if (typeof left === 'number' && typeof right === 'string') {
                        return left === 0 ? '' : right.repeat(Math.max(0, Math.floor(left)));
                    }
                    return left * right;
                case '/': return left / right;
                case 'MOD':
                case '%': return left % right;
                case '**':
                case '^': return Math.pow(left, right);
                case '=':
                case '==':
                    return left == right;
                case '<>':
                case '!=':
                    return left != right;
                case '<': return left < right;
                case '>': return left > right;
                case '<=': return left <= right;
                case '>=': return left >= right;
                case 'ET':
                case 'AND':
                case '&&':
                    return left && right;
                case 'OU':
                case 'OR':
                case '||':
                    return left || right;
                case 'XOR':
                case 'OUEX':
                    return !!(left ? !right : right); // XOR logic
                default: throw new Error(`Unknown operator: ${expr.operator}`);
            }
        }

        if (expr.type === 'UNARY') {
            const right = this.evaluate(expr.right);
            if (expr.operator === '-') return -right;
            if (expr.operator === 'NON') return !right;
        }

        throw new Error(`Unknown expression type: ${expr.type}`);
    }
}
