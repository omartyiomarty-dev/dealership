"use client";
import { useState } from "react";
import { I } from "./Icon";

export default function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [i, setI] = useState(0);
  if (images.length === 0) {
    return <div className="grid aspect-[4/3] w-full place-items-center rounded-xl bg-gray-100 text-gray-200"><I.car className="h-20 w-20" /></div>;
  }
  return (
    <div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[i]} alt={`${alt} ${i + 1}`} className="h-full w-full object-cover" />
        {images.length > 1 && (
          <>
            <button type="button" aria-label="Previous" onClick={() => setI((i - 1 + images.length) % images.length)} className="absolute start-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow transition hover:bg-white"><I.chevL className="h-5 w-5" /></button>
            <button type="button" aria-label="Next" onClick={() => setI((i + 1) % images.length)} className="absolute end-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow transition hover:bg-white"><I.chevR className="h-5 w-5" /></button>
            <span className="absolute bottom-2 end-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">{i + 1} / {images.length}</span>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {images.map((src, idx) => (
            <button key={idx} type="button" onClick={() => setI(idx)} className={`h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${idx === i ? "border-primary" : "border-transparent"}`} aria-label={`Image ${idx + 1}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
