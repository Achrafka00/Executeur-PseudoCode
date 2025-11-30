import React, { useRef, useEffect } from 'react';

export default function Editor({ code, onChange, currentLine, errorLine, suggestions }) {
    const textareaRef = useRef(null);
    const lineNumbersRef = useRef(null);

    const handleScroll = () => {
        if (lineNumbersRef.current && textareaRef.current) {
            lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
        }
    };

    const lines = code.split('\n');

    return (
        <div className="relative w-full h-full flex font-mono text-sm">
            {/* Line Numbers */}
            <div
                ref={lineNumbersRef}
                className="bg-gray-50 border-r border-gray-200 text-gray-400 text-right py-4 px-2 select-none overflow-hidden"
                style={{ width: '3rem' }}
            >
                {lines.map((_, i) => (
                    <div
                        key={i}
                        className={`leading-6 ${currentLine === i + 1 ? 'text-blue-600 font-bold' : ''} ${errorLine === i + 1 ? 'text-red-600 font-bold' : ''}`}
                    >
                        {i + 1}
                    </div>
                ))}
            </div>

            {/* Code Area */}
            <textarea
                ref={textareaRef}
                value={code}
                onChange={(e) => onChange(e.target.value)}
                onScroll={handleScroll}
                className="flex-1 p-4 outline-none resize-none leading-6 whitespace-pre"
                spellCheck="false"
            />

            {/* Highlighting Overlay */}
            <div className="absolute top-0 left-12 right-0 bottom-0 pointer-events-none overflow-hidden py-4 px-4">
                {lines.map((line, i) => {
                    const lineSuggestion = suggestions?.find(s => s.line === i + 1);
                    return (
                        <div key={i} className="leading-6 h-6 w-full relative flex items-center">
                            {currentLine === i + 1 && (
                                <div className="absolute inset-0 bg-blue-100 opacity-30 -mx-4"></div>
                            )}
                            {errorLine === i + 1 && (
                                <div className="absolute inset-0 bg-red-100 opacity-30 -mx-4 border-l-2 border-red-500"></div>
                            )}
                            {lineSuggestion && (
                                <div className="absolute right-0 text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 border border-yellow-200 shadow-sm translate-x-full opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-auto">
                                    {lineSuggestion.message}
                                </div>
                            )}
                            {lineSuggestion && (
                                <div className="absolute right-2 text-yellow-500 cursor-help pointer-events-auto" title={lineSuggestion.message}>
                                    {lineSuggestion.type === 'warning' ? '⚠️' : 'ℹ️'}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
