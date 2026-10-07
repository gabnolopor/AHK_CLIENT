import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clampZoneToBounds, createZoneAtUV, WALL_ZONE_BOUNDS } from './wallZoneConfig.js';

const ASPECT_PRESETS = [0.8, 0.75, 1, 1.25, 1.35];
const PLAQUE_CLEARANCE = 0.18;
const PLAQUE_HEIGHT = 0.14;
const WINDOW_EXCLUSION_MARGIN = 0.35;
const MIN_SEGMENT_WIDTH = 0.85;
const HANG_HEIGHT = 1.9;
const DEFAULT_ART_HEIGHT = 0.94;
const MIN_ART_HEIGHT = 0.62;
const MAX_ART_HEIGHT = 1.12;
const MAX_ART_WIDTH = 1.48;
const MIN_ART_WIDTH = 0.4;
const MIN_FRAME_GAP = 0.14;
const MAX_FRAME_GAP = 0.3;

const FRAME_GAP = 0.22;

function hashSeed(...parts) {
  let hash = 2166136261;
  const str = parts.join(':');
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}

function getItemSeed(item, slotIndex, wallIndex, salt = '') {
  const id = item?.id ?? item?._id ?? item?.name ?? slotIndex;
  return hashSeed(String(id), wallIndex, slotIndex, salt);
}

function getArtworkSize(item, slotIndex, wallIndex) {
  const aspect = getArtworkAspect(item, slotIndex);
  const sizeSeed = getItemSeed(item, slotIndex, wallIndex, 'size');
  const heightScale = 0.76 + sizeSeed * 0.38;
  let h = THREE.MathUtils.clamp(DEFAULT_ART_HEIGHT * heightScale, MIN_ART_HEIGHT, MAX_ART_HEIGHT);
  let w = h * aspect;

  if (w > MAX_ART_WIDTH) {
    w = MAX_ART_WIDTH;
    h = w / aspect;
  } else if (w < MIN_ART_WIDTH) {
    w = MIN_ART_WIDTH;
    h = w / aspect;
  }

  return { w, h };
}

function getPieceHangY(segment, size, seed) {
  const minY = segment.minY ?? segment.hangY - size.h * 0.5;
  const maxY = segment.maxY ?? segment.hangY + size.h * 0.5;
  const plaqueDrop = PLAQUE_CLEARANCE + PLAQUE_HEIGHT;
  const halfH = size.h / 2;
  const minCenter = minY + halfH + plaqueDrop;
  const maxCenter = maxY - halfH;
  const heightBias = 0.78 + hashSeed(seed, 'bias') * 0.14;
  const preferred = minY + (maxY - minY) * heightBias;
  const yJitter = (hashSeed(seed, 'y') - 0.5) * 0.22;

  return THREE.MathUtils.clamp(preferred + yJitter, minCenter, maxCenter);
}

function getPieceBoundsWithPlaque(x, y, w, h) {
  return {
    left: x - w / 2,
    right: x + w / 2,
    top: y + h / 2,
    bottom: y - h / 2 - PLAQUE_CLEARANCE - PLAQUE_HEIGHT,
  };
}

function boundsOverlap(a, b) {
  return a.left < b.right && a.right > b.left && a.top > b.bottom && a.bottom < b.top;
}

