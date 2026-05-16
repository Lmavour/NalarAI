# Mobile Responsiveness & Performance Optimization Recommendations

## Comprehensive Analysis of NalarAI Application

---

## 1. Viewport & HTML Configuration

### 1.1 Enhanced Viewport Meta Tag

**Current** ([`index.html`](index.html:5)):
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

**Recommended** — Add `viewport-fit=cover` for notch/safe-area support and prevent iOS auto-zoom on input focus:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, viewport-fit=cover" />
```

> **Why:** `viewport-fit=cover` enables CSS `env()` safe-area insets. Avoid `maximum-scale=1` (accessibility violation), but cap at 5x to prevent extreme zoom. Never use `user-scalable=no`.

### 1.2 Missing Mobile-Specific Meta Tags

Add to [`index.html`](index.html:3-6) `<head>`:

```html
<!-- PWA-like behavior on iOS -->
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="mobile-web-app-capable" content="yes" />

<!-- Brand color for browser chrome -->
<meta name="theme-color" content="#58CC02" />

<!-- iOS splash/title -->
<meta name="apple-mobile-web-app-title" content="Nalar.ai" />

<!-- Prevent phone number detection -->
<meta name="format-detection" content="telephone=no" />
```

> **Why:** `theme-color` colors the browser address bar on Android Chrome. `apple-mobile-web-app-capable` removes Safari chrome when launched from home screen. `format-detection` prevents random numbers being linked as phone numbers.

### 1.3 Disable iOS Input Zoom

iOS Safari auto-zooms inputs with `font-size < 16px`. The textarea in [`ChatInterface.tsx`](src/components/ChatInterface.tsx:220) uses `text-sm` (14px). Either:

- **Option A:** Change to `text-base` (16px) — simplest, prevents zoom entirely
- **Option B:** Keep `text-sm` but add the `maximum-scale=1` viewport hack (accessibility concern)

**Recommendation:** Use Option A. Change the textarea and all interactive inputs to `text-base`:

```tsx
// ChatInterface.tsx line 220
className="... text-base font-bold ..."  // was text-sm

// GapFill.tsx line 67
className="... text-base font-bold ..."  // was text-sm

// Paraphrase.tsx line 98
className="... text-base font-bold ..."  // was text-sm
```

---

## 2. CSS Layout Techniques

### 2.1 Safe Area Insets for Notch Devices

The footer in [`ChatInterface.tsx`](src/components/ChatInterface.tsx:207) uses `pb-8` but doesn't account for iOS safe areas. On iPhones with notches, content can be obscured by the home indicator.

**Add to [`src/index.css`](src/index.css:15-19):**

```css
@layer base {
  body {
    @apply bg-white text-slate-800 antialiased overflow-x-hidden;
    /* Safe area padding for notch/home indicator devices */
    padding-bottom: env(safe-area-inset-bottom, 0px);
    padding-left: env(safe-area-inset-left, 0px);
    padding-right: env(safe-area-inset-right, 0px);
  }
}
```

**Update footer in [`ChatInterface.tsx`](src/components/ChatInterface.tsx:207):**

```tsx
// Replace: pb-8
// With: dynamic safe-area padding
className="flex-shrink-0 bg-white border-t-2 border-slate-100 p-4 z-10 transition-all"
// Then add a spacer div inside the footer:
<div className="h-[env(safe-area-inset-bottom)]" />  // Tailwind doesn't support env() directly, use inline style
```

Or use an inline style approach:
```tsx
<footer style={{ paddingBottom: `max(2rem, env(safe-area-inset-bottom, 2rem))` }} ...>
```

### 2.2 Responsive Container Strategy

**Current** ([`ChatInterface.tsx`](src/components/ChatInterface.tsx:122)):
```tsx
<div className="flex flex-col h-screen ... max-w-md mx-auto relative shadow-2xl overflow-hidden">
```

This creates a phone-frame on desktop but on actual mobile devices, the `shadow-2xl` and `max-w-md` are wasted constraints.

**Recommended** — Use responsive max-width that adapts:

```tsx
<div className="flex flex-col h-dvh ... w-full max-w-md mx-auto relative overflow-hidden
  md:shadow-2xl md:rounded-none">
