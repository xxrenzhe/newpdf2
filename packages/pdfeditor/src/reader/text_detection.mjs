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

  const baseHeight = Math.max(current.height || 0, next.height || 0, 1);
  const yDiff = Math.abs((next.y ?? 0) - (current.y ?? 0));
  const yStrong = baseHeight * 0.85;
  if (yDiff > yStrong) {
    return { shouldBreak: true, reason: 'y-gap' };
  }
  return { shouldBreak: false, reason: 'baseline' };
}

export function shouldSplitByGapWithGuardrails({
  maxGap,
  lineWidth,
  baseFontSize,
  segmentCharCounts,
  segmentWidths
}) {
  const minGapPx = Math.max((baseFontSize || 0) * 6, 60);
  if (!Number.isFinite(maxGap) || maxGap < minGapPx) return false;
  const minSegmentChars = 3;
  if (Array.isArray(segmentCharCounts) && segmentCharCounts.some(c => c < minSegmentChars)) {
    return false;
  }
  const minSegmentWidth = Math.max((baseFontSize || 0) * 3, 24);
  if (Array.isArray(segmentWidths) && segmentWidths.some(w => w < minSegmentWidth)) {
    return false;
  }
  if (Number.isFinite(lineWidth) && maxGap / lineWidth < 0.12) return false;
  return true;
}

export function splitCoverRectsByLines(rects, lineMap) {
  if (!Array.isArray(rects) || !lineMap?.horizontal?.length) return rects;
  const output = [];
  rects.forEach(rect => {
    let splits = [rect];
    lineMap.horizontal.forEach(line => {
      splits = splits.flatMap(r => {
        if (line.y <= r.top || line.y >= r.bottom) return [r];
        return [
          { ...r, bottom: line.y, height: line.y - r.top },
          { ...r, top: line.y, height: r.bottom - line.y }
        ];
      });
    });
    output.push(...splits);
  });
  return output;
}