function seededShuffle(items, seedKey) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(hashSeed(seedKey, i) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getArtworkAspect(item, slotIndex) {
  if (item?.imageUrl) {
    const texture = textureCache.get(item.imageUrl);
    const image = texture?.image;
    if (image?.width > 0 && image?.height > 0) {
      return image.width / image.height;
    }
  }
  return ASPECT_PRESETS[slotIndex % ASPECT_PRESETS.length];
}

function fitSizesToSegmentHeight(sizes, segment) {
  const minY = segment.minY ?? segment.hangY - 0.6;
  const maxY = segment.maxY ?? segment.hangY + 0.6;
  const verticalBudget = maxY - minY - PLAQUE_CLEARANCE - PLAQUE_HEIGHT - 0.08;
  const tallest = Math.max(...sizes.map((size) => size.h), 0.01);

  if (tallest <= verticalBudget) return sizes;

  const scale = verticalBudget / tallest;
  return sizes.map((size) => ({
    w: size.w * scale,
    h: size.h * scale,
  }));
}

function getPieceBounds(x, y, w, h) {
  return {
    left: x - w / 2,
    right: x + w / 2,
    top: y + h / 2,
    bottom: y - h / 2 - PLAQUE_CLEARANCE,
  };
}

const HANG_Y_MIN = 0.85;
const HANG_Y_MAX = 2.05;
const SEGMENT_BIN_SIZE = 0.18;
const OPENING_GAP = 0.5;
const MAX_MAIN_WALL_SHARE = 0.42;

function findBinnedHorizontalSegments(points, { minWidth = MIN_SEGMENT_WIDTH, binSize = SEGMENT_BIN_SIZE } = {}) {
  if (points.length < 2) return [];

  const bandPoints = points.filter((point) => point.y >= HANG_Y_MIN && point.y <= HANG_Y_MAX);
  const usePoints = bandPoints.length >= 3 ? bandPoints : points;
  const uValues = usePoints.map((point) => point.u);
  const minU = Math.min(...uValues);
  const maxU = Math.max(...uValues);

  if (maxU - minU < minWidth) return [];

  const binCount = Math.max(1, Math.ceil((maxU - minU) / binSize));
  const bins = new Array(binCount).fill(0);
  usePoints.forEach((point) => {
    const idx = Math.min(binCount - 1, Math.floor(((point.u - minU) / (maxU - minU)) * binCount));
    bins[idx] += 1;
  });

  const segments = [];
  let inSegment = false;
  let segStart = minU;

  for (let i = 0; i < binCount; i += 1) {
    const occupied = bins[i] > 0;
    const binStart = minU + (i / binCount) * (maxU - minU);
    const binEnd = minU + ((i + 1) / binCount) * (maxU - minU);

    if (occupied && !inSegment) {
      inSegment = true;
      segStart = binStart;
    } else if (!occupied && inSegment) {
      if (binStart - segStart >= minWidth) {
        segments.push({ minX: segStart, maxX: binStart });
      }
      inSegment = false;
    }

    if (i === binCount - 1 && inSegment && maxU - segStart >= minWidth) {
      segments.push({ minX: segStart, maxX: maxU });
    }
  }

  if (!segments.length && maxU - minU >= minWidth) {
    return [{ minX: minU, maxX: maxU }];
  }

  return mergeNearbySegments(segments, OPENING_GAP);
}

function mergeNearbySegments(segments, mergeGap) {
  if (!segments.length) return [];

  const sorted = [...segments].sort((a, b) => a.minX - b.minX);
  const merged = [{ ...sorted[0] }];

  for (let i = 1; i < sorted.length; i += 1) {
    const current = sorted[i];
    const last = merged[merged.length - 1];
    if (current.minX - last.maxX <= mergeGap) {
      last.maxX = Math.max(last.maxX, current.maxX);
    } else {
      merged.push({ ...current });
    }
  }

  return merged.filter((segment) => segment.maxX - segment.minX >= MIN_SEGMENT_WIDTH);
}

function getFallbackHangSurfaces(roomWidth, roomDepth, windowExclusions) {
  const margin = 0.45;
  const candidates = [
    {
      wallId: 'outer-right',
      axis: 'x',
      sign: -1,
      planePos: roomWidth / 2,
      rotY: -Math.PI / 2,
      segment: {
        minX: -roomDepth / 2 + margin,
        maxX: roomDepth / 2 - margin,
        hangY: HANG_HEIGHT,
      },
    },
    {
      wallId: 'outer-back',
      axis: 'z',
      sign: -1,
      planePos: roomDepth / 2,
      rotY: Math.PI,
      segment: {
        minX: -roomWidth / 2 + margin,
        maxX: -2.1,
        hangY: HANG_HEIGHT,
      },
    },
    {
      wallId: 'outer-left',
      axis: 'x',
      sign: 1,
      planePos: -roomWidth / 2,
      rotY: Math.PI / 2,
      segment: {
        minX: -roomDepth / 2 + margin,
        maxX: roomDepth / 2 - margin,
        hangY: HANG_HEIGHT,
      },
    },
    {
      wallId: 'outer-front',
      axis: 'z',
      sign: 1,
      planePos: -roomDepth / 2,
      rotY: 0,
      segment: {
        minX: -roomWidth / 2 + margin,
        maxX: roomWidth / 2 - margin,
        hangY: HANG_HEIGHT,
      },
    },
  ];

  return candidates
    .flatMap((surface) => {
      const outerWallId = surface.wallId.replace('outer-', '');
      const trimmedSegments = trimSegmentForExclusions(
        { minX: surface.segment.minX, maxX: surface.segment.maxX },
        windowExclusions[outerWallId] || []
      );
      return trimmedSegments.map((trimmed) => ({
        ...surface,
        segment: trimmed,
        width: trimmed.maxX - trimmed.minX,
        isOuter: true,
      }));
    })
    .filter((surface) => surface.width >= MIN_SEGMENT_WIDTH);
}

function trimSegmentForExclusions(segment, exclusions) {
  const margin = 0.12;
  let ranges = [{ minX: segment.minX, maxX: segment.maxX }];

  exclusions.forEach((zone) => {
    ranges = ranges.flatMap((range) => {
      const overlap = !(range.maxX <= zone.minX || range.minX >= zone.maxX);
      if (!overlap) return [range];

      const parts = [];
      if (zone.minX - margin > range.minX) {
        parts.push({ minX: range.minX, maxX: zone.minX - margin });
      }
      if (zone.maxX + margin < range.maxX) {
        parts.push({ minX: zone.maxX + margin, maxX: range.maxX });
      }
      return parts;
    });
  });

  return ranges
    .filter((range) => range.maxX - range.minX >= MIN_SEGMENT_WIDTH)
    .map((range) => ({
      minX: range.minX + margin,
      maxX: range.maxX - margin,
      hangY: HANG_HEIGHT,
    }));
}

function analyzeHangSurfaces(wallMeshes, roomWidth, roomDepth, roomHeight, windowExclusions) {
  const floorY = -roomHeight / 2;
  const halfW = roomWidth / 2;
  const halfD = roomDepth / 2;
  const meshes = Array.isArray(wallMeshes) ? wallMeshes : [wallMeshes].filter(Boolean);

  if (!meshes.length) return getFallbackHangSurfaces(roomWidth, roomDepth, windowExclusions);

  const planeBuckets = new Map();
  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();
  const edgeA = new THREE.Vector3();
  const edgeB = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const center = new THREE.Vector3();

  meshes.forEach((wallMesh) => {
    wallMesh.updateMatrixWorld(true);
    const geometry = wallMesh.geometry;
    const positionAttr = geometry.attributes.position;
    const index = geometry.index;
    const triangleCount = index ? index.count / 3 : positionAttr.count / 3;

    for (let tri = 0; tri < triangleCount; tri += 1) {
      const ia = index ? index.getX(tri * 3) : tri * 3;
      const ib = index ? index.getX(tri * 3 + 1) : tri * 3 + 1;
      const ic = index ? index.getX(tri * 3 + 2) : tri * 3 + 2;

      vA.fromBufferAttribute(positionAttr, ia).applyMatrix4(wallMesh.matrixWorld);
      vB.fromBufferAttribute(positionAttr, ib).applyMatrix4(wallMesh.matrixWorld);
      vC.fromBufferAttribute(positionAttr, ic).applyMatrix4(wallMesh.matrixWorld);

      edgeA.subVectors(vB, vA);
      edgeB.subVectors(vC, vA);
      normal.crossVectors(edgeA, edgeB);
      if (normal.lengthSq() < 1e-10) continue;
      normal.normalize();

      if (Math.abs(normal.y) > 0.45) continue;

      center.copy(vA).add(vB).add(vC).multiplyScalar(1 / 3);
      const localY = center.y - floorY;
      if (localY < HANG_Y_MIN - 0.15 || localY > HANG_Y_MAX + 0.35) continue;

      const axis = Math.abs(normal.x) >= Math.abs(normal.z) ? 'x' : 'z';
      const sign = axis === 'x' ? (Math.sign(normal.x) || 1) : (Math.sign(normal.z) || 1);
      const planePos = axis === 'x' ? center.x : center.z;
      const isOuter = (
        (axis === 'x' && Math.abs(Math.abs(planePos) - halfW) < OUTER_WALL_TOLERANCE)
        || (axis === 'z' && Math.abs(Math.abs(planePos) - halfD) < OUTER_WALL_TOLERANCE)
      );
      if (!isOuter) continue;

      const bucketKey = `${axis}_${sign}_${Math.round(planePos * 8) / 8}`;

      let u;
      if (axis === 'x') {
        u = sign > 0 ? -center.z : center.z;
      } else {
        u = sign > 0 ? center.x : -center.x;
      }

      if (!planeBuckets.has(bucketKey)) {
        planeBuckets.set(bucketKey, {
          axis,
          sign,
          planePos,
          normal: normal.clone(),
          points: [],
        });
      }

      planeBuckets.get(bucketKey).points.push({ u, y: localY });
    }
  });

  const surfaces = [];

  planeBuckets.forEach((bucket, bucketKey) => {
    const segments = findBinnedHorizontalSegments(bucket.points);
    if (!segments.length) return;

    const rotY = Math.atan2(-bucket.normal.x, -bucket.normal.z);
    const outerWallId = bucket.axis === 'x'
      ? (bucket.planePos > 0 ? 'right' : 'left')
      : (bucket.planePos > 0 ? 'back' : 'front');
    const segmentExclusions = windowExclusions[outerWallId] || [];

    segments.forEach((segment) => {
      const trimmedSegments = trimSegmentForExclusions(segment, segmentExclusions);
      trimmedSegments.forEach((trimmed) => {
        const width = trimmed.maxX - trimmed.minX;
        if (width < MIN_SEGMENT_WIDTH) return;

        surfaces.push({
          wallId: `outer-${outerWallId}`,
          axis: bucket.axis,
          sign: bucket.sign,
          planePos: bucket.planePos,
          rotY,
          segment: trimmed,
          width,
          isOuter: true,
        });
      });
    });
  });

  const deduped = dedupeSimilarSurfaces(surfaces);
  const sorted = deduped.sort((a, b) => b.width - a.width);
  if (sorted.length) return sorted;

  return getFallbackHangSurfaces(roomWidth, roomDepth, windowExclusions);
}

function dedupeSimilarSurfaces(surfaces) {
  const kept = [];

  surfaces.forEach((surface) => {
    const duplicate = kept.find((existing) => {
      const samePlane = existing.axis === surface.axis
        && Math.abs(existing.planePos - surface.planePos) < 0.2;
      const overlappingSegment = !(
        existing.segment.maxX <= surface.segment.minX + 0.2
        || existing.segment.minX >= surface.segment.maxX - 0.2
      );
      return samePlane && overlappingSegment;
    });

    if (!duplicate) {
      kept.push(surface);
      return;
    }

    if (surface.width > duplicate.width) {
      const index = kept.indexOf(duplicate);
      kept[index] = surface;
    }
  });

  return kept;
}

function extractOpeningBoxes(room, roomWidth, roomDepth, roomHeight) {
  const floorY = -roomHeight / 2;
  const boxes = [];

  room.updateMatrixWorld(true);
  room.traverse((child) => {
    if (!isOpeningMesh(child)) return;
    const box = new THREE.Box3().setFromObject(child);
    box.expandByScalar(WINDOW_EXCLUSION_MARGIN);
    box.min.y = Math.max(box.min.y, floorY + HANG_Y_MIN - 0.1);
    box.max.y = Math.min(box.max.y, floorY + HANG_Y_MAX + 0.35);
    boxes.push(box);
  });

  return boxes;
}

function extractOverhangBoxes(wallMeshes) {
  const meshes = Array.isArray(wallMeshes) ? wallMeshes : [wallMeshes].filter(Boolean);
  if (!meshes.length) return [];

  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();
  const edgeA = new THREE.Vector3();
  const edgeB = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const boxes = [];

  meshes.forEach((wallMesh) => {
    wallMesh.updateMatrixWorld(true);
    const geometry = wallMesh.geometry;
    const positionAttr = geometry.attributes.position;
    const index = geometry.index;
    const triangleCount = index ? index.count / 3 : positionAttr.count / 3;

    for (let tri = 0; tri < triangleCount; tri += 1) {
      const ia = index ? index.getX(tri * 3) : tri * 3;
      const ib = index ? index.getX(tri * 3 + 1) : tri * 3 + 1;
      const ic = index ? index.getX(tri * 3 + 2) : tri * 3 + 2;

      vA.fromBufferAttribute(positionAttr, ia).applyMatrix4(wallMesh.matrixWorld);
      vB.fromBufferAttribute(positionAttr, ib).applyMatrix4(wallMesh.matrixWorld);
      vC.fromBufferAttribute(positionAttr, ic).applyMatrix4(wallMesh.matrixWorld);

      edgeA.subVectors(vB, vA);
      edgeB.subVectors(vC, vA);
      normal.crossVectors(edgeA, edgeB);
      if (normal.lengthSq() < 1e-10) continue;
      normal.normalize();

      if (normal.y > -0.65) continue;

      const triBox = new THREE.Box3().setFromPoints([vA, vB, vC]);
      const size = new THREE.Vector3();
      triBox.getSize(size);
      if (Math.max(size.x, size.z) < 0.45 || size.y > 0.35) continue;

      triBox.expandByScalar(0.18);
      boxes.push(triBox);
    }
  });

  return boxes;
}

function slotOverlapsOpening(localX, localY, w, h, surface, roomWidth, roomDepth, roomHeight, openingBoxes, overhangBoxes) {
  const { position } = toWorldPosition(localX, localY, surface, roomWidth, roomDepth, roomHeight);
  const pieceBox = new THREE.Box3(
    new THREE.Vector3(position.x - w / 2, position.y - h / 2 - PLAQUE_CLEARANCE, position.z - 0.12),
    new THREE.Vector3(position.x + w / 2, position.y + h / 2, position.z + 0.12)
  );

  return [...openingBoxes, ...overhangBoxes].some((box) => box.intersectsBox(pieceBox));
}

function computeWallCaps(surfaces, maxDisplay) {
  if (!surfaces.length) return new Map();

  const sorted = [...surfaces].sort((a, b) => b.width - a.width);
  const caps = new Map();
  const minPerWall = maxDisplay >= surfaces.length ? 1 : 0;

  sorted.forEach((surface) => {
    const widthCap = Math.max(minPerWall, Math.floor((surface.width - 0.25) / 0.82));
    caps.set(surface.wallId, widthCap);
  });

  const mainWall = sorted[0];
  if (mainWall) {
    const mainCap = Math.max(2, Math.ceil(maxDisplay * MAX_MAIN_WALL_SHARE));
    caps.set(mainWall.wallId, Math.min(caps.get(mainWall.wallId), mainCap));
  }

  let totalCap = [...caps.values()].reduce((sum, cap) => sum + cap, 0);
  if (totalCap < maxDisplay) {
    sorted.forEach((surface) => {
      if (totalCap >= maxDisplay) return;
      const widthCap = Math.floor((surface.width - 0.25) / 0.82);
      if (caps.get(surface.wallId) < widthCap) {
        caps.set(surface.wallId, caps.get(surface.wallId) + 1);
        totalCap += 1;
      }
    });
  }

  return caps;
}

function layoutItemsOnSegment(items, segment, wallIndex, surface, placementContext) {
  const shuffledItems = seededShuffle(items, `${wallIndex}:${segment.minX}:${segment.maxX}`);
  const count = shuffledItems.length;
  if (count === 0) return { slots: [], unplaced: [] };

  const getPieceGap = (item, slotIndex) => {
    if (slotIndex >= count - 1) return 0;
    const seed = getItemSeed(item, slotIndex, wallIndex);
    return MIN_FRAME_GAP + hashSeed(seed, 'gap') * (MAX_FRAME_GAP - MIN_FRAME_GAP);
  };

  let sizes = shuffledItems.map((item, slotIndex) => getArtworkSize(item, slotIndex, wallIndex));
  sizes = fitSizesToSegmentHeight(sizes, segment);

  const gaps = shuffledItems.map((item, slotIndex) => getPieceGap(item, slotIndex));
  let totalWidth = sizes.reduce((sum, size) => sum + size.w, 0) + gaps.reduce((sum, gap) => sum + gap, 0);
  const { minX, maxX } = segment;
  const available = maxX - minX;

  if (available < 0.4) return { slots: [], unplaced: shuffledItems };

  if (totalWidth > available) {
    const frameWidthTotal = sizes.reduce((sum, size) => sum + size.w, 0);
    const gapTotal = gaps.reduce((sum, gap) => sum + gap, 0);
    const maxGap = Math.min(
      MAX_FRAME_GAP,
      Math.max(MIN_FRAME_GAP, (available - frameWidthTotal) / Math.max(count - 1, 1))
    );
    if (frameWidthTotal > 0) {
      const scale = Math.min(1, (available - Math.min(gapTotal, maxGap * Math.max(count - 1, 0))) / frameWidthTotal);
      if (scale < 1) {
        sizes = sizes.map((size) => ({
          w: size.w * scale,
          h: size.h * scale,
        }));
      }
    }
    totalWidth = sizes.reduce((sum, size) => sum + size.w, 0)
      + Math.min(gapTotal, maxGap * Math.max(count - 1, 0));
  }

  let startX = minX;
  if (totalWidth <= available) {
    startX = minX + (available - totalWidth) / 2;
  }

  const slots = [];
  const unplaced = [];
  const placedBounds = [];
  let cursor = startX;

  for (let i = 0; i < count; i += 1) {
    const item = shuffledItems[i];
    const size = sizes[i];
    const seed = getItemSeed(item, i, wallIndex);
    const pieceGap = gaps[i];

    if (cursor + size.w > maxX + 0.015) {
      unplaced.push(item);
      continue;
    }

    const x = cursor + size.w / 2;
    let localY = getPieceHangY(segment, size, seed);
    let bounds = getPieceBoundsWithPlaque(x, localY, size.w, size.h);
    let attempts = 0;

    while (placedBounds.some((placed) => boundsOverlap(bounds, placed)) && attempts < 8) {
      localY = getPieceHangY(segment, size, hashSeed(seed, attempts));
      bounds = getPieceBoundsWithPlaque(x, localY, size.w, size.h);
      attempts += 1;
    }

    if (placedBounds.some((placed) => boundsOverlap(bounds, placed))) {
      unplaced.push(item);
      continue;
    }

    if (slotOverlapsOpening(
      x,
      localY,
      size.w,
      size.h,
      surface,
      placementContext.roomWidth,
      placementContext.roomDepth,
      placementContext.roomHeight,
      placementContext.openingBoxes,
      placementContext.overhangBoxes
    )) {
      unplaced.push(item);
      continue;
    }

    slots.push({
      item,
      size,
      localX: x,
      localY,
    });
    placedBounds.push(bounds);

    cursor += size.w + pieceGap;
  }

  return { slots, unplaced };
}

function getWallPlanePos(planePositions, depths, sign, maxDepth, { side, spawnX } = {}) {
  if (!planePositions.length) return 0;

  const depthCutoff = maxDepth - 0.75;
  let positions = planePositions.filter((_, index) => depths[index] >= depthCutoff);
  if (positions.length < 3) positions = planePositions;

  if (side === 'left') {
    const leftPositions = positions.filter((pos) => pos < spawnX - 3.5);
    const fallbackPositions = positions.filter((pos) => pos < spawnX - 2.5);
    const useLeft = leftPositions.length >= 3
      ? leftPositions
      : fallbackPositions;
    const sortedLeft = [...useLeft].sort((a, b) => a - b);
    const idx = Math.floor(sortedLeft.length * 0.95);
    return sortedLeft[Math.min(sortedLeft.length - 1, Math.max(0, idx))];
  }

  return sign > 0 ? Math.max(...positions) : Math.min(...positions);
}

function filterGroupToSide(group, spawnX, spawnZ, side) {
  if (side !== 'left') return group;

  const filtered = {
    ...group,
    points: [],
    planePositions: [],
    depths: [],
  };

  group.planePositions.forEach((planePos, index) => {
    const onLeft = group.axis === 'x'
      ? (group.sign > 0 ? planePos < spawnX - 3.5 : planePos > spawnX + 3.5)
      : false;
    if (!onLeft) return;

    filtered.points.push(group.points[index]);
    filtered.planePositions.push(planePos);
    filtered.depths.push(group.depths[index]);
  });

  return filtered.points.length >= 3 ? filtered : null;
}

function buildSurfaceFromGroup(group, wallId, spawnX, spawnZ, edgeMargin = 0.55) {
  const maxDepth = group.depths.length ? Math.max(...group.depths) : 0;
  const segments = findBinnedHorizontalSegments(group.points);
  if (!segments.length) return null;

  const uValues = group.points.map((point) => point.u);
  const globalMin = Math.min(...uValues);
  const globalMax = Math.max(...uValues);
  const margin = wallId === 'left-wall' ? Math.min(edgeMargin, 0.3) : edgeMargin;
  const trimmed = {
    minX: globalMin + margin,
    maxX: globalMax - margin,
    hangY: HANG_HEIGHT,
    minY: HANG_Y_MIN,
    maxY: HANG_Y_MAX,
  };
  const width = trimmed.maxX - trimmed.minX;
  if (width < MIN_SEGMENT_WIDTH) return null;

  const planePos = getWallPlanePos(
    group.planePositions,
    group.depths,
    group.sign,
    maxDepth,
    {
      side: wallId === 'left-wall' ? 'left' : undefined,
      spawnX,
    }
  );
  const expectedNormal = group.axis === 'x'
    ? new THREE.Vector3(group.sign, 0, 0)
    : new THREE.Vector3(0, 0, group.sign);

  return {
    wallId,
    axis: group.axis,
    sign: group.sign,
    planePos,
    rotY: Math.atan2(expectedNormal.x, expectedNormal.z),
    segment: trimmed,
    segments,
    width,
    isOuter: false,
    depth: maxDepth,
  };
}

function collectFacingWallGroups(wallMeshes, spawnX, spawnZ, yaw, floorY) {
  const meshes = Array.isArray(wallMeshes) ? wallMeshes : [wallMeshes].filter(Boolean);
  if (!meshes.length) return new Map();

  const lookDir = new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw)).normalize();
  const wallGroups = new Map();
  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();
  const edgeA = new THREE.Vector3();
  const edgeB = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const center = new THREE.Vector3();

  meshes.forEach((wallMesh) => {
    wallMesh.updateMatrixWorld(true);
    const geometry = wallMesh.geometry;
    const positionAttr = geometry.attributes.position;
    const index = geometry.index;
    const triangleCount = index ? index.count / 3 : positionAttr.count / 3;

    for (let tri = 0; tri < triangleCount; tri += 1) {
      const ia = index ? index.getX(tri * 3) : tri * 3;
      const ib = index ? index.getX(tri * 3 + 1) : tri * 3 + 1;
      const ic = index ? index.getX(tri * 3 + 2) : tri * 3 + 2;

      vA.fromBufferAttribute(positionAttr, ia).applyMatrix4(wallMesh.matrixWorld);
      vB.fromBufferAttribute(positionAttr, ib).applyMatrix4(wallMesh.matrixWorld);
      vC.fromBufferAttribute(positionAttr, ic).applyMatrix4(wallMesh.matrixWorld);

      edgeA.subVectors(vB, vA);
      edgeB.subVectors(vC, vA);
      normal.crossVectors(edgeA, edgeB);
      if (normal.lengthSq() < 1e-10) continue;
      normal.normalize();

      if (Math.abs(normal.y) > 0.45) continue;
      if (normal.dot(lookDir) > 0.45) continue;

      center.copy(vA).add(vB).add(vC).multiplyScalar(1 / 3);
      const toCenter = new THREE.Vector3(center.x - spawnX, 0, center.z - spawnZ);
      const depth = toCenter.dot(lookDir);
      if (depth < 0.35) continue;

      const localY = center.y - floorY;
      if (localY < HANG_Y_MIN - 0.15 || localY > HANG_Y_MAX + 0.35) continue;

      const axis = Math.abs(normal.x) >= Math.abs(normal.z) ? 'x' : 'z';
      const sign = axis === 'x' ? (Math.sign(normal.x) || 1) : (Math.sign(normal.z) || 1);
      const groupKey = `${axis}_${sign}`;
      const planePos = axis === 'x' ? center.x : center.z;

      let u;
      if (axis === 'x') {
        u = sign > 0 ? -center.z : center.z;
      } else {
        u = sign > 0 ? center.x : -center.x;
      }

      if (!wallGroups.has(groupKey)) {
        wallGroups.set(groupKey, {
          axis,
          sign,
          points: [],
          planePositions: [],
          depths: [],
          normal: normal.clone(),
        });
      }

      const group = wallGroups.get(groupKey);
      group.points.push({ u, y: localY });
      group.planePositions.push(planePos);
      group.depths.push(depth);
    }
  });

  return wallGroups;
}

