"use client";

export async function api<T = { ok: boolean }>(path: string, body?: unknown, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    ...init,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "เกิดข้อผิดพลาด");
  return data as T;
}

export type Uploaded = { url: string; mime: string; id?: string; kind?: string };

export async function uploadFile(file: File, opts: { orderId?: string; kind?: string } = {}): Promise<Uploaded> {
  const fd = new FormData();
  fd.append("file", file);
  if (opts.orderId) fd.append("orderId", opts.orderId);
  if (opts.kind) fd.append("kind", opts.kind);
  const res = await fetch("/api/uploads", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "อัปโหลดไม่สำเร็จ");
  return data as Uploaded;
}
