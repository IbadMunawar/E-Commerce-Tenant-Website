# BargainBaaS Integration Changelog

> **Integration:** BargainBaaS AI Negotiation Widget ("INA")
> **Date:** 2026-05-26
> **Scope:** Environment configuration + client-side cart state

---

## 1. `.env.local` *(new file — project root)*

### Added variables

| Variable | Side | Purpose |
|---|---|---|
| `NEXT_PUBLIC_INA_PUBLIC_KEY` | Browser | API key passed to the widget's CDN bundle to authenticate requests from the tenant's storefront. |
| `NEXT_PUBLIC_INA_CDN_URL` | Browser | Base URL from which the BargainBaaS widget JavaScript bundle is loaded. Points to `localhost:4000` in development; should be updated to the production CDN URL before deployment. |
| `INA_TENANT_ID` | Server only | Numeric identifier for this tenant in the BargainBaaS backend. Used in server-side API calls (e.g., webhook handlers, price-verification routes). Never prefixed with `NEXT_PUBLIC_`, so it is never sent to the browser. |
| `INA_WEBHOOK_SECRET` | Server only | HMAC signing secret issued by BargainBaaS. Used to verify the authenticity of incoming webhook events from the INA backend. Must be kept strictly server-side. |
| `INA_BACKEND_URL` | Server only | Base URL of the BargainBaaS backend REST API, used by server-side Next.js API routes when making outbound calls (e.g., session verification at checkout). |

### Why these are split this way
Variables prefixed with `NEXT_PUBLIC_` are inlined into the browser bundle at build time by Next.js. All sensitive credentials (`INA_TENANT_ID`, `INA_WEBHOOK_SECRET`, `INA_BACKEND_URL`) deliberately **omit** this prefix so they remain exclusively accessible via `process.env` inside server-side code (API routes, `getServerSideProps`), never leaking to the client.

---

## 2. `src/store/cartStore.ts` *(modified)*

### 2a. `CartItem` interface — added `sessionId` field

```ts
// BEFORE
export interface CartItem {
  id: string;
  name: string;
  imageUrl: string;
  originalPrice: number;
  finalPrice: number;
  quantity: number;
}

// AFTER
export interface CartItem {
  id: string;
  name: string;
  imageUrl: string;
  originalPrice: number;
  finalPrice: number;
  quantity: number;
  /** BargainBaaS negotiation session ID, present only when the price was negotiated */
  sessionId?: string;
}
```

**What this achieves:** Every item in the cart can now optionally carry the opaque session-ID string that BargainBaaS emits via `window.postMessage` when a deal is struck. Making it optional (`?`) means all existing call-sites (regular "Add to Cart" without negotiation) continue to work without modification — the field is simply absent on non-negotiated items.

---

### 2b. `CartStore` interface — updated `addToCart` signature

```ts
// BEFORE
addToCart: (product: Product, negotiatedPrice?: number) => void;

// AFTER
addToCart: (product: Product, negotiatedPrice?: number, sessionId?: string) => void;
```

**What this achieves:** Declares the new optional `sessionId` parameter at the type level so TypeScript enforces correct usage across the whole codebase.

---

### 2c. `addToCart` implementation — persist `sessionId` on new cart items

```ts
// BEFORE (new-item branch)
return {
  items: [
    ...state.items,
    {
      id: product.id,
      name: product.name,
      imageUrl: product.imageUrl,
      originalPrice: product.originalPrice,
      finalPrice,
      quantity: 1,
    },
  ],
};

// AFTER (new-item branch)
return {
  items: [
    ...state.items,
    {
      id: product.id,
      name: product.name,
      imageUrl: product.imageUrl,
      originalPrice: product.originalPrice,
      finalPrice,
      quantity: 1,
      // Store the BargainBaaS session ID so it can be forwarded
      // to the checkout API for server-side price verification.
      ...(sessionId !== undefined && { sessionId }),
    },
  ],
};
```

**What this achieves:**

- `finalPrice` already falls back to `product.originalPrice` when `negotiatedPrice` is `undefined` (unchanged pre-existing logic), so a standard add-to-cart is unaffected.
- The spread `...(sessionId !== undefined && { sessionId })` conditionally merges the `sessionId` field **only** when one is provided. This keeps non-negotiated cart items free of an explicit `undefined` key, which matters for JSON serialisation and Zustand's `persist` middleware (stored in `localStorage`).
- The **existing-item branch** (quantity bump) intentionally does **not** overwrite `sessionId`. If the user had already negotiated and is bumping quantity, the original session is preserved; if they add the same product without negotiating, the previously stored session remains intact. Any renegotiation flow can handle updating the session separately if required.

