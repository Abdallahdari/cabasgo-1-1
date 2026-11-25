const MONTHS = [
  "Janaayo",
  "Febraayo",
  "Maarso",
  "Abriil",
  "Maajo",
  "Juun",
  "Luuliyo",
  "Agoosto",
  "Sebtembar",
  "Oktoobar",
  "Nofembar",
  "Desembar",
];

export function formatDate(iso: string | Date) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Somali relative time, e.g. "25 daqiiqo kahor". */
export function timeAgo(iso: string | Date, now = Date.now()) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const s = Math.max(0, Math.round((now - d.getTime()) / 1000));
  if (s < 60) return "hadda";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} daqiiqo kahor`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} saac kahor`;
  const days = Math.round(h / 24);
  if (days < 7) return days === 1 ? "shalay" : `${days} maalmood kahor`;
  if (days < 30) return `${Math.round(days / 7)} toddobaad kahor`;
  return formatDate(d);
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function compactNumber(n: number) {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, "")}k`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}
