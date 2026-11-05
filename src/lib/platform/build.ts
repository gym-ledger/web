/**
 * True in the bundle built with `npm run build:native` (the static export that
 * ships inside the Android/iOS app), false in the web build.
 *
 * It is inlined at build time, so code behind `if (isNativeBuild)` is dropped
 * from the web bundle, and the other way round.
 */
export const isNativeBuild = process.env.NEXT_PUBLIC_BUILD_TARGET === "native";
