/**
 * Version of the terms of use (/terms) and privacy policy (/privacy), which
 * users accept together. Must equal PRIVACY_POLICY_VERSION in
 * gym-ledger/api/src/config/constants.ts. Bump both together whenever either
 * page changes; every user is asked to accept again.
 */
export const PRIVACY_POLICY_VERSION = "2026-10-23.1";

/** Shown as the "Last updated" line of both pages. */
export const PRIVACY_POLICY_UPDATED = "23 October 2026";

/**
 * Who runs this instance. Self-hosters set these at build time so the policy
 * names them, not the project's author.
 */
export const OPERATOR_NAME = process.env.NEXT_PUBLIC_OPERATOR_NAME || "the operator of this instance";
export const PRIVACY_CONTACT_EMAIL = process.env.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL || null;

/** Whose laws govern the terms of use; self-hosters elsewhere set their own at build time. */
export const TERMS_GOVERNING_LAW = process.env.NEXT_PUBLIC_TERMS_GOVERNING_LAW || "India";

/** Anchor of the AI section, linked from the AI consent sheet. */
export const PRIVACY_AI_SECTION_ID = "ai-check-ins";

/** Anchor of the account-deletion section, linked from the delete-account sheet. */
export const PRIVACY_DELETION_SECTION_ID = "deleting-your-account";

/** Mirrors the API (users.account.repository.ts). */
export const ACCOUNT_DELETION_GRACE_DAYS = 30;
export const DATA_EXPORT_TTL_DAYS = 7;

/**
 * The longest a database backup is kept, so the longest deleted data can
 * survive in one. Backups must be set up to expire within this.
 */
export const BACKUP_RETENTION_DAYS = 30;

/**
 * How long records of failed and slow requests are kept. Mirrors the API's
 * REQUEST_LOG_RETENTION_DAYS default (api_request_issues); self-hosters who
 * change one set NEXT_PUBLIC_REQUEST_LOG_RETENTION_DAYS to match.
 */
export const REQUEST_LOG_RETENTION_DAYS = Number(process.env.NEXT_PUBLIC_REQUEST_LOG_RETENTION_DAYS) || 30;