function findSpawnWallSurfaces(wallMeshes, spawnX, spawnZ, yaw, floorY) {
  const wallGroups = collectFacingWallGroups(wallMeshes, spawnX, spawnZ, yaw, floorY);
  if (!wallGroups.size) return [];

  const lookDir = new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw)).normalize();
  const leftDir = new THREE.Vector3(-Math.cos(yaw), 0, -Math.sin(yaw)).normalize();

  let entryGroup = null;
  let leftGroup = null;

  wallGroups.forEach((group) => {
    const expectedNormal = group.axis === 'x'
      ? new THREE.Vector3(group.sign, 0, 0)
      : new THREE.Vector3(0, 0, group.sign);
    const lookAlignment = expectedNormal.dot(lookDir);
    const leftAlignment = expectedNormal.dot(leftDir);
    const segments = findBinnedHorizontalSegments(group.points);
    if (!segments.length) return;

    const widestWidth = Math.max(...segments.map((segment) => segment.maxX - segment.minX));

    if (lookAlignment < -0.55) {
      if (!entryGroup || lookAlignment < entryGroup.lookAlignment
        || (Math.abs(lookAlignment - entryGroup.lookAlignment) <= 0.05 && widestWidth > entryGroup.widestWidth)) {
        entryGroup = {
          ...group,
          lookAlignment,
          widestWidth,
        };
      }
    }

    if (Math.abs(lookAlignment) < 0.35 && leftAlignment < -0.55 && group.axis === 'x') {
      const leftGroupCandidate = filterGroupToSide(group, spawnX, spawnZ, 'left');
      if (!leftGroupCandidate) return;

      const leftSegments = findBinnedHorizontalSegments(leftGroupCandidate.points);
      if (!leftSegments.length) return;

      const leftWidth = Math.max(...leftSegments.map((segment) => segment.maxX - segment.minX));
      if (!leftGroup || leftAlignment < leftGroup.leftAlignment
        || (Math.abs(leftAlignment - leftGroup.leftAlignment) <= 0.05 && leftWidth > leftGroup.widestWidth)) {
        leftGroup = {
          ...leftGroupCandidate,
          leftAlignment,
          widestWidth: leftWidth,
        };
      }
    }
  });

  const surfaces = [];

  if (entryGroup) {
    const entrySurface = buildSurfaceFromGroup(entryGroup, 'entry-wall', spawnX, spawnZ);
    if (entrySurface) surfaces.push(entrySurface);
  }

  if (leftGroup) {
    const leftSurface = buildSurfaceFromGroup(leftGroup, 'left-wall', spawnX, spawnZ);
    if (leftSurface) surfaces.push(leftSurface);
  }

  return surfaces;
}

function splitItemsAcrossSurfaces(items, surfaces) {
  if (!items.length || !surfaces.length) return [];

  const totalWidth = surfaces.reduce((sum, surface) => sum + surface.width, 0);
  const counts = surfaces.map((surface) => {
    const share = (surface.width / totalWidth) * items.length;
    return Math.max(1, Math.round(share));
  });

  let totalAssigned = counts.reduce((sum, count) => sum + count, 0);
  while (totalAssigned > items.length) {
    const index = counts.indexOf(Math.max(...counts));
    counts[index] -= 1;
    totalAssigned -= 1;
  }
  while (totalAssigned < items.length) {
    const index = counts.reduce((best, count, current) => (
      surfaces[current].width > surfaces[best].width ? current : best
    ), 0);
    counts[index] += 1;
    totalAssigned += 1;
  }

  const assignments = [];
  let itemIndex = 0;

  surfaces.forEach((surface, wallIndex) => {
    const wallItems = items.slice(itemIndex, itemIndex + counts[wallIndex]);
    itemIndex += counts[wallIndex];
    if (wallItems.length) {
      assignments.push({ surface, wallIndex, items: wallItems });
    }
  });

  return assignments;
}

