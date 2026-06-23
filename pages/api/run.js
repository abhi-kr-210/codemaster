import { compileAndRun } from '../../lib/javaRunner';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, driverCode, userCode, stdin, timeLimit } = req.body || {};
  const hasCode = code?.trim() || userCode?.trim() || driverCode?.trim();

  if (!hasCode) return res.status(400).json({ error: 'Code required' });

  try {
    const result = await compileAndRun({ code, driverCode, userCode, stdin, timeLimit });

    if (result.compileError) {
      return res.status(200).json({ error: result.compileError, compileError: true });
    }
    if (result.timedOut) {
      return res.status(200).json({ error: result.error || 'Time Limit Exceeded' });
    }
    if (result.error) {
      return res.status(200).json({ error: result.error });
    }
    return res.status(200).json({ output: result.output || '' });
  } catch (error) {
    const msg = error.message || 'Unexpected error';
    if (msg.includes('Downloading Java') || msg.includes('JDK')) {
      return res.status(503).json({ error: msg, setup: true });
    }
    return res.status(500).json({ error: msg });
  }
}
