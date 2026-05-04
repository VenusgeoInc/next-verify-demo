/**
 * Web ↔ MAUI
 *
 * OUT — `sendToMaui` tries in order:
 *   1) window.MauiHybrid.postMessage(json) — optional shared shape
 *   2) Android: window.jsBridge.invokeAction(json) — JavaScriptInterface
 *   3) iOS: window.webkit.messageHandlers.jsBridge.postMessage(json) — WKWebView (must match HandlerName)
 *
 * Android does not expose webkit.messageHandlers; iOS does not expose jsBridge.invokeAction.
 *
 * IN — `EvaluateJavaScriptAsync(nativeDemand(...))` → registerNativeDemand()
 *
 * Console: [HybridWeb]
 */

const TAG = "[HybridWeb]";

export const MAUI_HYBRID_BRIDGE = "MauiHybrid";

/** Same as iOS WebViewJsBridge.HandlerName — WKUserContentController script message name. */
export const IOS_SCRIPT_HANDLER_NAME = "jsBridge";

function toJsonString(data) {
  try {
    return typeof data === "string" ? data : JSON.stringify(data);
  } catch {
    return "{}";
  }
}

/**
 * Sends JSON to the native app (Android invokeAction OR iOS WK postMessage — see file header).
 */
export function sendToMaui(payload) {
  console.log(TAG, "📤 sendToMaui called with payload:", payload);

  const json = toJsonString(payload);
  console.log(TAG, "📦 JSON stringified:", json);

  if (typeof window === "undefined") {
    console.log(TAG, "❌ Window is undefined - running on server");
    return { ok: false, channel: "none", fallbackLogged: true };
  }

  console.log(TAG, "🔍 Checking for native bridges...");
  console.log(TAG, "   - window.MauiHybrid:", !!window[MAUI_HYBRID_BRIDGE]);
  console.log(TAG, "   - window.jsBridge:", !!window.jsBridge);
  console.log(TAG, "   - window.webkit:", !!window.webkit);

  const hybrid = window[MAUI_HYBRID_BRIDGE];
  if (hybrid?.postMessage) {
    try {
      hybrid.postMessage(json);
      console.log(TAG, "✅ → native (MauiHybrid)", json);
      return { ok: true, channel: MAUI_HYBRID_BRIDGE };
    } catch (err) {
      console.error(TAG, "❌ MauiHybrid.postMessage error", err);
      return { ok: false, channel: MAUI_HYBRID_BRIDGE, error: String(err) };
    }
  }

  // Android: AddJavascriptInterface(handler, "jsBridge") + invokeAction(string)
  if (window.jsBridge?.invokeAction) {
    try {
      window.jsBridge.invokeAction(json);
      console.log(TAG, "✅ → native (Android jsBridge.invokeAction)", json);
      return { ok: true, channel: "android-jsBridge" };
    } catch (err) {
      console.error(TAG, "❌ jsBridge.invokeAction error", err);
      return { ok: false, channel: "android-jsBridge", error: String(err) };
    }
  }

  // iOS WKWebView: AddScriptMessageHandler(..., "jsBridge") — NOT invokeAction
  const ios = window.webkit?.messageHandlers?.[IOS_SCRIPT_HANDLER_NAME];
  if (ios?.postMessage) {
    try {
      ios.postMessage(json);
      console.log(TAG, "✅ → native (iOS webkit.messageHandlers." + IOS_SCRIPT_HANDLER_NAME + ")", json);
      return { ok: true, channel: "ios-wk-" + IOS_SCRIPT_HANDLER_NAME };
    } catch (err) {
      console.error(TAG, "❌ WKWebView postMessage error", err);
      return { ok: false, channel: "ios-wk", error: String(err) };
    }
  }

  console.warn(
    TAG,
    "⚠️  NO BRIDGE FOUND - Running in regular browser (not webview)",
    "\n   Expected one of: MauiHybrid, Android jsBridge, or iOS webkit.messageHandlers.jsBridge",
    "\n   Message that would have been sent:", json
  );
  return { ok: false, channel: "none", fallbackLogged: true };
}

/**
 * MAUI calls nativeDemand(...) after EvaluateJavaScriptAsync — same JS on Android & iOS.
 */
export function registerNativeDemand(onBarcode) {
  if (typeof window === "undefined") return () => {};

  const before = window.nativeDemand;
  window.nativeDemand = (raw) => {
    const text = String(raw ?? "");
    console.log(TAG, "← native nativeDemand", text);
    onBarcode(text);
    if (typeof before === "function") before(raw);
  };

  return () => {
    window.nativeDemand = before;
    console.log(TAG, "nativeDemand removed");
  };
}
