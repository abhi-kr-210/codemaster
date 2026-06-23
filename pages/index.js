import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import Navbar from '../components/Navbar';
import TestCaseManager from '../components/TestCaseManager';
import ResultsModal from '../components/ResultsModal';
import ConsolePanel from '../components/ConsolePanel';
import CodeEditor from '../components/CodeEditor';
import { PlayIcon } from '../components/Icons';
import { useTheme } from '../hooks/useTheme';
import { usePersistedState } from '../hooks/usePersistedState';
import { useExamTimer } from '../hooks/useExamTimer';

const EXEC_TIMEOUT_SEC = 5;

const DEFAULT_DRIVER = `import java.util.*;

public class Solution {
  public static void main(String[] args) {
    Scanner sc = new Scanner(System.in);
    // Write ANY input logic here — strings, multiple lines, arrays, etc.

    // {{USER_CODE}}

    sc.close();
  }
}`;

const DEFAULT_USER_CODE = `// Your methods / logic (injected above in main, or call from main)
static void solve(Scanner sc) {
  // Example: int n = sc.nextInt();
}`;

const EMPTY_TEST = { input: '', expected: '' };

export default function Home() {
  const { theme, toggle: toggleTheme } = useTheme();
  const [question, setQuestion, hydratedQ] = usePersistedState('cm-question', 'Write a Java program that reads two integers and prints their sum.');
  const [examMinutes, setExamMinutes, hydratedT] = usePersistedState('cm-exam-minutes', 30);
  const [scoreValue, setScoreValue, hydratedS] = usePersistedState('cm-score', 100);
  const [driverCode, setDriverCode, hydratedD] = usePersistedState('cm-driver', DEFAULT_DRIVER);
  const [userCode, setUserCode, hydratedC] = usePersistedState('cm-user', DEFAULT_USER_CODE);
  const [publicTests, setPublicTests, hydratedP] = usePersistedState('cm-public', [{ ...EMPTY_TEST, input: '3 5', expected: '8' }]);
  const [hiddenTests, setHiddenTests, hydratedH] = usePersistedState('cm-hidden', [{ ...EMPTY_TEST, input: '10 20', expected: '30' }]);

  const examTimer = useExamTimer(examMinutes);

  const [leftTab, setLeftTab] = useState('problem');
  const [testTab, setTestTab] = useState('public');
  const [consoleTab, setConsoleTab] = useState('input');
  const [stdin, setStdin] = useState('3 5');
  const [runOutput, setRunOutput] = useState('');
  const [runError, setRunError] = useState('');
  const [testResults, setTestResults] = useState([]);
  const [publicResult, setPublicResult] = useState({ passed: 0, total: 0 });
  const [hiddenResult, setHiddenResult] = useState({ passed: 0, total: 0 });
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [modalHidden, setModalHidden] = useState(false);
  const [loading, setLoading] = useState(null);
  const [caseStatuses, setCaseStatuses] = useState({});
  const [consoleHeight, setConsoleHeight] = useState(220);
  const [successBanner, setSuccessBanner] = useState('');
  const [javaStatus, setJavaStatus] = useState({ checking: true, ok: false, message: 'Checking Java…' });
  const [fullCode, setFullCode, hydratedF] = usePersistedState('cm-full', '');
  const [editMode, setEditMode] = useState('split');
  const [autoSubmitted, setAutoSubmitted] = useState(false);

  const resizeRef = useRef(null);
  const runCaseBatchRef = useRef(null);

  const hydrated = hydratedQ && hydratedT && hydratedS && hydratedD && hydratedC && hydratedP && hydratedH && hydratedF;
  const examLocked = examTimer.isRunning || examTimer.isEnded;
  const testsLocked = examLocked;

  const mergedPreview = useMemo(() => {
    const marker = '// {{USER_CODE}}';
    if (driverCode.includes(marker)) {
      return driverCode.replace(marker, userCode.trim() ? `\n${userCode.trim()}\n` : '\n');
    }
    return `${driverCode}\n\n${userCode}`;
  }, [driverCode, userCode]);

  const payload = useMemo(() => {
    if (editMode === 'full' && fullCode.trim()) {
      return { code: fullCode, timeLimit: EXEC_TIMEOUT_SEC };
    }
    return { driverCode, userCode, timeLimit: EXEC_TIMEOUT_SEC };
  }, [driverCode, userCode, fullCode, editMode]);

  const openFullEditor = () => {
    setFullCode((prev) => (prev.trim() ? prev : mergedPreview));
    setEditMode('full');
  };

  useEffect(() => {
    try {
      if (!localStorage.getItem('cm-exam-minutes')) {
        const legacy = localStorage.getItem('cm-time');
        if (legacy) {
          const n = JSON.parse(legacy);
          setExamMinutes(n <= 10 ? Math.max(1, n) : Math.max(1, Math.ceil(n / 60)));
          localStorage.removeItem('cm-time');
        }
      }
      const legacyCode = localStorage.getItem('cm-code');
      if (legacyCode && !localStorage.getItem('cm-user')) {
        setUserCode(JSON.parse(legacyCode));
        localStorage.removeItem('cm-code');
      }
    } catch {
      /* ignore */
    }
  }, [setExamMinutes, setUserCode]);

  useEffect(() => {
    fetch('/api/java-status')
      .then((r) => r.json())
      .then((data) => {
        setJavaStatus({
          checking: false,
          ok: data.ok,
          message: data.ok ? `Java ready (${data.javaHome})` : data.error || 'Java setup failed',
        });
      })
      .catch(() => {
        setJavaStatus({ checking: false, ok: false, message: 'Could not reach Java runtime' });
      });
  }, []);

  const updateTest = (type, index, field, value) => {
    const setter = type === 'public' ? setPublicTests : setHiddenTests;
    setter((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeTest = (type, index) => {
    const setter = type === 'public' ? setPublicTests : setHiddenTests;
    setter((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length ? next : [{ ...EMPTY_TEST }];
    });
  };

  const addTest = (type) => {
    const setter = type === 'public' ? setPublicTests : setHiddenTests;
    setter((prev) => [...prev, { ...EMPTY_TEST }]);
  };

  const filterTests = (tests) => tests.filter((t) => t.input.trim() || t.expected.trim());

  const animateCaseStatuses = useCallback(async (type, results) => {
    const statuses = {};
    for (let i = 0; i < results.length; i += 1) {
      statuses[`${type}-${i}`] = 'running';
      setCaseStatuses({ ...statuses });
      await new Promise((r) => setTimeout(r, 180));
      statuses[`${type}-${i}`] = results[i].passed ? 'passed' : 'failed';
      setCaseStatuses({ ...statuses });
    }
  }, []);

  const handleApiError = (body, fallback) => {
    if (body.setup) {
      setRunError('Setting up Java JDK (first run may take 1–2 min). Please try again in a moment…');
      setJavaStatus({ checking: true, ok: false, message: 'Downloading JDK…' });
      return true;
    }
    setRunError(body.error || fallback);
    return false;
  };

  const runCaseBatch = useCallback(async (type, fromAutoSubmit = false) => {
    const tests = type === 'public' ? publicTests : hiddenTests;
    const filtered = filterTests(tests);
    if (!filtered.length) {
      setRunError('Add at least one test case with input or expected output.');
      setConsoleTab('output');
      return;
    }

    setLoading(type === 'public' ? 'execute' : 'submit');
    setSuccessBanner('');
    setCaseStatuses({});
    setRunError('');

    try {
      const response = await fetch('/api/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, tests: filtered }),
      });
      const body = await response.json();

      if (!response.ok) {
        handleApiError(body, 'Failed to run tests');
        setConsoleTab('output');
        return;
      }

      const entries = (body.results || []).map((r, i) => ({
        ...r,
        title: `${type === 'public' ? 'Public' : 'Hidden'} Case ${i + 1}`,
      }));

      await animateCaseStatuses(type, entries);

      const passedCount = entries.filter((r) => r.passed).length;
      setTestResults(entries);
      setConsoleTab('results');

      if (type === 'public') {
        setPublicResult({ passed: passedCount, total: entries.length });
      } else {
        setHiddenResult({ passed: passedCount, total: entries.length });
        if (fromAutoSubmit) {
          setAutoSubmitted(true);
          setSuccessBanner(
            passedCount === entries.length && entries.length > 0
              ? `Time is up! Auto-submitted — Accepted! ${scoreValue} points.`
              : 'Time is up! Your code was auto-submitted.'
          );
        } else if (passedCount === entries.length && entries.length > 0) {
          setSuccessBanner(`Accepted! You earned ${scoreValue} points.`);
        }
      }

      setModalHidden(type === 'hidden');
      setModalData({
        title: fromAutoSubmit
          ? 'Auto-Submit — Time Up!'
          : type === 'public'
            ? 'Public Test Results'
            : 'Submission Result',
        entries,
        passed: passedCount,
        total: entries.length,
        compileError: body.compileError,
        isSubmit: type === 'hidden',
        score: scoreValue,
      });
      setModalOpen(true);

      if (body.compileError) {
        setRunError(body.compileError);
        setConsoleTab('output');
      }
    } catch (err) {
      setRunError(err.message || 'Failed to run tests');
      setConsoleTab('output');
    } finally {
      setLoading(null);
    }
  }, [animateCaseStatuses, hiddenTests, payload, publicTests, scoreValue]);

  runCaseBatchRef.current = runCaseBatch;

  useEffect(() => {
    examTimer.setOnExpire(() => {
      if (runCaseBatchRef.current) {
        runCaseBatchRef.current('hidden', true);
      }
    });
  }, [examTimer.setOnExpire]);

  const runWithStdin = async () => {
    setLoading('run');
    setRunOutput('');
    setRunError('');

    try {
      const response = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, stdin }),
      });
      const body = await response.json();

      if (!response.ok) {
        handleApiError(body, 'Run failed');
        setConsoleTab('output');
        return;
      }

      if (body.error) {
        setRunError(body.error);
      } else {
        setRunOutput(body.output || '(no output)');
      }
      setConsoleTab('output');
    } catch (err) {
      setRunError(err.message || 'Run failed');
      setConsoleTab('output');
    } finally {
      setLoading(null);
    }
  };

  const handleStartExam = () => {
    if (filterTests(hiddenTests).length === 0) {
      setRunError('Add at least one hidden test case before starting the exam.');
      setConsoleTab('output');
      setLeftTab('tests');
      setTestTab('hidden');
      return;
    }
    setAutoSubmitted(false);
    setHiddenResult({ passed: 0, total: 0 });
    examTimer.startExam();
    setSuccessBanner(`Exam started! You have ${examMinutes} minute${examMinutes === 1 ? '' : 's'}. Good luck!`);
  };

  const handleResetExam = () => {
    examTimer.resetExam();
    setAutoSubmitted(false);
    setSuccessBanner('');
  };

  const onResizeStart = (e) => {
    e.preventDefault();
    resizeRef.current = { startY: e.clientY, startH: consoleHeight };
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!resizeRef.current) return;
      const delta = resizeRef.current.startY - e.clientY;
      setConsoleHeight(Math.min(480, Math.max(140, resizeRef.current.startH + delta)));
    };
    const onUp = () => {
      resizeRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [consoleHeight]);

  if (!hydrated) {
    return (
      <div className="boot-screen">
        <div className="boot-loader" />
        <p>Loading CodeMaster…</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>CodeMaster — Java Practice</title>
        <meta name="description" content="HackerRank-style Java programming practice platform" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      <div className={`app ${examTimer.isRunning ? 'app--exam-live' : ''}`}>
        <Navbar
          theme={theme}
          onToggleTheme={toggleTheme}
          examMinutes={examMinutes}
          setExamMinutes={setExamMinutes}
          scoreValue={scoreValue}
          setScoreValue={setScoreValue}
          publicPassed={publicResult.passed}
          publicTotal={publicResult.total || filterTests(publicTests).length}
          hiddenPassed={hiddenResult.passed}
          hiddenTotal={hiddenResult.total || filterTests(hiddenTests).length}
          javaStatus={javaStatus}
          examTimer={examTimer}
          onStartExam={handleStartExam}
          onResetExam={handleResetExam}
        />

        {successBanner && (
          <div className="success-toast animate-slide-down">
            <span>{successBanner}</span>
            <button type="button" onClick={() => setSuccessBanner('')}>×</button>
          </div>
        )}

        <div className="workspace">
          <aside className={`panel panel--left animate-slide-right ${examLocked ? 'panel--locked' : ''}`}>
            <div className="panel-tabs">
              <button type="button" className={leftTab === 'problem' ? 'active' : ''} onClick={() => setLeftTab('problem')}>
                Problem
              </button>
              <button type="button" className={leftTab === 'tests' ? 'active' : ''} onClick={() => setLeftTab('tests')} disabled={testsLocked}>
                Test Cases
              </button>
            </div>

            <div className="panel-scroll">
              {leftTab === 'problem' && (
                <div className="problem-view">
                  <div className="problem-meta">
                    <span className="chip chip--java">Java</span>
                    <span className="chip">Exam: {examMinutes} min</span>
                    <span className="chip chip--score">{scoreValue} pts</span>
                    {examTimer.isRunning && (
                      <span className="chip chip--live">Live</span>
                    )}
                  </div>
                  <textarea
                    className="problem-editor"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Describe the programming problem..."
                    readOnly={examLocked}
                  />
                  <p className="hint-box">
                    Use the <strong>Driver Code</strong> editor (main + I/O) on the right to read any input format. Add test cases here, then Run or Submit.
                  </p>
                </div>
              )}

              {leftTab === 'tests' && !testsLocked && (
                <TestCaseManager
                  activeTab={testTab}
                  setActiveTab={setTestTab}
                  publicTests={publicTests}
                  hiddenTests={hiddenTests}
                  onUpdate={updateTest}
                  onAdd={addTest}
                  onRemove={removeTest}
                  caseStatuses={caseStatuses}
                />
              )}

              {testsLocked && leftTab === 'tests' && (
                <p className="hint-box">Test case setup is locked during the exam. Edit Driver Code on the right to change I/O logic.</p>
              )}
            </div>
          </aside>

          <section className="panel panel--editor animate-slide-left">
            <div className="editor-toolbar">
              <div className="editor-toolbar__left">
                <div className="editor-mode-tabs">
                  <button
                    type="button"
                    className={`editor-mode-tabs__btn ${editMode === 'split' ? 'active' : ''}`}
                    onClick={() => setEditMode('split')}
                  >
                    Split (Driver + Solution)
                  </button>
                  <button
                    type="button"
                    className={`editor-mode-tabs__btn ${editMode === 'full' ? 'active' : ''}`}
                    onClick={openFullEditor}
                  >
                    Full File
                  </button>
                </div>
              </div>
              <div className="editor-toolbar__actions">
                <button type="button" className="btn btn--ghost" onClick={runWithStdin} disabled={!!loading}>
                  {loading === 'run' ? <span className="spinner" /> : <PlayIcon />}
                  Run Code
                </button>
                <button type="button" className="btn btn--secondary" onClick={() => runCaseBatch('public')} disabled={!!loading}>
                  {loading === 'execute' ? <span className="spinner" /> : null}
                  Execute Tests
                </button>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => runCaseBatch('hidden')}
                  disabled={!!loading || (examTimer.isEnded && autoSubmitted)}
                >
                  {loading === 'submit' ? <span className="spinner" /> : null}
                  Submit
                </button>
              </div>
            </div>

            {editMode === 'full' ? (
              <div className="solution-editor-wrap">
                <div className="solution-banner solution-banner--driver">
                  <span><strong>Full Solution.java</strong> — edit everything including <strong>main()</strong>, inputs, and output. Write any logic you need.</span>
                </div>
                <CodeEditor
                  label="Solution.java (complete file)"
                  value={fullCode || mergedPreview}
                  onChange={(e) => setFullCode(e.target.value)}
                  minHeight="520px"
                  theme={theme}
                />
              </div>
            ) : (
              <div className="dual-editor">
                <div className="dual-editor__pane">
                  <div className="solution-banner solution-banner--driver">
                    <span><strong>Driver Code</strong> — editable <strong>main()</strong> &amp; I/O. Read any input format, print any output.</span>
                  </div>
                  <CodeEditor
                    label="Driver.java — main() & I/O"
                    value={driverCode}
                    onChange={(e) => setDriverCode(e.target.value)}
                    minHeight="260px"
                    theme={theme}
                  />
                </div>
                <div className="dual-editor__pane">
                  <div className="solution-banner">
                    <span><strong>Your Solution</strong> — methods &amp; logic injected at <code>{'// {{USER_CODE}}'}</code></span>
                  </div>
                  <CodeEditor
                    label="YourSolution.java"
                    value={userCode}
                    onChange={(e) => setUserCode(e.target.value)}
                    minHeight="260px"
                    theme={theme}
                    placeholder={'static void solve(Scanner sc) {\n  // your logic\n}'}
                  />
                </div>
              </div>
            )}

            <ConsolePanel
              activeTab={consoleTab}
              setActiveTab={setConsoleTab}
              stdin={stdin}
              setStdin={setStdin}
              runOutput={runOutput}
              runError={runError}
              testResults={testResults}
              consoleHeight={consoleHeight}
              onResizeStart={onResizeStart}
            />
          </section>
        </div>

        <ResultsModal open={modalOpen} onClose={() => setModalOpen(false)} data={modalData} isHidden={modalHidden} />
      </div>
    </>
  );
}
