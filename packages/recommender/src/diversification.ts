import {
  DIVERSIFICATION_POOL_MULTIPLIER,
  MIN_DIVERSIFICATION_POOL,
  REDUNDANCY_CHANNEL_WEIGHTS,
} from './constants.js';
import type { ScoredCandidate } from './scoring.js';
import { idfWeightedCosine } from './similarity.js';

export type DiversifiedCandidate = {
  candidate: ScoredCandidate;
  preDiversificationRank: number;
  mmrScore: number;
};

type RankedCandidate = {
  candidate: ScoredCandidate;
  preDiversificationRank: number;
};

export function getDiversificationPoolSize(
  candidateCount: number,
  limit: number,
): number {
  return Math.min(
    candidateCount,
    Math.max(MIN_DIVERSIFICATION_POOL, limit * DIVERSIFICATION_POOL_MULTIPLIER),
  );
}

function candidateSimilarity(
  left: ScoredCandidate,
  right: ScoredCandidate,
  notesIdf: ReadonlyMap<string, number>,
  accordsIdf: ReadonlyMap<string, number>,
): number {
  let weightedSum = 0;
  let availableWeight = 0;

  if (left.indexed.notes.norm > 0 && right.indexed.notes.norm > 0) {
    weightedSum +=
      idfWeightedCosine(left.indexed.notes, right.indexed.notes, notesIdf) *
      REDUNDANCY_CHANNEL_WEIGHTS.notes;
    availableWeight += REDUNDANCY_CHANNEL_WEIGHTS.notes;
  }

  if (left.indexed.accords.norm > 0 && right.indexed.accords.norm > 0) {
    weightedSum +=
      idfWeightedCosine(
        left.indexed.accords,
        right.indexed.accords,
        accordsIdf,
      ) * REDUNDANCY_CHANNEL_WEIGHTS.accords;
    availableWeight += REDUNDANCY_CHANNEL_WEIGHTS.accords;
  }

  return availableWeight > 0 ? weightedSum / availableWeight : 0;
}

function maximumRedundancy(
  candidate: ScoredCandidate,
  selected: readonly RankedCandidate[],
  notesIdf: ReadonlyMap<string, number>,
  accordsIdf: ReadonlyMap<string, number>,
): number {
  let maximum = 0;
  for (const selectedCandidate of selected) {
    maximum = Math.max(
      maximum,
      candidateSimilarity(
        candidate,
        selectedCandidate.candidate,
        notesIdf,
        accordsIdf,
      ),
    );
  }
  return maximum;
}

export function diversifyCandidates(
  sortedCandidates: readonly ScoredCandidate[],
  limit: number,
  mmrLambda: number,
  notesIdf: ReadonlyMap<string, number>,
  accordsIdf: ReadonlyMap<string, number>,
): DiversifiedCandidate[] {
  const poolSize = getDiversificationPoolSize(sortedCandidates.length, limit);
  const remaining: RankedCandidate[] = sortedCandidates
    .slice(0, poolSize)
    .map((candidate, index) => ({
      candidate,
      preDiversificationRank: index + 1,
    }));
  const selected: RankedCandidate[] = [];
  const diversified: DiversifiedCandidate[] = [];

  const first = remaining.shift();
  if (first) {
    selected.push(first);
    diversified.push({
      candidate: first.candidate,
      preDiversificationRank: first.preDiversificationRank,
      mmrScore: mmrLambda * first.candidate.score,
    });
  }

  while (remaining.length > 0 && selected.length < limit) {
    let bestIndex = 0;
    let bestMmrScore = Number.NEGATIVE_INFINITY;

    for (let index = 0; index < remaining.length; index += 1) {
      const ranked = remaining[index];
      if (!ranked) continue;

      const redundancy = maximumRedundancy(
        ranked.candidate,
        selected,
        notesIdf,
        accordsIdf,
      );
      const mmrScore =
        mmrLambda * ranked.candidate.score - (1 - mmrLambda) * redundancy;
      const currentBest = remaining[bestIndex];
      const isBetter =
        mmrScore > bestMmrScore ||
        (mmrScore === bestMmrScore &&
          currentBest !== undefined &&
          ranked.candidate.indexed.perfume.id.localeCompare(
            currentBest.candidate.indexed.perfume.id,
          ) < 0);

      if (isBetter) {
        bestIndex = index;
        bestMmrScore = mmrScore;
      }
    }

    const [best] = remaining.splice(bestIndex, 1);
    if (!best) break;
    selected.push(best);
    diversified.push({
      candidate: best.candidate,
      preDiversificationRank: best.preDiversificationRank,
      mmrScore: bestMmrScore,
    });
  }

  return diversified;
}
