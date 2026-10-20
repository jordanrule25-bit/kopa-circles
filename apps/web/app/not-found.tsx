import Link from "next/link";
import { Seedling } from "@/components/plants";

export default function NotFound() {
  return (
    <section className="grid justify-items-center gap-4 py-16 text-center">
      <Seedling size={80} />
      <h1 className="text-4xl font-semibold">Nothing has grown here yet</h1>
      <p className="max-w-md text-lg text-muted">That page doesn’t exist, or the circle isn’t listed. It may still be forming.</p>
      <Link href="/" className="rounded-full bg-accent px-6 py-3 font-medium text-accent-ink hover:brightness-110">
        Back to circles
      </Link>
    </section>
  );
}
