/**
 * The terms of use (/terms) and privacy policy (/privacy) are accepted
 * together. Their VERSION is not kept here: the API defines it in
 * gym-ledger/api src/config/policyVersions.ts (read that file's header before
 * changing either page). Only material versions ask users to accept again,
 * but err on the side of asking again whenever you add a version.
 * After changing either page, run `npm run policy:lock -- <new version>`;
 * CI fails while the text and policy.lock.json disagree.
 */

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
