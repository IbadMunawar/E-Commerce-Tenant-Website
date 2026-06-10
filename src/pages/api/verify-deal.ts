import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

type VerifySuccessResponse = { verified: true; sessionId: string; productId: string; finalPrice: number };
type VerifyErrorResponse = { verified: false; error: string };
type VerifyResponse = VerifySuccessResponse | VerifyErrorResponse;

export default async function handler(req: NextApiRequest, res: NextApiResponse<VerifyResponse>) {
  // === BARGAIN_BAAS_INTEGRATION_START ===
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ verified: false, error: 'Method Not Allowed' });
  }

  const { sessionId, productId, finalPrice } = req.body ?? {};
  if (!sessionId || !productId || finalPrice === undefined || finalPrice === null) {
    return res.status(400).json({ verified: false, error: 'Missing required parameters: sessionId, productId, finalPrice' });
  }

  const webhookSecret = process.env.INA_WEBHOOK_SECRET;
  const tenantId = process.env.INA_TENANT_ID;
  const verifyUrl = process.env.INA_VERIFY_URL || 'https://ina-backend-fyp.onrender.com/api/saas/session/verify';

  if (!webhookSecret || !tenantId) {
    return res.status(500).json({ verified: false, error: 'Upstream microservice configuration keys missing' });
  }

  const body = JSON.stringify({ session_id: sessionId, final_price: Number(finalPrice) });
  const timestamp = Date.now().toString();
  const signature = crypto.createHmac('sha256', webhookSecret).update(`${timestamp}.${body}`).digest('hex');

  try {
    const inaResponse = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-INA-Tenant': tenantId,
        'X-INA-Timestamp': timestamp,
        'X-INA-Signature': signature,
      },
      body,
    });

    if (!inaResponse.ok) {
      return res.status(422).json({ verified: false, error: 'Upstream HMAC validation rejected request' });
    }

    const inaData = await inaResponse.json();
    if (!inaData?.valid) {
      return res.status(422).json({ verified: false, error: 'Price signature token mapping validation mismatch' });
    }

    return res.status(200).json({ verified: true, sessionId: String(sessionId), productId: String(productId), finalPrice: Number(finalPrice) });
  } catch (err) {
    return res.status(502).json({ verified: false, error: 'Failed to reach central BargainBaaS verification runtime' });
  }
  // === BARGAIN_BAAS_INTEGRATION_END ===
}
