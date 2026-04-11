/**
 * Global Theme System for CafePOS
 * 
 * Dynamically overrides all Tailwind amber utility classes with custom primary color.
 * Uses CSS custom properties injected via a <style> tag into the document head.
 */

const STYLE_ID = 'cafepos-theme-override';

/** Convert hex color to HSL */
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  // Remove # if present
  let c = hex.replace('#', '');

  // Parse hex
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/** Generate a full set of shades (50-950) from a hex color */
export function hexToShades(hex: string): Record<string, string> {
  const { h, s } = hexToHsl(hex);

  // Tailwind amber-600 maps to approximately #d97706 which is h(38) s(92) l(43)
  // We treat the input hex as the "600" shade and derive others from it
  const shades: Record<string, string> = {};

  // Define lightness targets for each shade level
  const lightnessMap: Record<string, number> = {
    '50': 98,
    '100': 96,
    '200': 93,
    '300': 87,
    '400': 78,
    '500': 65,
    '600': 45, // This is the "primary" shade - we adjust to match the input
    '700': 35,
    '800': 26,
    '900': 18,
    '950': 10,
  };

  // Compute the input's lightness to use as the 600 shade
  const inputHsl = hexToHsl(hex);
  lightnessMap['600'] = inputHsl.l;

  for (const [shade, l] of Object.entries(lightnessMap)) {
    // Adjust saturation: lighter shades get less saturation, darker get slightly less
    let adjustedS = s;
    if (l > 70) {
      adjustedS = Math.max(s * 0.6, 30);
    } else if (l > 50) {
      adjustedS = Math.max(s * 0.85, 40);
    } else if (l < 20) {
      adjustedS = Math.max(s * 0.7, 20);
    }

    shades[shade] = `hsl(${h}, ${adjustedS}%, ${l}%)`;
  }

  return shades;
}

/** The default amber primary color - don't override when this is set */
const DEFAULT_PRIMARY = '#d97706';

/**
 * Apply theme: inject a <style> tag that overrides all amber utility classes
 * with CSS custom properties derived from the custom primary color.
 */
export function applyTheme(primaryColor: string): void {
  if (typeof document === 'undefined') return;
  if (!primaryColor || primaryColor === DEFAULT_PRIMARY) {
    removeTheme();
    return;
  }

  const shades = hexToShades(primaryColor);
  const root = document.documentElement;

  // Set CSS custom properties on :root
  for (const [shade, value] of Object.entries(shades)) {
    root.style.setProperty(`--theme-primary-${shade}`, value);
  }

  // Build comprehensive CSS override rules for ALL amber utilities
  const css = buildOverrideCSS(shades);

  // Remove existing style tag if present
  removeTheme();

  // Inject new style tag
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.setAttribute('data-theme', primaryColor);
  style.textContent = css;
  document.head.appendChild(style);
}

/** Remove theme override and CSS custom properties */
export function removeTheme(): void {
  if (typeof document === 'undefined') return;

  // Remove style tag
  const existing = document.getElementById(STYLE_ID);
  if (existing) {
    existing.remove();
  }

  // Remove CSS custom properties
  const root = document.documentElement;
  const toRemove: string[] = [];
  for (let i = 0; i < root.style.length; i++) {
    const prop = root.style[i];
    if (prop && prop.startsWith('--theme-primary-')) {
      toRemove.push(prop);
    }
  }
  toRemove.forEach(prop => root.style.removeProperty(prop));
}

