// Keyboard + mouse input for SIZZLE RUSH. Produces one input object per frame:
// { up, down, left, right, interact, serve, drop, click } — interact/serve/drop
// and click are edge-triggered (true for exactly one frame).

export function createInput(canvas) {
  const keys = new Set();
  const input = {
    up: false, down: false, left: false, right: false,
    interact: false, serve: false, drop: false, click: null,
  };
  const edge = { interact: false, serve: false, drop: false, click: null };

  function keyName(e) {
    return e.key.toLowerCase();
  }

  window.addEventListener('keydown', (e) => {
    const k = keyName(e);
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (e.repeat) return;
    keys.add(k);
    if (k === 'e') edge.interact = true;
    if (k === ' ') edge.serve = true;
    if (k === 'q') edge.drop = true;
  });
  window.addEventListener('keyup', (e) => keys.delete(keyName(e)));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    edge.click = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  });

  return {
    // Call once per frame; returns the frame's input and clears the edges.
    poll() {
      input.up = keys.has('w') || keys.has('arrowup');
      input.down = keys.has('s') || keys.has('arrowdown');
      input.left = keys.has('a') || keys.has('arrowleft');
      input.right = keys.has('d') || keys.has('arrowright');
      input.interact = edge.interact;
      input.serve = edge.serve;
      input.drop = edge.drop;
      input.click = edge.click;
      edge.interact = false;
      edge.serve = false;
      edge.drop = false;
      edge.click = null;
      return input;
    },
    keys,
  };
}
