import { CategoryIcon } from "./CategoryIcon";

export function ProductImage({
  imageUrl,
  icon,
  name,
  size = "md",
}: {
  imageUrl: string | null;
  icon: string;
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const iconSize = size === "lg" ? "h-28 w-28" : size === "sm" ? "h-8 w-8" : "h-14 w-14";
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={imageUrl} alt={name} className="h-full w-full object-contain transition duration-300 group-hover:scale-105" loading="lazy" />
    );
  }
  return (
    <div
      className="flex h-full w-full items-center justify-center rounded bg-gradient-to-br from-brand-50 to-accent-50 text-brand-600"
      role="img"
      aria-label={name}
    >
      <CategoryIcon name={icon} className={iconSize} />
    </div>
  );
}
