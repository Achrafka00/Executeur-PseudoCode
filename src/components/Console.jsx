import React, { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';

export default function Console({ output, isWaitingForInput, onInput }) {
    const [inputValue, setInputValue] = useState('');
    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [output, isWaitingForInput]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (inputValue.trim() !== '') {
            onInput(inputValue);
            setInputValue('');
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-900 text-white rounded-md overflow-hidden font-mono text-sm shadow-lg">
            <div className="bg-gray-800 px-4 py-2 text-xs text-gray-400 uppercase tracking-wider border-b border-gray-700">
                Console Output
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-1">
                {output.map((line, index) => (
                    <div key={index} className="break-words">
                        <span className="text-green-400">➜</span> {line}
                    </div>
                ))}

                {isWaitingForInput && (
                    <div className="text-yellow-400 animate-pulse">
                        Waiting for input...
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {isWaitingForInput && (
                <form onSubmit={handleSubmit} className="p-2 bg-gray-800 border-t border-gray-700 flex gap-2">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Enter value..."
                        className="flex-1 bg-gray-900 border border-gray-600 rounded px-3 py-1 text-white focus:outline-none focus:border-blue-500"
                        autoFocus
                    />
                    <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition-colors"
                    >
                        <Send size={16} />
                    </button>
                </form>
            )}
        </div>
    );
}
