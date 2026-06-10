# 📄 BargainBaaS — Tenant Integration Guide (With Simple Explanations)

This guide documents every block of code added to the `TechStore` storefront to plug in the BargainBaaS AI Negotiation SDK.

Each section includes a **"Simple Explanation (Why?)"** — agar viva mein examiners poochein ke *"Beta yeh code kyun lagaya hai?"*, toh yeh 2-3 lines bol kar impress kar sakte hain.

---

## 🛠️ File 1: `src/store/cartStore.ts` (Global State Store)

### Block 1 — `sessionId` field in `CartItem`

```typescript
export interface CartItem {
  id: string;
  name: string;
  imageUrl: string;
  originalPrice: number;
  finalPrice: number;
  quantity: number;
  // === BARGAIN_BAAS_INTEGRATION_START ===
  sessionId?: string;
  // === BARGAIN_BAAS_INTEGRATION_END ===
}
```

> **Simple Explanation (Why?):** Baseline website ko yeh nahi pata hota ke cart mein aaya hua item bargained hai ya normal. Humne `sessionId` isliye add kiya hai taake har product ke sath uski deal ki unique ID save ho sake. Check-out ke waqt isi ID se backend par confirm hota hai ke user ne waqai yeh price bargain ki thi.

---

### Block 2 — Updated `addToCart` type signature in `CartStore`

```typescript
interface CartStore {
  items: CartItem[];
  // === BARGAIN_BAAS_INTEGRATION_START ===
  addToCart: (product: Product, negotiatedPrice?: number, sessionId?: string) => void;
  // === BARGAIN_BAAS_INTEGRATION_END ===
}
```

> **Simple Explanation (Why?):** Pehle `addToCart` function sirf product leta tha aur uski original price cart mein daal deta tha. Humne isko modify kiya taake yeh widget se negotiated (sasti) price aur deal ki `sessionId` ko bhi accept kar sake.

---

### Block 3 — `sessionId` spread inside `addToCart` implementation

```typescript
// Inside addToCart implementation when creating a new item:
id: product.id,
name: product.name,
finalPrice,
quantity: 1,
// === BARGAIN_BAAS_INTEGRATION_START ===
...(sessionId !== undefined && { sessionId }),
// === BARGAIN_BAAS_INTEGRATION_END ===
```

> **Simple Explanation (Why?):** Jab naya item cart mein add ho raha ho, agar user widget se bargain karke aaya hai, toh yeh spread operator (`...`) us item ke andar uski safe `sessionId` ko secure tareeqe se attach (inject) kar deta hai.

---

## 🖥️ File 2: `src/pages/product/[id].tsx` (Product Detail Page)

### Block 1 — `declare global` Window extension

```typescript
// === BARGAIN_BAAS_INTEGRATION_START ===
declare global {
  interface Window {
    INA?: (...args: unknown[]) => void;
  }
}
// === BARGAIN_BAAS_INTEGRATION_END ===
```

> **Simple Explanation (Why?):** Humara widget aik external CDN script se load hota hai. TypeScript default window object par external methods ko allow nahi karta. Yeh window declaration TypeScript ko batati hai ke `window.INA` aik valid widget trigger function hai, taake compiler error na de.

---

### Block 2 — Negotiation state variables

```typescript
// === BARGAIN_BAAS_INTEGRATION_START ===
const [negotiatedPrice, setNegotiatedPrice] = useState<number | null>(null);
const [negotiationSessionId, setNegotiationSessionId] = useState<string | null>(null);
// === BARGAIN_BAAS_INTEGRATION_END ===
```

> **Simple Explanation (Why?):** Yeh dono React states widget se aane wali sasti price aur session tokens ko page par temporarily hold (cache) karti hain. Yeh tab tak button ko nahi chertin jab tak user khud click na kare.

---

### Block 3 — Effect 1: Reset on product change

```typescript
// === BARGAIN_BAAS_INTEGRATION_START ===
// Effect 1: Reset negotiation state when the product changes to avoid state leakages
useEffect(() => {
  setNegotiatedPrice(null);
  setNegotiationSessionId(null);
  setAdded(false);
}, [id]);
// === BARGAIN_BAAS_INTEGRATION_END ===
```

> **Simple Explanation (Why?):** Agar user website par navigation karke doosre product page par jata hai, toh yeh hook purani bargain ki hui sasti price ko flush (reset) kar deta hai, taake aik product ki sasti deal doosre product par leak na ho sake.

---

### Block 4 — Effect 2: SPA handshake signal

```typescript
// === BARGAIN_BAAS_INTEGRATION_START ===
// Effect 2: Signal the BargainBaaS widget when this product page mounts
useEffect(() => {
  if (!product) return;
  if (typeof window !== 'undefined' && typeof window.INA === 'function') {
    window.INA('product-change', { productId: product?.id });
  }
}, [product?.id]);
// === BARGAIN_BAAS_INTEGRATION_END ===
```

> **Simple Explanation (Why?):** Yeh website aur widget ke darmiyan **handshake signal** hai. Jab bhi Next.js par koi naya product load hota hai, yeh widget ko bata deta hai taake widget us specific product ka pricing context load kar sake.

---

### Block 5 — Effect 3: PostMessage event bridge

