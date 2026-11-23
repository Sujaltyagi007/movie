import { renderAppIcon } from "@/lib/app-icon";

/**
 * App icons, served at /icon/192, /icon/512 and /icon/maskable (referenced by app/manifest.ts).
 * "maskable" is full-bleed with the glyph inside the central safe zone, so Android can crop it
 * to any shape.
 */
const ICONS = {
  "192": { size: 192, glyphScale: 0.52, cornerRadius: 0.22 },
  "512": { size: 512, glyphScale: 0.52, cornerRadius: 0.22 },
  maskable: { size: 512, glyphScale: 0.42, cornerRadius: 0 },
} as const;

type IconId = keyof typeof ICONS;

export function generateImageMetadata() {
  return (Object.keys(ICONS) as IconId[]).map((id) => ({
    id,
    contentType: "image/png",
    size: { width: ICONS[id].size, height: ICONS[id].size },
  }));
}

export default async function Icon({ id }: { id: Promise<string | number> }) {
  const key = String(await id);
  const options = key in ICONS ? ICONS[key as IconId] : ICONS["192"];
  return renderAppIcon(options);
}
