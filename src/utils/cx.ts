import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes safely. Last-write-wins on conflicting utilities.
 */
export const cx = twMerge;

/**
 * Identity helper that gives the Tailwind IntelliSense extension a hook for
 * sorting classes inside style objects (the extension doesn't sort inside
 * plain object literals otherwise).
 */
export function sortCx<
  T extends Record<
    string,
    string | number | Record<string, string | number | Record<string, string | number>>
  >,
>(classes: T): T {
  return classes;
}
