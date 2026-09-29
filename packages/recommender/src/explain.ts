import { MAX_REASONS } from './constants.js';
import type { ScoredCandidate } from './scoring.js';
import type {
  MatchedNote,
  NoteStage,
  RecommendationMatch,
  ScoringSignal,
} from './types.js';

const SIGNAL_ORDER: readonly ScoringSignal[] = [
  'notes',
  'accords',
  'gender',
  'occasion',
  'concentration',
];

function stagesForNote(candidate: ScoredCandidate, term: string): NoteStage[] {
  const stages: NoteStage[] = [];
  if (candidate.indexed.perfume.notes.top.includes(term)) stages.push('top');
  if (candidate.indexed.perfume.notes.middle.includes(term))
    stages.push('middle');
  if (candidate.indexed.perfume.notes.base.includes(term)) stages.push('base');
  return stages;
}

export function buildMatch(candidate: ScoredCandidate): RecommendationMatch {
  const notes: MatchedNote[] = candidate.matchedTerms.notes.map((term) => ({
    term,
    stages: stagesForNote(candidate, term),
  }));

  return {
    notes,
    accords: [...candidate.matchedTerms.accords],
    occasions: [...candidate.matchedTerms.occasions],
    concentration: candidate.matchedTerms.concentration,
    gender: candidate.matchedTerms.gender,
  };
}

export function buildReasons(candidate: ScoredCandidate): string[] {
  const reasons: Array<{
    signal: ScoringSignal;
    weight: number;
    text: string;
  }> = [];
  const { matchedTerms, components } = candidate;

  if (matchedTerms.notes.length > 0 && components.notes) {
    reasons.push({
      signal: 'notes',
      weight: components.notes.weight,
      text: `Matches preferred notes: ${matchedTerms.notes.slice(0, 3).join(', ')}`,
    });
  }
  if (matchedTerms.accords.length > 0 && components.accords) {
    const label = matchedTerms.accords.length === 1 ? 'accord' : 'accords';
    reasons.push({
      signal: 'accords',
      weight: components.accords.weight,
      text: `Matches preferred ${label}: ${matchedTerms.accords.slice(0, 3).join(', ')}`,
    });
  }
  if (matchedTerms.gender && components.gender) {
    reasons.push({
      signal: 'gender',
      weight: components.gender.weight,
      text: `Matches ${matchedTerms.gender} gender preference`,
    });
  }
  if (matchedTerms.occasions.length > 0 && components.occasion) {
    reasons.push({
      signal: 'occasion',
      weight: components.occasion.weight,
      text: `Matches ${matchedTerms.occasions[0]} occasion`,
    });
  }
  if (matchedTerms.concentration && components.concentration) {
    reasons.push({
      signal: 'concentration',
      weight: components.concentration.weight,
      text: `Matches ${matchedTerms.concentration} concentration`,
    });
  }

  return reasons
    .sort(
      (left, right) =>
        right.weight - left.weight ||
        SIGNAL_ORDER.indexOf(left.signal) - SIGNAL_ORDER.indexOf(right.signal),
    )
    .slice(0, MAX_REASONS)
    .map((reason) => reason.text);
}