/** Build the CSS string that overrides all Tailwind amber classes */
function buildOverrideCSS(shades: Record<string, string>): string {
  const lines: string[] = [];

  lines.push('/* CafePOS Theme Override */');

  // ─── Background colors ───
  lines.push(`
/* Solid backgrounds */
.bg-amber-50 { background-color: ${shades['50']} !important; }
.bg-amber-100 { background-color: ${shades['100']} !important; }
.bg-amber-200 { background-color: ${shades['200']} !important; }
.bg-amber-300 { background-color: ${shades['300']} !important; }
.bg-amber-400 { background-color: ${shades['400']} !important; }
.bg-amber-500 { background-color: ${shades['500']} !important; }
.bg-amber-600 { background-color: ${shades['600']} !important; }
.bg-amber-700 { background-color: ${shades['700']} !important; }
.bg-amber-800 { background-color: ${shades['800']} !important; }
.bg-amber-900 { background-color: ${shades['900']} !important; }

/* Background with opacity (via CSS custom property approach) */
.bg-amber-50\\/50 { background-color: color-mix(in srgb, ${shades['50']} 50%, transparent) !important; }

/* Hover backgrounds */
.hover\\:bg-amber-700:hover { background-color: ${shades['700']} !important; }
.hover\\:bg-amber-600:hover { background-color: ${shades['600']} !important; }
.hover\\:bg-amber-500:hover { background-color: ${shades['500']} !important; }
.hover\\:bg-amber-100:hover { background-color: ${shades['100']} !important; }
  `);

  // ─── Text colors ───
  lines.push(`
/* Text colors */
.text-amber-50 { color: ${shades['50']} !important; }
.text-amber-100 { color: ${shades['100']} !important; }
.text-amber-200 { color: ${shades['200']} !important; }
.text-amber-300 { color: ${shades['300']} !important; }
.text-amber-400 { color: ${shades['400']} !important; }
.text-amber-500 { color: ${shades['500']} !important; }
.text-amber-600 { color: ${shades['600']} !important; }
.text-amber-700 { color: ${shades['700']} !important; }
.text-amber-800 { color: ${shades['800']} !important; }
.text-amber-900 { color: ${shades['900']} !important; }
  `);

  // ─── Border colors ───
  lines.push(`
/* Border colors */
.border-amber-50 { border-color: ${shades['50']} !important; }
.border-amber-100 { border-color: ${shades['100']} !important; }
.border-amber-200 { border-color: ${shades['200']} !important; }
.border-amber-300 { border-color: ${shades['300']} !important; }
.border-amber-400 { border-color: ${shades['400']} !important; }
.border-amber-500 { border-color: ${shades['500']} !important; }
.border-amber-600 { border-color: ${shades['600']} !important; }
.border-amber-700 { border-color: ${shades['700']} !important; }
.border-amber-800 { border-color: ${shades['800']} !important; }

/* Focus border */
.focus\\:border-amber-400:focus { border-color: ${shades['400']} !important; }
.focus\\:border-amber-500:focus { border-color: ${shades['500']} !important; }

/* Group hover border */
.group-hover\\:border-amber-400:hover { border-color: ${shades['400']} !important; }
  `);

  // ─── Gradient from-* ───
  lines.push(`
/* Gradient from-* colors */
.from-amber-50 { --tw-gradient-from: ${shades['50']} !important; }
.from-amber-100 { --tw-gradient-from: ${shades['100']} !important; }
.from-amber-200 { --tw-gradient-from: ${shades['200']} !important; }
.from-amber-300 { --tw-gradient-from: ${shades['300']} !important; }
.from-amber-400 { --tw-gradient-from: ${shades['400']} !important; }
.from-amber-500 { --tw-gradient-from: ${shades['500']} !important; }
.from-amber-600 { --tw-gradient-from: ${shades['600']} !important; }
.from-amber-700 { --tw-gradient-from: ${shades['700']} !important; }
.from-amber-800 { --tw-gradient-from: ${shades['800']} !important; }
.from-amber-900 { --tw-gradient-from: ${shades['900']} !important; }

/* Hover gradient from- */
.hover\\:from-amber-700:hover { --tw-gradient-from: ${shades['700']} !important; }
.hover\\:from-amber-800:hover { --tw-gradient-from: ${shades['800']} !important; }
  `);

  // ─── Gradient to-* ───
  lines.push(`
/* Gradient to-* colors */
.to-amber-50 { --tw-gradient-to: ${shades['50']} !important; }
.to-amber-100 { --tw-gradient-to: ${shades['100']} !important; }
.to-amber-200 { --tw-gradient-to: ${shades['200']} !important; }
.to-amber-300 { --tw-gradient-to: ${shades['300']} !important; }
.to-amber-400 { --tw-gradient-to: ${shades['400']} !important; }
.to-amber-500 { --tw-gradient-to: ${shades['500']} !important; }
.to-amber-600 { --tw-gradient-to: ${shades['600']} !important; }
.to-amber-700 { --tw-gradient-to: ${shades['700']} !important; }
.to-amber-800 { --tw-gradient-to: ${shades['800']} !important; }
.to-amber-900 { --tw-gradient-to: ${shades['900']} !important; }

/* Hover gradient to- */
.hover\\:to-amber-800:hover { --tw-gradient-to: ${shades['800']} !important; }
  `);

  // ─── Gradient via-* (for gradient-to-l which uses via) ───
  lines.push(`
/* Gradient via-* colors */
.via-amber-50 { --tw-gradient-via: ${shades['50']} !important; }
.via-amber-100 { --tw-gradient-via: ${shades['100']} !important; }
.via-amber-200 { --tw-gradient-via: ${shades['200']} !important; }
.via-amber-300 { --tw-gradient-via: ${shades['300']} !important; }
.via-amber-400 { --tw-gradient-via: ${shades['400']} !important; }
.via-amber-500 { --tw-gradient-via: ${shades['500']} !important; }
.via-amber-600 { --tw-gradient-via: ${shades['600']} !important; }
  `);

  // ─── Ring colors ───
  lines.push(`
/* Ring colors */
.ring-amber-50 { --tw-ring-color: ${shades['50']} !important; }
.ring-amber-100 { --tw-ring-color: ${shades['100']} !important; }
.ring-amber-200 { --tw-ring-color: ${shades['200']} !important; }
.ring-amber-300 { --tw-ring-color: ${shades['300']} !important; }
.ring-amber-400 { --tw-ring-color: ${shades['400']} !important; }
.ring-amber-500 { --tw-ring-color: ${shades['500']} !important; }
.ring-amber-600 { --tw-ring-color: ${shades['600']} !important; }
.ring-amber-700 { --tw-ring-color: ${shades['700']} !important; }
  `);

  // ─── Shadow colors ───
  lines.push(`
/* Shadow overrides - use color-mix for proper opacity */
.shadow-amber-500\\/20 { box-shadow: 0 4px 6px -1px color-mix(in srgb, ${shades['500']} 20%, transparent), 0 2px 4px -2px color-mix(in srgb, ${shades['500']} 20%, transparent) !important; }
.shadow-amber-500\\/25 { box-shadow: 0 10px 15px -3px color-mix(in srgb, ${shades['500']} 25%, transparent), 0 4px 6px -4px color-mix(in srgb, ${shades['500']} 25%, transparent) !important; }
.shadow-amber-900\\/10 { box-shadow: 0 20px 25px -5px color-mix(in srgb, ${shades['900']} 10%, transparent), 0 8px 10px -6px color-mix(in srgb, ${shades['900']} 10%, transparent) !important; }
  `);

  // ─── Orange color overrides (used in login screen) ───
  lines.push(`
/* Orange overrides - map to primary shades for login screen consistency */
.via-orange-50 { --tw-gradient-via: ${shades['50']} !important; }
.bg-orange-50 { background-color: ${shades['50']} !important; }
.text-orange-50 { color: ${shades['50']} !important; }
  `);

  return lines.join('\n');
}
