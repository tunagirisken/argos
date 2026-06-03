import type { CSSProperties, ReactNode } from "react";

function Svg({
  size = 20,
  style,
  children,
}: {
  size?: number;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      {children}
    </svg>
  );
}

export function Icon({
  name,
  size = 20,
  style,
}: {
  name: string;
  size?: number;
  style?: CSSProperties;
}) {
  switch (name) {
    case "eye":
      return (
        <Svg size={size} style={style}>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </Svg>
      );
    case "dashboard":
      return (
        <Svg size={size} style={style}>
          <rect x="3" y="3" width="7" height="9" rx="1.5" />
          <rect x="14" y="3" width="7" height="5" rx="1.5" />
          <rect x="14" y="12" width="7" height="9" rx="1.5" />
          <rect x="3" y="16" width="7" height="5" rx="1.5" />
        </Svg>
      );
    case "stocks":
      return (
        <Svg size={size} style={style}>
          <path d="M3 17l5-5 4 3 8-8" />
          <path d="M16 7h4v4" />
        </Svg>
      );
    case "ai":
      return (
        <Svg size={size} style={style}>
          <path d="M12 3a4 4 0 0 1 4 4v1a4 4 0 0 1 0 8v1a4 4 0 0 1-8 0v-1a4 4 0 0 1 0-8V7a4 4 0 0 1 4-4Z" />
          <circle cx="12" cy="11" r="1.4" fill="currentColor" stroke="none" />
        </Svg>
      );
    case "bell":
      return (
        <Svg size={size} style={style}>
          <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
          <path d="M10.5 20a1.7 1.7 0 0 0 3 0" />
        </Svg>
      );
    case "settings":
      return (
        <Svg size={size} style={style}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 6.2 19l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H2a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 3.3 6.2l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 9 3.3V2a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
        </Svg>
      );
    case "send":
      return (
        <Svg size={size} style={style}>
          <path d="M22 2 11 13" />
          <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
        </Svg>
      );
    case "arrow-up":
      return (
        <Svg size={size} style={style}>
          <path d="M12 19V5" />
          <path d="m5 12 7-7 7 7" />
        </Svg>
      );
    case "arrow-down":
      return (
        <Svg size={size} style={style}>
          <path d="M12 5v14" />
          <path d="m5 12 7 7 7-7" />
        </Svg>
      );
    case "plus":
      return (
        <Svg size={size} style={style}>
          <path d="M12 5v14M5 12h14" />
        </Svg>
      );
    case "x":
      return (
        <Svg size={size} style={style}>
          <path d="M18 6 6 18M6 6l12 12" />
        </Svg>
      );
    case "edit":
      return (
        <Svg size={size} style={style}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
        </Svg>
      );
    case "back":
      return (
        <Svg size={size} style={style}>
          <path d="m15 18-6-6 6-6" />
        </Svg>
      );
    case "target":
      return (
        <Svg size={size} style={style}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
        </Svg>
      );
    case "shield":
      return (
        <Svg size={size} style={style}>
          <path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3Z" />
        </Svg>
      );
    case "spark":
      return (
        <Svg size={size} style={style}>
          <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
        </Svg>
      );
    case "sun":
      return (
        <Svg size={size} style={style}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </Svg>
      );
    case "moon":
      return (
        <Svg size={size} style={style}>
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
        </Svg>
      );
    case "external":
      return (
        <Svg size={size} style={style}>
          <path d="M15 3h6v6" />
          <path d="M10 14 21 3" />
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        </Svg>
      );
    case "check":
      return (
        <Svg size={size} style={style}>
          <path d="M20 6 9 17l-5-5" />
        </Svg>
      );
    case "chevron-down":
      return (
        <Svg size={size} style={style}>
          <path d="m6 9 6 6 6-6" />
        </Svg>
      );
    case "trash":
      return (
        <Svg size={size} style={style}>
          <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        </Svg>
      );
    default:
      return null;
  }
}
