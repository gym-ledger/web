interface DropsetAwareSet {
  id: string;
  set_order: number;
  parent_set_id: string | null;
  drop_order: number | null;
}

export interface GroupedSet<T> {
  main: T;
  drops: T[];
}

/**
 * Groups a flat list of workout sets into { main, drops } pairs. A "main" set
 * has `parent_set_id === null`; its drop sets reference it via `parent_set_id`
 * and are ordered by `drop_order`. Rows without a matching main (shouldn't
 * happen, but defends against partial/out-of-order data) are dropped.
 */
export function groupSetsWithDropsets<T extends DropsetAwareSet>(sets: T[]): GroupedSet<T>[] {
  const mains = sets
    .filter((s) => s.parent_set_id == null)
    .sort((a, b) => a.set_order - b.set_order);

  const dropsByParentId = new Map<string, T[]>();
  for (const s of sets) {
    if (s.parent_set_id == null) continue;
    const list = dropsByParentId.get(s.parent_set_id) ?? [];
    list.push(s);
    dropsByParentId.set(s.parent_set_id, list);
  }
  for (const drops of dropsByParentId.values()) {
    drops.sort((a, b) => (a.drop_order ?? 0) - (b.drop_order ?? 0));
  }

  return mains.map((main) => ({
    main,
    drops: dropsByParentId.get(main.id) ?? [],
  }));
}

/** "3:05" style elapsed time between two set timestamps — used to show rest time between consecutive sets. */
export function formatElapsedSince(fromIso: string, toIso: string) {
  const totalSeconds = Math.max(
    0,
    Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 1000),
  );
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
