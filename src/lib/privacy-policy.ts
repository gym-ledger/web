/**
 * Must equal PRIVACY_POLICY_VERSION in workout-gym-api/src/config/constants.ts.
 * Bump both together whenever /privacy changes; every user is asked to accept again.
 */
export const PRIVACY_POLICY_VERSION = "2026-10-21";

/** Shown as the policy's "Last updated" line. */
export const PRIVACY_POLICY_UPDATED = "21 October 2026";

/**
 * Who runs this instance. Self-hosters set these at build time so the policy
 * names them, not the project's author.
 */
export const OPERATOR_NAME = process.env.NEXT_PUBLIC_OPERATOR_NAME || "the operator of this instance";
export const PRIVACY_CONTACT_EMAIL = process.env.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL || null;

/** Anchor of the AI section, linked from the AI consent sheet. */
export const PRIVACY_AI_SECTION_ID = "ai-check-ins";
