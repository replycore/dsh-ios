// DSHWebPolyfill.js — small WebKit polyfills for the older Safari on iOS 15.
//
// The app supports iOS 15.5+, but the dsh web UI (served from the guest and
// shown in this app's WKWebView) is written against a modern WebKit. This
// file is injected as a WKUserScript at document start, before any page
// script runs, so feature detection inside the page sees the polyfilled APIs.
//
// Keep each polyfill guarded by feature detection and behavior-compatible
// with the spec; add new ones below as older-WebKit gaps are found.

(function () {
    'use strict';

    // AbortSignal.timeout(ms) — added in Safari 16.4. The dsh settings pages
    // (Agent presets, Models, Permissions) use it for request timeouts; on
    // iOS 15.5 the call throws "AbortSignal.timeout is not a function" and the
    // pages fail to load. Emulate with AbortController + setTimeout.
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout !== 'function') {
        AbortSignal.timeout = function (ms) {
            var controller = new AbortController();
            setTimeout(function () {
                var reason;
                try {
                    reason = new DOMException('The operation timed out.', 'TimeoutError');
                } catch (e) {
                    reason = new Error('The operation timed out.');
                    reason.name = 'TimeoutError';
                }
                controller.abort(reason);
            }, ms);
            return controller.signal;
        };
    }
})();
