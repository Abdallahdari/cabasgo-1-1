import "server-only";
import { getEnv } from "@/server/env";
import type { EmailMessage } from "@/server/email";

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function layout(heading: string, paragraphs: string[], cta?: { label: string; url: string }) {
  const body = paragraphs.map((p) => `<p style="margin:0 0 14px;line-height:1.6">${escapeHtml(p)}</p>`).join("");
  const button = cta
    ? `<p style="margin:24px 0"><a href="${escapeHtml(cta.url)}" style="background:#2F6FED;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">${escapeHtml(cta.label)}</a></p>
       <p style="font-size:12px;color:#6b7280">Haddii badhanku shaqayn waayo, nuqul ka qaado xiriirkan: ${escapeHtml(cta.url)}</p>`
    : "";
  return `<!doctype html><html lang="so"><body style="margin:0;background:#f3f5f9;font-family:Arial,sans-serif;color:#111827">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px">
    <div style="background:#fff;border-radius:16px;padding:28px">
      <div style="font-weight:700;font-size:18px;color:#2F6FED;margin-bottom:18px">Codka Bulshada</div>
      <h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(heading)}</h1>
      ${body}${button}
    </div>
    <p style="font-size:12px;color:#6b7280;text-align:center;margin-top:16px">Codka Bulshada — madal ay muwaadiniintu kaga warbixiyaan dhibaatooyinka adeegyada dadweynaha.</p>
  </div></body></html>`;
}

function text(heading: string, paragraphs: string[], cta?: { label: string; url: string }) {
  return [heading, "", ...paragraphs, ...(cta ? ["", `${cta.label}: ${cta.url}`] : [])].join("\n");
}

function build(to: string, subject: string, heading: string, paragraphs: string[], cta?: { label: string; url: string }): EmailMessage {
  return { to, subject, html: layout(heading, paragraphs, cta), text: text(heading, paragraphs, cta) };
}

const url = (path: string) => new URL(path, getEnv().APP_URL).toString();

export const emailTemplates = {
  verifyEmail: (to: string, name: string, token: string) =>
    build(
      to,
      "Xaqiiji email-kaaga — Codka Bulshada",
      `Ku soo dhawoow, ${name}!`,
      ["Fadlan xaqiiji cinwaanka email-kaaga si aad u gudbin karto cabashooyin iyo faallooyin.", "Xiriirkani wuxuu dhacayaa 24 saacadood kadib."],
      { label: "Xaqiiji email-ka", url: url(`/verify-email?token=${token}`) },
    ),
  passwordReset: (to: string, name: string, token: string) =>
    build(
      to,
      "Dib u dejinta furaha sirta ah — Codka Bulshada",
      `Salaan ${name},`,
      [
        "Waxaa la codsaday in dib loo dejiyo furaha sirta ah ee akoonkaaga.",
        "Xiriirkani wuxuu dhacayaa 1 saac kadib, hal mar oo keliya ayaana la isticmaali karaa. Haddii aadan adigu codsan, iska indho tir fariintan.",
      ],
      { label: "Deji furo cusub", url: url(`/reset-password?token=${token}`) },
    ),
  editorInvitation: (to: string, inviterName: string, token: string, expiresAt: Date) =>
    build(
      to,
      "Waxaa lagugu casuumay inaad noqoto Tifaftire — Codka Bulshada",
      "Casuumad Tifaftire",
      [
        `${inviterName} ayaa kuu casuumay inaad ku biirto Codka Bulshada adigoo ah Tifaftire (Editor).`,
        "Tifaftireyaashu waxay dib u eegaan cabashooyinka, waxay cusbooneysiiyaan xaaladdooda, waxayna ka jawaabaan bulshada.",
        `Casuumaddani waxay dhacaysaa ${expiresAt.toISOString().slice(0, 10)}, hal mar oo keliya ayaana la isticmaali karaa.`,
      ],
      { label: "Aqbal casuumadda", url: url(`/invitations/accept?token=${token}`) },
    ),
  statusChanged: (to: string, name: string, complaintTitle: string, statusLabel: string, complaintId: string, note: string) =>
    build(
      to,
      `Xaaladda cabashadaada waa la beddelay: ${statusLabel}`,
      `Salaan ${name},`,
      [`Cabashada "${complaintTitle}" xaaladdeeda hadda waa: ${statusLabel}.`, ...(note ? [`Faahfaahin: ${note}`] : [])],
      { label: "Eeg cabashada", url: url(`/complaints/${complaintId}`) },
    ),
  moderationResult: (to: string, name: string, complaintTitle: string, approved: boolean, note: string, complaintId: string) =>
    build(
      to,
      approved ? "Cabashadaada waa la daabacay" : "Cabashadaada lama aqbalin",
      `Salaan ${name},`,
      approved
        ? [`Cabashada "${complaintTitle}" waa la ansixiyay, hadda bulshada ayaa arki karta.`]
        : [`Cabashada "${complaintTitle}" lama daabacin.`, ...(note ? [`Sababta: ${note}`] : [])],
      { label: "Eeg cabashada", url: url(`/complaints/${complaintId}`) },
    ),
};
