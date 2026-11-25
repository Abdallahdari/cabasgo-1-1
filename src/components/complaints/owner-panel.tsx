"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImagePicker } from "@/components/complaints/image-picker";
import { api, errorMessage } from "@/lib/api-client";
import { uploadComplaintImage } from "@/lib/image-upload";
import { UPLOAD_LIMITS, type Visibility } from "@/lib/constants";
import type { ImageDTO } from "@/types";

/** Owner controls: manage evidence photos while pending, delete while pending/rejected. */
export function OwnerPanel({
  complaintId,
  visibility,
  images,
  uploadsEnabled,
}: {
  complaintId: string;
  visibility: Visibility;
  images: ImageDTO[];
  uploadsEnabled: boolean;
}) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isPending = visibility === "PENDING";
  const canDelete = visibility === "PENDING" || visibility === "REJECTED";
  const remaining = UPLOAD_LIMITS.maxImagesPerComplaint - images.length;

  if (!isPending && !canDelete) return null;

  function upload() {
    startTransition(async () => {
      let ok = 0;
      for (const f of files) {
        try {
          await uploadComplaintImage(complaintId, f);
          ok++;
        } catch (err) {
          toast.error(errorMessage(err));
        }
      }
      if (ok) toast.success(`${ok} sawir ayaa la soo geliyay.`);
      setFiles([]);
      router.refresh();
    });
  }

  function removeImage(id: string) {
    startTransition(async () => {
      try {
        await api(`/api/uploads/${id}`, { method: "DELETE" });
        router.refresh();
      } catch (err) {
        toast.error(errorMessage(err));
      }
    });
  }

  function remove() {
    startTransition(async () => {
      try {
        await api(`/api/complaints/${complaintId}`, { method: "DELETE" });
        toast.success("Cabashada waa la tirtiray.");
        router.push("/me/complaints");
        router.refresh();
      } catch (err) {
        toast.error(errorMessage(err));
      }
    });
  }

  return (
    <section className="rounded-3xl bg-card p-5 sm:p-6" aria-labelledby="owner-title">
      <h2 id="owner-title" className="font-bold">
        Cabashadaada
      </h2>
      {isPending ? (
        <>
          <p className="mt-1 text-sm text-muted-foreground">
            Inta ay sugayso dib-u-eegis, waxaad ku dari kartaa ama ka saari kartaa sawirro.
          </p>
          {images.length > 0 ? (
            <ul className="mt-4 grid grid-cols-3 gap-2">
              {images.map((img, i) => (
                <li key={img.id} className="relative aspect-square overflow-hidden rounded-xl bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={`Sawirka ${i + 1}`} className="size-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(img.id)}
                    disabled={pending}
                    className="absolute top-1 right-1 flex size-7 items-center justify-center rounded-full bg-black/60 text-white"
                    aria-label={`Tirtir sawirka ${i + 1}`}
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {uploadsEnabled && remaining > 0 ? (
            <div className="mt-4 space-y-3">
              <ImagePicker files={files} onChange={setFiles} max={remaining} disabled={pending} />
              {files.length > 0 ? (
                <Button onClick={upload} disabled={pending} className="h-10 w-full rounded-xl">
                  {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
                  Soo geli {files.length} sawir
                </Button>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
      {canDelete ? (
        <Button
          variant="destructive"
          className="mt-5 h-10 w-full rounded-xl"
          onClick={() => setConfirmDelete(true)}
          disabled={pending}
        >
          <Trash2 aria-hidden /> Tirtir cabashada
        </Button>
      ) : null}

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ma hubtaa inaad tirtirto?</DialogTitle>
            <DialogDescription>Cabashada iyo sawirradeeda si joogto ah ayaa loo tirtirayaa.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Maya
            </Button>
            <Button variant="destructive" onClick={remove} disabled={pending}>
              Haa, tirtir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
