// Method registry, matching contracts/sentinel_sla.py exactly as deployed
// at 0x9bf02585228D7A7E3d4dcB3a35928045a7C250E8 (StudioNet). This is the
// single place method names/args are defined — every call site imports
// from here rather than typing method names inline, so a contract change
// only needs updating in one place.

export const VALID_VERDICTS = ['compliant', 'non_compliant', 'unverifiable'] as const;
export type Verdict = (typeof VALID_VERDICTS)[number];

export const FIX_SUBSTANTIVENESS_LEVELS = ['substantive', 'weak', 'none'] as const;
export type FixSubstantiveness = (typeof FIX_SUBSTANTIVENESS_LEVELS)[number];

export const CHALLENGE_REASON_CODES = [
  'GHSA_RECORD_MISREAD',
  'FIX_REFERENCE_MISJUDGED',
  'TIMESTAMP_MISCALCULATED',
  'ADVISORY_WITHDRAWN_SINCE',
  'WRONG_ADVISORY_FOR_REPO',
] as const;

const SENTINEL_SLA_ABI_METHODS = {
  write: {
    registerSla: 'register_sla',
    fileComplianceCheck: 'file_compliance_check',
    resolveCompliance: 'resolve_compliance',
    openChallenge: 'open_challenge',
    resolveChallenge: 'resolve_challenge',
    finalizeCompliance: 'finalize_compliance',
  },
  read: {
    getSla: 'get_sla',
    getCheck: 'get_check',
    getChallenge: 'get_challenge',
    getReputation: 'get_reputation',
    getNextCheckId: 'get_next_check_id',
  },
} as const;

export default SENTINEL_SLA_ABI_METHODS;
