// Shared brand marks — the leaf icon and the herringbone tapping-cut motif —
// reused across the landing and the public-facing auth pages.
import { BRAND } from "../lib/brandTokens";

export const Ic = ({ children, size = 22 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

export const IconLeaf = (p) => (
  <Ic {...p}>
    <path d="M11 20A7 7 0 0 1 4 13c0-5 5-9 15-9 0 8-4 13-8 13Z" />
    <path d="M6 21c0-4 3-8 8-10" />
  </Ic>
);

// The tapping-cut motif. Horizontal for stacked-section seams, vertical for
// the split-pane seam on auth pages.
export function Herringbone({ orientation = "horizontal", stroke = BRAND.amber, size = 14 }) {
  const id = `herr-${orientation}-${stroke.replace("#", "")}`;
  const isV = orientation === "vertical";
  return (
    <div aria-hidden="true" className="relative h-full w-full" style={{ [isV ? "width" : "height"]: size }}>
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
        <defs>
          <pattern
            id={id}
            width={isV ? size * 2 : 26}
            height={isV ? 26 : size * 2}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={
                isV
                  ? `M${size * 0.15} 0 L${size * 1.85} 13 L${size * 0.15} 26`
                  : "M0 " + size + " L13 " + size * 0.15 + " L26 " + size
              }
              fill="none"
              stroke={stroke}
              strokeWidth="1.3"
              opacity="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} />
      </svg>
    </div>
  );
}
