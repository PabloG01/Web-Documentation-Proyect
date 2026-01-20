import React, { useState } from 'react';
import '../styles/ScoreBreakdown.css';

/**
 * Score Breakdown Component
 * Shows detailed quality score with progress bars by criteria
 */
function ScoreBreakdown({
    score = 0,
    breakdown = null,
    suggestions = [],
    compact = false,
    onExpand = null,
    isExpanded = undefined, // Controlled state
    renderAsBadge = false   // Force rendering as badge even if expanded
}) {
    const [localExpanded, setLocalExpanded] = useState(false);

    // Determine effective expanded state
    const expanded = isExpanded !== undefined ? isExpanded : localExpanded;

    // Get level info from score
    const getLevel = (score) => {
        if (score >= 71) return { level: 'good', emoji: '🟢', label: 'Completa', color: '#22c55e' };
        if (score >= 41) return { level: 'partial', emoji: '🟡', label: 'Parcial', color: '#f59e0b' };
        return { level: 'basic', emoji: '🔴', label: 'Básica', color: '#ef4444' };
    };

    const level = getLevel(score);

    // Toggle expansion
    const handleToggle = () => {
        const newExpanded = !expanded;
        if (isExpanded === undefined) {
            setLocalExpanded(newExpanded);
        }
        if (onExpand) {
            onExpand(newExpanded);
        }
    };

    // Compact mode - just badge
    if ((compact && !expanded) || renderAsBadge) {
        return (
            <button
                className={`score-badge ${level.level} ${expanded ? 'active' : ''}`}
                onClick={handleToggle}
                title="Ver desglose de calidad"
            >
                {level.emoji} {score}%
            </button>
        );
    }

    // Default criteria if breakdown not provided
    const defaultBreakdown = {
        routes: { score: score > 0 ? 20 : 0, max: 20, label: 'Rutas', icon: '🛤️', percentage: score > 0 ? 100 : 0 },
        descriptions: { score: 0, max: 20, label: 'Descripciones', icon: '📝', percentage: 0 },
        parameters: { score: 0, max: 15, label: 'Parámetros', icon: '🔧', percentage: 0 },
        responses: { score: 0, max: 15, label: 'Respuestas', icon: '📤', percentage: 0 },
        examples: { score: 0, max: 10, label: 'Ejemplos', icon: '💡', percentage: 0 },
        schemas: { score: 0, max: 10, label: 'Schemas', icon: '📋', percentage: 0 },
        info: { score: 0, max: 10, label: 'Info', icon: 'ℹ️', percentage: 0 }
    };

    const displayBreakdown = breakdown || defaultBreakdown;

    return (
        <div className={`score-breakdown ${expanded ? 'expanded' : ''}`}>
            {/* Header */}
            <div className="score-header" onClick={compact ? handleToggle : undefined}>
                <div className="score-main">
                    <div
                        className="score-circle"
                        style={{
                            background: `conic-gradient(${level.color} ${score * 3.6}deg, #e2e8f0 0deg)`
                        }}
                    >
                        <span className="score-value">{score}%</span>
                    </div>
                    <div className="score-info">
                        <span className="score-label">Calidad de Documentación</span>
                        <span className={`score-level ${level.level}`}>
                            {level.emoji} {level.label}
                        </span>
                    </div>
                </div>
                {compact && (
                    <button className="collapse-btn" onClick={handleToggle}>
                        ✕
                    </button>
                )}
            </div>

            {/* Breakdown bars */}
            <div className="breakdown-list">
                {Object.entries(displayBreakdown).map(([key, item]) => (
                    <div key={key} className="breakdown-item">
                        <div className="breakdown-label">
                            <span className="breakdown-icon">{item.icon}</span>
                            <span className="breakdown-name">{item.label}</span>
                            <span className="breakdown-score">{item.score}/{item.max}</span>
                        </div>
                        <div className="breakdown-bar">
                            <div
                                className="breakdown-fill"
                                style={{
                                    width: `${item.percentage || 0}%`,
                                    backgroundColor: getLevel(item.percentage || 0).color
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* Suggestions */}
            {suggestions && suggestions.length > 0 && (
                <div className="suggestions-section">
                    <h4>💡 Sugerencias para mejorar</h4>
                    <ul className="suggestions-list">
                        {suggestions.map((suggestion, index) => (
                            <li key={index}>{suggestion}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

export default ScoreBreakdown;
