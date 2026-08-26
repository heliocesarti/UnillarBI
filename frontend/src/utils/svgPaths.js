export function roundedBarPath(x, y, w, h, r) {
  if (h < r) r = Math.max(h, 0.01);
  return `M ${x},${y + h} L ${x},${y + r} Q ${x},${y} ${x + r},${y} L ${x + w - r},${y} Q ${x + w},${y} ${x + w},${y + r} L ${x + w},${y + h} Z`;
}

export function roundedBarPathRight(x, y, w, h, r) {
  if (w < r) r = Math.max(w, 0.01);
  return `M ${x},${y} L ${x + w - r},${y} Q ${x + w},${y} ${x + w},${y + r} L ${x + w},${y + h - r} Q ${x + w},${y + h} ${x + w - r},${y + h} L ${x},${y + h} Z`;
}
