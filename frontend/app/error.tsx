"use client";
export default function DataError({reset}:{error:Error;reset:()=>void}) {
  return <main className="mx-auto max-w-3xl p-8"><h1>Charging data unavailable</h1><p role="alert">We could not load charging data. Please try again.</p><button onClick={reset} className="mt-4 rounded border px-4 py-2">Retry</button></main>;
}
