import type { CategoryIcon } from "@/lib/constants";

export const REGIONS: { name: string; cities: { name: string; districts?: string[] }[] }[] = [
  { name: "Awdal", cities: [{ name: "Boorama" }, { name: "Saylac" }] },
  { name: "Woqooyi Galbeed", cities: [{ name: "Hargeysa" }, { name: "Berbera" }, { name: "Gabiley" }] },
  { name: "Togdheer", cities: [{ name: "Burco" }, { name: "Oodweyne" }] },
  { name: "Sanaag", cities: [{ name: "Ceerigaabo" }, { name: "Laasqoray" }] },
  { name: "Sool", cities: [{ name: "Laascaanood" }] },
  { name: "Bari", cities: [{ name: "Boosaaso" }, { name: "Qardho" }, { name: "Iskushuban" }] },
  { name: "Nugaal", cities: [{ name: "Garoowe" }, { name: "Eyl" }] },
  { name: "Mudug", cities: [{ name: "Gaalkacyo" }, { name: "Hobyo" }] },
  { name: "Galgaduud", cities: [{ name: "Dhuusamareeb" }, { name: "Cadaado" }, { name: "Ceelbuur" }] },
  { name: "Hiiraan", cities: [{ name: "Beledweyne" }, { name: "Buulobarde" }] },
  { name: "Shabeellaha Dhexe", cities: [{ name: "Jowhar" }, { name: "Balcad" }] },
  {
    name: "Banaadir",
    cities: [
      {
        name: "Muqdisho",
        districts: [
          "Abdiaziz",
          "Boondheere",
          "Dayniile",
          "Dharkenley",
          "Garasbaley",
          "Gubadley",
          "Hamar Jajab",
          "Hamar Weyne",
          "Hawl Wadaag",
          "Heliwaa",
          "Hodan",
          "Kaaraan",
          "Kaxda",
          "Shangaani",
          "Shibis",
          "Waaberi",
          "Wadajir",
          "Wardhiigleey",
          "Yaaqshiid",
        ],
      },
    ],
  },
  { name: "Shabeellaha Hoose", cities: [{ name: "Marka" }, { name: "Afgooye" }, { name: "Baraawe" }] },
  { name: "Bay", cities: [{ name: "Baydhabo" }, { name: "Buurhakaba" }] },
  { name: "Bakool", cities: [{ name: "Xuddur" }, { name: "Waajid" }] },
  { name: "Gedo", cities: [{ name: "Garbahaarrey" }, { name: "Luuq" }, { name: "Doolow" }, { name: "Beled Xaawo" }] },
  { name: "Jubbada Dhexe", cities: [{ name: "Bu'aale" }, { name: "Saakow" }, { name: "Jilib" }] },
  { name: "Jubbada Hoose", cities: [{ name: "Kismaayo" }, { name: "Afmadow" }] },
];

export const CATEGORIES: { slug: string; name: string; description: string; icon: CategoryIcon; color: string }[] = [
  { slug: "biyaha", name: "Biyaha", description: "Biyo la'aan, biyo wasakhaysan, tuubbooyin jaban.", icon: "droplets", color: "#0ea5e9" },
  { slug: "korontada", name: "Korontada", description: "Koronto go'go'da, qiimo sare, fiilooyin khatar ah.", icon: "zap", color: "#f59e0b" },
  { slug: "waddooyinka", name: "Waddooyinka & Kaabayaasha", description: "Waddooyin burbursan, buundooyin, daad-reebyo.", icon: "construction", color: "#64748b" },
  { slug: "nadaafadda", name: "Nadaafadda & Qashinka", description: "Qashin aan la qaadin, bullaacado.", icon: "trash", color: "#16a34a" },
  { slug: "caafimaadka", name: "Caafimaadka", description: "Isbitaallo, daawo la'aan, adeeg caafimaad.", icon: "stethoscope", color: "#e11d48" },
  { slug: "waxbarashada", name: "Waxbarashada", description: "Dugsiyo, macallimiin, qalab waxbarasho.", icon: "graduation-cap", color: "#7c3aed" },
  { slug: "amniga", name: "Amniga", description: "Arrimaha nabadgelyada bulshada.", icon: "shield", color: "#1e3a8a" },
  { slug: "musuqmaasuqa", name: "Musuqmaasuq", description: "Laaluush, ku takri-fal awood.", icon: "scale", color: "#b45309" },
  { slug: "adeegyada-dowladda", name: "Adeegyada Dowladda", description: "Dukumentiyo, shatiyo, xafiisyada dowladda.", icon: "landmark", color: "#2f6fed" },
  { slug: "deegaanka", name: "Deegaanka", description: "Dhir-goyn, wasakhow, daadad.", icon: "trees", color: "#15803d" },
  { slug: "gaadiidka", name: "Gaadiidka Dadweynaha", description: "Bas, bajaaj, kaalmaha gaadiidka.", icon: "bus", color: "#0891b2" },
  { slug: "kale", name: "Arrimo kale", description: "Wax aan qaybaha kale ku jirin.", icon: "circle-help", color: "#6b7280" },
];

export function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
