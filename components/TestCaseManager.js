import { ChevronIcon } from './Icons';

function TestCaseCard({ index, test, type, onChange, onRemove, canRemove, status }) {
  const isHidden = type === 'hidden';
  const statusClass = status === 'passed' ? 'case--passed' : status === 'failed' ? 'case--failed' : status === 'running' ? 'case--running' : '';

  return (
    <div className={`case-card animate-slide-up ${statusClass}`} style={{ animationDelay: `${index * 40}ms` }}>
      <div className="case-card__head">
        <span className="case-card__badge">Case {index + 1}</span>
        {status && (
          <span className={`case-status case-status--${status}`}>
            {status === 'passed' ? '✓' : status === 'failed' ? '✗' : status === 'running' ? '…' : ''}
          </span>
        )}
        {canRemove && (
          <button type="button" className="ghost-btn ghost-btn--sm" onClick={() => onRemove(index)}>
            Remove
          </button>
        )}
      </div>
      <label className="field">
        <span>Input {isHidden ? '(hidden on submit)' : ''}</span>
        <textarea
          value={test.input}
          onChange={(e) => onChange(index, 'input', e.target.value)}
          placeholder="e.g. 3 5"
          spellCheck={false}
        />
      </label>
      <label className="field">
        <span>Expected Output</span>
        <textarea
          value={test.expected}
          onChange={(e) => onChange(index, 'expected', e.target.value)}
          placeholder="e.g. 8"
          spellCheck={false}
        />
      </label>
    </div>
  );
}

export default function TestCaseManager({ activeTab, setActiveTab, publicTests, hiddenTests, onUpdate, onAdd, onRemove, caseStatuses }) {
  const tests = activeTab === 'public' ? publicTests : hiddenTests;
  const type = activeTab;

  return (
    <div className="test-manager">
      <div className="tab-bar">
        <button
          type="button"
          className={`tab-bar__btn ${activeTab === 'public' ? 'active' : ''}`}
          onClick={() => setActiveTab('public')}
        >
          Public ({publicTests.length})
        </button>
        <button
          type="button"
          className={`tab-bar__btn ${activeTab === 'hidden' ? 'active' : ''}`}
          onClick={() => setActiveTab('hidden')}
        >
          Hidden ({hiddenTests.length})
        </button>
      </div>

      <div className="test-manager__list">
        {tests.map((test, i) => (
          <TestCaseCard
            key={`${type}-${i}`}
            index={i}
            test={test}
            type={type}
            onChange={(idx, field, val) => onUpdate(type, idx, field, val)}
            onRemove={(idx) => onRemove(type, idx)}
            canRemove={tests.length > 1}
            status={caseStatuses?.[`${type}-${i}`]}
          />
        ))}
      </div>

      <button type="button" className="add-case-btn" onClick={() => onAdd(type)}>
        + Add {activeTab === 'public' ? 'Public' : 'Hidden'} Test Case
      </button>
    </div>
  );
}

export function TestResultRow({ index, result, isHidden, expanded, onToggle }) {
  const status = result.passed ? 'passed' : result.timedOut ? 'tle' : result.error ? 'error' : 'failed';

  return (
    <div className={`result-row result-row--${status} ${expanded ? 'expanded' : ''}`}>
      <button type="button" className="result-row__header" onClick={onToggle}>
        <span className={`result-dot result-dot--${status}`} />
        <span className="result-row__title">Test Case {index + 1}</span>
        <span className="result-row__status">
          {result.passed ? 'Passed' : result.timedOut ? 'Time Limit Exceeded' : result.error ? 'Runtime Error' : 'Wrong Answer'}
        </span>
        <ChevronIcon open={expanded} />
      </button>
      {expanded && (
        <div className="result-row__body animate-expand">
          {!isHidden && (
            <>
              <div className="io-block">
                <span className="io-label">Input (stdin)</span>
                <pre>{result.input || '(empty)'}</pre>
              </div>
              <div className="io-block">
                <span className="io-label">Expected Output</span>
                <pre>{result.expected || '(empty)'}</pre>
              </div>
            </>
          )}
          {isHidden && !result.passed && (
            <p className="hidden-hint">Hidden test case details are not shown.</p>
          )}
          <div className="io-block">
            <span className="io-label">Your Output</span>
            <pre className={result.passed ? 'text-success' : 'text-danger'}>{result.actual || result.error || '(empty)'}</pre>
          </div>
          {result.message && !result.passed && (
            <div className="io-block">
              <span className="io-label">Message</span>
              <pre>{result.message}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
