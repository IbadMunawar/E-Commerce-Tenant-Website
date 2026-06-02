import crypto from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';

// ─── Response shape types ─────────────────────────────────────────────────────

type VerifySuccessResponse = {
  verified: true;
  sessionId: string;
  productId: string;
  finalPrice: number;
};

type VerifyErrorResponse = {
  verified: false;
  error: string;
};

type VerifyResponse = VerifySuccessResponse | VerifyErrorResponse;

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<VerifyResponse>
) {
  // ── 1. Method guard ─────────────────────────────────────────────────────────
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res
      .status(405)
      .json({ verified: false, error: 'Method Not Allowed' });
  }

  // ── 2. Extract and validate request body fields ──────────────────────────────
  const { sessionId, productId, finalPrice } = req.body ?? {};

  if (
    sessionId === undefined ||
    sessionId === null ||
    productId === undefined ||
    productId === null ||
    finalPrice === undefined ||
    finalPrice === null
  ) {
    return res.status(400).json({
      verified: false,
      error: 'Missing required fields: sessionId, productId, finalPrice',
    });
  }

  // ── 3. Load private server-side credentials ──────────────────────────────────
  const webhookSecret = process.env.INA_WEBHOOK_SECRET;
  const tenantId = process.env.INA_TENANT_ID;
  const verifyUrl = process.env.INA_VERIFY_URL;

  if (!webhookSecret || !tenantId || !verifyUrl) {
    console.error('[verify-deal] Missing one or more required env vars: INA_WEBHOOK_SECRET, INA_TENANT_ID, INA_VERIFY_URL');
    return res.status(500).json({
      verified: false,
      error: 'Server configuration error',
    });
  }

  // ── 4. Build the canonical request body payload ──────────────────────────────
  // The field order and naming must exactly match the BargainBaaS backend schema.
  const body = JSON.stringify({ session_id: sessionId, final_price: finalPrice });

  // ── 5. Generate Unix millisecond timestamp ───────────────────────────────────
  const timestamp = Date.now().toString();

  // ── 6. Compute HMAC-SHA256 signature ────────────────────────────────────────
  // Signed input: "<timestamp>.<body>"  — must match the central blueprint exactly.
  const signature = crypto
    .createHmac('sha256', webhookSecret)
    .update(`${timestamp}.${body}`)
    .digest('hex');

  // ── 7. Forward the request to the BargainBaaS verification endpoint ──────────
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

    // ── 8. Handle non-2xx responses from the upstream ────────────────────────────
    if (!inaResponse.ok) {
      const upstream = await inaResponse.text();
      console.error(`[verify-deal] Upstream ${inaResponse.status}: ${upstream}`);
      return res.status(422).json({
        verified: false,
        error: 'Deal verification failed: upstream rejected the request',
      });
    }

    // ── 9. Parse the upstream JSON and check the validity flag ───────────────────
    const inaData = await inaResponse.json();

    if (!inaData?.valid) {
      return res.status(422).json({
        verified: false,
        error: 'Deal verification failed: price mismatch or session invalid',
      });
    }

    // ── 10. All checks passed — return confirmation to the client ─────────────────
    return res.status(200).json({
      verified: true,
      sessionId: String(sessionId),
      productId: String(productId),
      finalPrice: Number(finalPrice),
    });
  } catch (err) {
    console.error('[verify-deal] Network or parse error:', err);
    return res.status(502).json({
      verified: false,
      error: 'Failed to reach the BargainBaaS verification service',
    });
  }
}