---

## Summary of call-site usage (for widget integration)

When the BargainBaaS widget fires a `postMessage` event with a struck deal, the product-page handler should call:

```ts
const { addToCart } = useCartStore.getState();

window.addEventListener('message', (event) => {
  if (event.data?.type === 'INA_DEAL_STRUCK') {
    const { finalPrice, sessionId } = event.data;
    addToCart(product, finalPrice, sessionId);
  }
});
```

At checkout, read `cartItem.sessionId` and forward it to the server-side verification API (`INA_BACKEND_URL`) using `INA_TENANT_ID` and `INA_WEBHOOK_SECRET` to confirm the negotiated price has not been tampered with.

---

## 3. `src/pages/product/[id].tsx` *(modified)*

### 3a. New imports

```diff
+ import Script from 'next/script';
- import { useState } from 'react';
+ import { useState, useEffect } from 'react';
```

**What this achieves:**
- `Script` — the official Next.js `next/script` component. It manages script loading lifecycle and deduplication, making it safer than a raw `<script>` tag in JSX.
- `useEffect` — needed to attach/detach the `window.addEventListener` side-effect at the right point in the React lifecycle.

---

### 3b. `useEffect` — BargainBaaS postMessage handler

The hook is placed inside `ProductPage`, after the early-return guards so `product` is guaranteed to be defined when the effect runs.

```tsx
useEffect(() => {
  function handleINAMessage(event: MessageEvent) {
    // Gate 1: reject cross-origin messages
    if (event.origin !== window.location.origin) return;

    const data = event.data;

    // Gate 2 & 3: validate widget source and event type
    if (data?.source !== 'ina-widget' || data?.type !== 'INA_PRICE_AGREED') return;

    // Gate 4: confirm the message targets this exact product
    if (data.productId !== product.id) return;

    // All gates passed — add to cart with the negotiated price and session ID
    addToCart(product, data.price, data.sessionId);
  }

  window.addEventListener('message', handleINAMessage);

  return () => {
    window.removeEventListener('message', handleINAMessage);
  };
}, [product, addToCart]);
```

**Security gates explained:**

| Gate | Check | Why |
|---|---|---|
| **1 — Origin** | `event.origin !== window.location.origin` | Rejects all cross-origin messages. Prevents any third-party iframe or external page from injecting fake deal events. |
| **2 — Source** | `data.source !== 'ina-widget'` | Namespaces the message to the BargainBaaS widget. Avoids acting on unrelated `postMessage` events from other integrations (e.g., analytics iframes, payment widgets). |
| **3 — Type** | `data.type !== 'INA_PRICE_AGREED'` | Filters to only the specific event that signals a completed deal; ignores all other lifecycle events the widget may emit (e.g., `INA_OPENED`, `INA_CLOSED`). |
| **4 — Product ID** | `data.productId !== product.id` | Cross-verifies that the deal belongs to the product currently rendered on this page. Guards against stale events from a previously visited product page that may still be in flight. |

**Cleanup:** The `return () => window.removeEventListener(...)` teardown ensures the handler is dropped when the user navigates away from the product page, preventing memory leaks and duplicate handler accumulation across navigations.

**Dependency array `[product, addToCart]`:** Both values are stable references (Zustand selector returns a stable function; `product` is derived from a static array by constant `id`). The effect re-registers cleanly if either ever changes.

---

### 3c. `<Script>` loader element in JSX

Placed immediately after the `<Head>` block in the return statement, before the main content `<div>`:

```tsx
<Script
  src={`${process.env.NEXT_PUBLIC_INA_CDN_URL}/loader.js`}
  data-ina-tenant={process.env.NEXT_PUBLIC_INA_PUBLIC_KEY}
  data-ina-product={product.id}
  strategy="afterInteractive"
/>
```

**What each attribute does:**

| Attribute | Value | Purpose |
|---|---|---|
| `src` | `NEXT_PUBLIC_INA_CDN_URL` + `/loader.js` | Points to the BargainBaaS compiled widget bundle. The env var is swapped in at build time. |
| `data-ina-tenant` | `NEXT_PUBLIC_INA_PUBLIC_KEY` | The widget reads this `data-*` attribute from its own `<script>` tag on boot to identify which tenant is embedding it, without needing a global variable. |
| `data-ina-product` | `product.id` | Tells the widget which product to load negotiation context for, so it can fetch the correct pricing rules from the INA backend. |
| `strategy="afterInteractive"` | — | Defers the bundle until after Next.js hydration completes. This is **mandatory**: it guarantees `window.addEventListener` is already registered (by the `useEffect` above) before the widget script executes and could attempt to emit its first `postMessage`. |

