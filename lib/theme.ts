/**
 * Browser-chrome colors (address bar / status bar / installed-app title bar). They match the
 * top of the app panel (`--panel-top` in app/globals.css) so the bar blends into the header.
 * Keep in sync with those CSS values.
 */
export const THEME_COLORS = {
  light: "#f3f5fc",
  dark: "#141624",
} as const;

/** Installed-app splash screen background (`--panel-bottom` in dark mode). */
export const SPLASH_BACKGROUND = "#0e1019";
