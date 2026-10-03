/* ==========================================================================
   50 · UI PRIMITIVES — toasts, modal stack (owns time), tooltip, context menu
   ========================================================================== */

const Toast = {
  show(msg, kind = 'info', dur = 3800) {
    const root = U.$('#toasts');
    if (!root) return;
    const t = U.el('div.toast.' + kind, null, msg);
    root.appendChild(t);
    requestAnimationFrame(() => t.classList.add('in'));
    setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 400); }, dur);
    while (root.children.length > 5) root.firstChild.remove();
  },
};
Bus.on('toast', (o) => Toast.show(o.msg, o.kind, o.dur));

/** Modal stack. Each open modal pauses the game clock (unless pauseTime:false). */
const Modal = {
  stack: [],
  open({ title, body, actions = [], wide = false, dismissible = true, pauseTime = true, onClose, cls }) {
    const root = U.$('#modals');
    const box = U.el('div.modal' + (wide ? '.wide' : '') + (cls ? '.' + cls : ''));
    const head = U.el('div.mhead', null, U.el('h2', null, title || ''));
    if (dismissible) head.appendChild(U.el('button.mclose', { title: STR.close, on: { click: () => Modal.close() } }, '✕'));
    const content = U.el('div.mbody');
    if (body instanceof Node) content.appendChild(body); else if (body) content.innerHTML = body;
    const foot = U.el('div.mfoot');
    for (const a of actions) foot.appendChild(U.el('button.btn' + (a.primary ? '.primary' : '') + (a.danger ? '.danger' : ''), { on: { click: () => { const r = a.fn && a.fn(); if (r !== false && a.close !== false) Modal.close(); } } }, a.label));
    box.append(head, content);
    if (actions.length) box.appendChild(foot);
    const back = U.el('div.mback', { on: { mousedown: (e) => { if (e.target === back && dismissible) Modal.close(); } } }, box);
    root.appendChild(back);
    const entry = { back, dismissible, pauseTime, onClose, content };
    this.stack.push(entry);
    if (pauseTime) GameClock.pauseLocks++;
    return entry;
  },
  close() {
    const e = this.stack.pop();
    if (!e) return;
    e.back.remove();
    if (e.pauseTime) GameClock.pauseLocks = Math.max(0, GameClock.pauseLocks - 1);
    if (e.onClose) e.onClose();
  },
  closeAll() { while (this.stack.length) this.close(); },
  isOpen() { return this.stack.length > 0; },
  top() { return this.stack[this.stack.length - 1]; },
  confirm(title, msg, onYes, yesLabel = STR.confirm, danger = false) {
    return this.open({ title, body: U.el('p', null, msg), actions: [
      { label: STR.cancel },
      { label: yesLabel, primary: !danger, danger, fn: onYes },
    ] });
  },
};

const Tooltip = {
  el: null,
  show(html, x, y) {
    if (!this.el) this.el = U.$('#tooltip');
    this.el.innerHTML = html;
    this.el.style.display = 'block';
    this.move(x, y);
  },
  move(x, y) {
    if (!this.el || this.el.style.display !== 'block') return;
    const r = this.el.getBoundingClientRect();
    let tx = x + 16, ty = y + 14;
    if (tx + r.width > innerWidth - 8) tx = x - r.width - 12;
    if (ty + r.height > innerHeight - 8) ty = innerHeight - r.height - 8;
    this.el.style.left = Math.max(4, tx) + 'px'; this.el.style.top = Math.max(4, ty) + 'px';
  },
  hide() { if (this.el) this.el.style.display = 'none'; },
};

const ContextMenu = {
  show(x, y, items) {
    this.hide();
    if (!items.length) return;
    const m = U.el('div.ctxmenu#ctxmenu');
    for (const it of items) m.appendChild(U.el('button', { disabled: !!it.disabled, on: { click: () => { this.hide(); it.fn(); } } }, it.label));
    document.body.appendChild(m);
    const r = m.getBoundingClientRect();
    m.style.left = Math.min(x, innerWidth - r.width - 6) + 'px';
    m.style.top = Math.min(y, innerHeight - r.height - 6) + 'px';
    setTimeout(() => document.addEventListener('mousedown', this._away = (e) => { if (!m.contains(e.target)) this.hide(); }), 0);
  },
  hide() {
    const m = U.$('#ctxmenu'); if (m) m.remove();
    if (this._away) { document.removeEventListener('mousedown', this._away); this._away = null; }
  },
};
