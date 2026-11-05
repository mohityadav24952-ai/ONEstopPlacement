"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function ShareModal({ url, name, onClose }: { url: string; name: string; onClose: () => void }) {
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let live = true;
    QRCode.toDataURL(url, { margin: 1, width: 240 })
      .then((d) => {
        if (live) setQr(d);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [url]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard blocked: the link is shown in the box so it can be copied by hand
    }
  }

  const text = encodeURIComponent(`${name ? `${name}'s` : "My"} developer portfolio`);
  const u = encodeURIComponent(url);
  const links: [string, string][] = [
    ["LinkedIn", `https://www.linkedin.com/sharing/share-offsite/?url=${u}`],
    ["X (Twitter)", `https://twitter.com/intent/tweet?text=${text}&url=${u}`],
    ["WhatsApp", `https://wa.me/?text=${text}%20${u}`],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="share-title" className="sticker animate-in w-full max-w-sm space-y-4 rounded-3xl p-6">
        <div className="flex items-start justify-between gap-3">
          <h2 id="share-title" className="font-display text-xl font-bold">Share your portfolio</h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-muted hover:text-fg">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex justify-center rounded-2xl bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {qr ? <img src={qr} alt={`QR code for ${url}`} width={200} height={200} /> : <div className="h-[200px] w-[200px]" />}
        </div>
        <div className="flex items-center gap-2">
          <input readOnly value={url} aria-label="Portfolio link" onFocus={(e) => e.currentTarget.select()} className="field min-w-0 flex-1 !py-2 text-xs" />
          <Button size="sm" onClick={() => void copy()}>
            {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {links.map(([label, href]) => (
            <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="rounded-full border border-edge-strong px-3.5 py-1.5 text-sm font-bold hover:border-primary hover:text-primary">
              {label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