---

## 4. `src/pages/api/verify-deal.ts` *(new file)*

A server-side proxy API route that performs the cryptographic handshake between our storefront backend and the BargainBaaS platform before allowing a negotiated price to proceed to payment. The client never has access to the signing secret, the tenant ID, or the upstream backend URL.

### 4a. Validation pipeline

Each incoming `POST` request is processed through a sequential set of validation steps before a single byte leaves the server toward the upstream:

| Step | Check | Failure response |
|---|---|---|
| **Method guard** | `req.method !== 'POST'` | `405 Method Not Allowed` + `Allow: POST` header |
| **Body fields** | `sessionId`, `productId`, `finalPrice` all present and non-null | `400 Bad Request` |
| **Env var presence** | `INA_WEBHOOK_SECRET`, `INA_TENANT_ID`, `INA_BACKEND_URL` all set | `500 Server configuration error` |
| **Upstream HTTP status** | `inaResponse.ok` (status in 200–299 range) | `422 Unprocessable Entity` |
| **Upstream payload** | `inaData.valid === true` | `422 Unprocessable Entity` |

### 4b. Canonical request body construction

```ts
const body = JSON.stringify({ session_id: sessionId, final_price: finalPrice });
```

The field names (`session_id`, `final_price`) and their order are fixed by the BargainBaaS backend schema. Deviating from either will produce a signature mismatch on the remote side.

### 4c. HMAC-SHA256 signature scheme

```ts
const timestamp = Date.now().toString();          // Unix milliseconds as string

const signature = crypto
  .createHmac('sha256', webhookSecret)            // key = INA_WEBHOOK_SECRET
  .update(`${timestamp}.${body}`)                 // signed input = "<ms_timestamp>.<json_body>"
  .digest('hex');                                 // output = lowercase hex string
```

**Why this format:**
- The dot-separated `"<timestamp>.<body>"` concatenation is the exact scheme specified in the BargainBaaS central blueprint. Any variation (e.g. reversed order, different separator, base64 output) will cause the remote HMAC verification to fail.
- Prefixing the body with a timestamp makes each signature unique per request, preventing replay attacks where a captured valid signature could be re-submitted.

### 4d. Outgoing request headers to the upstream

The signed metadata is forwarded to `${INA_BACKEND_URL}/api/saas/session/verify` via these mandatory headers:

| Header | Value | Purpose |
|---|---|---|
| `Content-Type` | `application/json` | Declares the body encoding so the remote server parses it correctly. |
| `X-INA-Tenant` | `INA_TENANT_ID` (numeric string) | Identifies which tenant is making the call; the remote uses this to look up the corresponding stored HMAC secret for counter-verification. |
| `X-INA-Timestamp` | `timestamp` (ms since epoch, as string) | Used by the remote to reject requests older than a configurable replay window (typically 5 minutes). |
| `X-INA-Signature` | `signature` (hex HMAC-SHA256) | The cryptographic proof that this request was constructed by a party holding `INA_WEBHOOK_SECRET`. The remote recomputes the same HMAC and compares. |

### 4e. Success and error response shapes

**Success (`200 OK`):**
```json
{
  "verified": true,
  "sessionId": "ina_sess_abc123",
  "productId": "prod_xyz",
  "finalPrice": 45000
}
```

**Failure (400 / 422 / 500 / 502):**
```json
{
  "verified": false,
  "error": "<human-readable reason>"
}
```

The client (e.g., the checkout page) should gate payment gateway redirection exclusively on `verified === true`. A `verified: false` response must block the checkout flow regardless of the HTTP status code.

### 4f. Why this is a server-side proxy

| Concern | Client-side approach (❌ insecure) | This proxy (✅ secure) |
|---|---|---|
| `INA_WEBHOOK_SECRET` exposure | Would be visible in browser devtools | Never leaves the server process |
| `INA_TENANT_ID` exposure | Visible in network requests | Injected server-side from `process.env` |
| Price tampering | `finalPrice` from `localStorage` is trivially editable | `finalPrice` from `req.body` is still user-supplied, but the HMAC signature ties it to a specific session; the remote rejects any mismatch |
| Replay attacks | None | Timestamp binding + remote replay window enforcement |

---

## 5. `src/pages/cart.tsx` *(modified)*

### 5a. New imports

```diff
+ import { useRouter } from 'next/router';
- import { Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
+ import { Trash2, ShoppingBag, ArrowRight, AlertTriangle, Loader2 } from 'lucide-react';
+ import { useState } from 'react';
```

