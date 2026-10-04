/**
 * POST /api/upload handler.
 * Temporary lockdown: existing admin session only (cookie adminSession or x-admin-token).
 * MIME and size checks are unchanged.
 */
import fs from "fs";
import path from "path";
import type { Request, Response } from "express";
import { validateAdminSession } from "./admin-sessions.js";

const ALLOWED_MIME_TYPES: Record<string, string> = {
  jpeg: "jpg",
  jpg: "jpg",
  png: "png",
  webp: "webp",
  gif: "gif",
};
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB decoded

function readAdminToken(req: Request): string | undefined {
  const cookie = req.cookies?.adminSession;
  const header = req.headers["x-admin-token"];
  const fromHeader = Array.isArray(header) ? header[0] : header;
  if (typeof cookie === "string" && cookie.length > 0) return cookie;
  if (typeof fromHeader === "string" && fromHeader.length > 0) return fromHeader;
  return undefined;
}

export async function handleImageUpload(
  req: Request,
  res: Response,
  uploadsDir: string
): Promise<void> {
  const token = readAdminToken(req);
  if (!token) {
    res.status(401).json({ error: "UNAUTHORIZED" });
    return;
  }

  let sessionValid = false;
  try {
    sessionValid = await validateAdminSession(token);
  } catch {
    res.status(401).json({ error: "UNAUTHORIZED" });
    return;
  }
  if (!sessionValid) {
    res.status(401).json({ error: "UNAUTHORIZED" });
    return;
  }

  const { data, filename } = req.body as { data?: string; filename?: string };
  if (!data || !data.startsWith("data:")) {
    res.status(400).json({ error: "Invalid data" });
    return;
  }
  const matches = data.match(/^data:([^;]+);base64,(.+)$/s);
  if (!matches) {
    res.status(400).json({ error: "Invalid base64 data URL" });
    return;
  }
  const mimeType = matches[1].toLowerCase(); // e.g. "image/jpeg"
  const base64Data = matches[2];

  const subtype = mimeType.split("/")[1]; // "jpeg", "png", etc.
  const mappedExt = subtype ? ALLOWED_MIME_TYPES[subtype] : undefined;
  if (!mimeType.startsWith("image/") || !mappedExt) {
    res.status(415).json({
      error: "نوع الملف غير مدعوم. الأنواع المسموح بها: JPEG، PNG، WebP، GIF",
    });
    return;
  }

  const buffer = Buffer.from(base64Data, "base64");
  if (buffer.length > MAX_UPLOAD_BYTES) {
    res
      .status(413)
      .json({ error: "حجم الصورة يتجاوز الحد المسموح (5 ميغابايت)" });
    return;
  }

  const rawName = (filename ?? `upload-${Date.now()}`).replace(
    /[^a-z0-9_-]/gi,
    "_"
  );
  const safeName = rawName.replace(/^_+/, "") || `upload-${Date.now()}`;
  const finalName = `${safeName}.${mappedExt}`;

  fs.writeFileSync(path.join(uploadsDir, finalName), buffer);
  res.json({ url: `/uploads/${finalName}` });
}
