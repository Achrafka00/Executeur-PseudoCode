import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, RotateCcw, FastForward, Bug } from 'lucide-react';
import Editor from './components/Editor';
import Console from './components/Console';
import VariablesPanel from './components/VariablesPanel';
import { tokenize } from './interpreter/Tokenizer';
import { parse } from './interpreter/Parser';
import { Executor } from './interpreter/Executor';
import { lint } from './interpreter/Linter';

const DEFAULT_CODE = `ALGORITHME TestEnhancements
VAR
    X : ENTIER
DEBUT
    X = 10
    
    // Test Case Insensitivity
    si X > 5 alors
        ecrire("Case insensitivity works")
    finsi

    // Test SINON SI
    X = 20
    SI X < 10 ALORS
        ECRIRE("X < 10")
    SINON SI X < 15 ALORS
        ECRIRE("X < 15")
    SINONSI X < 25 ALORS
        ECRIRE("SINONSI works: X < 25")
    SINON
        ECRIRE("Else")
    FINSI

    // Test Nested SI
    SI X > 0 ALORS
        ECRIRE("Outer IF")
        SI X > 15 ALORS
            ECRIRE("Inner IF works")
        FINSI
    FINSI

    // Test Nested POUR
    ECRIRE("Testing Nested Loops:")
    POUR I DE 1 A 2 FAIRE
        POUR J DE 1 A 2 FAIRE
            ECRIRE("I=", I, " J=", J)
        FINPOUR
    FINPOUR
FIN`;

const EXAMPLES = {
  'Test Features': DEFAULT_CODE,
  'Deviner un nombre': `ALGORITHME Deviner
VAR
    M, N : ENTIER
DEBUT
    M = 42
    REPETER
        ECRIRE("Devinez le nombre (entre 1 et 100) :")
        LIRE(N)
        SI N < M ALORS
            ECRIRE("C'est plus !")
        SINON SI N > M ALORS
            ECRIRE("C'est moins !")
        SINON
            ECRIRE("Gagné !")
        FINSI
    JUSQU'A (N = M)
FIN`,
  'Factorielle': `ALGORITHME Factorielle
VAR
    N, I, F : ENTIER
DEBUT
    ECRIRE("Entrez un nombre :")
    LIRE(N)
    F = 1
    POUR I DE 1 A N FAIRE
        F = F * I
    FINPOUR
    ECRIRE("La factorielle de", N, "est", F)
FIN`,
  'Somme 1 à N': `ALGORITHME Somme
VAR
    N, I, S : ENTIER
DEBUT
    ECRIRE("Entrez N :")
    LIRE(N)
    S = 0
    I = 1
    TANTQUE I <= N FAIRE
        S = S + I
        I = I + 1
    FINTANTQUE
    ECRIRE("La somme est :", S)
FIN`
};

