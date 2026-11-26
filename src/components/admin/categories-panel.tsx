"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CategoryTile } from "@/components/complaints/category-icon";
import { api, errorMessage } from "@/lib/api-client";
import { CATEGORY_ICONS, type CategoryIcon } from "@/lib/constants";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  order: number;
  active: boolean;
};

export function CategoriesPanel({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [icon, setIcon] = useState<CategoryIcon>("circle-help");
  const [color, setColor] = useState("#2f6fed");

  const run = (fn: () => Promise<void>) =>
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch (err) {
        toast.error(errorMessage(err));
      }
    });

  return (
    <div className="space-y-6">
      <form
        className="grid gap-4 rounded-lg border bg-card p-5 sm:grid-cols-[1fr_1fr_160px_100px_auto] sm:items-end sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            await api("/api/admin/categories", {
              method: "POST",
              body: { name, slug, icon, color, order: categories.length + 1 },
            });
            toast.success("Qayb cusub ayaa la sameeyay.");
            setName("");
            setSlug("");
          });
        }}
      >
        <div>
          <Label htmlFor="cat-name" className="mb-2">
            Magaca
          </Label>
          <Input id="cat-name" required value={name} onChange={(e) => setName(e.target.value)} className="h-10 rounded-xl" />
        </div>
        <div>
          <Label htmlFor="cat-slug" className="mb-2">
            Slug
          </Label>
          <Input
            id="cat-slug"
            required
            pattern="[a-z0-9-]+"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            className="h-10 rounded-xl"
          />
        </div>
        <div>
          <Label htmlFor="cat-icon" className="mb-2">
            Astaanta
          </Label>
          <select
            id="cat-icon"
            value={icon}
            onChange={(e) => setIcon(e.target.value as CategoryIcon)}
            className="h-10 w-full rounded-xl border bg-background px-2 text-sm"
          >
            {CATEGORY_ICONS.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="cat-color" className="mb-2">
            Midabka
          </Label>
          <input
            id="cat-color"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-10 w-full rounded-xl border bg-background"
          />
        </div>
        <Button type="submit" className="h-10 rounded-xl" disabled={pending}>
          Ku dar
        </Button>
      </form>

      <ul className="grid gap-3 sm:grid-cols-2">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center gap-4 rounded-lg border bg-card p-4">
            <CategoryTile icon={c.icon} color={c.color} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{c.name}</p>
              <p className="font-mono text-xs text-muted-foreground">{c.slug}</p>
            </div>
            <Button
              size="sm"
              variant={c.active ? "outline" : "default"}
              disabled={pending}
              onClick={() =>
                run(async () => {
                  await api(`/api/admin/categories/${c.id}`, { method: "PATCH", body: { active: !c.active } });
                  toast.success(c.active ? "Qaybta waa la damiyay." : "Qaybta waa la shiday.");
                })
              }
            >
              {c.active ? "Dami" : "Shid"}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
