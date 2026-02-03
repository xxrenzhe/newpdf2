export function classifyOrientation({ isVertical, rotationDeg }) {
  if (isVertical) return 'vertical';
  const deg = Math.abs(Number(rotationDeg) || 0);
  if ((deg >= 80 && deg <= 100) || (deg >= 260 && deg <= 280)) return 'rotated';
  return 'horizontal';
}

export function shouldBreakLine({ current, next, hasEOL, lineHasLeader }) {
  if (!current || !next) return { shouldBreak: true, reason: 'missing' };
  const currentOri = classifyOrientation(current);
  const nextOri = classifyOrientation(next);
  if (currentOri !== nextOri) return { shouldBreak: true, reason: 'orientation' };
  if (hasEOL) return { shouldBreak: true, reason: 'eol' };
  if (lineHasLeader) return { shouldBreak: false, reason: 'leader' };
  return { shouldBreak: false, reason: 'baseline' };
}
