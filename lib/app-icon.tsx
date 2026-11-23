import { ImageResponse } from "next/og";

/** Clapperboard glyph paths from lucide-react (ISC), the same mark as the header logo. */
const CLAPPERBOARD_PATHS = [
  "m12.296 3.464 3.02 3.956",
  "M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3z",
  "M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  "m6.18 5.276 3.1 3.899",
];

type AppIconOptions = {
  /** Square size in pixels. */
  size: number;
  /** Glyph size as a share of the icon. Maskable icons keep it inside the central safe zone. */
  glyphScale: number;
  /** Corner radius as a share of the size (0 = square; the OS applies its own mask). */
  cornerRadius: number;
};

/** Renders the Reelio app icon: white clapperboard on the dark panel gradient. */
export function renderAppIcon({ size, glyphScale, cornerRadius }: AppIconOptions): ImageResponse {
  const glyph = Math.round(size * glyphScale);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: Math.round(size * cornerRadius),
          background: "linear-gradient(145deg, #2a2c44 0%, #17182b 55%, #0e1019 100%)",
        }}
      >
        <svg width={glyph} height={glyph} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
          {CLAPPERBOARD_PATHS.map((d) => (
            <path key={d} d={d} />
          ))}
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
