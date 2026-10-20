import type { MetadataRoute } from "next";

// Lets field agents add Kopa to their Android home screen and open it full screen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kopa Circles",
    short_name: "Kopa",
    description: "Form borrower circles and record weekly meetings.",
    start_url: "/agent",
    scope: "/",
    display: "standalone",
    background_color: "#f5f5f7",
    theme_color: "#1f8a3c",
    icons: [
      { src: "/app-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/app-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/app-icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