function splitItemsAcrossZones(items, zoneEntries) {
  if (!items.length || !zoneEntries.length) return [];

  const totalArea = zoneEntries.reduce((sum, entry) => {
    const { zone } = entry;
    return sum + Math.max(0.2, (zone.maxU - zone.minU) * (zone.maxY - zone.minY));
  }, 0);

  const counts = zoneEntries.map((entry) => {
    const { zone } = entry;
    const area = Math.max(0.2, (zone.maxU - zone.minU) * (zone.maxY - zone.minY));
    return Math.max(0, Math.round((area / totalArea) * items.length));
  });

  let assigned = counts.reduce((sum, count) => sum + count, 0);
  while (assigned > items.length) {
    const index = counts.indexOf(Math.max(...counts));
    counts[index] -= 1;
    assigned -= 1;
  }
  while (assigned < items.length) {
    const index = counts.reduce((best, count, current) => {
      const areaA = (zoneEntries[current].zone.maxU - zoneEntries[current].zone.minU)
        * (zoneEntries[current].zone.maxY - zoneEntries[current].zone.minY);
      const areaB = (zoneEntries[best].zone.maxU - zoneEntries[best].zone.minU)
        * (zoneEntries[best].zone.maxY - zoneEntries[best].zone.minY);
      return areaA > areaB ? current : best;
    }, 0);
    counts[index] += 1;
    assigned += 1;
  }

  const assignments = [];
  let itemIndex = 0;

  zoneEntries.forEach((entry, zoneIndex) => {
    const count = counts[zoneIndex];
    if (!count) return;
    const zoneItems = items.slice(itemIndex, itemIndex + count);
    itemIndex += count;
    if (zoneItems.length) {
      assignments.push({ ...entry, zoneIndex, items: zoneItems });
    }
  });

  return assignments;
}

function resolveHangZones(hangZones, surfaces) {
  if (!hangZones?.length) return [];

  const surfaceMap = new Map(surfaces.map((surface) => [surface.wallId, surface]));

  return hangZones
    .filter((zone) => zone.enabled)
    .map((zone) => {
      const surface = surfaceMap.get(zone.wallId);
      if (!surface) return null;

      const wallBounds = WALL_ZONE_BOUNDS[zone.wallId];
      let minU = zone.minU;
      let maxU = zone.maxU;

      if (wallBounds) {
        minU = Math.max(minU, wallBounds.minU);
        maxU = Math.min(maxU, wallBounds.maxU);
      }

      const minY = zone.minY;
      const maxY = zone.maxY;

      const seg = surface.segment;
      if (seg) {
        const overlapMin = Math.max(minU, seg.minX);
        const overlapMax = Math.min(maxU, seg.maxX);
        if (overlapMax - overlapMin >= MIN_SEGMENT_WIDTH) {
          minU = overlapMin;
          maxU = overlapMax;
        }
      }

      if (maxU - minU < MIN_SEGMENT_WIDTH || maxY - minY < 0.2) return null;

      return {
        zone,
        surface,
        segment: {
          minX: minU,
          maxX: maxU,
          minY,
          maxY,
          hangY: minY + (maxY - minY) * 0.8,
        },
      };
    })
    .filter(Boolean);
}

function assignItemsToZonesGreedy(items, zoneStates) {
  const usage = zoneStates.map((state) => ({
    used: 0,
    width: state.segment.maxX - state.segment.minX,
  }));

  items.forEach((item, itemIndex) => {
    const size = getArtworkSize(item, itemIndex, itemIndex);
    const needed = size.w + MIN_FRAME_GAP;

    const ranked = zoneStates
      .map((state, index) => ({
        index,
        free: usage[index].width - usage[index].used,
      }))
      .filter((entry) => entry.free >= size.w * 0.55)
      .sort((a, b) => b.free - a.free);

    const pick = ranked[0] ?? zoneStates
      .map((state, index) => ({
        index,
        free: usage[index].width - usage[index].used,
      }))
      .sort((a, b) => b.free - a.free)[0];

    if (!pick) return;

    zoneStates[pick.index].items.push(item);
    usage[pick.index].used += needed;
  });
}

function layoutZoneStates(zoneStates, placementContext) {
  const placements = [];
  const unplaced = [];

  zoneStates.forEach((state) => {
    if (!state.items.length) return;

    const { slots, unplaced: zoneUnplaced } = layoutItemsOnSegment(
      state.items,
      state.segment,
      state.zoneIndex,
      state.surface,
      placementContext
    );

    state.items = slots.map((slot) => slot.item);

    slots.forEach((slot) => {
      placements.push({
        item: slot.item,
        size: slot.size,
        localX: slot.localX,
        localY: slot.localY,
        surface: state.surface,
      });
    });

    zoneUnplaced.forEach((item) => {
      unplaced.push({ item, fromZoneId: state.zone.id });
    });
  });

  return { placements, unplaced };
}

function redistributeUnplacedItems(unplacedEntries, zoneStates, placementContext) {
  let pending = [...unplacedEntries];
  let guard = 0;

  while (pending.length && guard < pending.length * zoneStates.length * 2) {
    guard += 1;
    const entry = pending.shift();
    const { item, fromZoneId } = entry;

    const fromState = zoneStates.find((state) => state.zone.id === fromZoneId);
    if (fromState) {
      fromState.items = fromState.items.filter((candidate) => candidate !== item);
    }

    const candidates = zoneStates
      .filter((state) => state.zone.id !== fromZoneId)
      .map((state) => ({
        state,
        free: state.segment.maxX - state.segment.minX,
      }))
      .sort((a, b) => b.free - a.free);

    let moved = false;

    for (const { state } of candidates) {
      const trialItems = [...state.items, item];
      const trial = layoutItemsOnSegment(
        trialItems,
        state.segment,
        state.zoneIndex,
        state.surface,
        placementContext
      );

      if (!trial.unplaced.includes(item)) {
        state.items = trialItems;
        moved = true;
        break;
      }
    }

    if (!moved && fromState) {
      fromState.items.push(item);
    } else if (!moved) {
      pending.push(entry);
    }
  }

  return pending;
}

function distributeItemsOnSpawnWalls(items, maxDisplay, surfaces, placementContext, hangZones = null) {
  const displayItems = items.slice(0, maxDisplay);
  const validSurfaces = surfaces.filter((surface) => surface && surface.width >= MIN_SEGMENT_WIDTH);
  if (!displayItems.length || !validSurfaces.length) return [];

  const resolvedZones = resolveHangZones(hangZones, validSurfaces);
  const placements = [];

  if (resolvedZones.length) {
    const zoneStates = resolvedZones.map((entry, zoneIndex) => ({
      ...entry,
      zoneIndex,
      items: [],
    }));

    assignItemsToZonesGreedy(seededShuffle(displayItems, 'gallery-pack'), zoneStates);

    let { placements: packed, unplaced } = layoutZoneStates(zoneStates, placementContext);
    const leftover = redistributeUnplacedItems(unplaced, zoneStates, placementContext);

    if (leftover.length) {
      leftover.forEach(({ item, fromZoneId }) => {
        const state = zoneStates.find((entry) => entry.zone.id === fromZoneId)
          ?? zoneStates.reduce((best, entry) => {
            const free = entry.segment.maxX - entry.segment.minX;
            const bestFree = best.segment.maxX - best.segment.minX;
            return free > bestFree ? entry : best;
          }, zoneStates[0]);
        if (state && !state.items.includes(item)) {
          state.items.push(item);
        }
      });
      ({ placements: packed } = layoutZoneStates(zoneStates, placementContext));
    }

    return packed;
  }

  const assignments = splitItemsAcrossSurfaces(displayItems, validSurfaces);

  assignments.forEach(({ surface, wallIndex, items: wallItems }) => {
    const { slots } = layoutItemsOnSegment(
      wallItems,
      surface.segment,
      wallIndex,
      surface,
      placementContext
    );

    slots.forEach((slot) => {
      placements.push({
        item: slot.item,
        size: slot.size,
        localX: slot.localX,
        localY: slot.localY,
        surface,
      });
    });
  });

  return placements;
}

function findEntryWallSurface(wallMeshes, spawnX, spawnZ, yaw, floorY) {
  const surfaces = findSpawnWallSurfaces(wallMeshes, spawnX, spawnZ, yaw, floorY);
  return surfaces.find((surface) => surface.wallId === 'entry-wall') || surfaces[0] || null;
}

function distributeItemsOnEntryWall(items, maxDisplay, entrySurface, placementContext, hangZones = null) {
  return distributeItemsOnSpawnWalls(items, maxDisplay, [entrySurface], placementContext, hangZones);
}

function distributeItems(items, maxDisplay, placementContext) {
  const {
    hangSurfaces = [],
  } = placementContext;
  const displayItems = items.slice(0, maxDisplay);
  const surfaces = hangSurfaces.filter((surface) => surface.width >= MIN_SEGMENT_WIDTH);

  if (!surfaces.length || !displayItems.length) return [];

  const wallCaps = computeWallCaps(surfaces, maxDisplay);
  const surfaceQueues = surfaces.map((surface) => ({
    ...surface,
    items: [],
    maxItems: wallCaps.get(surface.wallId) || 1,
  }));

  const assignedIds = new Set();

  displayItems.forEach((item) => {
    const ranked = [...surfaceQueues].sort((a, b) => {
      const loadA = a.items.length / Math.max(a.maxItems, 1);
      const loadB = b.items.length / Math.max(b.maxItems, 1);
      if (Math.abs(loadA - loadB) > 0.04) return loadA - loadB;
      if (a.items.length === 0 && b.items.length > 0) return -1;
      if (b.items.length === 0 && a.items.length > 0) return 1;
      return b.width - a.width;
    });

    const target = ranked.find((surface) => surface.items.length < surface.maxItems);
    if (target) {
      target.items.push(item);
      assignedIds.add(item.id ?? item._id ?? item.name);
    }
  });

  let overflowItems = displayItems.filter((item) => !assignedIds.has(item.id ?? item._id ?? item.name));
  const placements = [];

  surfaceQueues.forEach((surface, wallIndex) => {
    if (!surface.items.length) return;

    const { slots, unplaced } = layoutItemsOnSegment(
      surface.items,
      surface.segment,
      wallIndex,
      surface,
      placementContext
    );

    overflowItems = overflowItems.concat(unplaced);

    slots.forEach((slot) => {
      placements.push({
        item: slot.item,
        size: slot.size,
        localX: slot.localX,
        localY: slot.localY,
        surface,
      });
    });
  });

  overflowItems.forEach((item) => {
    const ranked = [...surfaceQueues]
      .filter((surface) => surface.items.length < surface.maxItems + 1)
      .sort((a, b) => b.width - a.width);

    for (const surface of ranked) {
      const { slots } = layoutItemsOnSegment(
        [item],
        surface.segment,
        0,
        surface,
        placementContext
      );
      if (!slots.length) continue;
      placements.push({
        item: slots[0].item,
        size: slots[0].size,
        localX: slots[0].localX,
        localY: slots[0].localY,
        surface,
      });
      break;
    }
  });

  return placements;
}

function worldToZoneCoords(point, surface, floorY) {
  const y = point.y - floorY;
  if (surface.axis === 'z') {
    return { u: surface.sign > 0 ? point.x : -point.x, y };
  }
  return { u: surface.sign > 0 ? -point.z : point.z, y };
}

