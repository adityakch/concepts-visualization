const PATHS = {
  laptop: (
    <>
      <rect x="4" y="5" width="16" height="11" rx="1.8" />
      <path d="M2.5 19h19" strokeLinecap="round" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M3.6 12h16.8M12 3.6c2.2 2.4 3.3 5.3 3.3 8.4s-1.1 6-3.3 8.4c-2.2-2.4-3.3-5.3-3.3-8.4S9.8 6 12 3.6z" />
    </>
  ),
  shield: (
    <>
      <path
        d="M12 3l7.5 3.2v5.5c0 4.6-3.1 7.8-7.5 9.3-4.4-1.5-7.5-4.7-7.5-9.3V6.2L12 3z"
        strokeLinejoin="round"
      />
      <path d="M12 9v3.5" strokeLinecap="round" />
      <circle cx="12" cy="15.4" r=".9" fill="currentColor" stroke="none" />
    </>
  ),
  api: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="2" />
      <path d="M3 9h18" />
      <path
        d="M8.5 13l-2 2.2 2 2.2M15.5 13l2 2.2-2 2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  id: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="11" r="2.2" />
      <path d="M5.6 16.4c.7-1.5 2-2.3 3.4-2.3s2.7.8 3.4 2.3" strokeLinecap="round" />
      <path d="M15 10h4M15 13.5h4" strokeLinecap="round" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M4 16v2.5A2.5 2.5 0 006.5 21h11a2.5 2.5 0 002.5-2.5V16"
        strokeLinecap="round"
      />
    </>
  ),
  scan: (
    <>
      <circle cx="12" cy="12" r="5.2" />
      <path
        d="M12 6.8V3.5M12 17.2v3.3M17.2 12h3.3M3.5 12h3.3M15.7 8.3L18 6M6 18l2.3-2.3M15.7 15.7L18 18M6 6l2.3 2.3"
        strokeLinecap="round"
      />
    </>
  ),
  tag: (
    <>
      <path d="M11 3.5h6.5a3 3 0 013 3V13l-9.5 9.5L2.5 13 11 3.5z" strokeLinejoin="round" />
      <circle cx="16" cy="8" r="1.3" fill="currentColor" stroke="none" />
    </>
  ),
  log: (
    <>
      <path
        d="M5 4.5A1.5 1.5 0 016.5 3H18a1.5 1.5 0 011.5 1.5v15L15 17l-4.5 2.5L6 17l-1 2.5V4.5z"
        strokeLinejoin="round"
      />
      <path d="M9 8h6M9 11.5h6" strokeLinecap="round" />
    </>
  ),
  chunk: (
    <>
      <rect x="3" y="3.5" width="7.5" height="7.5" rx="1.4" />
      <rect x="13.5" y="3.5" width="7.5" height="7.5" rx="1.4" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.4" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.4" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="12" r="4.2" />
      <path d="M12 12h9M18 12v3.5M15.5 12v2.5" strokeLinecap="round" />
    </>
  ),
  disk: (
    <>
      <ellipse cx="12" cy="6.5" rx="8" ry="3.2" />
      <path d="M4 6.5v11c0 1.8 3.6 3.2 8 3.2s8-1.4 8-3.2v-11" />
      <path d="M4 12c0 1.8 3.6 3.2 8 3.2s8-1.4 8-3.2" />
    </>
  ),
  db: (
    <>
      <rect x="3.5" y="4" width="17" height="6" rx="1.6" />
      <rect x="3.5" y="14" width="17" height="6" rx="1.6" />
      <circle cx="7.5" cy="7" r=".8" fill="currentColor" stroke="none" />
      <circle cx="7.5" cy="17" r=".8" fill="currentColor" stroke="none" />
    </>
  ),
};

export function Icon({ name, size = 22 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      {PATHS[name] ?? null}
    </svg>
  );
}
