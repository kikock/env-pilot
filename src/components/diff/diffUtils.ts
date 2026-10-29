export interface TreeDiffRow {
  type: "added" | "removed" | "unchanged" | "moved";
  raw: string;
  oldIndex?: number;
  newIndex?: number;
}

export function computeMultiItemTreeDiff(
  oldVal?: string | null,
  newVal?: string | null
): {
  rows: TreeDiffRow[];
  addedCount: number;
  removedCount: number;
  unchangedCount: number;
} {
  const splitItems = (v?: string | null) =>
    (v || "")
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

  const oldItems = splitItems(oldVal);
  const newItems = splitItems(newVal);

  const oldNorm = oldItems.map((it) => it.toLowerCase().replace(/[\/\\]+$/, ""));
  const newNorm = newItems.map((it) => it.toLowerCase().replace(/[\/\\]+$/, ""));

  const rows: TreeDiffRow[] = [];
  let addedCount = 0;
  let removedCount = 0;
  let unchangedCount = 0;

  // 1. 查找被删除的项 (在 oldItems 中但不在 newItems 中)
  oldItems.forEach((oldIt, oIdx) => {
    const norm = oldNorm[oIdx];
    if (!newNorm.includes(norm)) {
      rows.push({
        type: "removed",
        raw: oldIt,
        oldIndex: oIdx + 1,
      });
      removedCount++;
    }
  });

  // 2. 遍历新项，标定新增、移动或未改变
  newItems.forEach((newIt, nIdx) => {
    const norm = newNorm[nIdx];
    const origOldIdx = oldNorm.indexOf(norm);

    if (origOldIdx === -1) {
      rows.push({
        type: "added",
        raw: newIt,
        newIndex: nIdx + 1,
      });
      addedCount++;
    } else if (origOldIdx !== nIdx) {
      rows.push({
        type: "moved",
        raw: newIt,
        oldIndex: origOldIdx + 1,
        newIndex: nIdx + 1,
      });
      unchangedCount++;
    } else {
      rows.push({
        type: "unchanged",
        raw: newIt,
        oldIndex: origOldIdx + 1,
        newIndex: nIdx + 1,
      });
      unchangedCount++;
    }
  });

  return { rows, addedCount, removedCount, unchangedCount };
}
