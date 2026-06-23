import { compileAndRun } from '../../lib/javaRunner';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, driverCode, userCode, tests, timeLimit } = req.body || {};
  const hasCode = code?.trim() || userCode?.trim() || driverCode?.trim();

  if (!hasCode || !Array.isArray(tests)) {
    return res.status(400).json({ error: 'Code and tests are required.' });
  }

  try {
    const result = await compileAndRun({ code, driverCode, userCode, tests, timeLimit });

    if (result.compileError) {
      return res.status(200).json({
        compileError: result.compileError,
        results: tests.map((test) => ({
          passed: false,
          message: result.compileError,
          input: test.input || '',
          expected: (test.expected || '').trim(),
          actual: '',
          timedOut: false,
          error: result.compileError,
        })),
      });
    }

    return res.status(200).json({ results: result.results, compileError: null });
  } catch (error) {
    const msg = error.message || 'Unexpected server error';
    if (msg.includes('Downloading Java') || msg.includes('JDK')) {
      return res.status(503).json({ error: msg, setup: true });
    }
    return res.status(500).json({ error: msg });
  }
}
