import { checkJavaSetup } from '../../lib/javaRunner';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const status = await checkJavaSetup();
    return res.status(200).json(status);
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
}
