// Inline script for the native build's <head>. It runs before Next loads.
//
// The native app is a static export: each route is its own file,
// /home/ -> home/index.html. Capacitor's local server doesn't know that. It
// treats the app as a single-page app, so a full page load of any path without
// a file extension (/home, /home/, /workout/history/session?id=…) gets the root
// index.html. Next then hydrates the "/" page at the wrong URL. The root page
// redirects to /home, which loads the root page again, and so on forever.
//
// A full page load happens on a hard navigation, a reload (the error screen,
// accept-privacy), or when Android restores a killed WebView. So:
// - extensionless path (always the root fallback; "/" is the real root page):
//   load <path>/index.html instead. It has an extension, so Capacitor serves
//   that route's own file.
// - …/index.html: put the address back to …/ before Next reads it, so routing,
//   usePathname and links all see the normal URL.
export const STATIC_ROUTE_SCRIPT = `(function () {
  var l = window.location, p = l.pathname;
  if (/\\/index\\.html$/.test(p)) {
    history.replaceState(history.state, "", p.slice(0, -"index.html".length) + l.search + l.hash);
  } else if (p !== "/" && !/\\.[^/]*$/.test(p)) {
    l.replace((p.charAt(p.length - 1) === "/" ? p : p + "/") + "index.html" + l.search + l.hash);
  }
})();`;
