import React from 'react';

export default function VariablesPanel({ variables }) {
    return (
        <div className="h-full bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm flex flex-col">
            <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                Variables
            </div>
            <div className="flex-1 overflow-y-auto p-0">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {Object.entries(variables).length === 0 ? (
                            <tr>
                                <td colSpan="2" className="px-4 py-4 text-center text-sm text-gray-400 italic">
                                    No variables defined
                                </td>
                            </tr>
                        ) : (
                            Object.entries(variables).map(([name, value]) => (
                                <tr key={name} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{name}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-blue-600 font-mono">
                                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
