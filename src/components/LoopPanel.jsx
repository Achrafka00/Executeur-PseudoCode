import React from 'react';

export default function LoopPanel({ loops, variables }) {
    return (
        <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Boucles Actives</span>
            </div>

            <div className="flex-1 overflow-auto p-2 space-y-2">
                {loops.length === 0 ? (
                    <div className="text-gray-400 text-sm p-4 text-center italic">
                        Aucune boucle active
                    </div>
                ) : (
                    loops.map((loop, index) => (
                        <div key={index} className="bg-blue-50 border border-blue-100 rounded p-2 text-sm">
                            <div className="font-medium text-blue-800 mb-1">
                                {loop.type} ({loop.varName}) - Itération {loop.iteration}
                            </div>
                            <div className="text-xs text-gray-600 font-mono">
                                {loop.varName} = {variables[loop.varName]}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
