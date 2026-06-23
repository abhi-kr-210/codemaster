export default function ConsolePanel({ activeTab, setActiveTab, stdin, setStdin, runOutput, runError, testResults, consoleHeight, onResizeStart }) {
  return (
    <div className="console-panel" style={{ height: consoleHeight }}>
      <div className="console-panel__resize" onMouseDown={onResizeStart} title="Drag to resize" />
      <div className="console-tabs">
        <button
          type="button"
          className={`console-tabs__btn ${activeTab === 'input' ? 'active' : ''}`}
          onClick={() => setActiveTab('input')}
        >
          Custom Input
        </button>
        <button
          type="button"
          className={`console-tabs__btn ${activeTab === 'output' ? 'active' : ''}`}
          onClick={() => setActiveTab('output')}
        >
          Output
        </button>
        <button
          type="button"
          className={`console-tabs__btn ${activeTab === 'results' ? 'active' : ''}`}
          onClick={() => setActiveTab('results')}
        >
          Test Results
          {testResults.length > 0 && (
            <span className="console-badge">
              {testResults.filter((r) => r.passed).length}/{testResults.length}
            </span>
          )}
        </button>
      </div>

      <div className="console-body">
        {activeTab === 'input' && (
          <textarea
            className="console-input"
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            placeholder="Enter custom stdin here and click Run Code..."
            spellCheck={false}
          />
        )}
        {activeTab === 'output' && (
          <div className="console-output">
            {runError ? (
              <pre className="output-error">{runError}</pre>
            ) : runOutput ? (
              <pre className="output-success">{runOutput}</pre>
            ) : (
              <p className="console-empty">Run your code with custom input to see output here.</p>
            )}
          </div>
        )}
        {activeTab === 'results' && (
          <div className="console-results">
            {testResults.length === 0 ? (
              <p className="console-empty">Execute public tests or submit to see results here.</p>
            ) : (
              testResults.map((r, i) => (
                <div key={i} className={`mini-result ${r.passed ? 'passed' : 'failed'}`}>
                  <span className="mini-result__idx">#{i + 1}</span>
                  <span className="mini-result__status">{r.passed ? 'Passed' : r.message}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
