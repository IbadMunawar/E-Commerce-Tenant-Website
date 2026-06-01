# BargainBaaS — Tenant Integration Blueprint

**Platform:** BargainBaaS AI Negotiation SDK  
**Tenant Store:** TechStore (Next.js 16, Pages Router)  
**Integration Date:** 2025  
**Integration Status:** ✅ Active  

This document records every single line of code added, modified, or created on
the tenant storefront to integrate the BargainBaaS widget. A developer can use
this file to **re-apply the integration from scratch in under 5 minutes**, or
**completely roll it back to the baseline store** in under 2 minutes.

---

## Architecture Overview

```
Tenant Store (TechStore)
       │
       ├── loader.js  (served from BargainBaaS CDN port 4000)
       │       └── Injects widget.js, listens to SPA route changes
       │
       ├── widget.js  (served from BargainBaaS CDN port 4000)
       │       └── Preact chat UI, calls INA backend + orchestrator
       │
       └── /api/verify-deal.ts  (local Next.js API route)
               └── Server-side HMAC proxy to INA /api/saas/session/verify
```

**Zero business logic lives in the widget.** The widget only handles the
conversation. All price verification happens server-to-server via HMAC.

---

## Environment Variables Required

Create `.env.local` at the repo root with these values (never commit this file):

```bash
# ── Public (safe to expose to browser) ───────────────────────────────────────
NEXT_PUBLIC_INA_CDN_URL=http://localhost:4000
NEXT_PUBLIC_INA_PUBLIC_KEY=<your client_api_key from BargainBaaS dashboard>

# ── Private (server-only, never exposed to browser) ──────────────────────────
INA_TENANT_ID=<your numeric tenant ID from BargainBaaS dashboard>
INA_WEBHOOK_SECRET=<your webhook_secret from BargainBaaS dashboard>
INA_BACKEND_URL=https://ina-backend-fyp.onrender.com
```

**Where to find these values:**  
Log in to [BargainBaaS Dashboard] → Integration page → copy "Tenant API Key"
(public key) and "Tenant ID". The `webhook_secret` is returned by
`GET /api/v1/tenant/configuration` after logging in.

---

## Files Changed

### 1. `src/store/cartStore.ts` — Modified

**Why:** The cart needed to store the BargainBaaS `sessionId` alongside each
negotiated item so it can be forwarded to the server-side `/verify` endpoint
at checkout. Without this, there is no way to link a cart item back to its
negotiation row in the INA database.

**Lines added:**

```typescript
// ADDED to CartItem interface:
/** BargainBaaS negotiation session ID — present only for negotiated items */
sessionId?: string;

// ADDED to CartStore interface — third parameter:
addToCart: (product: Product, negotiatedPrice?: number, sessionId?: string) => void;

// ADDED inside addToCart implementation when creating a new item:
...(sessionId !== undefined && { sessionId }),
```

**Rollback:** Remove the `sessionId?: string` field from `CartItem`, remove the
third parameter from `addToCart`, and remove the `sessionId` spread from the
new-item object.

---

### 2. `src/pages/product/[id].tsx` — Modified

**Why:** Four integration hooks are needed on the product detail page:

| Hook | Purpose |
|---|---|
| `<Script>` tag | Loads BargainBaaS `loader.js` with tenant + product context |
| `window.INA('product-change')` useEffect | Explicit SPA handshake on every product mount |
| postMessage listener | Receives negotiated price from widget, updates page UI |
| Updated `handleAddToCart` | Forwards negotiated price + sessionId to cart store |

**Lines added:**

```tsx
// NEW import at top:
declare global {
  interface Window { INA?: (...args: unknown[]) => void; }
}

// NEW state variables (added after existing `added` state):
const [negotiatedPrice,      setNegotiatedPrice]      = useState<number | null>(null);
const [negotiationSessionId, setNegotiationSessionId] = useState<string | null>(null);

// NEW useEffect — resets negotiation state on product change:
useEffect(() => {
  setNegotiatedPrice(null);
  setNegotiationSessionId(null);
  setAdded(false);
}, [id]);

// NEW useEffect — signals widget on SPA navigation:
useEffect(() => {
  if (!product) return;
  if (typeof window.INA === 'function') {
    window.INA('product-change', { productId: product.id });
  }
}, [product?.id]);

// NEW useEffect — postMessage bridge:
useEffect(() => {
  function handleINAMessage(event: MessageEvent) { ... }
  window.addEventListener('message', handleINAMessage);
  return () => window.removeEventListener('message', handleINAMessage);
}, [product, addToCart]);

// MODIFIED handleAddToCart — now uses negotiated price:
const handleAddToCart = () => {
  addToCart(product!, negotiatedPrice ?? undefined, negotiationSessionId ?? undefined);
  ...
};

// NEW in JSX — <Script> tag (inside return, after <Head>):
<Script
  src={`${process.env.NEXT_PUBLIC_INA_CDN_URL}/loader.js`}
  data-ina-tenant={process.env.NEXT_PUBLIC_INA_PUBLIC_KEY}
  data-ina-product={product.id}
  data-ina-product-route="/product/:id"
  strategy="afterInteractive"
/>

// MODIFIED price display — shows negotiated price when deal exists
// MODIFIED button — turns green, shows deal price, uses negotiated price
```