```

Key changes:
- Replace `h-screen` with `h-dvh` — `h-dvh` uses `100dvh` which accounts for mobile browser address bar resizing (dynamic viewport height). This prevents the footer from being hidden when the browser chrome changes.
- Remove `shadow-2xl` on mobile (it's invisible when the app fills the screen), add it only at `md:` breakpoint
- Ensure `w-full` is explicit so the container fills mobile screens

### 2.3 Dynamic Viewport Height

`h-screen` = `100vh` which is the "large viewport" and doesn't account for mobile browser chrome. Use `h-dvh` (dynamic viewport height):

```tsx
// ChatInterface.tsx line 122
className="flex flex-col h-dvh bg-white font-sans max-w-md mx-auto relative overflow-hidden"
```

> **Why:** On mobile Safari, `100vh` includes the area behind the address bar, causing the footer to be partially hidden. `100dvh` adjusts as the bar shows/hides. Tailwind v4 supports `h-dvh` natively.

**Fallback for older browsers** — Add to [`src/index.css`](src/index.css):

```css
@layer base {
  /* Fallback for browsers without dvh support */
  @supports not (height: 100dvh) {
    .h-dvh {
      height: 100vh;
    }
  }
}
```

### 2.4 Word-Break & Overflow Handling

Long words or URLs in chat messages can overflow bubbles. Add to [`src/index.css`](src/index.css:39-53):

```css
.markdown-body {
  @apply text-[15px] leading-relaxed space-y-3 font-medium;
  overflow-wrap: break-word;
  word-break: break-word;
}

/* Prevent KaTeX overflow on mobile */
.markdown-body .katex-display {
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
}

.markdown-body .katex {
  font-size: 1em;  /* Scale with parent, not fixed */
}
```

### 2.5 Touch-Optimization CSS

Add to [`src/index.css`](src/index.css):

```css
@layer base {
  /* Remove tap highlight on all interactive elements */
  * {
    -webkit-tap-highlight-color: transparent;
  }

  /* Prevent callout menu on long-press for UI elements */
  .btn-tactile,
  .card-tactile,
  button,
  [role="button"] {
    -webkit-touch-callout: none;
    user-select: none;
    touch-action: manipulation;  /* Prevent double-tap zoom, allow pan/pinch */
  }

  /* Allow text selection in content areas */
  .markdown-body,
  .ai-bubble p,
  .user-bubble p {
    user-select: text;
    -webkit-user-select: text;
  }

  /* Smooth scrolling with momentum on iOS */
  .scroll-smooth {
    -webkit-overflow-scrolling: touch;
    scroll-behavior: smooth;
  }
}
```

> **Why:** `touch-action: manipulation` eliminates the 300ms tap delay on mobile and prevents double-tap-to-zoom on buttons while still allowing pinch-zoom on content. `-webkit-tap-highlight-color: transparent` removes the blue/gray flash on tap.

---

## 3. Touch-Friendly UI/UX Adjustments

### 3.1 Minimum Touch Target Sizes

WCAG 2.5.8 requires **24×24px** minimum touch targets; Material Design recommends **48×48dp**. Current audit:

| Element | Current Size | Recommendation |
|---------|-------------|----------------|
| Send button ([`ChatInterface.tsx`](src/components/ChatInterface.tsx:227)) | `w-10 h-10` (40px) | ✅ Adequate |
| Avatar icon ([`MessageItem.tsx`](src/components/MessageItem.tsx:35)) | `w-10 h-10` (40px) | ✅ Adequate |
| Quiz option buttons ([`Quiz.tsx`](src/components/interactions/Quiz.tsx:63)) | `p-4` (~56px height) | ✅ Good |
| Hint button ([`GapFill.tsx`](src/components/interactions/GapFill.tsx:85)) | `p-4` (~56px height) | ✅ Good |
| Header icons ([`ChatInterface.tsx`](src/components/ChatInterface.tsx:127-146)) | `w-5 h-5` (20px) | ❌ Too small |
| "Lihat Lagi" link ([`Paraphrase.tsx`](src/components/interactions/Paraphrase.tsx:75)) | text link | ❌ Too small |

**Fix header icons** — Wrap stat items in larger touch targets:

```tsx
// ChatInterface.tsx - wrap each stat in a min-touch-target container
<div className="flex items-center gap-1 text-brand-error font-black min-w-[44px] min-h-[44px] flex items-center justify-center">
  <Heart className={`w-5 h-5 fill-current ${hearts <= 1 ? 'animate-pulse' : ''}`} />
  <span className="text-sm">{hearts}</span>
