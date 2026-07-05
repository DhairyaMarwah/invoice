import type { SVGProps } from 'react';

const base = (props: SVGProps<SVGSVGElement>) => ({
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  ...props,
});

export const IconOverview = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>
);
export const IconClients = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1" /><circle cx="9.5" cy="8" r="3.2" /><path d="M17 4a3.2 3.2 0 0 1 0 6.2M21 20v-1a4 4 0 0 0-3-3.8" /></svg>
);
export const IconContracts = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M6 2.5h8L19 7v13.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-17a1 1 0 0 1 1-1z" /><path d="M13.5 2.5V7H19" /><path d="M8.5 13h7M8.5 16.5h7M8.5 9.5h2" /></svg>
);
export const IconInvoices = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M6 2.5h12a1 1 0 0 1 1 1v18l-3-1.6-2 1.6-2-1.6-2 1.6-2-1.6L5 21.5v-18a1 1 0 0 1 1-1z" /><path d="M9 8h6M9 11.5h6M9 15h4" /></svg>
);
export const IconReports = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M3 3v18h18" /><rect x="7" y="12" width="3" height="6" rx="0.5" /><rect x="12.5" y="8" width="3" height="10" rx="0.5" /><rect x="18" y="5" width="3" height="13" rx="0.5" /></svg>
);
export const IconSettings = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H1a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 2.6 7a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H7a1.6 1.6 0 0 0 1-1.5V1a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V7a1.6 1.6 0 0 0 1.5 1H23a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" /></svg>
);
export const IconPlus = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>
);
export const IconSearch = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
);
export const IconChevronRight = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M9 6l6 6-6 6" /></svg>
);
export const IconChevronLeft = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M15 6l-6 6 6 6" /></svg>
);
export const IconArrowRight = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
export const IconSun = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
);
export const IconMoon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
);
export const IconDownload = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg>
);
export const IconFile = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M6 2.5h8L19 7v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1z" /><path d="M13.5 2.5V7H19" /></svg>
);
export const IconCheck = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M5 12.5l4.5 4.5L19 7" /></svg>
);
export const IconTrash = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M10 11v6M14 11v6" /></svg>
);
export const IconEdit = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
);
export const IconSparkle = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" /><path d="M19 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z" /></svg>
);
export const IconExternal = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>
);
export const IconClock = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></svg>
);
export const IconWarn = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 3l9.5 16.5H2.5L12 3z" /><path d="M12 10v4M12 17.5v.01" /></svg>
);
export const IconArrowUp = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 19V5M5 12l7-7 7 7" /></svg>
);
export const IconArrowDown = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 5v14M19 12l-7 7-7-7" /></svg>
);
export const IconBox = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" /><path d="M3 8l9 5 9-5M12 13v8" /></svg>
);
export const IconPipeline = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="3" y="4" width="5" height="16" rx="1" /><rect x="10" y="4" width="5" height="11" rx="1" /><rect x="17" y="4" width="4" height="7" rx="1" /></svg>
);
export const IconActivity = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M3 12h4l2 6 4-14 2 8h6" /></svg>
);
export const IconApproval = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M9 11l3 3 8-8" /><path d="M21 12v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h11" /></svg>
);
export const IconUser = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="8" r="4" /><path d="M4 20a8 8 0 0 1 16 0" /></svg>
);
export const IconLinkedIn = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 10v7M7 7v.01M11 17v-4a2 2 0 0 1 4 0v4M11 10v7" /></svg>
);
export const IconMail = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
);
export const IconPhone = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></svg>
);
export const IconPin = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
);
export const IconBuilding = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h.01M15 15h.01M10 21v-3h4v3" /></svg>
);
export const IconClose = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M6 6l12 12M18 6L6 18" /></svg>
);
