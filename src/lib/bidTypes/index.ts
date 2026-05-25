/**
 * Bid type registry. One generic engine; each job type is a validated
 * data definition. Adding a type = adding a file and one line here.
 */

import { validateBidType, type CompiledBidType } from '../bidType';
import { securityWall } from './securityWall';

const DEFS = [securityWall];

/** Validated at module load — a bad definition fails fast, not in the UI. */
export const BID_TYPES: Record<string, CompiledBidType> = Object.fromEntries(
  DEFS.map((d) => [d.id, validateBidType(d)]),
);

export const BID_TYPE_IDS = DEFS.map((d) => d.id);
