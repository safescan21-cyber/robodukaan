const PATHS: Record<string, string> = {
  pcb: "M4 4h16v16H4zM8 8h3v3H8zM14 13h2v3h-2zM11 9.5h5V13M9.5 11v4.5H14M7 4V2M12 4V2M17 4V2M7 22v-2M12 22v-2M17 22v-2",
  power: "M13 2 5 13h6l-1 9 8-11h-6z",
  scale: "M12 3v3M5 6h14M5 6l-3 7a3 3 0 0 0 6 0zM19 6l-3 7a3 3 0 0 0 6 0zM12 6v14M8 20h8",
  chip: "M9 3v2M15 3v2M9 19v2M15 19v2M3 9h2M3 15h2M19 9h2M19 15h2M7 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm3 5h4v4h-4z",
  sensor: "M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8",
  motor: "M12 12m-7 0a7 7 0 1 0 14 0a7 7 0 1 0-14 0M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M12 5v3M12 16v3M5 12h3M16 12h3",
  drone: "M5 5m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M19 5m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M5 19m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M19 19m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M7 7l3 3M17 7l-3 3M7 17l3-3M17 17l-3-3M10 10h4v4h-4z",
  battery: "M4 7h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1ZM21 10v4M11 9l-2 3h4l-2 3",
  display: "M3 5h18v11H3zM8 20h8M12 16v4M7 9h5M7 12h8",
  wifi: "M5 12.5a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0M2 9a15 15 0 0 1 20 0M12 19h.01",
  component: "M2 12h4M18 12h4M6 9h12v6H6zM9 9v6M12 9v6M15 9v6",
  wrench: "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z",
  kit: "M3 8h18v12H3zM8 8V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v3M3 13h18M11 12h2v2h-2z",
};

export function CategoryIcon({
  name,
  className = "h-6 w-6",
}: {
  name: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={PATHS[name] ?? PATHS.chip} />
    </svg>
  );
}