```typescript
// === BARGAIN_BAAS_INTEGRATION_START ===
// Effect 3: postMessage bridge: receive negotiated price metrics safely from widget runtime
useEffect(() => {
  if (!product) return;
  function handleINAMessage(event: MessageEvent) {
    if (event.origin !== window.location.origin) return;
    const data = event.data;
    if (!data || data.source !== 'ina-widget') return;
    if (data.type !== 'BARGAIN_BAAS_SUCCESS') return;
    if (data.productId !== product?.id) return;

    const agreedPrice = data.finalPrice ?? data.price;
    const sessionId = data.sessionId;
    if (!agreedPrice || !sessionId) return;

    setNegotiatedPrice(agreedPrice);
    setNegotiationSessionId(sessionId);
    addToCart(product!, agreedPrice, sessionId);
  }
  window.addEventListener('message', handleINAMessage);
  return () => window.removeEventListener('message', handleINAMessage);
}, [product, addToCart]);
// === BARGAIN_BAAS_INTEGRATION_END ===
```

> **Simple Explanation (Why?):** Isay **PostMessage Event Bridge** kehte hain. Chunki widget iframe ya external engine par chal sakta hai, jab chat mein deal accept hoti hai, toh widget browser mein yeh event push karta hai. Yeh listener us event ko securely catch karke deal price save kar leta hai aur item ko automatically global cart mein add kar deta hai taake user ko dobara button na dabana pare.

---

### Block 6 — `handleAddToCart` — deal price forwarding

```typescript
// Inside handleAddToCart function parameters:
addToCart(
  product!,
  // === BARGAIN_BAAS_INTEGRATION_START ===
  negotiatedPrice ?? undefined,
  negotiationSessionId ?? undefined
  // === BARGAIN_BAAS_INTEGRATION_END ===
);
```

> **Simple Explanation (Why?):** Jab user final button click karta hai, toh yeh logic check karta hai ke agar widget se koi discount price mili hui hai toh woh cart store mein bhej de, warna default product price par fallback kar jaye.

---

### Block 7 — JSX `<Script>` CDN loader tag

```tsx
{/* === BARGAIN_BAAS_INTEGRATION_START === */}
<Script
  src={process.env.NEXT_PUBLIC_INA_CDN_URL}
  data-ina-tenant={process.env.NEXT_PUBLIC_INA_PUBLIC_KEY}
  data-ina-product={product?.id}
  data-ina-product-route="/product/:id"
  strategy="afterInteractive"
/>
{/* === BARGAIN_BAAS_INTEGRATION_END === */}
```

> **Simple Explanation (Why?):** Yeh Next.js asynchronous script component tag hai. Iska kaam server se humare BargainBaaS `loader.js` script asset files ko async runtime par efficiently inject karna hai.

---

## 🛒 File 3: `src/pages/cart.tsx` (Shopping Cart Page)

### Block 1 — Verification state variables

```typescript
// === BARGAIN_BAAS_INTEGRATION_START ===
const [isVerifying, setIsVerifying] = useState(false);
const [verifyError, setVerifyError] = useState<string | null>(null);
// === BARGAIN_BAAS_INTEGRATION_END ===
```

> **Simple Explanation (Why?):** Check-out lifecycle ke dauran security checks ke visual loaders (spinners) aur error messages display karne ke liye yeh state custom hooks set kiye gaye hain.

---

### Block 2 — `handleCheckout` async verification function

```typescript
// === BARGAIN_BAAS_INTEGRATION_START ===
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
        setVerifyError(`Price validation failed for "${item.name}". Please renegotiate.`);
        setIsVerifying(false);
        return;
      }
    } catch {
      setVerifyError("Network validation error.");
      setIsVerifying(false);
      return;
    }
  }
  setIsVerifying(false);
  router.push('/checkout');
}
// === BARGAIN_BAAS_INTEGRATION_END ===
```

> **Simple Explanation (Why?):** **This is the main security guard!** Agar koi user chaalaaki karke browser ke local storage/Zustand dev-tools mein ja kar price change (Rs 0) karne ki koshish kare, toh yeh loop checkout dabate hi har product ko server-side verification proxy API par bhej kar double-verify karta hai. Verification pass hone par hi user checkout page par ja sakta hai.

---

### Block 3 — `verifyError` alert banner JSX

```tsx
{/* === BARGAIN_BAAS_INTEGRATION_START === */}
{verifyError && (
  <div role="alert" className="text-sm text-rose-700 bg-rose-50 ...">
    <AlertTriangle className="w-4 h-4 text-rose-500" />
    <span>{verifyError}</span>
  </div>
)}
{/* === BARGAIN_BAAS_INTEGRATION_END === */}
```

> **Simple Explanation (Why?):** Agar server-side verification fail ho jaye aur signature mismatch ho, toh user ko batane ke liye yeh red alert layout warning block render hota hai.

---

## 🛡️ File 4: `src/pages/api/verify-deal.ts` (Cryptographic Gateway)

### Block 1 — Entire handler body

```typescript
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
```

> **Simple Explanation (Why?):** **Security Architecture Blueprint.** Backend server par secure check lagane ke liye ek server-to-server **HMAC-SHA256 signature** generate karna lazmi hota hai. Agar hum yeh signature client-browser (frontend) par banate, toh humara secret software code proxy token publicly leak ho jata. Isliye humne Next.js API direct endpoint banaya jo background mein chhupe hue env variables (`INA_WEBHOOK_SECRET`) use karke backend se verification complete karwata hai.

---

## 📋 Quick Reference — Anchor Tag Map

| File | Blocks Wrapped | What's Isolated |
|---|---|---|
| `cartStore.ts` | 3 | `sessionId` field, `addToCart` signature, sessionId spread |
| `product/[id].tsx` | 7 | Window global, 2 state vars, 3 useEffects, handler args, Script tag |
| `cart.tsx` | 5 | 2 state vars, handleCheckout fn, error banner JSX, button onClick+disabled+label |
| `api/verify-deal.ts` | 1 | Entire handler body |

> Ab aap be-fiqr ho kar present karo. 🦾🔥🚀

