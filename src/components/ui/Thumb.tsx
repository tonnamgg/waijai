import clsx from "clsx";
import { Image as ImageIcon, Package } from "lucide-react";

export function Thumb({
  src,
  size = 56,
  icon = "package",
  className,
  alt = "",
}: {
  src?: string | null;
  size?: number;
  icon?: "package" | "image";
  className?: string;
  alt?: string;
}) {
  const Icon = icon === "package" ? Package : ImageIcon;
  return (
    <div
      className={clsx("relative flex shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-soft", className)}
      style={{ width: size, height: size }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <Icon className="text-muted" style={{ width: size * 0.4, height: size * 0.4 }} strokeWidth={1.6} />
      )}
    </div>
  );
}
