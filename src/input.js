// Keyboard on desktop, drag-anywhere virtual stick on touch.

const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
};

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.stick = { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0 };
    this.aromaQueued = false;
    this.pausePressed = false;
    this.canvas = canvas;

    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (KEYMAP[e.code]) { this.keys.add(KEYMAP[e.code]); e.preventDefault(); }
      if (e.code === 'Space') { this.aromaQueued = true; e.preventDefault(); }
      if (e.code === 'KeyP' || e.code === 'Escape') this.pausePressed = true;
    });
    addEventListener('keyup', (e) => {
      if (KEYMAP[e.code]) this.keys.delete(KEYMAP[e.code]);
    });
    addEventListener('blur', () => this.keys.clear());

    const down = (e) => {
      const t = e.changedTouches ? e.changedTouches[0] : e;
      if (this.stick.active) return;
      this.stick.active = true;
      this.stick.id = t.identifier ?? 'mouse';
      this.stick.ox = t.clientX; this.stick.oy = t.clientY;
      this.stick.x = 0; this.stick.y = 0;
    };
    const move = (e) => {
      if (!this.stick.active) return;
      const list = e.changedTouches ? Array.from(e.changedTouches) : [e];
      const t = list.find((p) => (p.identifier ?? 'mouse') === this.stick.id);
      if (!t) return;
      const dx = t.clientX - this.stick.ox;
      const dy = t.clientY - this.stick.oy;
      const max = 60;
      const len = Math.hypot(dx, dy) || 1;
      const k = Math.min(len, max) / len;
      this.stick.x = (dx * k) / max;
      this.stick.y = (dy * k) / max;
      if (e.cancelable) e.preventDefault();
    };
    const up = (e) => {
      const list = e.changedTouches ? Array.from(e.changedTouches) : [e];
      const t = list.find((p) => (p.identifier ?? 'mouse') === this.stick.id);
      if (!t && e.changedTouches) return;
      this.stick.active = false; this.stick.x = 0; this.stick.y = 0;
    };

    canvas.addEventListener('touchstart', down, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    canvas.addEventListener('touchend', up);
    canvas.addEventListener('touchcancel', up);
    canvas.addEventListener('mousedown', down);
    addEventListener('mousemove', move);
    addEventListener('mouseup', up);
  }

  /** Normalised movement direction this frame. */
  dir() {
    let x = 0, y = 0;
    if (this.keys.has('left')) x -= 1;
    if (this.keys.has('right')) x += 1;
    if (this.keys.has('up')) y -= 1;
    if (this.keys.has('down')) y += 1;
    if (x || y) {
      const l = Math.hypot(x, y);
      return { x: x / l, y: y / l };
    }
    if (this.stick.active) {
      const l = Math.hypot(this.stick.x, this.stick.y);
      if (l > 0.18) return { x: this.stick.x, y: this.stick.y };
    }
    return { x: 0, y: 0 };
  }

  takeAroma() {
    const v = this.aromaQueued;
    this.aromaQueued = false;
    return v;
  }
  takePause() {
    const v = this.pausePressed;
    this.pausePressed = false;
    return v;
  }
  queueAroma() { this.aromaQueued = true; }
}