</div>
```

**Fix "Lihat Lagi" link** — Make it a proper button with padding:

```tsx
// Paraphrase.tsx line 75
<button 
  onClick={() => setIsReady(false)}
  className="ml-auto text-brand-primary font-black hover:underline min-h-[44px] px-3 py-2 rounded-lg"
>
  Lihat Lagi
</button>
```

### 3.2 Input Focus & Keyboard Handling

**Problem:** When the mobile keyboard opens, the chat area shrinks and the user loses context. The scroll-to-bottom effect in [`ChatInterface.tsx`](src/components/ChatInterface.tsx:36-40) fires on `messages` change but not on keyboard open.

**Recommended** — Add a visual viewport resize listener:

```tsx
// Add to ChatInterface.tsx
useEffect(() => {
  if (window.visualViewport) {
    const onResize = () => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    };
    window.visualViewport.addEventListener('resize', onResize);
    return () => window.visualViewport.removeEventListener('resize', onResize);
  }
}, []);
```

**Also:** Prevent the page from scrolling when the textarea is focused (iOS rubber-banding issue):

```css
/* In index.css */
@layer base {
  html {
    overflow: hidden;
    height: 100%;
  }
}
```

### 3.3 Textarea Auto-Resize

The textarea in [`ChatInterface.tsx`](src/components/ChatInterface.tsx:210-222) has `rows={1}` and `max-h-32` but doesn't auto-grow as the user types multiple lines.

**Recommended** — Add auto-resize logic:

```tsx
const textareaRef = useRef<HTMLTextAreaElement>(null);

