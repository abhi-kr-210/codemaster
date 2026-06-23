import { useCallback, useEffect, useRef, useState } from 'react';

function formatMs(ms) {
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function useExamTimer(examMinutes) {
  const [status, setStatus] = useState('idle');
  const [remainingMs, setRemainingMs] = useState(() => Math.max(1, examMinutes) * 60 * 1000);
  const endAtRef = useRef(null);
  const onExpireRef = useRef(null);

  const setOnExpire = useCallback((fn) => {
    onExpireRef.current = fn;
  }, []);

  const startExam = useCallback(() => {
    const ms = Math.max(1, Number(examMinutes) || 30) * 60 * 1000;
    endAtRef.current = Date.now() + ms;
    setRemainingMs(ms);
    setStatus('running');
  }, [examMinutes]);

  const resetExam = useCallback(() => {
    endAtRef.current = null;
    setStatus('idle');
    setRemainingMs(Math.max(1, Number(examMinutes) || 30) * 60 * 1000);
  }, [examMinutes]);

  useEffect(() => {
    if (status !== 'running') return undefined;
    let expired = false;
    const tick = () => {
      const left = Math.max(0, (endAtRef.current || Date.now()) - Date.now());
      setRemainingMs(left);
      if (left <= 0 && !expired) {
        expired = true;
        setStatus('ended');
        onExpireRef.current?.();
        onExpireRef.current = null;
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [status]);

  useEffect(() => {
    if (status === 'idle') {
      setRemainingMs(Math.max(1, Number(examMinutes) || 30) * 60 * 1000);
    }
  }, [examMinutes, status]);

  const isRunning = status === 'running';
  const isEnded = status === 'ended';
  const progress =
    status === 'running' && endAtRef.current
      ? remainingMs / (Math.max(1, Number(examMinutes) || 30) * 60 * 1000)
      : 1;

  return {
    status,
    remainingMs,
    formattedTime: formatMs(remainingMs),
    progress,
    isRunning,
    isEnded,
    startExam,
    resetExam,
    setOnExpire,
  };
}
