/* ==========================================================================
   20 · INVENTORY MODEL — grid containers, item instances, transfers
   Item instance: { uid, id, qty, cond (0..1), inv? (Container for bags), st? (state bag) }
   Container:     { uid, w, h, limit (kg), label, temp ('ambient'|'fridge'|'freezer'),
                    slots: [{ it, x, y, r }] }   r = 1 → rotated 90°
   Containers are plain JSON so they save as-is.
   ========================================================================== */

const Inv = {
  /* ---------- construction ---------- */
  makeItem(id, qty = 1, extra) {
    const d = itemDef(id);
    const it = { uid: U.uid(), id: d.id, qty: Math.max(1, Math.min(qty, d.stack || 1)) };
    if (d.dura) it.cond = 1;
    if (d.uses) it.uses = d.uses;
    if (d.grid) it.inv = Inv.makeContainer(d.grid[0], d.grid[1], d.limit, d.name);
    if (extra) Object.assign(it, extra);
    return it;
  },
  makeContainer(w, h, limit, label, temp = 'ambient') {
    return { uid: U.uid(), w, h, limit: limit || 999, label: label || '', temp, slots: [] };
  },

  /* ---------- geometry ---------- */
  dims(it, r) { const s = itemDef(it.id).size; return r ? [s[1], s[0]] : [s[0], s[1]]; },
  /** True if a w×h rect at (x,y) fits inside c and overlaps nothing except `ignore` slot. */
  fits(c, x, y, w, h, ignore) {
    if (x < 0 || y < 0 || x + w > c.w || y + h > c.h) return false;
    for (const s of c.slots) {
      if (s === ignore) continue;
      const [sw, sh] = Inv.dims(s.it, s.r);
      if (x < s.x + sw && x + w > s.x && y < s.y + sh && y + h > s.y) return false;
    }
    return true;
  },
  slotAt(c, cx, cy) {
    for (const s of c.slots) {
      const [sw, sh] = Inv.dims(s.it, s.r);
      if (cx >= s.x && cx < s.x + sw && cy >= s.y && cy < s.y + sh) return s;
    }
    return null;
  },
  /** First free spot scanning rows; tries both rotations unless noRotate. */
  findSpot(c, it, preferR = 0, noRotate = false) {
    const tries = noRotate ? [preferR] : [preferR, preferR ? 0 : 1];
    for (const r of tries) {
      const [w, h] = Inv.dims(it, r);
      if (w === h && r !== tries[0]) continue;
      for (let y = 0; y + h <= c.h; y++)
        for (let x = 0; x + w <= c.w; x++)
          if (Inv.fits(c, x, y, w, h)) return { x, y, r };
    }
    return null;
  },

  /* ---------- weight ---------- */
  itemWeight(it) {
    const d = itemDef(it.id);
    let w = d.weight * it.qty;
    if (it.st && it.st.portionsLeft != null && d.portions) w *= 0.15 + 0.85 * (it.st.portionsLeft / d.portions);
    if (it.inv) w += Inv.weight(it.inv);
    return w;
  },
  weight(c) { let w = 0; for (const s of c.slots) w += Inv.itemWeight(s.it); return w; },
  /** Would adding `it` exceed c.limit? (Containers enforce their own weight limit strictly.) */
  weightOk(c, it, extraQty) {
    const add = extraQty != null ? itemDef(it.id).weight * extraQty : Inv.itemWeight(it);
    return Inv.weight(c) + add <= c.limit + 1e-6;
  },

  /* ---------- nesting guard ---------- */
  /** True if container c is `it`'s own inventory or nested anywhere inside it. */
  wouldNestIntoSelf(it, c) {
    if (!it.inv) return false;
    if (it.inv === c) return true;
    for (const s of it.inv.slots) if (Inv.wouldNestIntoSelf(s.it, c)) return true;
    return false;
  },

  /* ---------- core mutations ---------- */
  remove(c, slot) { const i = c.slots.indexOf(slot); if (i >= 0) c.slots.splice(i, 1); return slot; },
  canStack(a, b) {
    const d = itemDef(a.id);
    return a.id === b.id && d.stack > 1 && !a.inv && !b.inv && !a.st && !b.st &&
      (a.cond == null || a.cond === b.cond) && (a.uses == null || a.uses === b.uses);
  },
  /** Place item at an exact position. Returns the slot or null. */
  placeAt(c, it, x, y, r) {
    if (Inv.wouldNestIntoSelf(it, c)) return null;
    const [w, h] = Inv.dims(it, r);
    if (!Inv.fits(c, x, y, w, h)) return null;
    if (!Inv.weightOk(c, it)) return null;
    const slot = { it, x, y, r: r ? 1 : 0 };
    c.slots.push(slot);
    return slot;
  },
  /**
   * Add an item anywhere: first top up existing stacks, then find a free spot.
   * Returns the quantity that could NOT be added (0 = all added). Mutates it.qty.
   */
  add(c, it) {
    if (Inv.wouldNestIntoSelf(it, c)) return it.qty;
    const d = itemDef(it.id);
    if (d.stack > 1) {
      for (const s of c.slots) {
        if (it.qty <= 0) break;
        if (!Inv.canStack(s.it, it)) continue;
        const room = d.stack - s.it.qty;
        if (room <= 0) continue;
        let n = Math.min(room, it.qty);
        while (n > 0 && !Inv.weightOk(c, it, n)) n--;
        s.it.qty += n; it.qty -= n;
      }
      if (it.qty <= 0) return 0;
    }
    let maxQ = it.qty;
    while (maxQ > 0 && !Inv.weightOk(c, it, maxQ)) maxQ--;
    if (maxQ <= 0) return it.qty;
    const spot = Inv.findSpot(c, it);
    if (!spot) return it.qty;
    if (maxQ < it.qty) {
      const part = Object.assign(U.deepClone(it), { uid: U.uid(), qty: maxQ });
      c.slots.push({ it: part, x: spot.x, y: spot.y, r: spot.r });
      it.qty -= maxQ;
      return it.qty;
    }
    c.slots.push({ it, x: spot.x, y: spot.y, r: spot.r });
    return 0;
  },
  /** Add into the first container of a list that accepts it. Returns leftover qty. */
  addToAny(list, it) {
    let left = it.qty;
    for (const c of list) {
      if (left <= 0) break;
      left = Inv.add(c, it);
    }
    return left;
  },
  /**
   * Move one slot from src to the best of dstList. Partial stacks may move.
   * Returns true if anything moved.
   */
  transfer(src, slot, dstList) {
    const before = slot.it.qty;
    const left = Inv.addToAny(dstList, slot.it);
    if (left <= 0) { Inv.remove(src, slot); return true; }
    slot.it.qty = left;
    return left < before;
  },
  /** Move all slots matching pred. Returns {moved, failed}. */
  transferAll(src, dstList, pred = () => true) {
    let moved = 0, failed = 0;
    const order = [...src.slots].sort((a, b) => Inv.area(b.it) - Inv.area(a.it));
    for (const s of order) {
      if (!pred(s.it)) continue;
      if (Inv.transfer(src, s, dstList)) moved++; else failed++;
    }
    return { moved, failed };
  },
  area(it) { const s = itemDef(it.id).size; return s[0] * s[1]; },

  /**
   * Auto-sort: repack by category then size. Skill improves packing:
   * level < 4 → first-fit scan; ≥ 4 → also tries the rotation that leaves less waste.
   * Never drops items: if repacking fails the original layout is restored.
   */
  autoSort(c, skill = 1) {
    const backup = c.slots.map((s) => ({ ...s }));
    // Merge partial stacks first.
    const merged = [];
    for (const s of c.slots) {
      const host = merged.find((m) => Inv.canStack(m.it, s.it) && m.it.qty < itemDef(m.it.id).stack);
      if (host) {
        const room = itemDef(host.it.id).stack - host.it.qty;
        const n = Math.min(room, s.it.qty);
        host.it.qty += n; s.it.qty -= n;
        if (s.it.qty > 0) merged.push(s);
      } else merged.push(s);
    }
    const catOrder = Object.keys(CATEGORIES);
    merged.sort((a, b) => {
      const da = itemDef(a.it.id), db = itemDef(b.it.id);
      const ca = catOrder.indexOf(da.cat), cb = catOrder.indexOf(db.cat);
      if (Inv.area(b.it) !== Inv.area(a.it) && skill >= 4) return Inv.area(b.it) - Inv.area(a.it);
      if (ca !== cb) return ca - cb;
      if (Inv.area(b.it) !== Inv.area(a.it)) return Inv.area(b.it) - Inv.area(a.it);
      return da.name.localeCompare(db.name, 'th');
    });
    c.slots = [];
    for (const s of merged) {
      let spot = null;
      if (skill >= 4) spot = Inv.bestSpot(c, s.it);
      if (!spot) spot = Inv.findSpot(c, s.it, 0);
      if (!spot) { c.slots = backup; return false; }
      c.slots.push({ it: s.it, x: spot.x, y: spot.y, r: spot.r });
    }
    return true;
  },
  /** Bottom-left heuristic: lowest y then lowest x across both rotations. */
  bestSpot(c, it) {
    let best = null;
    for (const r of [0, 1]) {
      const [w, h] = Inv.dims(it, r);
      for (let y = 0; y + h <= c.h; y++) {
        for (let x = 0; x + w <= c.w; x++) {
          if (!Inv.fits(c, x, y, w, h)) continue;
          const score = (y + h) * 100 + x;
          if (!best || score < best.score) best = { x, y, r, score };
          break;
        }
      }
    }
    return best;
  },

  /** Walk every item in a container tree. fn(it, container) */
  walk(c, fn) {
    for (const s of c.slots) { fn(s.it, c, s); if (s.it.inv) Inv.walk(s.it.inv, fn); }
  },
  /** Count items by id across a container tree. */
  count(c, id) { let n = 0; Inv.walk(c, (it) => { if (it.id === id) n += it.qty; }); return n; },
  /** Find the slot (and its container) that holds an item uid. */
  locate(c, uid) {
    for (const s of c.slots) {
      if (s.it.uid === uid) return { c, slot: s };
      if (s.it.inv) { const r = Inv.locate(s.it.inv, uid); if (r) return r; }
    }
    return null;
  },
  /** Total sale value — used by the stock overview and robbery demands later. */
  value(c) { let v = 0; Inv.walk(c, (it) => { v += (itemDef(it.id).price || 0) * it.qty; }); return v; },
};