function App() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [output, setOutput] = useState([]);
  const [variables, setVariables] = useState({});
  const [currentLine, setCurrentLine] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isWaitingForInput, setIsWaitingForInput] = useState(false);
  const [error, setError] = useState(null);
  const [delay, setDelay] = useState(500);

  const executorRef = useRef(null);
  const inputResolverRef = useRef(null);

  const handleRun = async () => {
    if (isRunning) return;

    setOutput([]);
    setVariables({});
    setError(null);
    setIsRunning(true);
    setCurrentLine(0);

    try {
      const tokens = tokenize(code);

      // Run Linter
      const suggestions = lint(tokens);
      if (suggestions.length > 0) {
        setOutput(prev => [
          ...prev,
          ...suggestions.map(s => `[${s.type === 'warning' ? '⚠️' : 'ℹ️'} Ligne ${s.line}] ${s.message}`)
        ]);
      }

      const instructions = parse(tokens);

      executorRef.current = new Executor(
        instructions,
        (msg, isNewline) => {
          if (isNewline) {
            // Newline: flush buffer
            setOutput(prev => [...prev, '']);
          } else {
            // Inline: append to last line
            setOutput(prev => {
              const newOutput = [...prev];
              if (newOutput.length === 0 || prev[prev.length - 1] === '\n') {
                newOutput.push(msg);
              } else {
                newOutput[newOutput.length - 1] += msg;
              }
              return newOutput;
            });
          }
        },
        (varName) => {
          setIsWaitingForInput(true);
          return new Promise((resolve) => {
            inputResolverRef.current = resolve;
          });
        }
      );

      runLoop();
    } catch (err) {
      setError(err.message);
      setIsRunning(false);
    }
  };

  const runLoop = async () => {
    if (!executorRef.current) return;

    while (executorRef.current.status !== 'finished' && executorRef.current.status !== 'error') {
      // Update state for UI
      setCurrentLine(executorRef.current.instructions[executorRef.current.pc]?.line || 0);
      setVariables({ ...executorRef.current.variables });

      // Wait for delay
      await new Promise(r => setTimeout(r, delay));

      // Execute step
      const shouldContinue = await executorRef.current.step();

      if (executorRef.current.status === 'waiting') {
        // Stop loop, wait for input
        setIsWaitingForInput(true);
        return;
      }

      if (!shouldContinue) break;
    }

    setIsRunning(false);
    setCurrentLine(0);
    if (executorRef.current.status === 'error') {
      setError(executorRef.current.error);
    }
  };

  const handleInput = (value) => {
    if (inputResolverRef.current) {
      inputResolverRef.current(value);
      inputResolverRef.current = null;
      setIsWaitingForInput(false);
      // Resume loop
      runLoop();
    }
  };

  const handleStop = () => {
    executorRef.current = null;
    setIsRunning(false);
    setIsWaitingForInput(false);
    setCurrentLine(0);
    inputResolverRef.current = null;
  };

  const handleReset = () => {
    handleStop();
    setOutput([]);
    setVariables({});
    setError(null);
  };

  const handleClearCode = () => {
    handleStop();
    setCode(`ALGORITHME Nouveau
// VAR
//    N : ENTIER
DEBUT
    
FIN`);
    setOutput([]);
    setVariables({});
    setError(null);
  };

  const handleLoadExample = (key) => {
    handleStop();
    setCode(EXAMPLES[key]);
    setOutput([]);
    setVariables({});
    setError(null);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 text-gray-800">
      {/* Header */}
      <header className="bg-white shadow-sm px-6 py-3 flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 text-white p-1.5 rounded-lg">
              <Bug size={20} />
            </div>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">AlgoViz <span className="text-blue-600 text-sm font-normal bg-blue-50 px-2 py-0.5 rounded-full">Morocco Edition</span></h1>
          </div>

          <select
            onChange={(e) => handleLoadExample(e.target.value)}
            className="text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50 py-1 px-2"
            defaultValue="Test Features"
          >
            {Object.keys(EXAMPLES).map(key => (
              <option key={key} value={key}>{key}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
            <span className="text-xs font-medium text-gray-500 px-2">Vitesse:</span>
            <input
              type="range"
              min="50"
              max="2000"
              step="50"
              value={delay}
              onChange={(e) => setDelay(Number(e.target.value))}
              className="w-24 h-1.5 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <span className="text-xs w-12 text-right font-mono">{delay}ms</span>
          </div>

          <div className="h-6 w-px bg-gray-300 mx-2"></div>

          <button
            onClick={handleRun}
            disabled={isRunning && !isWaitingForInput}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all shadow-sm ${isRunning
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700 hover:shadow-md active:transform active:scale-95'
              }`}
          >
            <Play size={18} fill="currentColor" /> Exécuter
          </button>

          <button
            onClick={handleStop}
            disabled={!isRunning}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all shadow-sm ${!isRunning
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-red-500 text-white hover:bg-red-600 hover:shadow-md active:transform active:scale-95'
              }`}
          >
            <Square size={18} fill="currentColor" /> Arrêter
          </button>

          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-2 rounded-md font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            title="Réinitialiser l'exécution"
          >
            <RotateCcw size={18} />
          </button>

          <button
            onClick={handleClearCode}
            className="flex items-center gap-2 px-3 py-2 rounded-md font-medium text-red-600 hover:bg-red-50 transition-colors border border-transparent hover:border-red-100"
            title="Effacer le code"
          >
            Effacer
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden p-4 gap-4">
        {/* Left: Editor */}
        <div className="flex-1 flex flex-col min-w-0 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Éditeur de Code</span>
            {error && <span className="text-xs text-red-500 font-medium truncate max-w-md">{error}</span>}
          </div>
          <div className="flex-1 relative">
            <Editor
              code={code}
              onChange={setCode}
              currentLine={currentLine}
              errorLine={error ? (error.match(/line (\d+)/i) ? parseInt(error.match(/line (\d+)/i)[1]) : null) : null}
              suggestions={output.filter(line => line.startsWith('[ℹ️') || line.startsWith('[⚠️')).map(line => {
                const match = line.match(/Ligne (\d+)\] (.*)/);
                return match ? { line: parseInt(match[1]), message: match[2], type: line.includes('⚠️') ? 'warning' : 'info' } : null;
              }).filter(Boolean)}
            />
          </div>
        </div>

        {/* Right: Output & Variables */}
        <div className="w-1/3 flex flex-col gap-4 min-w-[300px]">
          {/* Variables */}
          <div className="flex-1 min-h-0">
            <VariablesPanel variables={variables} />
          </div>

          {/* Console */}
          <div className="h-1/2 min-h-[200px]">
            <Console
              output={output}
              isWaitingForInput={isWaitingForInput}
              onInput={handleInput}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
