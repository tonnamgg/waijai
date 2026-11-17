import { storage } from "@/lib/storage/local";

type Ctx = { params: Promise<{ name: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { name } = await params;
  const file = await storage.read(name);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