// Auto-resize textarea
useEffect(() => {
  if (textareaRef.current) {
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`;
  }
}, [input]);

// Update textarea element:
<textarea
  ref={textareaRef}
  value={input}
  ...
/>
```

### 3.4 Prevent Accidental Submit

On mobile, pressing Enter in the textarea submits immediately ([`ChatInterface.tsx`](src/components/ChatInterface.tsx:213-217)). This is fine for a chat app, but consider adding a brief debounce or requiring a double-tap on the send button for longer messages.

**Current behavior is acceptable** for a chat interface, but add visual confirmation:

```tsx
// Add a brief scale animation on send to confirm action
<motion.button
  whileTap={{ scale: 0.9 }}
  onClick={() => handleSendMessage(input)}
  ...
>
```

### 3.5 Swipe & Gesture Considerations

Currently no swipe gestures exist. For future enhancement:

- **Swipe-to-dismiss** for error messages or hints
- **Pull-down** to refresh/restart conversation
- Consider `framer-motion` drag constraints for card-based interactions

Not critical now, but plan for when adding more interaction types.

---

## 4. Media Query Strategies

### 4.1 Breakpoint Audit

Current breakpoints used in the codebase:

| Breakpoint | Usage | Tailwind Class |
|-----------|-------|---------------|
| `md` (768px) | Message max-width ([`MessageItem.tsx`](src/components/MessageItem.tsx:33)) | `md:max-w-[85%]` |
| `md` (768px) | Interaction padding ([`Quiz.tsx`](src/components/interactions/Quiz.tsx:39), [`GapFill.tsx`](src/components/interactions/GapFill.tsx:43), [`Paraphrase.tsx`](src/components/interactions/Paraphrase.tsx:30)) | `md:mt-6`, `md:p-6`, `md:rounded-3xl` |

**Missing breakpoints:**
- **`sm` (640px)** — No adjustments for small phones (320-640px) vs. medium phones (640-768px)
- **`lg` (1024px)** — No tablet landscape adjustments
- **`xl` (1280px)** — No desktop enhancements beyond the `max-w-md` constraint

### 4.2 Recommended Responsive Scale Map

Add to [`src/index.css`](src/index.css) as a design system reference:

```css
/*
 * Responsive Scale Map:
 * 
 * xs: 0-374px   — Very small phones (iPhone SE 1st gen, old Androids)
 * sm: 375-639px — Standard phones (iPhone SE 2+, most Androids)
 * md: 640-767px — Large phones / small tablets in portrait
 * lg: 768-1023px — Tablets portrait / phones landscape
 * xl: 1024+     — Tablets landscape / desktops
 */
```

### 4.3 Specific Media Query Adjustments

**Header compactness on small screens** ([`ChatInterface.tsx`](src/components/ChatInterface.tsx:124)):

```tsx
// Current: pt-6 px-6 pb-6
// Recommended: responsive padding
className="flex-shrink-0 pt-4 sm:pt-6 px-4 sm:px-6 pb-4 sm:pb-6 bg-white border-b border-slate-100 z-20"
```

**Welcome screen scaling** ([`WelcomeScreen.tsx`](src/components/WelcomeScreen.tsx:17-44)):

```tsx
// Current: text-4xl, w-24 h-24, py-10
// Recommended:
className="... py-6 sm:py-10 ..."                    // logo container
className="text-3xl sm:text-4xl font-black ..."      // heading
className="... max-w-[260px] sm:max-w-[280px] ..."   // description
```

**Message bubble padding** ([`MessageItem.tsx`](src/components/MessageItem.tsx:41)):

```tsx
// Current: px-5 py-4
// Recommended: responsive padding
className="px-4 sm:px-5 py-3 sm:py-4 border-2 w-full ..."
```

**Certificate modal padding** ([`CertificateModal.tsx`](src/components/CertificateModal.tsx:22-44)):

```tsx
// Current: p-8 (both header and body)
// Recommended:
className="bg-brand-primary p-6 sm:p-8 text-center text-white ..."  // header
className="p-6 sm:p-8 text-center"                                  // body
```

### 4.4 Landscape Mode Handling

On phones in landscape, the chat interface becomes very short. Add:

```css
/* In index.css */
@media (orientation: landscape) and (max-height: 500px) {
  /* Compact header in landscape */
  .chat-header {
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
  }
  
  /* Reduce welcome screen vertical spacing */
  .welcome-screen {
    padding-top: 1rem;
    padding-bottom: 1rem;
  }
}
```

Or in Tailwind, use arbitrary variants:
```tsx
<header className="... pt-4 sm:pt-6 landscape:max-h-[60px] landscape:py-2 ...">
```

---

## 5. Mobile-Specific Design Patterns

### 5.1 Bottom Sheet Pattern for Interactions

The Quiz, GapFill, and Paraphrase interactions render inline within message bubbles. On mobile, this can push content far down and make the chat history inaccessible.

**Recommended** — For longer interactions, use a bottom sheet overlay:

```tsx
// Create a MobileSheet component
<motion.div
  initial={{ y: '100%' }}
  animate={{ y: 0 }}
  exit={{ y: '100%' }}
  transition={{ type: 'spring', damping: 25 }}
  className="fixed bottom-0 left-0 right-0 z-30 bg-white rounded-t-3xl shadow-lg
    max-h-[80dvh] overflow-y-auto p-4 pb-[env(safe-area-inset-bottom)]"
>
  {/* Interaction content here */}
</motion.div>
```

This keeps the chat visible above and the interaction in a focused bottom panel — a pattern used by Duolingo itself.

### 5.2 Sticky Input Bar

The footer should remain visible even when the keyboard is open. Current implementation uses `flex-shrink-0` which is correct, but on iOS Safari the address bar collapse can cause layout shifts.

**Enhancement** — Use `position: sticky` as a fallback strategy:

```tsx
<footer className="sticky bottom-0 flex-shrink-0 bg-white border-t-2 border-slate-100 p-4 z-10
  [padding-bottom:max(2rem,env(safe-area-inset-bottom))]"
>
```

### 5.3 Progressive Disclosure for Mobile

On small screens, the header stats bar ([`ChatInterface.tsx`](src/components/ChatInterface.tsx:125-148)) takes significant vertical space. Consider:

- **Collapse stats into a single row** on very small screens:
  ```tsx
  <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-4">
    {/* On xs screens, show only hearts + XP bar + streak */}
    {/* On sm+, show all four stat items */}
  </div>
  ```

- **Use a collapsible header** that shrinks after the first message is sent:
  ```tsx
  const [isHeaderCompact, setIsHeaderCompact] = useState(false);
  // Set to true when messages.length > 0
  
  <header className={`... ${isHeaderCompact ? 'py-2' : 'pt-6 px-6 pb-6'}`}>
  ```

### 5.4 Loading & Skeleton Patterns

The current loading indicator ([`ChatInterface.tsx`](src/components/ChatInterface.tsx:188-202)) uses animated dots. On slow mobile networks, consider:

- **Add a network-aware loading state**: Use `navigator.connection.effectiveType` to show different loading indicators
- **Skeleton screens** for initial page load before React mounts:

```html
<!-- Add to index.html inside #root -->
<style>
  .skeleton { animation: pulse 1.5s infinite; background: #f1f5f9; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
</style>
<div class="skeleton h-screen max-w-md mx-auto flex flex-col">
  <div class="skeleton h-16 border-b"></div>
  <div class="flex-1"></div>
  <div class="skeleton h-20 border-t"></div>
</div>
```

This gives instant visual feedback before JS loads.

### 5.5 Offline & Error States

No offline handling exists. Add:

```tsx
// ChatInterface.tsx - add offline detection
const [isOffline, setIsOffline] = useState(!navigator.onLine);

useEffect(() => {
  const onOnline = () => setIsOffline(false);
  const onOffline = () => setIsOffline(true);
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}, []);

// Render offline banner
{isOffline && (
  <div className="bg-rose-50 text-rose-700 text-xs font-bold px-4 py-2 text-center">
    📡 Kamu sedang offline. Pesan akan terkirim saat internet kembali.
  </div>
)}
```

---

## 6. Performance Optimizations

### 6.1 Font Loading Strategy

**Current** ([`src/index.css`](src/index.css:1)):
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
```

**Problems:**
- `@import` inside CSS is render-blocking — the browser must fetch this CSS before processing any rules
- Three font families with multiple weights = many HTTP requests
- No `font-display` parameter (though `display=swap` is in the URL)

**Recommended** — Move to `<link>` in HTML with `preconnect`:

```html
<!-- Add to index.html <head> -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" />
```

**Remove Inter** — Plus Jakarta Sans already covers all the weight ranges Inter provides. Inter is redundant as a primary font when Plus Jakarta Sans is the specified `--font-sans`. Keep it only as a system fallback:

```css
--font-sans: "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;
```

This eliminates one entire font family download (~30KB saved).

### 6.2 Audio Preloading

**Current** ([`ChatInterface.tsx`](src/components/ChatInterface.tsx:19-28), [`Quiz.tsx`](src/components/interactions/Quiz.tsx:19-26), [`GapFill.tsx`](src/components/interactions/GapFill.tsx:20-26)):
```tsx
const audio = new Audio(sounds[type]);
audio.play().catch(() => {});
```

**Problems:**
- Creates a new `Audio` object on every interaction — no caching
- Fetches from external URL each time — network latency on mobile
- No preloading — first play has a delay

**Recommended** — Create a singleton audio cache:

```tsx
// src/utils/audio.ts
const audioCache: Record<string, HTMLAudioElement> = {};

const SOUNDS = {
  success: 'https://www.soundjay.com/buttons/sounds/button-3.mp3',
  error: 'https://www.soundjay.com/buttons/sounds/button-10.mp3',
  pop: 'https://www.soundjay.com/buttons/sounds/button-21.mp3',
};

export function preloadSounds() {
  Object.entries(SOUNDS).forEach(([key, url]) => {
    const audio = new Audio(url);
    audio.volume = 0.3;
    audio.preload = 'auto';
    audioCache[key] = audio;
  });
}

export function playSound(type: 'success' | 'error' | 'pop') {
  const audio = audioCache[type];
  if (audio) {
    // Reset to start for rapid replays
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }
}
```

Call `preloadSounds()` once on app mount in [`ChatInterface.tsx`](src/components/ChatInterface.tsx:9).

### 6.3 React Memoization

[`MessageItem`](src/components/MessageItem.tsx:16) re-renders every time any message is added because the parent maps over all messages. For long conversations on low-end mobile devices, this becomes costly.

**Recommended:**

```tsx
// MessageItem.tsx
import React from 'react';

const MessageItem = React.memo(function MessageItem({ message, onInteractionComplete }: MessageItemProps) {
  // ... existing implementation
});
```

Also memoize the `onInteractionComplete` callback in [`ChatInterface.tsx`](src/components/ChatInterface.tsx:100-117):

```tsx
const handleInteractionComplete = useCallback((result: { feedback: string; success: boolean }) => {
  // ... existing implementation
}, [xp]);  // dependency on xp for the threshold check
```

### 6.4 Lazy Load Heavy Dependencies

`react-markdown`, `remark-math`, and `rehype-katex` are heavy (~50KB+ combined). They're only needed for assistant messages with markdown content.

**Recommended** — Lazy load the markdown renderer:

```tsx
// MessageItem.tsx
import React, { lazy, Suspense } from 'react';

const LazyReactMarkdown = lazy(() => import('react-markdown'));

// Then in render:
<Suspense fallback={<p className="text-sm text-slate-400">Loading...</p>}>
  <LazyReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
    {cleanContent}
  </LazyReactMarkdown>
</Suspense>
```

Alternatively, since `remark-math` and `rehype-katex` are only needed when math content is present, conditionally load them:

```tsx
const hasMath = cleanContent.includes('$') || cleanContent.includes('\\(');
const plugins = hasMath ? [remarkMath] : [];
const rehypePlugins = hasMath ? [rehypeKatex] : [];
```

This avoids KaTeX processing for plain text messages.

### 6.5 Animation Performance

**Current** — Every message uses `motion.div` with `layout` prop ([`MessageItem.tsx`](src/components/MessageItem.tsx:30)). The `layout` prop triggers FLIP animations on every re-layout, which is expensive.

**Recommended:**

```tsx
// Remove `layout` from MessageItem — it causes unnecessary re-layouts
<motion.div 
  initial={{ opacity: 0, x: isAssistant ? -20 : 20 }}
  animate={{ opacity: 1, x: 0 }}
  // layout  ← REMOVE THIS
  className={...}
>
```

Only use `layout` on elements that genuinely change size/position within a shared layout.

**Add `will-change` hints** for animated progress bar ([`ChatInterface.tsx`](src/components/ChatInterface.tsx:132-136)):

```tsx
<motion.div 
  initial={{ width: 0 }}
  animate={{ width: `${Math.min((xp / 100) * 100, 100)}%` }}
  className="h-full bg-brand-primary shadow-[inset_0_-3px_0_0_rgba(0,0,0,0.1)] will-change-[width]"
/>
```

### 6.6 Image & Asset Optimization

No images exist currently, but when adding them:

- Use `<img loading="lazy" decoding="async">` for all non-critical images
- Serve responsive images with `srcset`:
  ```html
  <img srcset="logo-80.png 80w, logo-160.png 160w" sizes="80px" ... />
  ```
- Use WebP format with PNG fallback
- Consider inlining small icons as SVG instead of using external URLs

### 6.7 Bundle Size Considerations

Current heavy dependencies:
- `motion` (framer-motion v12): ~30KB gzipped
- `react-markdown` + plugins: ~20KB gzipped
- `katex`: ~100KB+ (CSS + fonts + JS)
- `lucide-react`: tree-shakeable, but verify only imported icons are bundled

**Recommendations:**
- Verify Vite is tree-shaking `lucide-react` properly (it should with ES imports)
- Consider replacing `motion` with lighter CSS animations for simple transitions:
  ```css
  .message-enter {
    animation: slideIn 0.3s ease-out;
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(-20px); }
    to { opacity: 1; transform: translateX(0); }
  }
  ```
- Only use `motion` for complex interactions (progress bar, modal, AnimatePresence)
- KaTeX fonts are the biggest payload — consider loading them only when math content is detected

### 6.8 Network-Aware Loading

Use the Network Information API for adaptive behavior:

```tsx
// src/utils/network.ts
export function getConnectionQuality(): 'fast' | 'slow' | 'offline' {
  const conn = (navigator as any).connection;
  if (!navigator.onLine) return 'offline';
  if (conn && conn.effectiveType) {
    return ['4g'].includes(conn.effectiveType) ? 'fast' : 'slow';
  }
  return 'fast'; // default assumption
}
```

Use this to:
- Skip sound effects on slow connections
- Reduce animation complexity on slow devices
- Show simplified markdown (no KaTeX) on slow connections
- Pre-warn users before sending large messages

---

## 7. Accessibility on Mobile

### 7.1 Focus Management

After sending a message, focus should return to the input:

```tsx
// ChatInterface.tsx - after handleSendMessage
const inputRef = useRef<HTMLTextAreaElement>(null);

// In handleSendMessage, after setting state:
setTimeout(() => inputRef.current?.focus(), 100);
```

### 7.2 ARIA Labels for Icon Buttons

The send button ([`ChatInterface.tsx`](src/components/ChatInterface.tsx:224-234)) and hint button ([`GapFill.tsx`](src/components/interactions/GapFill.tsx:84-88)) are icon-only with no accessible names:

```tsx
// Send button
<button aria-label="Kirim pesan" ...>

// Hint button  
<button aria-label="Tampilkan petunjuk" ...>

// Header stats
<span aria-label={`Nyawa: ${hearts}`}>{hearts}</span>
<span aria-label={`Streak: ${streak}`}>{streak}</span>
<span aria-label={`XP: ${xp}`}>{xp}</span>
```

### 7.3 Screen Reader Announcements

Use `aria-live` regions for dynamic content:

```tsx
// Add to ChatInterface.tsx
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {isLoading ? 'Nalar.ai sedang berpikir...' : ''}
  {messages.length > 0 && messages[messages.length - 1].role === 'assistant' 
    ? 'Pesan baru diterima' : ''}
</div>
```

---

## 8. Testing & Validation Checklist

### 8.1 Device Testing Matrix

| Device Category | Example Devices | Key Concerns |
|----------------|----------------|--------------|
| Small phone | iPhone SE (375×667), Galaxy S8 (360×760) | Layout overflow, touch targets |
| Standard phone | iPhone 14 (390×844), Pixel 7 (412×915) | Safe areas, keyboard handling |
| Large phone | iPhone 15 Pro Max (430×932), Galaxy S24 Ultra | Content width, font scaling |
| Phone landscape | Any phone rotated | Height compression, header collapse |
| Tablet portrait | iPad Mini (768×1024) | `max-w-md` constraint appearance |
| Tablet landscape | iPad Air (1024×768) | Wide layout, sidebar potential |
| Notch/Dynamic Island | iPhone 14+ (390×844) | `env(safe-area-inset-*)` |
| Android gesture nav | Pixel 7+ | Bottom overscroll, home indicator |

### 8.2 Chrome DevTools Mobile Audit Steps

1. **Performance panel**: Record a message send → verify no long tasks >50ms
2. **Lighthouse mobile audit**: Target 90+ performance score
3. **Network throttling**: Test on "Slow 3G" — verify skeleton appears, sounds don't block
4. **Rendering panel**: Enable paint flashing — verify no unnecessary repaints during scroll
5. **CPU throttling**: 4x slowdown — verify animations remain smooth

### 8.3 CSS Validation Commands

```bash
# Check for unused CSS
npx purgecss --css src/index.css --content src/**/*.tsx

# Audit bundle sizes
npx vite-bundle-visualizer
```

---

## 9. Priority Implementation Order

| Priority | Item | Impact | Effort |
|----------|------|--------|--------|
| 🔴 P0 | `h-dvh` instead of `h-screen` | Prevents footer hidden on mobile | Low |
| 🔴 P0 | Safe-area insets for footer | Fixes iPhone notch overlap | Low |
| 🔴 P0 | `touch-action: manipulation` | Eliminates 300ms tap delay | Low |
| 🔴 P0 | Input `font-size ≥ 16px` | Prevents iOS auto-zoom | Low |
| 🔴 P0 | `-webkit-tap-highlight-color` | Removes ugly tap flash | Low |
| 🟡 P1 | Font loading optimization | ~30KB savings, faster FCP | Medium |
| 🟡 P1 | Audio preloading cache | Eliminates playback delay | Medium |
| 🟡 P1 | `React.memo` on MessageItem | Prevents unnecessary re-renders | Low |
| 🟡 P1 | Remove `layout` prop from motion | Reduces layout thrashing | Low |
| 🟡 P1 | Word-break on markdown content | Prevents overflow on long words | Low |
| 🟡 P1 | Responsive padding (sm: breakpoints) | Better spacing on small phones | Low |
| 🟡 P1 | `theme-color` + mobile meta tags | Better browser integration | Low |
| 🟢 P2 | Lazy load react-markdown/KaTeX | ~50KB+ reduction on initial load | Medium |
| 🟢 P2 | Conditional KaTeX loading | Skip heavy math rendering when unused | Medium |
| 🟢 P2 | Bottom sheet for interactions | Better UX pattern for long interactions | High |
| 🟢 P2 | Offline detection & banner | Graceful degradation | Medium |
| 🟢 P2 | Visual viewport resize handler | Scroll-to-bottom on keyboard open | Medium |
| 🟢 P2 | Collapsible header after first message | More chat space on small screens | Medium |
| 🔵 P3 | Skeleton screen in HTML | Faster perceived load | Low |
| 🔵 P3 | Network-aware loading | Adaptive experience | Medium |
| 🔵 P3 | ARIA labels & live regions | Accessibility compliance | Medium |
| 🔵 P3 | Landscape mode handling | Compact layout in landscape | Medium |

---

## Summary

The application has a solid Duolingo-inspired mobile-first design foundation. The `max-w-md` constraint, tactile button effects, haptic feedback, and gamification UI are well-executed mobile patterns. However, there are critical gaps in:

1. **iOS-specific handling** — safe areas, input zoom, dynamic viewport height
2. **Touch optimization** — tap delay, highlight removal, minimum target sizes for header icons
3. **Performance** — render-blocking fonts, uncached audio, unmemoized components, heavy KaTeX loading
4. **Responsive scaling** — no adjustments for very small (xs) or landscape screens
5. **Accessibility** — missing ARIA labels, no screen reader announcements


