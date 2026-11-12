const GAME_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ShiftLeft', 'ShiftRight', 'KeyC', 'KeyR', 'KeyV', 'KeyB', 'KeyH',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
]);

/** Klawiatura + mysz + Pointer Lock (z trybem awaryjnym, gdy blokada kursora jest niedostępna). */
export class Input {
  constructor(el) {
    this.el = el;
    this.keys = new Set();
    this.justPressed = new Set();
    this.mouse = { left: false, right: false };
    this.dx = 0;
    this.dy = 0;
    this.locked = false;
    this.enabled = false; // gra działa (menu zamknięte)
    this.onLockChange = null;
    this.onLockError = null;

    addEventListener('keydown', (e) => {
      if (this.enabled && GAME_KEYS.has(e.code)) e.preventDefault();
      if (!this.keys.has(e.code)) this.justPressed.add(e.code);
      this.keys.add(e.code);
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => {
      this.keys.clear();
      this.mouse.left = this.mouse.right = false;
    });
    addEventListener('mousedown', (e) => {
      if (!this.enabled) return;
      if (e.button === 0) this.mouse.left = true;
      if (e.button === 2) this.mouse.right = true;
    });
    addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouse.left = false;
      if (e.button === 2) this.mouse.right = false;
    });
    addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('mousemove', (e) => {
      if (!this.enabled) return;
      this.dx += e.movementX || 0;
      this.dy += e.movementY || 0;
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.el;
      this.onLockChange?.(this.locked);
    });
    document.addEventListener('pointerlockerror', () => this.onLockError?.());
  }

  requestLock() {
    try {
      const r = this.el.requestPointerLock?.();
      if (r && typeof r.catch === 'function') r.catch(() => this.onLockError?.());
      if (!this.el.requestPointerLock) this.onLockError?.();
    } catch {
      this.onLockError?.();
    }
  }

  down(code) {
    return this.keys.has(code);
  }

  pressed(code) {
    return this.justPressed.has(code);
  }

  consumeMouse() {
    const d = { x: this.dx, y: this.dy };
    this.dx = this.dy = 0;
    return d;
  }

  endFrame() {
    this.justPressed.clear();
  }
}
