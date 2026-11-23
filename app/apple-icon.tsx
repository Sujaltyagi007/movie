import { renderAppIcon } from "@/lib/app-icon";

/** iOS home-screen icon. Square and full-bleed: iOS applies its own rounded mask. */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return renderAppIcon({ size: size.width, glyphScale: 0.52, cornerRadius: 0 });
}