function getWallPlaneNormal(surface) {
  if (surface.axis === 'x') {
    return new THREE.Vector3(surface.sign, 0, 0);
  }
  return new THREE.Vector3(0, 0, surface.sign);
}

function getZonePlacement(zone, surface, floorY, roomWidth, roomDepth, roomHeight) {
  const centerU = (zone.minU + zone.maxU) / 2;
  const centerY = (zone.minY + zone.maxY) / 2;
  const width = Math.max(0.2, zone.maxU - zone.minU);
  const height = Math.max(0.2, zone.maxY - zone.minY);
  const { position, rotation } = toWorldPosition(centerU, centerY, surface, roomWidth, roomDepth, roomHeight);
  const normal = getWallPlaneNormal(surface);
  position.add(normal.clone().multiplyScalar(0.025));

  return { position, rotation, width, height, normal };
}

function raycastWallUV(mouse, raycaster, camera, surface, floorY, roomWidth, roomDepth, roomHeight) {
  const bounds = {
    minU: surface.segment.minX,
    maxU: surface.segment.maxX,
    minY: HANG_Y_MIN,
    maxY: HANG_Y_MAX,
  };
  const { position } = getZonePlacement(bounds, surface, floorY, roomWidth, roomDepth, roomHeight);
  const normal = getWallPlaneNormal(surface);
  const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, position);
  raycaster.setFromCamera(mouse, camera);
  const hit = new THREE.Vector3();
  if (!raycaster.ray.intersectPlane(plane, hit)) return null;
  return worldToZoneCoords(hit, surface, floorY);
}

function applyZoneHandleDrag(origin, handle, du, dy) {
  switch (handle) {
    case 'move':
      return {
        minU: origin.minU + du,
        maxU: origin.maxU + du,
        minY: origin.minY + dy,
        maxY: origin.maxY + dy,
      };
    case 'nw':
      return { minU: origin.minU + du, maxU: origin.maxU, minY: origin.minY, maxY: origin.maxY + dy };
    case 'ne':
      return { minU: origin.minU, maxU: origin.maxU + du, minY: origin.minY, maxY: origin.maxY + dy };
    case 'sw':
      return { minU: origin.minU + du, maxU: origin.maxU, minY: origin.minY + dy, maxY: origin.maxY };
    case 'se':
      return { minU: origin.minU, maxU: origin.maxU + du, minY: origin.minY + dy, maxY: origin.maxY };
    case 'n':
      return { ...origin, maxY: origin.maxY + dy };
    case 's':
      return { ...origin, minY: origin.minY + dy };
    case 'w':
      return { ...origin, minU: origin.minU + du };
    case 'e':
      return { ...origin, maxU: origin.maxU + du };
    default:
      return origin;
  }
}

function getZoneHandlePositions(zone) {
  const centerU = (zone.minU + zone.maxU) / 2;
  const centerY = (zone.minY + zone.maxY) / 2;
  return [
    { handle: 'nw', u: zone.minU, y: zone.maxY, kind: 'corner' },
    { handle: 'ne', u: zone.maxU, y: zone.maxY, kind: 'corner' },
    { handle: 'sw', u: zone.minU, y: zone.minY, kind: 'corner' },
    { handle: 'se', u: zone.maxU, y: zone.minY, kind: 'corner' },
    { handle: 'n', u: centerU, y: zone.maxY, kind: 'edge' },
    { handle: 's', u: centerU, y: zone.minY, kind: 'edge' },
    { handle: 'w', u: zone.minU, y: centerY, kind: 'edge' },
    { handle: 'e', u: zone.maxU, y: centerY, kind: 'edge' },
  ];
}

function createWallZone3DEditor({
  scene,
  camera,
  raycaster,
  mouse,
  surfaces,
  floorY,
  roomWidth,
  roomDepth,
  roomHeight,
  getZones,
  onZonesChange,
  onSelectZone,
  getSelectedZoneId,
}) {
  const root = new THREE.Group();
  root.name = 'wall-zone-editor';
  root.renderOrder = 20;
  scene.add(root);

  const surfaceMap = new Map(surfaces.map((surface) => [surface.wallId, surface]));
  let enabled = false;
  let dragState = null;
  let pulseZoneId = null;
  let pulseStart = 0;

  const rebuild = () => {
    while (root.children.length) {
      root.remove(root.children[0]);
    }
    if (!enabled) return;

    const selectedId = getSelectedZoneId?.() ?? null;

    getZones().forEach((zone) => {
      const surface = surfaceMap.get(zone.wallId);
      if (!surface) return;

      const isSelected = zone.id === selectedId;
      const isPulsing = zone.id === pulseZoneId;
      const { position, rotation, width, height } = getZonePlacement(
        zone,
        surface,
        floorY,
        roomWidth,
        roomDepth,
        roomHeight
      );
      const normal = getWallPlaneNormal(surface);
      const offset = normal.clone().multiplyScalar(0.028);

      const fill = new THREE.Mesh(
        new THREE.PlaneGeometry(width, height),
        new THREE.MeshBasicMaterial({
          color: isSelected ? 0x8fd46a : (zone.enabled ? 0xc4a46c : 0x888888),
          transparent: true,
          opacity: isSelected ? 0.42 : (zone.enabled ? 0.3 : 0.16),
          depthWrite: false,
          side: THREE.DoubleSide,
        })
      );
      fill.position.copy(position);
      fill.rotation.copy(rotation);
      fill.userData = { type: 'zone-body', zoneId: zone.id, wallId: zone.wallId };
      if (isPulsing) fill.scale.set(1.06, 1.06, 1);
      root.add(fill);

      const outline = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.PlaneGeometry(width, height)),
        new THREE.LineBasicMaterial({
          color: isSelected ? 0xb8ff9a : 0xf3d08d,
          depthTest: false,
          linewidth: 2,
        })
      );
      outline.position.copy(position);
      outline.rotation.copy(rotation);
      outline.renderOrder = 21;
      if (isPulsing) outline.scale.set(1.06, 1.06, 1);
      root.add(outline);

      const label = makeZoneLabel(
        `${zone.label}\n${(zone.maxU - zone.minU).toFixed(1)}×${(zone.maxY - zone.minY).toFixed(1)} m`
      );
      label.position.copy(position).add(offset.clone().multiplyScalar(1.4));
      label.rotation.copy(rotation);
      label.renderOrder = 23;
      root.add(label);

      if (isSelected) {
        getZoneHandlePositions(zone).forEach(({ handle, u, y, kind }) => {
          const handleMesh = new THREE.Mesh(
            kind === 'corner'
              ? new THREE.SphereGeometry(0.1, 14, 14)
              : new THREE.BoxGeometry(0.11, 0.11, 0.11),
            new THREE.MeshBasicMaterial({
              color: kind === 'corner' ? 0xffe08a : 0xffffff,
              depthTest: false,
            })
          );
          const { position: handlePos, rotation: handleRot } = toWorldPosition(
            u,
            y,
            surface,
            roomWidth,
            roomDepth,
            roomHeight
          );
          handleMesh.position.copy(handlePos).add(offset.clone().multiplyScalar(2));
          handleMesh.rotation.copy(handleRot);
          handleMesh.userData = { type: 'zone-handle', zoneId: zone.id, wallId: zone.wallId, handle };
          handleMesh.renderOrder = 24;
          root.add(handleMesh);
        });
      }
    });
  };

  const pickZoneTarget = () => {
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(root.children, true);
    if (!hits.length) return null;

    for (let i = 0; i < hits.length; i += 1) {
      let object = hits[i].object;
      while (object) {
        if (object.userData?.zoneId) return object.userData;
        object = object.parent;
      }
    }
    return null;
  };

  const raycastAnyWall = () => {
    let best = null;
    surfaces.forEach((surface) => {
      const bounds = {
        minU: surface.segment.minX,
        maxU: surface.segment.maxX,
        minY: HANG_Y_MIN,
        maxY: HANG_Y_MAX,
      };
      const { position } = getZonePlacement(bounds, surface, floorY, roomWidth, roomDepth, roomHeight);
      const normal = getWallPlaneNormal(surface);
      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, position);
      raycaster.setFromCamera(mouse, camera);
      const hit = new THREE.Vector3();
      if (!raycaster.ray.intersectPlane(plane, hit)) return;
      const distance = camera.position.distanceTo(hit);
      if (!best || distance < best.distance) {
        best = {
          surface,
          uv: worldToZoneCoords(hit, surface, floorY),
          distance,
        };
      }
    });
    return best;
  };

  const setZonesList = (next, { pulseId = null } = {}) => {
    onZonesChange(next);
    if (pulseId) {
      pulseZoneId = pulseId;
      pulseStart = performance.now();
    }
    rebuild();
  };

  const updateZone = (zoneId, updater) => {
    const next = getZones().map((zone) => {
      if (zone.id !== zoneId) return zone;
      const updated = clampZoneToBounds(updater({ ...zone }));
      if (updated.maxU - updated.minU < 0.4 || updated.maxY - updated.minY < 0.22) {
        return zone;
      }
      return updated;
    });
    onZonesChange(next);
    rebuild();
  };

  const addZoneAtUV = (wallId, u, y) => {
    const index = getZones().filter((zone) => zone.wallId === wallId).length;
    const zone = createZoneAtUV(wallId, u, y, index);
    setZonesList([...getZones(), zone], { pulseId: zone.id });
    onSelectZone?.(zone.id);
    return zone.id;
  };

  const deleteSelectedZone = () => {
    const selectedId = getSelectedZoneId?.();
    if (!selectedId) return false;
    setZonesList(getZones().filter((zone) => zone.id !== selectedId));
    onSelectZone?.(null);
    return true;
  };

  const onPointerDown = (event) => {
    if (!enabled) return false;
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    const target = pickZoneTarget();
    if (target?.zoneId) {
      onSelectZone?.(target.zoneId);

      const zone = getZones().find((entry) => entry.id === target.zoneId);
      const surface = surfaceMap.get(target.wallId);
      if (!zone || !surface) return false;

      const uv = raycastWallUV(mouse, raycaster, camera, surface, floorY, roomWidth, roomDepth, roomHeight);
      if (!uv) return false;

      dragState = {
        zoneId: zone.id,
        wallId: zone.wallId,
        mode: target.type === 'zone-handle' ? target.handle : 'move',
        origin: { ...zone },
        startUV: uv,
      };
      return true;
    }

    return false;
  };

  const onPointerMove = (event) => {
    if (!enabled || !dragState) return false;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    const surface = surfaceMap.get(dragState.wallId);
    if (!surface) return false;

    const uv = raycastWallUV(mouse, raycaster, camera, surface, floorY, roomWidth, roomDepth, roomHeight);
    if (!uv) return false;

    const du = uv.u - dragState.startUV.u;
    const dy = uv.y - dragState.startUV.y;
    const o = dragState.origin;

    updateZone(dragState.zoneId, (zone) => ({
      ...zone,
      ...applyZoneHandleDrag(o, dragState.mode, du, dy),
    }));

    return true;
  };

  const onPointerUp = () => {
    if (!dragState) return false;
    dragState = null;
    return true;
  };

  const onDoubleClick = (event) => {
    if (!enabled) return false;
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    if (pickZoneTarget()?.zoneId) return false;

    const hit = raycastAnyWall();
    if (!hit) return false;

    addZoneAtUV(hit.surface.wallId, hit.uv.u, hit.uv.y);
    return true;
  };

  const tick = () => {
    if (pulseZoneId && performance.now() - pulseStart > 900) {
      pulseZoneId = null;
      rebuild();
    }
  };

  return {
    setEnabled(value) {
      enabled = value;
      root.visible = value;
      rebuild();
    },
    setZones() {
      rebuild();
    },
    setSelectedZoneId() {
      rebuild();
    },
    addZoneAtUV,
    deleteSelectedZone,
    rebuild,
    tick,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onDoubleClick,
    dispose() {
      scene.remove(root);
    },
  };
}

