"use client";

import { useEffect, useId, useMemo } from "react";
import { ImagePlus, X } from "lucide-react";
import { UPLOAD_LIMITS } from "@/lib/constants";
import { validateImageFile } from "@/lib/image-upload";
import { toast } from "sonner";

/** Local file picker with previews. Files are uploaded by the parent. */
export function ImagePicker({
  files,
  onChange,
  max = UPLOAD_LIMITS.maxImagesPerComplaint,
  disabled,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  max?: number;
  disabled?: boolean;
}) {
  const id = useId();
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  function add(list: FileList | null) {
    if (!list) return;
    const next = [...files];
    for (const f of Array.from(list)) {
      const err = validateImageFile(f);
      if (err) {
        toast.error(err);
        continue;
      }
      if (next.length >= max) {
        toast.error(`Ugu badnaan ${max} sawir ayaad soo gelin kartaa.`);
        break;
      }
      next.push(f);
    }
    onChange(next);
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {previews.map((src, i) => (
          <div key={src} className="relative aspect-square overflow-hidden rounded-xl bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`Sawir la doortay ${i + 1}`} className="size-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(files.filter((_, j) => j !== i))}
              disabled={disabled}
              className="absolute top-1.5 right-1.5 flex size-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
              aria-label={`Ka saar sawirka ${i + 1}`}
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ))}
        {files.length < max ? (
          <label
            htmlFor={id}
            className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-muted-foreground hover:border-primary/50 hover:bg-secondary hover:text-primary has-disabled:pointer-events-none has-disabled:opacity-50"
          >
            <ImagePlus className="size-6" aria-hidden />
            <span className="text-xs font-medium">Ku dar sawir</span>
            <input
              id={id}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              disabled={disabled}
              onChange={(e) => {
                add(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        ) : null}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Ugu badnaan {max} sawir · JPG, PNG ama WebP · 5 MB sawirkiiba. Macluumaadka goobta (GPS) ee sawirka waa laga
        saarayaa ka hor inta aan la soo gelin.
      </p>
    </div>
  );
}
