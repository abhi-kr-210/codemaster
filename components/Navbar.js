import { CodeMasterLogo, MoonIcon, SunIcon } from './Icons';

export default function Navbar({
  theme,
  onToggleTheme,
  examMinutes,
  setExamMinutes,
  scoreValue,
  setScoreValue,
  publicPassed,
  publicTotal,
  hiddenPassed,
  hiddenTotal,
  javaStatus,
  examTimer,
  onStartExam,
  onResetExam,
}) {
  const { status, formattedTime, progress, isRunning, isEnded } = examTimer;
  const urgent = isRunning && examTimer.remainingMs <= 5 * 60 * 1000;
  const critical = isRunning && examTimer.remainingMs <= 60 * 1000;

  return (
    <header className="navbar animate-fade-in">
      <div className="navbar__brand">
        <CodeMasterLogo />
        <div>
          <span className="navbar__title">CodeMaster</span>
          <span className="navbar__tagline">Java Practice Platform</span>
        </div>
      </div>

      <div className="navbar__stats">
        <div className={`exam-timer ${isRunning ? 'exam-timer--live' : ''} ${urgent ? 'exam-timer--urgent' : ''} ${critical ? 'exam-timer--critical' : ''} ${isEnded ? 'exam-timer--ended' : ''}`}>
          <div className="exam-timer__top">
            <span className="exam-timer__label">{isEnded ? 'Time Up' : isRunning ? 'Exam Time' : 'Exam Duration'}</span>
            <span className="exam-timer__clock">{isRunning || isEnded ? formattedTime : `${examMinutes} min`}</span>
          </div>
          {isRunning && (
            <div className="exam-timer__bar">
              <div className="exam-timer__fill" style={{ width: `${Math.max(0, Math.min(100, progress * 100))}%` }} />
            </div>
          )}
        </div>
        <div className="stat-pill">
          <span className="stat-pill__label">Public</span>
          <span className="stat-pill__value">{publicPassed}/{publicTotal}</span>
        </div>
        <div className="stat-pill stat-pill--hidden">
          <span className="stat-pill__label">Hidden</span>
          <span className="stat-pill__value">{hiddenPassed}/{hiddenTotal}</span>
        </div>
      </div>

      <div className="navbar__controls">
        <div className={`java-status ${javaStatus?.ok ? 'java-status--ok' : javaStatus?.checking ? 'java-status--wait' : 'java-status--err'}`} title={javaStatus?.message}>
          <span className="java-status__dot" />
          {javaStatus?.checking ? 'Java…' : javaStatus?.ok ? 'Java OK' : 'Java err'}
        </div>

        {!isRunning && !isEnded && (
          <label className="inline-field">
            <span>Exam (min)</span>
            <input
              type="number"
              min="1"
              max="300"
              value={examMinutes}
              onChange={(e) => setExamMinutes(Number(e.target.value) || 30)}
            />
          </label>
        )}

        <label className="inline-field">
          <span>Score</span>
          <input
            type="number"
            min="1"
            max="1000"
            value={scoreValue}
            onChange={(e) => setScoreValue(Number(e.target.value) || 100)}
            disabled={isRunning}
          />
        </label>

        {!isRunning && !isEnded && (
          <button type="button" className="btn btn--exam" onClick={onStartExam}>
            Start Exam
          </button>
        )}

        {isRunning && (
          <span className="exam-live-badge">Exam in progress</span>
        )}

        {isEnded && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={onResetExam}>
            Reset Exam
          </button>
        )}

        <button type="button" className="icon-btn" onClick={onToggleTheme} aria-label="Toggle theme">
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </header>
  );
}
