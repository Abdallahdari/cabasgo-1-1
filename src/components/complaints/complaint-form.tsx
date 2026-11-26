"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImagePicker } from "@/components/complaints/image-picker";
import { api, ApiError, errorMessage } from "@/lib/api-client";
import { uploadComplaintImage } from "@/lib/image-upload";
import { createComplaintSchema } from "@/lib/validation";
import type { ComplaintDTO } from "@/types";

type Option = { id: string; name: string };

const selectCls =
  "h-12 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary/50 focus:ring-3 focus:ring-primary/15 disabled:opacity-50";

export function ComplaintForm({
  categories,
  regions,
  defaultAnonymous,
  uploadsEnabled,
}: {
  categories: Option[];
  regions: Option[];
  defaultAnonymous: boolean;
  uploadsEnabled: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [progress, setProgress] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [regionId, setRegionId] = useState("");
  const [cityId, setCityId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [locationDetail, setLocationDetail] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(defaultAnonymous);
  const [files, setFiles] = useState<File[]>([]);

  const [cities, setCities] = useState<Option[]>([]);
  const [districts, setDistricts] = useState<Option[]>([]);

  // Cascading location selects: changing a parent clears its children and
  // loads the next level from the API.
  function onRegionChange(value: string) {
    setRegionId(value);
    setCityId("");
    setCities([]);
    setDistrictId("");
    setDistricts([]);
    if (!value) return;
    api<{ cities: Option[] }>(`/api/locations/regions/${value}/cities`)
      .then((r) => setCities(r.cities))
      .catch((e) => toast.error(errorMessage(e)));
  }

  function onCityChange(value: string) {
    setCityId(value);
    setDistrictId("");
    setDistricts([]);
    if (!value) return;
    api<{ districts: Option[] }>(`/api/locations/cities/${value}/districts`)
      .then((r) => setDistricts(r.districts))
      .catch((e) => toast.error(errorMessage(e)));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      title,
      body,
      categoryId,
      regionId,
      cityId,
      districtId: districtId || null,
      locationDetail,
      isAnonymous,
    };
    const parsed = createComplaintSchema.safeParse(payload);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        next[key] ??= ["categoryId", "regionId", "cityId"].includes(key) ? "Fadlan dooro." : issue.message;
      }
      setErrors(next);
      toast.error("Fadlan sax khaladaadka foomka.");
      return;
    }
    setErrors({});

    startTransition(async () => {
      try {
        setProgress("Cabashada waa la gudbinayaa…");
        const { complaint } = await api<{ complaint: ComplaintDTO }>("/api/complaints", {
          method: "POST",
          body: parsed.data,
        });
        let failed = 0;
        for (let i = 0; i < files.length; i++) {
          setProgress(`Sawirka ${i + 1} / ${files.length} waa la soo gelinayaa…`);
          try {
            await uploadComplaintImage(complaint.id, files[i]);
          } catch (err) {
            failed++;
            toast.error(errorMessage(err));
          }
        }
        toast.success(
          failed
            ? "Cabashada waa la gudbiyay, laakiin sawirrada qaar lama soo gelin. Waxaad ku dari kartaa bogga cabashada."
            : "Cabashadaada waa la gudbiyay. Waxay sugaysaa dib-u-eegis.",
        );
        router.push(`/complaints/${complaint.id}`);
        router.refresh();
      } catch (err) {
        if (err instanceof ApiError && err.code === "EMAIL_NOT_VERIFIED") {
          toast.error(err.message);
          router.push("/settings#email");
          return;
        }
        toast.error(errorMessage(err));
      } finally {
        setProgress(null);
      }
    });
  }

  const fieldError = (k: string) =>
    errors[k] ? (
      <p id={`${k}-error`} className="mt-1.5 text-sm text-destructive">
        {errors[k]}
      </p>
    ) : null;

  return (
    <form onSubmit={submit} className="space-y-8" noValidate>
      <section className="space-y-5">
        <div>
          <Label htmlFor="title" className="mb-2">
            Cinwaanka cabashada
          </Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={140}
            placeholder="Tusaale: Biyo la'aan ka jirta xaafadda Hodan muddo 2 toddobaad ah"
            className="h-12 rounded-xl"
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? "title-error" : undefined}
          />
          {fieldError("title")}
        </div>
        <div>
          <Label htmlFor="body" className="mb-2">
            Faahfaahinta
          </Label>
          <Textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={5000}
            rows={7}
            placeholder="Sharax dhibaatada: maxaa dhacay, goorma ayay bilaabatay, yaa ay saameysay…"
            className="rounded-xl"
            aria-invalid={Boolean(errors.body)}
            aria-describedby={errors.body ? "body-error" : undefined}
          />
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>{fieldError("body")}</span>
            <span>{body.length} / 5000</span>
          </div>
        </div>
      </section>

      <section id="qaybta" className="scroll-mt-28">
        <Label htmlFor="category" className="mb-2">
          Qaybta
        </Label>
        <select
          id="category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className={selectCls}
          aria-invalid={Boolean(errors.categoryId)}
        >
          <option value="">Dooro qaybta…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {fieldError("categoryId")}
      </section>

      <section id="goobta" className="scroll-mt-28 space-y-4">
        <h2 className="text-sm font-semibold">Goobta</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="region" className="mb-2 text-xs text-muted-foreground">
              Gobolka
            </Label>
            <select id="region" value={regionId} onChange={(e) => onRegionChange(e.target.value)} className={selectCls}>
              <option value="">Dooro gobolka…</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            {fieldError("regionId")}
          </div>
          <div>
            <Label htmlFor="city" className="mb-2 text-xs text-muted-foreground">
              Magaalada
            </Label>
            <select
              id="city"
              value={cityId}
              onChange={(e) => onCityChange(e.target.value)}
              className={selectCls}
              disabled={!regionId}
            >
              <option value="">{regionId ? "Dooro magaalada…" : "Marka hore dooro gobol"}</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {fieldError("cityId")}
          </div>
          <div>
            <Label htmlFor="district" className="mb-2 text-xs text-muted-foreground">
              Degmada (ikhtiyaari)
            </Label>
            <select
              id="district"
              value={districtId}
              onChange={(e) => setDistrictId(e.target.value)}
              className={selectCls}
              disabled={!cityId || districts.length === 0}
            >
              <option value="">{districts.length ? "Dooro degmada…" : "—"}</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <Label htmlFor="locationDetail" className="mb-2 text-xs text-muted-foreground">
            Meesha saxda ah (ikhtiyaari)
          </Label>
          <Input
            id="locationDetail"
            value={locationDetail}
            onChange={(e) => setLocationDetail(e.target.value)}
            maxLength={200}
            placeholder="Tusaale: Agagaarka suuqa Bakaaraha, waddada 21-ka Oktoobar"
            className="h-12 rounded-xl"
          />
        </div>
      </section>

      <section id="sawirro" className="scroll-mt-28">
        <h2 className="mb-3 text-sm font-semibold">Sawirro caddeyn ah</h2>
        {uploadsEnabled ? (
          <ImagePicker files={files} onChange={setFiles} disabled={pending} />
        ) : (
          <p className="rounded-xl bg-canvas p-4 text-sm text-muted-foreground">
            Soo gelinta sawirrada hadda lama heli karo (kaydinta lama habeyn).
          </p>
        )}
      </section>

      <label className="flex cursor-pointer items-start gap-4 rounded-lg border p-5 has-checked:border-primary has-checked:bg-secondary">
        <input
          type="checkbox"
          checked={isAnonymous}
          onChange={(e) => setIsAnonymous(e.target.checked)}
          className="mt-1 size-4 accent-primary"
        />
        <span>
          <span className="flex items-center gap-2 font-semibold">
            <EyeOff className="size-4" aria-hidden /> U gudbi si qarsoodi ah
          </span>
          <span className="mt-1 block text-sm text-muted-foreground">
            Magacaaga lama tusi doono dadweynaha, tifaftireyaasha iyo maamulayaasha midkoodna. Adiga keliya ayaa arki kara
            in cabashadu taada tahay, wararka cusubna waad heli doontaa.
          </span>
        </span>
      </label>

      <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
        {progress ? (
          <p className="text-sm text-muted-foreground sm:mr-auto" role="status">
            {progress}
          </p>
        ) : null}
        <Button type="button" variant="outline" size="lg" className="h-12 rounded-xl px-6" onClick={() => router.back()}>
          Jooji
        </Button>
        <Button type="submit" size="lg" className="h-12 rounded-xl px-8" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
          Gudbi cabashada
        </Button>
      </div>
    </form>
  );
}
