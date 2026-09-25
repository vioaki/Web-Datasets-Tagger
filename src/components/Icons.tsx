import type { SVGProps } from 'react'

/**
 * Line icons on a 16px grid, 1.5px stroke — matched weight so they sit
 * evenly next to 13px text without visual jumping between components.
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Base({ size = 16, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const IconUpload = (p: IconProps) => (
  <Base {...p}>
    <path d="M8 11V2.5" />
    <path d="m4.75 5.75 3.25-3.25 3.25 3.25" />
    <path d="M2.5 10.5v2A1 1 0 0 0 3.5 13.5h9a1 1 0 0 0 1-1v-2" />
  </Base>
)

export const IconFolder = (p: IconProps) => (
  <Base {...p}>
    <path d="M2 4.5A1.5 1.5 0 0 1 3.5 3h2.19a1.5 1.5 0 0 1 1.06.44l.75.75a1.5 1.5 0 0 0 1.06.44h4.94A1.5 1.5 0 0 1 15 6.13v5.37A1.5 1.5 0 0 1 13.5 13h-10A1.5 1.5 0 0 1 2 11.5z" />
  </Base>
)

export const IconCopy = (p: IconProps) => (
  <Base {...p}>
    <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
    <path d="M10.5 3.5v-1a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h1" />
  </Base>
)

export const IconCheck = (p: IconProps) => (
  <Base {...p} strokeWidth={2}>
    <path d="m3.5 8.5 3 3 6-7" />
  </Base>
)

export const IconX = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 4l8 8M12 4l-8 8" />
  </Base>
)

export const IconPlus = (p: IconProps) => (
  <Base {...p}>
    <path d="M8 3.5v9M3.5 8h9" />
  </Base>
)

export const IconSettings = (p: IconProps) => (
  <Base {...p} viewBox="0 0 24 24" strokeWidth={1.7}>
    <path d="M9.6 3h4.8l.6 2.5 1.5.9 2.5-.7 2.4 4.2-1.9 1.8v1.7l1.9 1.8-2.4 4.2-2.5-.7-1.5.9-.6 2.4H9.6L9 19.6l-1.5-.9-2.5.7-2.4-4.2 1.9-1.8v-1.7L2.6 9.9 5 5.7l2.5.7L9 5.5z" />
    <circle cx="12" cy="12.5" r="3" />
  </Base>
)

export const IconImage = (p: IconProps) => (
  <Base {...p}>
    <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
    <circle cx="5.5" cy="6.25" r="1.25" />
    <path d="m1.5 11.5 3.4-3.4a1.5 1.5 0 0 1 2.12 0L11 12M10.5 9.5l1.15-1.15a1.5 1.5 0 0 1 2.85.9v.25" />
  </Base>
)

export const IconPlay = (p: IconProps) => (
  <Base {...p}>
    <path d="M4.5 3.2v9.6a.6.6 0 0 0 .92.5l7.4-4.8a.6.6 0 0 0 0-1l-7.4-4.8a.6.6 0 0 0-.92.5z" />
  </Base>
)

export const IconStop = (p: IconProps) => (
  <Base {...p}>
    <rect x="4" y="4" width="8" height="8" rx="1.25" />
  </Base>
)

export const IconDownload = (p: IconProps) => (
  <Base {...p}>
    <path d="M8 2.5V11" />
    <path d="m4.75 7.75 3.25 3.25 3.25-3.25" />
    <path d="M2.5 12.5h11" />
  </Base>
)

export const IconTrash = (p: IconProps) => (
  <Base {...p}>
    <path d="M2.5 4.5h11" />
    <path d="M6.5 4.5V3a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v1.5" />
    <path d="M4 4.5 4.6 13a1 1 0 0 0 1 .93h4.8a1 1 0 0 0 1-.93L12 4.5" />
  </Base>
)

export const IconSparkle = (p: IconProps) => (
  <Base {...p}>
    <path d="M8 1.5c.4 2.6 1.4 3.6 4 4-2.6.4-3.6 1.4-4 4-.4-2.6-1.4-3.6-4-4 2.6-.4 3.6-1.4 4-4z" />
    <path d="M12.5 10c.2 1.2.7 1.7 1.9 1.9-1.2.2-1.7.7-1.9 1.9-.2-1.2-.7-1.7-1.9-1.9 1.2-.2 1.7-.7 1.9-1.9z" />
  </Base>
)

export const IconChip = (p: IconProps) => (
  <Base {...p}>
    <rect x="4.5" y="4.5" width="7" height="7" rx="1.25" />
    <path d="M6.5 1.5v3M9.5 1.5v3M6.5 11.5v3M9.5 11.5v3M1.5 6.5h3M1.5 9.5h3M11.5 6.5h3M11.5 9.5h3" />
  </Base>
)

export const IconHelp = (p: IconProps) => (
  <Base {...p}>
    <circle cx="8" cy="8" r="6.25" />
    <path d="M6.4 6.2a1.7 1.7 0 0 1 3.3.5c0 1.1-1.7 1.4-1.7 2.4" />
    <path d="M8 11.6v.01" strokeWidth={2} />
  </Base>
)

export const IconChevron = (p: IconProps) => (
  <Base {...p}>
    <path d="m6 4 4 4-4 4" />
  </Base>
)

export const IconBack = (p: IconProps) => (
  <Base {...p}><path d="m7 3-5 5 5 5M2 8h12" /></Base>
)

export const IconInfo = (p: IconProps) => (
  <Base {...p}><circle cx="8" cy="8" r="6.25" /><path d="M8 7v4M8 4.7v.1" /></Base>
)

/** GitHub's 16px mark, kept as a filled silhouette. */
export const IconGithub = (p: IconProps) => (
  <Base {...p} fill="currentColor" stroke="none">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.65 7.65 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
  </Base>
)
