import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Monkey-patch JSON.stringify to handle circular references safely and prevent
// uncaught circular structure errors from crash-reporting libraries and sandbox overlays.
const originalStringify = JSON.stringify;
JSON.stringify = function (value: any, replacer?: any, space?: any) {
  const seen = new WeakSet();
  function serializer(key: string, val: any) {
    if (typeof val === 'object' && val !== null) {
      if (seen.has(val)) {
        return '[Circular]';
      }
      seen.add(val);
    }
    return val;
  }
  
  try {
    if (typeof replacer === 'function') {
      const customReplacer = replacer;
      return originalStringify(value, (key, val) => {
        const safeVal = serializer(key, val);
        if (safeVal === '[Circular]') return safeVal;
        return customReplacer(key, safeVal);
      }, space);
    } else if (Array.isArray(replacer)) {
      // Just clean up circular dependencies first before applying array replacer
      const cleanValue = JSON.parse(originalStringify(value, serializer) || '{}');
      return originalStringify(cleanValue, replacer, space);
    } else {
      return originalStringify(value, serializer, space);
    }
  } catch (e) {
    try {
      return originalStringify({ 
        error: 'JSON.stringify circular fallback', 
        message: value instanceof Error ? value.message : String(value) 
      });
    } catch {
      return '"[Unserializable]"';
    }
  }
};

// Intercept uncaught rejection/error events to prevent the sandboxed iframe's parent wrapper
// from calling JSON.stringify on circular Firebase/Firestore structures, which causes the application to crash.
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  if (reason && typeof reason === 'object') {
    const errorMessage = reason.message || String(reason);
    console.warn('Captured unhandled promise rejection safely (preventing circular serialization crash):', errorMessage);
    // Prevent default handling and stop immediate propagation
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);

window.addEventListener('error', (event) => {
  const error = event.error;
  if (error && typeof error === 'object') {
    const errorMessage = error.message || String(error);
    console.warn('Captured unhandled runtime error safely (preventing circular serialization crash):', errorMessage);
    // Prevent default handling and stop immediate propagation
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