- `useRouter` — needed to call `router.push('/checkout')` programmatically only after all verifications pass, replacing the previous passive `<Link>`.
- `AlertTriangle`, `Loader2` — UI icons for the error banner and the in-button loading spinner respectively.
- `useState` — used for the two new state variables below.

---

### 5b. New state variables

```ts
const [isVerifying, setIsVerifying] = useState(false);
const [verifyError, setVerifyError] = useState<string | null>(null);
```

| Variable | Type | Purpose |
|---|---|---|
| `isVerifying` | `boolean` | `true` while the verification loop is running; disables the checkout button and swaps its label to "Verifying prices…" to prevent double-submits. |
| `verifyError` | `string \| null` | Holds the human-readable failure message for whichever item first fails verification; `null` when no error exists. Rendered in the error banner above the checkout button. |

---

### 5c. `handleCheckout` — sequential verification loop

```ts
async function handleCheckout() {
  setVerifyError(null);
  setIsVerifying(true);

  const negotiatedItems = items.filter((item) => item.sessionId);

  for (const item of negotiatedItems) {
    try {
      const res = await fetch('/api/verify-deal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: item.sessionId,
          productId: item.id,
          finalPrice: item.finalPrice,
        }),
      });

      const data = await res.json();

      if (!data.verified) {
        setVerifyError(
          `Price validation failed for "${item.name}". Please renegotiate before checking out.`
        );
        setIsVerifying(false);
        return;                   // ← halt; router.push is never reached
      }
    } catch {
      setVerifyError(
        `Could not verify the negotiated price for "${item.name}". Check your connection and try again.`
      );
      setIsVerifying(false);
      return;                     // ← halt on network/parse error too
    }
  }

  setIsVerifying(false);
  router.push('/checkout');       // ← only reached when ALL items pass
}
```

**Design decisions:**

- **Filter first, then loop** — `items.filter(item => item.sessionId)` skips non-negotiated items entirely. Items added via the regular "Add to Cart" button have no `sessionId` and require no cryptographic verification.
- **Sequential `for…of` not `Promise.all`** — requests are fired one at a time. This means:
  - The error message can name the *specific* item that failed, rather than a generic "something failed".
  - We avoid sending unnecessary follow-up requests after the first failure is detected.
  - The server is not hit with a burst of concurrent verification calls.
- **`return` after each failure** — a bare `return` inside the `for…of` exits the entire `handleCheckout` function, ensuring `router.push` is unconditionally unreachable after any error branch.
- **Catch block for network errors** — a `fetch` that rejects (DNS failure, timeout, server crash) is treated identically to a `verified: false` response; checkout is halted and a user-facing message is displayed. The raw error is intentionally not surfaced to the UI to avoid leaking internal details.

---

### 5d. JSX changes — checkout button replacement and error banner

**Before:**
```tsx
<Link
  href="/checkout"
  id="proceed-to-checkout"
  className="..."
>
  Proceed to Checkout
  <ArrowRight className="w-4 h-4" />
</Link>
```

**After:**
```tsx
{/* Error banner — conditionally rendered above the button */}
{verifyError && (
  <div
    role="alert"
    className="flex items-start gap-2.5 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 mb-4 text-sm text-rose-700"
  >
    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-500" />
    <span>{verifyError}</span>
  </div>
)}

<button
  id="proceed-to-checkout"
  onClick={handleCheckout}
  disabled={isVerifying}
  className="... disabled:opacity-60 disabled:cursor-not-allowed ..."
>
  {isVerifying ? (
    <>
      <Loader2 className="w-4 h-4 animate-spin" />
      Verifying prices…
    </>
  ) : (
    <>
      Proceed to Checkout
      <ArrowRight className="w-4 h-4" />
    </>
  )}
</button>
```

**What each UI element achieves:**

| Element | Behaviour |
|---|---|
| Error banner (`role="alert"`) | Appears only when `verifyError` is non-null. `role="alert"` causes screen readers to announce it immediately without the user having to navigate to it. Styled in rose tones to clearly signal failure. |
| `disabled={isVerifying}` | Prevents the user from clicking "Proceed to Checkout" a second time while a verification is already in-flight. Combined with `disabled:opacity-60` and `disabled:cursor-not-allowed` Tailwind classes to give immediate visual feedback. |
| Spinner + label swap | While `isVerifying` is `true`, the button content changes from "Proceed to Checkout" to a spinning `Loader2` icon + "Verifying prices…", communicating that background work is in progress without a full-page overlay. |
| `<Link>` → `<button>` | The checkout element is no longer a passive hyperlink. Changing it to a `<button>` gives us full control over the async gate: navigation only happens as the last line of `handleCheckout`, after all verifications succeed. |


