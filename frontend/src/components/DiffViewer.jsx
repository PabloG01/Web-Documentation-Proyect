import React, { useMemo } from 'react';
import * as diff from 'diff';
import '../styles/DocumentHistory.css';

const DiffViewer = ({ oldText = '', newText = '' }) => {
    // Calcular diferencias usando diffChars para mayor precisión o diffWords para legibilidad
    const diffs = useMemo(() => {
        if (!oldText && !newText) return [];
        // Usamos diffWordsWithSpace para que sea más legible en texto
        return diff.diffWordsWithSpace(oldText || '', newText || '');
    }, [oldText, newText]);

    if (!diffs.length) {
        return <div className="diff-no-changes">No hay cambios visibles</div>;
    }

    return (
        <div className="diff-viewer">
            <div className="diff-content">
                {diffs.map((part, index) => {
                    // Verde si se añadió, Rojo (tachado) si se eliminó, Normal si no cambió
                    const color = part.added ? 'diff-added' : part.removed ? 'diff-removed' : 'diff-unchanged';

                    // Si el usuario solo quiere ver lo nuevo, podríamos ocultar part.removed
                    // Pero para un diff completo, mostramos ambos.

                    return (
                        <span key={index} className={`diff-part ${color}`}>
                            {part.value}
                        </span>
                    );
                })}
            </div>
        </div>
    );
};

export default DiffViewer;
