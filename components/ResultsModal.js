import { useEffect, useState } from 'react';
import { TestResultRow } from './TestCaseManager';

export default function ResultsModal({ open, onClose, data, isHidden }) {
  const [expandedIdx, setExpandedIdx] = useState(null);
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (!open || !data) {
      setVisibleCount(0);
      setExpandedIdx(null);
      return;
    }

    setVisibleCount(0);
    const entries = data.entries || [];
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      setVisibleCount(i);
      if (i >= entries.length) clearInterval(timer);
    }, 120);

    return () => clearInterval(timer);
  }, [open, data]);

  if (!open || !data) return null;

  const { title, entries = [], passed = 0, total = 0, compileError, isSubmit, score } = data;
  const allPassed = total > 0 && passed === total;
  const pct = total > 0 ? Math.round((passed / total) * 100) : 0;

  return (
    <div className="modal-backdrop animate-backdrop" onClick={onClose} role="presentation">
      <div className="modal-sheet animate-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-sheet__hero">
          <div className={`score-ring ${allPassed ? 'score-ring--success' : passed > 0 ? 'score-ring--partial' : 'score-ring--fail'}`}>
            <svg viewBox="0 0 120 120">
              <circle className="score-ring__bg" cx="60" cy="60" r="52" />
              <circle
                className="score-ring__fg"
                cx="60"
                cy="60"
                r="52"
                style={{ strokeDashoffset: 327 - (327 * pct) / 100 }}
              />
            </svg>
            <div className="score-ring__text">
              <strong>{passed}/{total}</strong>
              <span>passed</span>
            </div>
          </div>

          <div className="modal-sheet__summary">
            <h2>{allPassed && isSubmit ? '🎉 Accepted!' : title}</h2>
            {compileError ? (
              <p className="compile-error">{compileError}</p>
            ) : (
              <p>
                {allPassed
                  ? isSubmit
                    ? `All hidden test cases passed. Score: ${score}`
                    : 'All public test cases passed. Ready to submit!'
                  : `${total - passed} test case${total - passed === 1 ? '' : 's'} failed.`}
              </p>
            )}
          </div>

          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="modal-sheet__cases">
          {entries.slice(0, visibleCount).map((entry, i) => (
            <TestResultRow
              key={i}
              index={i}
              result={entry}
              isHidden={isHidden}
              expanded={expandedIdx === i}
              onToggle={() => setExpandedIdx(expandedIdx === i ? null : i)}
            />
          ))}
        </div>

        <div className="modal-sheet__footer">
          {!allPassed && !compileError && (
            <span className="hint-text">Click a test case to inspect input / output</span>
          )}
          <button type="button" className="btn btn--primary" onClick={onClose}>
            {allPassed ? 'Continue' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