function makeZoneLabel(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(18, 16, 14, 0.82)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#f3e8d8';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const lines = String(text).split('\n').slice(0, 2);
  const lineHeight = 26;
  const startY = canvas.height / 2 - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, index) => {
    ctx.fillText(line.slice(0, 22), canvas.width / 2, startY + index * lineHeight);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.2), material);
  mesh.renderOrder = 23;
  return mesh;
}

function getWallPlacementOffsets(surface) {
  if (surface.wallId === 'left-wall') {
    return { inset: -0.006, wallOffset: -0.032, localDepthOffset: -0.024 };
  }
  if (surface.wallId === 'entry-wall') {
    return { inset: 0.038, wallOffset: 0.012, localDepthOffset: 0 };
  }
  return { inset: 0.21, wallOffset: 0.05, localDepthOffset: 0 };
}

function toWorldPosition(localX, localY, surface, roomWidth, roomDepth, roomHeight) {
  const { inset } = getWallPlacementOffsets(surface);
  const floorY = -roomHeight / 2;
  const position = new THREE.Vector3();
  const rotation = new THREE.Euler(0, surface.rotY, 0);
  const y = floorY + localY;

  if (surface.axis === 'x') {
    position.set(
      surface.planePos + surface.sign * inset,
      y,
      surface.sign > 0 ? -localX : localX
    );
  } else if (surface.axis === 'z') {
    position.set(
      surface.sign > 0 ? localX : -localX,
      y,
      surface.planePos + surface.sign * inset
    );
  } else if (surface.rotY === 0) {
    position.set(localX, y, -roomDepth / 2 + inset);
  } else if (surface.rotY === Math.PI) {
    position.set(-localX, y, roomDepth / 2 - inset);
  } else if (surface.rotY === -Math.PI / 2) {
    position.set(roomWidth / 2 - inset, y, localX);
  } else {
    position.set(-roomWidth / 2 + inset, y, -localX);
  }

  return { position, rotation };
}

function createPlaqueTexture(title, description) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 512;
  canvas.height = 96;

  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#2a2520');
  gradient.addColorStop(1, '#1a1613');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = '#8a7355';
  context.lineWidth = 3;
  context.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

  context.fillStyle = '#e8dcc8';
  context.font = 'bold 28px Georgia, serif';
  context.textAlign = 'center';
  context.fillText(title.slice(0, 36), canvas.width / 2, 40);

  context.fillStyle = '#c4b8a4';
  context.font = '20px Georgia, serif';
  const desc = description.length > 48 ? `${description.slice(0, 48)}…` : description;
  context.fillText(desc, canvas.width / 2, 72);

  return canvas;
}

function mountFramedArtwork({
  texture,
  item,
  size,
  position,
  rotation,
  index,
  itemKey,
  scene,
  artworkMeshes,
  wallOffset = 0.06,
  localDepthOffset = 0,
}) {
  const group = new THREE.Group();
  group.position.copy(position);
  group.rotation.copy(rotation);
  group.renderOrder = 10;

  const forward = new THREE.Vector3(
    Math.sin(rotation.y) * wallOffset,
    0,
    Math.cos(rotation.y) * wallOffset
  );
  group.position.add(forward);

  const canvasWidth = size.w;
  const canvasHeight = size.h;
  const frameThickness = 0.025;
  const frameDepth = 0.02;

  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x0a0a0a,
    roughness: 0.65,
    metalness: 0.05,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });

  const artMaterial = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.9,
    metalness: 0,
    emissiveMap: texture,
    emissive: 0xffffff,
    emissiveIntensity: 0.28,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
    depthWrite: true,
  });

  const frameZ = frameDepth / 2 + localDepthOffset;
  const frontZ = frameDepth + localDepthOffset;
  const artZ = frontZ + 0.001;

  const frameParts = [
    [canvasWidth + frameThickness * 2, frameThickness, frameDepth, 0, canvasHeight / 2 + frameThickness / 2],
    [canvasWidth + frameThickness * 2, frameThickness, frameDepth, 0, -canvasHeight / 2 - frameThickness / 2],
    [frameThickness, canvasHeight, frameDepth, -canvasWidth / 2 - frameThickness / 2, 0],
    [frameThickness, canvasHeight, frameDepth, canvasWidth / 2 + frameThickness / 2, 0],
  ];

  frameParts.forEach(([w, h, d, x, y]) => {
    const part = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), frameMaterial);
    part.position.set(x, y, frameZ);
    group.add(part);
  });

  const artMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(canvasWidth, canvasHeight),
    artMaterial
  );
  artMesh.position.z = artZ;
  group.add(artMesh);

  const plaqueCanvas = createPlaqueTexture(item.name || 'Untitled', item.description || '');
  const plaqueTexture = new THREE.CanvasTexture(plaqueCanvas);
  plaqueTexture.colorSpace = THREE.SRGBColorSpace;

  const plaque = new THREE.Mesh(
    new THREE.PlaneGeometry(Math.min(canvasWidth, 0.85), 0.14),
    new THREE.MeshStandardMaterial({
      map: plaqueTexture,
      roughness: 0.8,
      metalness: 0.1,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    })
  );
  plaque.renderOrder = 10;
  plaque.position.set(0, -canvasHeight / 2 - 0.18, artZ);
  group.add(plaque);

  group.userData = { [itemKey]: item, artworkIndex: index };
  scene.add(group);
  artworkMeshes.push(group);
}

function createFallbackTexture(index) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  const colors = ['#7a6a5a', '#5a6a7a', '#6a5a7a', '#7a5a6a'];
  ctx.fillStyle = colors[index % colors.length];
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createFramedArtwork({
  textureLoader,
  item,
  size,
  position,
  rotation,
  index,
  itemKey,
  scene,
  artworkMeshes,
  wallOffset = 0.06,
  localDepthOffset = 0,
}) {
  const mount = (texture) => {
    configureArtTexture(texture);

    mountFramedArtwork({
      texture,
      item,
      size,
      position,
      rotation,
      index,
      itemKey,
      scene,
      artworkMeshes,
      wallOffset,
      localDepthOffset,
    });
  };

  if (!item.imageUrl) {
    mount(createFallbackTexture(index));
    return;
  }

  const cachedTexture = textureCache.get(item.imageUrl);
  if (cachedTexture) {
    mount(cachedTexture);
    return;
  }

  textureLoader.load(
    item.imageUrl,
    (texture) => {
      configureArtTexture(texture);
      textureCache.set(item.imageUrl, texture);
      mount(texture);
    },
    undefined,
    () => {
      console.warn('Could not load artwork texture:', item.imageUrl);
      mount(createFallbackTexture(index));
    }
  );
}

const ROOM_GLB_PATH = '/merge_xyz.glb';
const WALL_ART_INSET = 0.09;
const EYE_HEIGHT_RATIO = 0.72;
const EYE_HEIGHT_MIN = 1.55;
const EYE_HEIGHT_MAX = 1.85;
const MOVE_SPEED = 2.1;
const SPAWN_BACK_LIMIT = 5.5;
const WALL_MATERIALS = new Set(['tex_u1_v1', 'beige_wall_001', 'default_tex0']);
const INTERIOR_MESH_NAMES = ['Object_6', 'Object_12'];
const OUTER_WALL_TOLERANCE = 0.45;

let roomGltfCache = null;
let roomLoadPromise = null;
let cachedRoomPath = null;
const textureCache = new Map();

export function createGalleryTextureLoader(loadingManager = null) {
  const loader = new THREE.TextureLoader(loadingManager);
  loader.setCrossOrigin('anonymous');
  return loader;
}

function configureArtTexture(texture) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

function loadRoomGltf(loadingManager) {
  if (roomGltfCache && cachedRoomPath === ROOM_GLB_PATH) {
    return Promise.resolve(roomGltfCache);
  }
  if (roomLoadPromise && cachedRoomPath === ROOM_GLB_PATH) return roomLoadPromise;

  roomGltfCache = null;
  cachedRoomPath = ROOM_GLB_PATH;
  roomLoadPromise = new Promise((resolve, reject) => {
    const loader = loadingManager ? new GLTFLoader(loadingManager) : new GLTFLoader();
    loader.load(
      ROOM_GLB_PATH,
      (gltf) => {
        roomGltfCache = gltf;
        resolve(gltf);
      },
      undefined,
      reject
    );
  });

  return roomLoadPromise;
}

export function preloadRoomModel(loadingManager) {
  return loadRoomGltf(loadingManager);
}

function isOpeningMesh(child) {
  if (!child.isMesh) return false;

  const materialName = child.material?.name;
  if (materialName === 'Glass') return true;
  if (materialName !== 'Plastic') return false;

  const box = new THREE.Box3().setFromObject(child);
  const size = new THREE.Vector3();
  box.getSize(size);
  return Math.min(size.x, size.y, size.z) < 0.2;
}

function isWindowMesh(child) {
  return isOpeningMesh(child);
}

function extractWindowExclusions(room, roomWidth, roomDepth, roomHeight) {
  const floorY = -roomHeight / 2;
  const exclusions = { front: [], back: [], left: [], right: [] };
  const halfW = roomWidth / 2;
  const halfD = roomDepth / 2;

  room.updateMatrixWorld(true);
  room.traverse((child) => {
    if (!isOpeningMesh(child)) return;

    const box = new THREE.Box3().setFromObject(child);
    const center = new THREE.Vector3();
    box.getCenter(center);

    const distFront = Math.abs(center.z + halfD);
    const distBack = Math.abs(center.z - halfD);
    const distLeft = Math.abs(center.x + halfW);
    const distRight = Math.abs(center.x - halfW);
    const minDist = Math.min(distFront, distBack, distLeft, distRight);

    let wallId = 'front';
    if (minDist === distBack) wallId = 'back';
    else if (minDist === distLeft) wallId = 'left';
    else if (minDist === distRight) wallId = 'right';

    let minX;
    let maxX;
    if (wallId === 'front') {
      minX = box.min.x - WINDOW_EXCLUSION_MARGIN;
      maxX = box.max.x + WINDOW_EXCLUSION_MARGIN;
    } else if (wallId === 'back') {
      minX = -box.max.x - WINDOW_EXCLUSION_MARGIN;
      maxX = -box.min.x + WINDOW_EXCLUSION_MARGIN;
    } else if (wallId === 'left') {
      minX = -box.max.z - WINDOW_EXCLUSION_MARGIN;
      maxX = -box.min.z + WINDOW_EXCLUSION_MARGIN;
    } else {
      minX = box.min.z - WINDOW_EXCLUSION_MARGIN;
      maxX = box.max.z + WINDOW_EXCLUSION_MARGIN;
    }

    exclusions[wallId].push({
      minX,
      maxX,
      minY: box.min.y - floorY - WINDOW_EXCLUSION_MARGIN,
      maxY: box.max.y - floorY + WINDOW_EXCLUSION_MARGIN,
    });
  });

  return exclusions;
}

