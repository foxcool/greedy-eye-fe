"use client";

/**
 * Greedy Eye — living mark (heavy lid).
 *
 * States:
 *  - idle      — static eye
 *  - wander    — pupil looks around (background activity: fetch, sync, recalc)
 *  - attention — pupil dilated + glow (unseen attention items;
 *                NO number — the count lives in the Automation nav item)
 *
 * Color comes from theme CSS variables (--ring = mark accent).
 * Requires keyframes from tokens.css (ge-wander, ge-dilate, ge-glowpulse).
 */

export type EyeState = "idle" | "wander" | "attention";

export function GreedyEyeLogo({
  state = "idle",
  size = 24, // eye width, px; height = size/2
}: {
  state?: EyeState;
  size?: number;
}) {
  const h = size / 2;
  const lidTop = Math.max(2, size * 0.11);
  const rim = Math.max(1.5, size * 0.065);
  const pupil = size * 0.3;

  return (
    <span
      className="ge-eye"
      aria-hidden
      style={{
        display: "inline-flex",
        justifyContent: "center",
        overflow: "hidden",
        boxSizing: "border-box",
        width: size,
        height: h,
        borderRadius: `0 0 ${size}px ${size}px`,
        border: `${rim}px solid var(--ring)`,
        borderTopWidth: lidTop,
        animation:
          state === "attention" ? "ge-glowpulse 2.4s ease-in-out infinite" : undefined,
      }}
    >
      <span
        className="ge-eye-pupil"
        style={{
          width: pupil,
          height: pupil,
          borderRadius: "50%",
          background: "var(--ring)",
          marginTop: -lidTop / 2,
          animation:
            state === "wander"
              ? "ge-wander 7s ease-in-out infinite"
              : state === "attention"
                ? "ge-dilate 2.4s ease-in-out infinite"
                : undefined,
        }}
      />
    </span>
  );
}
