import React from 'react';

export default function VariablesPanel({ variables, changedVariables = [], inputVariables = [] }) {
    const variableNames = Object.keys(variables);

    return (
        <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Variables</span>
            </div>

            <div className="flex-1 overflow-auto p-0">
                {variableNames.length === 0 ? (
                    <div className="text-gray-400 text-sm p-4 text-center italic">
                        Aucune variable
                    </div>
                ) : (
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0">
                            <tr>
                                <th className="px-4 py-2 font-medium">Nom</th>
                                <th className="px-4 py-2 font-medium">Valeur</th>
                                <th className="px-4 py-2 font-medium">Type</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {variableNames.map(name => {
                                const value = variables[name];
                                const type = Array.isArray(value) ? 'TABLEAU' : typeof value === 'number' ? 'ENTIER/REEL' : typeof value === 'boolean' ? 'BOOLEEN' : 'CHAINE';
                                const isChanged = changedVariables.includes(name);
                                const isInput = inputVariables.includes(name);

                                return (
                                    <tr key={name} className={`transition-colors duration-500 ${isChanged ? 'bg-green-100' : isInput ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                                        <td className="px-4 py-2 font-medium text-gray-700">{name}</td>
                                        <td className="px-4 py-2 font-mono text-gray-600">
                                            {Array.isArray(value) ? `[${value.join(', ')}]` : String(value)}
                                        </td>
                                        <td className="px-4 py-2 text-gray-400 text-xs">{type}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
