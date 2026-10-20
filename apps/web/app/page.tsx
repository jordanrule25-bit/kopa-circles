import { aprFromFlatFee, FEE_BPS, WEEKS } from "@kopa/core";
import Link from "next/link";

export default function Home() {
  const apr = aprFromFlatFee(FEE_BPS, WEEKS);
  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-semibold">Kopa Circles</h1>
      <p className="mt-3 text-stone-600">
        Lend $25 to a circle of five small-business owners in Kenya. You get your principal back; you never earn interest.
      </p>
      <p className="mt-6 text-sm text-stone-500">
        Borrowers pay a flat {FEE_BPS / 100}% fee over {WEEKS} weekly installments, about{" "}
        <span data-testid="apr">{(apr * 100).toFixed(1)}%</span> APR.
      </p>
      <Link href="/agent" className="mt-8 inline-block rounded bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800">
        Agent tools
      </Link>
    </main>
  );
}
