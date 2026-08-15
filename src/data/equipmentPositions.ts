export type Animal =
  | "dog"
  | "cat"
  | "penguin"
  | "red-panda";

export type Stage =
  | "baby"
  | "child"
  | "teen"
  | "adult";

export type EquipmentSlot =
  | "hat"
  | "clothes"
  | "accessory";

export type EquipmentFit = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

// =====================================================
// 레드 비니 기본 착용값
// =====================================================
//
// x        : 좌우 위치(%)
// y        : 위아래 위치(%)
// scale    : 크기(%)
// rotation : 회전 각도(deg)
//            음수 = 왼쪽 기울기
//            양수 = 오른쪽 기울기
// =====================================================

export const RED_BEANIE_FITS: Record<
  Animal,
  Record<Stage, EquipmentFit>
> = {
  dog: {
    baby: {
      x: 50,
      y: 15,
      scale: 66,
      rotation: 0,
    },
    child: {
      x: 50,
      y: 14,
      scale: 68,
      rotation: 0,
    },
    teen: {
      x: 50,
      y: 12,
      scale: 70,
      rotation: 0,
    },
    adult: {
      x: 50,
      y: 11,
      scale: 72,
      rotation: 0,
    },
  },

  cat: {
    baby: {
      x: 50,
      y: 13,
      scale: 66,
      rotation: 0,
    },
    child: {
      x: 50,
      y: 12,
      scale: 68,
      rotation: 0,
    },
    teen: {
      x: 50,
      y: 10,
      scale: 70,
      rotation: 0,
    },
    adult: {
      x: 50,
      y: 9,
      scale: 72,
      rotation: 0,
    },
  },

  penguin: {
    baby: {
      x: 50,
      y: 11,
      scale: 88,
      rotation: 0,
    },
    child: {
      x: 50,
      y: 10,
      scale: 96,
      rotation: 0,
    },
    teen: {
      x: 50,
      y: 9,
      scale: 104,
      rotation: 0,
    },
    adult: {
      x: 50,
      y: 8,
      scale: 112,
      rotation: 0,
    },
  },

  "red-panda": {
    baby: {
      x: 50,
      y: 13,
      scale: 66,
      rotation: 0,
    },
    child: {
      x: 50,
      y: 12,
      scale: 68,
      rotation: 0,
    },
    teen: {
      x: 50,
      y: 10,
      scale: 70,
      rotation: 0,
    },
    adult: {
      x: 50,
      y: 9,
      scale: 72,
      rotation: 0,
    },
  },
};

export function getRedBeanieFit(
  animal: Animal,
  stage: Stage
): EquipmentFit {
  return RED_BEANIE_FITS[animal][stage];
}