function getWallMeshes(room) {
  const meshes = [];
  room.traverse((child) => {
    if (!child.isMesh) return;

    const materialName = child.material?.name || '';
    if (WALL_MATERIALS.has(materialName)) {
      meshes.push(child);
    }
  });
  return meshes;
}

function computeInteriorNav(room, roomWidth, roomDepth) {
  let interiorMesh = null;

  room.traverse((child) => {
    if (!child.isMesh) return;
    if (INTERIOR_MESH_NAMES.includes(child.name)) {
      if (!interiorMesh || child.name === 'Object_6') {
        interiorMesh = child;
      }
    }
  });

  const margin = 0.9;
  if (!interiorMesh) {
    return {
      spawnX: 0,
      spawnZ: 0,
      halfW: roomWidth / 2 - margin,
      halfD: roomDepth / 2 - margin,
    };
  }

  const box = new THREE.Box3().setFromObject(interiorMesh);
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);

  return {
    spawnX: center.x,
    spawnZ: center.z,
    halfW: Math.max(1.2, size.x / 2 - margin),
    halfD: Math.max(1.2, size.z / 2 - margin),
  };
}

function cloneAndPrepareRoom(gltf) {
  const room = gltf.scene.clone(true);

  room.traverse((child) => {
    if (!child.isMesh) return;

    child.castShadow = true;
    child.receiveShadow = true;
    child.renderOrder = 0;

    if (child.material?.name === 'Glass') {
      child.visible = false;
      return;
    }

    if (child.material) {
      child.material = child.material.clone();
      child.material.polygonOffset = false;
    }
  });

  room.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(room);
  const size = new THREE.Vector3();
  box.getSize(size);
  const center = new THREE.Vector3();
  box.getCenter(center);

  const roomWidth = size.x;
  const roomDepth = size.z;
  const roomHeight = size.y;

  room.position.set(
    -center.x,
    -box.min.y - roomHeight / 2,
    -center.z
  );
  room.updateMatrixWorld(true);

  const wallMeshes = getWallMeshes(room);
  const windowExclusions = extractWindowExclusions(room, roomWidth, roomDepth, roomHeight);
  const hangSurfaces = analyzeHangSurfaces(wallMeshes, roomWidth, roomDepth, roomHeight, windowExclusions);
  const openingBoxes = extractOpeningBoxes(room, roomWidth, roomDepth, roomHeight);
  const overhangBoxes = extractOverhangBoxes(wallMeshes);

  const interiorNav = computeInteriorNav(room, roomWidth, roomDepth);

  return {
    room,
    roomWidth,
    roomHeight,
    roomDepth,
    windowExclusions,
    hangSurfaces,
    openingBoxes,
    overhangBoxes,
    interiorNav,
    wallMeshes,
  };
}

async function createRoom(scene) {
  const gltf = await loadRoomGltf();
  const {
    room,
    roomWidth,
    roomHeight,
    roomDepth,
    windowExclusions,
    hangSurfaces,
    openingBoxes,
    overhangBoxes,
    interiorNav,
    wallMeshes,
  } = cloneAndPrepareRoom(gltf);
  scene.add(room);

  const floorLight = new THREE.DirectionalLight(0xfff3e4, 0.55);
  floorLight.position.set(0, roomHeight / 2 - 0.15, 1.5);
  floorLight.target.position.set(0, -roomHeight / 2, 0);
  scene.add(floorLight);
  scene.add(floorLight.target);

  const floorFill = new THREE.HemisphereLight(0xfff8f0, 0x4a3424, 0.28);
  scene.add(floorFill);

  return {
    roomWidth,
    roomHeight,
    roomDepth,
    windowExclusions,
    hangSurfaces,
    openingBoxes,
    overhangBoxes,
    interiorNav,
    wallMeshes,
  };
}

function addCeilingLighting(scene, roomWidth, roomHeight, roomDepth) {
  const trackMaterial = new THREE.MeshStandardMaterial({
    color: 0x3a3a3a,
    roughness: 0.4,
    metalness: 0.6,
    emissive: 0x222222,
    emissiveIntensity: 0.15,
  });

  const track = new THREE.Mesh(
    new THREE.BoxGeometry(roomWidth * 0.55, 0.04, 0.14),
    trackMaterial
  );
  track.position.set(0, roomHeight / 2 - 0.08, 0);
  scene.add(track);

  const spotPositions = [
    [-roomWidth * 0.22, -roomDepth * 0.22],
    [roomWidth * 0.22, -roomDepth * 0.22],
    [-roomWidth * 0.22, roomDepth * 0.22],
    [roomWidth * 0.22, roomDepth * 0.22],
    [0, 0],
  ];

  const floorY = -roomHeight / 2;

  spotPositions.forEach(([x, z]) => {
    const housing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 0.1, 12),
      trackMaterial
    );
    housing.position.set(x, roomHeight / 2 - 0.12, z);
    scene.add(housing);

    const light = new THREE.SpotLight(0xfff6ea, 28, roomWidth * 1.4, Math.PI / 4.2, 0.45, 1.2);
    light.position.set(x, roomHeight / 2 - 0.14, z);
    light.target.position.set(x, floorY + roomHeight * 0.45, z);
    light.castShadow = true;
    light.shadow.mapSize.set(512, 512);
    light.shadow.bias = -0.0002;
    scene.add(light);
    scene.add(light.target);
  });

  const wallWashers = [
    { pos: [0, roomHeight / 2 - 0.12, -roomDepth / 2 + 0.8], target: [0, floorY + 1.2, -roomDepth / 2 + WALL_ART_INSET] },
    { pos: [0, roomHeight / 2 - 0.12, roomDepth / 2 - 0.8], target: [0, floorY + 1.2, roomDepth / 2 - WALL_ART_INSET] },
    { pos: [roomWidth / 2 - 0.8, roomHeight / 2 - 0.12, 0], target: [roomWidth / 2 - WALL_ART_INSET, floorY + 1.2, 0] },
    { pos: [-roomWidth / 2 + 0.8, roomHeight / 2 - 0.12, 0], target: [-roomWidth / 2 + WALL_ART_INSET, floorY + 1.2, 0] },
  ];

  wallWashers.forEach(({ pos, target }) => {
    const washer = new THREE.SpotLight(0xfff0e0, 18, roomWidth, Math.PI / 3.4, 0.55, 1.1);
    washer.position.set(...pos);
    washer.target.position.set(...target);
    scene.add(washer);
    scene.add(washer.target);
  });
}

export function preloadGalleryTextures(textureLoader, items, maxDisplay, { loadingManager = null } = {}) {
  preloadRoomModel(loadingManager).catch((error) => {
    console.warn('Could not preload room model:', error);
  });

  items.slice(0, maxDisplay).forEach((item) => {
    if (!item.imageUrl || textureCache.has(item.imageUrl)) return;

    textureLoader.load(
      item.imageUrl,
      (texture) => {
        configureArtTexture(texture);
        textureCache.set(item.imageUrl, texture);
      },
      undefined,
      (error) => {
        console.warn('Could not preload artwork texture:', item.imageUrl, error);
      }
    );
  });
}

function createNavigationControls(onMoveStart, onMoveStop) {
  const nav = document.createElement('div');
  nav.className = 'gallery-room-nav';
  nav.setAttribute('aria-label', 'Room navigation');

  const buttons = [
    { dir: 'forward', label: '↑', className: 'nav-forward' },
    { dir: 'left', label: '←', className: 'nav-left' },
    { dir: 'back', label: '↓', className: 'nav-back' },
    { dir: 'right', label: '→', className: 'nav-right' },
  ];

  buttons.forEach(({ dir, label, className }) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `gallery-room-nav-btn ${className}`;
    button.textContent = label;
    button.setAttribute('aria-label', dir);

    const start = (event) => {
      event.preventDefault();
      event.stopPropagation();
      onMoveStart(dir);
    };
    const stop = (event) => {
      event.preventDefault();
      event.stopPropagation();
      onMoveStop(dir);
    };

    button.addEventListener('pointerdown', start);
    button.addEventListener('pointerup', stop);
    button.addEventListener('pointerleave', stop);
    button.addEventListener('pointercancel', stop);
    nav.appendChild(button);
  });

  return nav;
}

