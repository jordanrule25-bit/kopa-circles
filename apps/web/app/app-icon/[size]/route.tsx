import { ImageResponse } from "next/og";

// Home-screen icon: a white leaf on green, rendered at the requested size.
const SIZES = new Set([180, 192, 512]);

export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const size = Number((await params).size);
  if (!SIZES.has(size)) return new Response("Not found", { status: 404 });
  const leaf = Math.round(size * 0.56);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#1a7a35" }}>
        <svg width={leaf} height={leaf} viewBox="0 0 24 24">
          <path d="M4 20C4 10.5 10.5 4 20 4c0 9.5-6.5 16-16 16z" fill="#ffffff" />
          <path d="M4.5 19.5L15 9" stroke="#1a7a35" strokeWidth="1.4" strokeLinecap="round" fill="none" />
        </svg>
      </div>
    ),
    { width: size, height: size, headers: { "cache-control": "public, max-age=86400" } },
  );
}
