import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, BookOpen } from 'lucide-react';

const STEPS = [
    {
        title: "C'est quoi un Algorithme ?",
        content: (
            <div className="space-y-4">
                <p>Un algorithme est une suite d'instructions précises pour résoudre un problème, comme une recette de cuisine !</p>
                <div className="bg-gray-50 p-3 rounded border border-gray-200 font-mono text-sm">
                    ALGORITHME Recette<br />
                    DEBUT<br />
                    &nbsp;&nbsp;Prendre des oeufs<br />
                    &nbsp;&nbsp;Battre les oeufs<br />
                    &nbsp;&nbsp;Cuire<br />
                    FIN
                </div>
            </div>
        )
    },
    {
        title: "Les Variables",
        content: (
            <div className="space-y-4">
                <p>Une variable est comme une boîte avec une étiquette où l'on range une valeur (un nombre, un texte...).</p>
                <ul className="list-disc pl-5 space-y-2">
                    <li><strong>ENTIER</strong> : Nombres sans virgule (1, 5, -10)</li>
                    <li><strong>REEL</strong> : Nombres à virgule (3.14, 2.5)</li>
                    <li><strong>CHAINE</strong> : Texte ("Bonjour")</li>
                </ul>
                <div className="bg-gray-50 p-3 rounded border border-gray-200 font-mono text-sm">
                    VAR age : ENTIER<br />
                    DEBUT<br />
                    &nbsp;&nbsp;age ← 25<br />
                    FIN
                </div>
            </div>
        )
    },
    {
        title: "Les Conditions (SI / SINON)",
        content: (
            <div className="space-y-4">
                <p>Elles permettent de faire des choix. Si une condition est vraie, on fait une chose, sinon on en fait une autre.</p>
                <div className="bg-gray-50 p-3 rounded border border-gray-200 font-mono text-sm">
                    SI age &gt;= 18 ALORS<br />
                    &nbsp;&nbsp;ECRIRE("Majeur")<br />
                    SINON<br />
                    &nbsp;&nbsp;ECRIRE("Mineur")<br />
                    FINSI
                </div>
            </div>
        )
    },
    {
        title: "Les Boucles (POUR)",
        content: (
            <div className="space-y-4">
                <p>Pour répéter une action plusieurs fois, on utilise des boucles.</p>
                <div className="bg-gray-50 p-3 rounded border border-gray-200 font-mono text-sm">
                    POUR i ALLANT DE 1 A 3 FAIRE<br />
                    &nbsp;&nbsp;ECRIRE("Tour numéro ", i)<br />
                    FINPOUR
                </div>
                <p className="text-sm text-gray-500">Cela affichera : Tour numéro 1, Tour numéro 2, Tour numéro 3.</p>
            </div>
        )
    }
];

export default function TutorialModal({ isOpen, onClose }) {
    const [currentStep, setCurrentStep] = useState(0);

    if (!isOpen) return null;

    const step = STEPS[currentStep];

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
                    <div className="flex items-center gap-2 font-semibold text-lg">
                        <BookOpen size={24} />
                        Tutoriel Interactif
                    </div>
                    <button onClick={onClose} className="hover:bg-blue-700 p-1 rounded transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 overflow-y-auto">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">{step.title}</h3>
                    <div className="text-gray-600 leading-relaxed">
                        {step.content}
                    </div>
                </div>

                {/* Footer / Navigation */}
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                    <div className="flex gap-1">
                        {STEPS.map((_, i) => (
                            <div
                                key={i}
                                className={`h-2 w-2 rounded-full transition-colors ${i === currentStep ? 'bg-blue-600' : 'bg-gray-300'}`}
                            />
                        ))}
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
                            disabled={currentStep === 0}
                            className="px-3 py-2 rounded text-gray-600 hover:bg-gray-200 disabled:opacity-50 flex items-center gap-1 text-sm font-medium transition-colors"
                        >
                            <ChevronLeft size={16} /> Précédent
                        </button>

                        {currentStep < STEPS.length - 1 ? (
                            <button
                                onClick={() => setCurrentStep(prev => Math.min(STEPS.length - 1, prev + 1))}
                                className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1 text-sm font-medium transition-colors shadow-sm"
                            >
                                Suivant <ChevronRight size={16} />
                            </button>
                        ) : (
                            <button
                                onClick={onClose}
                                className="px-3 py-2 rounded bg-green-600 text-white hover:bg-green-700 flex items-center gap-1 text-sm font-medium transition-colors shadow-sm"
                            >
                                Terminer
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