export async function initGalleryRoom(mountEl, items, options, onSelect) {
  const {
    maxDisplay = 10,
    itemKey = 'artwork',
    initialYaw = 0,
    roomLabel = '',
    placeArtwork = true,
    entryWallOnly = false,
    hangZones = null,
    onWallSurfacesReady = null,
    getHangZones = null,
    onHangZonesChange = null,
    getSelectedZoneId = null,
    onSelectZone = null,
    showPositionDebug = true,
  } = options;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe8e4df);

  const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.05, 120);

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 2 : 2.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  mountEl.style.position = 'relative';
  mountEl.appendChild(renderer.domElement);

  const {
    roomWidth,
    roomHeight,
    roomDepth,
    hangSurfaces,
    openingBoxes,
    overhangBoxes,
    interiorNav,
    wallMeshes,
  } = await createRoom(scene);

  const floorY = -roomHeight / 2;
  const eyeHeight = floorY + THREE.MathUtils.clamp(
    roomHeight * EYE_HEIGHT_RATIO,
    EYE_HEIGHT_MIN,
    EYE_HEIGHT_MAX
  );
  const roomMargin = 0.55;
  const halfW = interiorNav.halfW;
  const halfD = interiorNav.halfD;
  scene.fog = new THREE.Fog(0xe8e4df, roomDepth * 0.35, roomDepth * 1.4);

  const player = { x: interiorNav.spawnX, z: interiorNav.spawnZ };
  const view = {
    yaw: initialYaw,
    pitch: -0.1,
  };
  const activeMoves = new Set();
  let lastFrameTime = performance.now();

  const lookTarget = new THREE.Vector3();

  const getLookDirection = () => new THREE.Vector3(
    Math.sin(view.yaw) * Math.cos(view.pitch),
    Math.sin(view.pitch),
    -Math.cos(view.yaw) * Math.cos(view.pitch)
  ).normalize();

  const getFlatForward = () => {
    const forward = getLookDirection();
    forward.y = 0;
    if (forward.lengthSq() < 0.0001) {
      forward.set(0, 0, -1);
    } else {
      forward.normalize();
    }
    return forward;
  };

  const getFlatRight = () => {
    const forward = getFlatForward();
    return new THREE.Vector3(-forward.z, 0, forward.x);
  };

  const spawnForward = new THREE.Vector3(
    Math.sin(initialYaw),
    0,
    -Math.cos(initialYaw)
  ).normalize();

  const clampPlayerToRoom = () => {
    player.x = THREE.MathUtils.clamp(player.x, -halfW, halfW);
    player.z = THREE.MathUtils.clamp(player.z, -halfD, halfD);

    const relX = player.x - interiorNav.spawnX;
    const relZ = player.z - interiorNav.spawnZ;
    const forwardDist = relX * spawnForward.x + relZ * spawnForward.z;

    if (forwardDist < -SPAWN_BACK_LIMIT) {
      const lateralX = relX - spawnForward.x * forwardDist;
      const lateralZ = relZ - spawnForward.z * forwardDist;
      player.x = interiorNav.spawnX + spawnForward.x * (-SPAWN_BACK_LIMIT) + lateralX;
      player.z = interiorNav.spawnZ + spawnForward.z * (-SPAWN_BACK_LIMIT) + lateralZ;
    }
  };

  let positionDebugEl = null;
  if (showPositionDebug) {
    positionDebugEl = document.createElement('div');
    positionDebugEl.className = 'gallery-position-debug';
    positionDebugEl.setAttribute('aria-live', 'polite');
    mountEl.appendChild(positionDebugEl);
  }

  const updatePositionDebug = () => {
    if (!positionDebugEl) return;
    const relX = player.x - interiorNav.spawnX;
    const relZ = player.z - interiorNav.spawnZ;
    const forwardDist = relX * spawnForward.x + relZ * spawnForward.z;
    const backDist = Math.max(0, -forwardDist);
    positionDebugEl.textContent = `x ${player.x.toFixed(2)} · z ${player.z.toFixed(2)} · atrás ${backDist.toFixed(2)}m / ${SPAWN_BACK_LIMIT}m`;
  };

  const updateCamera = () => {
    clampPlayerToRoom();
    camera.position.set(player.x, eyeHeight, player.z);
    lookTarget.copy(camera.position).add(getLookDirection());
    camera.lookAt(lookTarget);
    updatePositionDebug();
  };

  const tryMove = (deltaX, deltaZ) => {
    player.x += deltaX;
    player.z += deltaZ;
    updateCamera();
  };

  const applyMovement = (deltaSeconds) => {
    if (activeMoves.size === 0) return;

    const forward = getFlatForward();
    const right = getFlatRight();
    const velocity = new THREE.Vector3();

    if (activeMoves.has('forward')) velocity.add(forward);
    if (activeMoves.has('back')) velocity.sub(forward);
    if (activeMoves.has('right')) velocity.add(right);
    if (activeMoves.has('left')) velocity.sub(right);

    if (velocity.lengthSq() === 0) return;

    velocity.normalize().multiplyScalar(MOVE_SPEED * deltaSeconds);
    tryMove(velocity.x, velocity.z);
  };

  updateCamera();

  let isDragging = false;
  let isZoneDragging = false;
  let lastPointer = { x: 0, y: 0 };
  let pointerMoved = false;
  const dragThreshold = 6;
  const domElement = renderer.domElement;

  const onPointerDown = (event) => {
    if (event.target.closest('.gallery-room-nav, .wall-zone-editor, .wall-zone-toggle, .wall-zone-toolbar')) return;

    if (zoneEditor?.onPointerDown(event)) {
      isZoneDragging = true;
      pointerMoved = false;
      domElement.setPointerCapture(event.pointerId);
      return;
    }

    isDragging = true;
    pointerMoved = false;
    lastPointer = { x: event.clientX, y: event.clientY };
    domElement.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event) => {
    if (isZoneDragging && zoneEditor?.onPointerMove(event)) {
      pointerMoved = true;
      return;
    }

    if (!isDragging) return;

    const dx = event.clientX - lastPointer.x;
    const dy = event.clientY - lastPointer.y;

    if (Math.abs(dx) > dragThreshold || Math.abs(dy) > dragThreshold) {
      pointerMoved = true;
    }

    view.yaw -= dx * (isMobile ? 0.005 : 0.004);
    view.pitch = THREE.MathUtils.clamp(view.pitch + dy * 0.003, -0.35, 0.08);
    lastPointer = { x: event.clientX, y: event.clientY };
    updateCamera();
  };

  const onPointerUp = (event) => {
    if (event.target.closest('.gallery-room-nav, .wall-zone-editor, .wall-zone-toggle, .wall-zone-toolbar')) return;

    if (isZoneDragging) {
      zoneEditor?.onPointerUp();
      isZoneDragging = false;
      if (domElement.hasPointerCapture(event.pointerId)) {
        domElement.releasePointerCapture(event.pointerId);
      }
      return;
    }

    isDragging = false;
    if (domElement.hasPointerCapture(event.pointerId)) {
      domElement.releasePointerCapture(event.pointerId);
    }

    if (!pointerMoved && !zoneEditActive) {
      handleArtworkClick(event.clientX, event.clientY);
    }
  };

  const onWheel = (event) => {
    event.preventDefault();
    const forward = getFlatForward();
    const step = -event.deltaY * 0.0018;
    tryMove(forward.x * step, forward.z * step);
  };

  const onDoubleClick = (event) => {
    if (!zoneEditActive) return;
    if (event.target.closest('.gallery-room-nav, .wall-zone-editor, .wall-zone-toggle, .wall-zone-toolbar')) return;
    zoneEditor?.onDoubleClick(event);
  };

  domElement.addEventListener('pointerdown', onPointerDown);
  domElement.addEventListener('pointermove', onPointerMove);
  domElement.addEventListener('pointerup', onPointerUp);
  domElement.addEventListener('pointercancel', onPointerUp);
  domElement.addEventListener('dblclick', onDoubleClick);
  domElement.addEventListener('wheel', onWheel, { passive: false });

  const navControls = createNavigationControls(
    (dir) => activeMoves.add(dir),
    (dir) => activeMoves.delete(dir)
  );
  mountEl.appendChild(navControls);

  const keyToMove = {
    ArrowUp: 'forward',
    w: 'forward',
    W: 'forward',
    ArrowDown: 'back',
    s: 'back',
    S: 'back',
    ArrowLeft: 'left',
    a: 'left',
    A: 'left',
    ArrowRight: 'right',
    d: 'right',
    D: 'right',
  };

  const onKeyDown = (event) => {
    const move = keyToMove[event.key];
    if (move) {
      event.preventDefault();
      activeMoves.add(move);
      return;
    }

    if (event.key === 'r' || event.key === 'R') {
      player.x = interiorNav.spawnX;
      player.z = interiorNav.spawnZ;
      view.yaw = initialYaw;
      view.pitch = -0.1;
      activeMoves.clear();
      updateCamera();
      return;
    }

    if (zoneEditActive && (event.key === 'Delete' || event.key === 'Backspace')) {
      event.preventDefault();
      zoneEditor?.deleteSelectedZone();
    }
  };

  const onKeyUp = (event) => {
    const move = keyToMove[event.key];
    if (move) {
      event.preventDefault();
      activeMoves.delete(move);
    }
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  addCeilingLighting(scene, roomWidth, roomHeight, roomDepth);

  scene.add(new THREE.HemisphereLight(0xfff8f0, 0x5a5248, 0.65));
  scene.add(new THREE.AmbientLight(0xffffff, 0.48));

  const textureLoader = createGalleryTextureLoader();
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const artworkGroup = new THREE.Group();
  artworkGroup.name = 'gallery-artwork';
  scene.add(artworkGroup);
  const artworkMeshes = [];
  let spawnWallSurfaces = [];
  let zoneEditor = null;
  let zoneEditActive = false;
  const zonesGetter = () => (getHangZones ? getHangZones() : hangZones) ?? [];

  if (placeArtwork) {
    spawnWallSurfaces = entryWallOnly
      ? findSpawnWallSurfaces(
        wallMeshes,
        interiorNav.spawnX,
        interiorNav.spawnZ,
        initialYaw,
        floorY
      )
      : [];

    if (onWallSurfacesReady) {
      onWallSurfacesReady(spawnWallSurfaces);
    }

    if (spawnWallSurfaces.length && onHangZonesChange) {
      zoneEditor = createWallZone3DEditor({
        scene,
        camera,
        raycaster,
        mouse,
        surfaces: spawnWallSurfaces,
        floorY,
        roomWidth,
        roomDepth,
        roomHeight,
        getZones: zonesGetter,
        onZonesChange: onHangZonesChange,
        onSelectZone,
        getSelectedZoneId,
      });
    }

    const placementContext = {
      hangSurfaces,
      roomWidth,
      roomDepth,
      roomHeight,
      openingBoxes,
      overhangBoxes,
    };

    const placements = spawnWallSurfaces.length
      ? distributeItemsOnSpawnWalls(items, maxDisplay, spawnWallSurfaces, placementContext, hangZones)
      : distributeItems(items, maxDisplay, placementContext);

    placements.forEach((placement, index) => {
      const { position, rotation } = toWorldPosition(
        placement.localX,
        placement.localY,
        placement.surface,
        roomWidth,
        roomDepth,
        roomHeight
      );

      createFramedArtwork({
        textureLoader,
        item: placement.item,
        size: placement.size,
        position,
        rotation,
        index,
        itemKey,
        scene: artworkGroup,
        artworkMeshes,
        ...getWallPlacementOffsets(placement.surface),
      });
    });
  }

  const handleArtworkClick = (clientX, clientY) => {
    mouse.x = (clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(artworkMeshes, true);
    if (intersects.length === 0) return;

    let object = intersects[0].object;
    while (object && !object.userData[itemKey]) {
      object = object.parent;
    }
    if (object?.userData?.[itemKey]) {
      onSelect(object.userData[itemKey]);
    }
  };

  const handleResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };

  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', handleResize);

  let animationId;
  const animate = (now) => {
    animationId = requestAnimationFrame(animate);
    const deltaSeconds = Math.min((now - lastFrameTime) / 1000, 0.05);
    lastFrameTime = now;
    applyMovement(deltaSeconds);
    zoneEditor?.tick();
    renderer.render(scene, camera);
  };
  animationId = requestAnimationFrame(animate);

  return {
    dispose: () => {
      cancelAnimationFrame(animationId);

      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      domElement.removeEventListener('pointerdown', onPointerDown);
      domElement.removeEventListener('pointermove', onPointerMove);
      domElement.removeEventListener('pointerup', onPointerUp);
      domElement.removeEventListener('pointercancel', onPointerUp);
      domElement.removeEventListener('dblclick', onDoubleClick);
      domElement.removeEventListener('wheel', onWheel);

      zoneEditor?.dispose();

      if (navControls.parentElement) {
        navControls.parentElement.removeChild(navControls);
      }

      if (positionDebugEl?.parentElement) {
        positionDebugEl.parentElement.removeChild(positionDebugEl);
      }

      if (mountEl.contains(renderer.domElement)) {
        mountEl.removeChild(renderer.domElement);
      }

      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => {
            if (material.map) material.map.dispose();
            material.dispose();
          });
        }
      });
      renderer.dispose();
    },
    setZoneEditMode(enabled) {
      zoneEditActive = enabled;
      artworkGroup.visible = !enabled;
      zoneEditor?.setEnabled(enabled);
    },
    setSelectedZoneId() {
      zoneEditor?.setSelectedZoneId();
    },
    refreshZoneOverlays() {
      zoneEditor?.setZones();
    },
  };
}
