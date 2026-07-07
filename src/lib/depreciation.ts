/** Straight-line depreciation from purchase_date, cost and useful_life_years. */

export interface DepreciationResult {
  annual: number;
  accumulated: number;
  bookValue: number;
  fullyDepreciated: boolean;
}

export function straightLine(
  cost: number | null | undefined,
  purchaseDate: string | null | undefined,
  usefulLifeYears: number,
  asOf: Date = new Date(),
): DepreciationResult | null {
  if (cost === null || cost === undefined || !purchaseDate || usefulLifeYears <= 0) return null;
  const start = new Date(purchaseDate);
  if (Number.isNaN(start.getTime())) return null;

  const annual = cost / usefulLifeYears;
  const yearsElapsed = Math.max(0, (asOf.getTime() - start.getTime()) / (365.25 * 86400000));
  const accumulated = Math.min(cost, annual * yearsElapsed);
  const bookValue = Math.max(0, cost - accumulated);
  return {
    annual: round2(annual),
    accumulated: round2(accumulated),
    bookValue: round2(bookValue),
    fullyDepreciated: bookValue <= 0.005,
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;
