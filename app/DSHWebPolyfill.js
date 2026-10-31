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

    // AbortSignal.any(signals) — added in Safari 17.4. dsh's API client
    // (dsh-client-connection postJson) combines the timeout signal with a
    // caller-provided signal via AbortSignal.any(); on iOS 15.5 this throws
    // "AbortSignal.any is not a function" and settings sections that pass an
    // external signal (Agent presets, Permissions) show "Load failed".
    // Spec: returns a signal that aborts when any source aborts, carrying
    // the first abort's reason; already aborted if any source already is.
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.any !== 'function') {
        AbortSignal.any = function (signals) {
            var controller = new AbortController();
            var list;
            try {
                list = Array.from(signals);
            } catch (e) {
                throw new TypeError('AbortSignal.any: argument is not iterable');
            }
            var settled = false;
            function abortWith(reason) {
                if (settled) return;
                settled = true;
                controller.abort(reason);
            }
            function reasonOf(source) {
                try { return source.reason; } catch (e) { return undefined; }
            }
            for (var i = 0; i < list.length; i++) {
                (function (source) {
                    var aborted = false;
                    try { aborted = !!(source && source.aborted); } catch (e) { aborted = false; }
                    if (aborted) {
                        abortWith(reasonOf(source));
                    } else if (source && typeof source.addEventListener === 'function') {
                        source.addEventListener('abort', function () {
                            abortWith(reasonOf(source));
                        }, { once: true });
                    }
                })(list[i]);
            }
            return controller.signal;
        };
    }

    // Portrait/narrow-screen fix for the dsh settings dialog.
    // Upstream (@deepseek-ai/dsh-client-ui-settings-general@0.1.0-rc.7, the
    // pinned version) ships no @media rules: the dialog is a fixed 800px-wide
    // flex row with a 188px sidebar, so on a 390px portrait phone the content
    // column is squeezed to ~150px (text wraps mid-word, inputs/buttons cut
    // off). Below 640px we stack the dialog vertically and turn the sidebar
    // into a horizontal scrollable tab bar.
    // NOTE: class names are CSS-modules hashes for the pinned dsh version;
    // re-verify them if dsh is ever upgraded.
    try {
        var css = [
            '@media (max-width: 640px) {',
            '  .VOzbGW_panel {',
            '    flex-direction: column;',
            '    width: auto;',
            '    max-width: calc(100vw - 24px);',
            '    height: min(860px, 100vh - 24px);',
            '  }',
            '  .VOzbGW_nav {',
            '    width: auto;',
            '    flex-direction: row;',
            '    align-items: center;',
            '    gap: 8px;',
            '    padding: 14px 12px 10px;',
            '    overflow-x: auto;',
            '    border-bottom: 1px solid var(--dsw-alias-border-l2, rgba(0,0,0,0.08));',
            '  }',
            '  .VOzbGW_navTitle { display: none; }',
            '  .VOzbGW_navList { flex-direction: row; gap: 6px; }',
            '  .VOzbGW_navCell { flex: none; height: 36px; padding: 7px 12px; white-space: nowrap; }',
            '  .VOzbGW_navLabel { flex: none; }',
            '  .VOzbGW_content { min-height: 0; }',
            '  .VOzbGW_header { height: auto; min-height: 54px; padding: 12px 12px 8px; }',
            '  .VOzbGW_options { padding: 0 16px 20px; }',
            '}'
        ].join('\n');
        var style = document.createElement('style');
        style.setAttribute('data-dsh-ios', 'settings-portrait-fix');
        style.appendChild(document.createTextNode(css));
        (document.head || document.documentElement).appendChild(style);
    } catch (e) {
        // Non-fatal: the dialog just keeps its desktop layout.
    }
})();