**Rollback:** Remove the two new state variables, the three new `useEffect`
blocks, the `<Script>` tag, and revert `handleAddToCart` to
`addToCart(product)`. Revert price display and button JSX to use
`product.originalPrice` directly.

---

### 3. `src/pages/cart.tsx` — Modified

**Why:** The "Proceed to Checkout" button needed server-side price verification
before allowing the user to reach the payment page. Without this, a user could
manipulate the `finalPrice` value in localStorage (where Zustand persists the
cart) and check out at `Rs 0`.

**Lines added:**

```typescript
// NEW imports:
import { AlertTriangle, Loader2 } from 'lucide-react';

// NEW state:
const [isVerifying, setIsVerifying] = useState(false);
const [verifyError, setVerifyError] = useState<string | null>(null);

// NEW function — replaces the old router.push('/checkout') button handler:
async function handleCheckout() {
  setVerifyError(null);
  setIsVerifying(true);
  const negotiatedItems = items.filter((item) => item.sessionId);
  for (const item of negotiatedItems) {
    const res  = await fetch('/api/verify-deal', { method: 'POST', ... });
    const data = await res.json();
    if (!data.verified) { setVerifyError(...); return; }
  }
  router.push('/checkout');
}

// MODIFIED checkout button — now calls handleCheckout(), shows loading state
// NEW error banner — shown when verification fails
```

**Rollback:** Remove the `isVerifying` and `verifyError` state, remove
`handleCheckout`, remove the error banner JSX, and change the checkout button
`onClick` back to `() => router.push('/checkout')`.

---

### 4. `src/pages/api/verify-deal.ts` — **NEW FILE**

**Why:** The HMAC signature required by the INA backend's `/verify` endpoint
must be computed server-side using `INA_WEBHOOK_SECRET`, which must never be
exposed to the browser. This Next.js API route acts as a secure proxy between
the cart page and the INA backend.

**What it does:**

```
Cart page  →  POST /api/verify-deal  →  INA backend /api/saas/session/verify
              (public, same-origin)      (server-to-server, HMAC-signed)
```

**Full file:**

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { sessionId, productId, finalPrice } = req.body;
  const body      = JSON.stringify({ session_id: sessionId, final_price: finalPrice });
  const timestamp = Date.now().toString();
  const signature = crypto
    .createHmac('sha256', process.env.INA_WEBHOOK_SECRET!)
    .update(`${timestamp}.${body}`)
    .digest('hex');

  const inaRes = await fetch(
    `${process.env.INA_BACKEND_URL}/api/saas/session/verify`,
    {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'X-INA-Tenant':    process.env.INA_TENANT_ID!,
        'X-INA-Timestamp': timestamp,
        'X-INA-Signature': signature,
      },
      body,
    }
  );

  const data = await inaRes.json().catch(() => ({}));
  return res.status(inaRes.status).json(data);
}
```

**Rollback:** Delete the file `src/pages/api/verify-deal.ts`.

---

## Integration Checklist (Apply from Scratch)

```
□ 1. Copy .env.local values (get keys from BargainBaaS dashboard)
□ 2. Run: npm install   (no new packages needed — crypto is Node built-in)
□ 3. Apply changes to src/store/cartStore.ts
□ 4. Apply changes to src/pages/product/[id].tsx
□ 5. Apply changes to src/pages/cart.tsx
□ 6. Create src/pages/api/verify-deal.ts
□ 7. Start widget CDN: npx serve dist -p 4000 --cors  (in Bargain-Widget folder)
□ 8. Start storefront:  npm run dev
□ 9. Open any product page — confirm widget FAB appears bottom-right
□ 10. Navigate to /cart — confirm FAB disappears
□ 11. Return to product — confirm FAB reappears (fresh session)
```

## Disintegration Checklist (Roll Back Completely)

```
□ 1. src/store/cartStore.ts       — remove sessionId field + parameter
□ 2. src/pages/product/[id].tsx   — remove Script tag, 3 useEffects,
                                     2 state vars, revert price/button JSX
□ 3. src/pages/cart.tsx           — revert checkout button to router.push
□ 4. src/pages/api/verify-deal.ts — DELETE this file
□ 5. .env.local                   — remove the 5 INA_ variables
□ 6. Stop the widget CDN process on port 4000
```

After step 6, TechStore operates as a completely standard Next.js storefront
with zero BargainBaaS footprint.

---

## Security Model

| Layer | Mechanism |
|---|---|
| Widget auth | `data-ina-tenant` public key + Origin header validated by INA backend |
| Price integrity | `sessionId` stored per cart item, verified via HMAC before checkout |
| Secret protection | `INA_WEBHOOK_SECRET` and `INA_TENANT_ID` are server-only env vars |
| Replay prevention | Each `sessionId` transitions to `VERIFIED` atomically — single use |
| XSS protection | postMessage only accepted from `window.location.origin` |
