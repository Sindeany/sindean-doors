/** Unit captured when the user selected the item or accepted a reviewed unit. */
export type CapturedBomLine = {
  itemId: number;
  quantity: number;
  notes: string;
  unit: string;
};

export function bomLineSubmit(lines: readonly CapturedBomLine[]) {
  return lines.map((line) => ({
    itemId: line.itemId,
    quantity: line.quantity,
    notes: line.notes || undefined,
    expectedUnit: line.unit,
  }));
}

export function lineUnitIsStale(capturedUnit: string, liveUnit: string | undefined): boolean {
  return liveUnit != null && liveUnit !== capturedUnit;
}

export function acceptReviewedUnit<T extends CapturedBomLine & { unitCost: number }>(
  line: T,
  live: { unit: string; unitCost: number }
): T {
  return { ...line, unit: live.unit, unitCost: live.unitCost, quantity: 1 };
}
