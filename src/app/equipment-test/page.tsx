"use client";

import { useMemo, useState } from "react";

import {
  RED_BEANIE_FITS,
  type Animal,
  type Stage,
  type EquipmentFit,
} from "@/data/equipmentPositions";

const ANIMALS: {
  key: Animal;
  label: string;
}[] = [
  { key: "dog", label: "강아지" },
  { key: "cat", label: "고양이" },
  { key: "penguin", label: "펭귄" },
  { key: "red-panda", label: "레서판다" },
];

const STAGES: {
  key: Stage;
  label: string;
}[] = [
  { key: "baby", label: "아기" },
  { key: "child", label: "꼬마" },
  { key: "teen", label: "청년" },
  { key: "adult", label: "성년" },
];

type FitMap = Record<
  Animal,
  Record<Stage, EquipmentFit>
>;

function cloneFits(): FitMap {
  return {
    dog: {
      baby: { ...RED_BEANIE_FITS.dog.baby },
      child: { ...RED_BEANIE_FITS.dog.child },
      teen: { ...RED_BEANIE_FITS.dog.teen },
      adult: { ...RED_BEANIE_FITS.dog.adult },
    },

    cat: {
      baby: { ...RED_BEANIE_FITS.cat.baby },
      child: { ...RED_BEANIE_FITS.cat.child },
      teen: { ...RED_BEANIE_FITS.cat.teen },
      adult: { ...RED_BEANIE_FITS.cat.adult },
    },

    penguin: {
      baby: { ...RED_BEANIE_FITS.penguin.baby },
      child: { ...RED_BEANIE_FITS.penguin.child },
      teen: { ...RED_BEANIE_FITS.penguin.teen },
      adult: { ...RED_BEANIE_FITS.penguin.adult },
    },

    "red-panda": {
      baby: { ...RED_BEANIE_FITS["red-panda"].baby },
      child: { ...RED_BEANIE_FITS["red-panda"].child },
      teen: { ...RED_BEANIE_FITS["red-panda"].teen },
      adult: { ...RED_BEANIE_FITS["red-panda"].adult },
    },
  };
}

export default function EquipmentTestPage() {
  const [fits, setFits] =
    useState<FitMap>(() => cloneFits());

  const [selectedAnimal, setSelectedAnimal] =
    useState<Animal>("dog");

  const [selectedStage, setSelectedStage] =
    useState<Stage>("baby");

  const current =
    fits[selectedAnimal][selectedStage];

  const selectedAnimalLabel =
    useMemo(
      () =>
        ANIMALS.find(
          (item) =>
            item.key === selectedAnimal
        )?.label ?? "",
      [selectedAnimal]
    );

  const selectedStageLabel =
    useMemo(
      () =>
        STAGES.find(
          (item) =>
            item.key === selectedStage
        )?.label ?? "",
      [selectedStage]
    );

  function updateCurrent(
    patch: Partial<EquipmentFit>
  ) {
    setFits((prev) => ({
      ...prev,

      [selectedAnimal]: {
        ...prev[selectedAnimal],

        [selectedStage]: {
          ...prev[selectedAnimal][selectedStage],
          ...patch,
        },
      },
    }));
  }

  function moveX(amount: number) {
    updateCurrent({
      x: Math.max(
        0,
        Math.min(
          100,
          current.x + amount
        )
      ),
    });
  }

  function moveY(amount: number) {
    updateCurrent({
      y: Math.max(
        0,
        Math.min(
          100,
          current.y + amount
        )
      ),
    });
  }

  function resize(amount: number) {
    updateCurrent({
      scale: Math.max(
        20,
        Math.min(
          140,
          current.scale + amount
        )
      ),
    });
  }

  function rotate(amount: number) {
    updateCurrent({
      rotation: Math.max(
        -30,
        Math.min(
          30,
          current.rotation + amount
        )
      ),
    });
  }

  function centerCurrent() {
    updateCurrent({
      x: 50,
      rotation: 0,
    });
  }

  function resetCurrent() {
    updateCurrent({
      ...RED_BEANIE_FITS[selectedAnimal][selectedStage],
    });
  }

  function resetAll() {
    setFits(
      cloneFits()
    );
  }

  return (
    <main className="min-h-screen bg-[#fff8fb] px-4 py-7 text-[#2b2b2b] sm:px-5">
      <div className="mx-auto max-w-6xl">

        <header>
          <p className="text-xs font-semibold tracking-[0.2em] text-pink-400">
            EQUIPMENT TEST
          </p>

          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
            레드 비니 착용 규격 테스트
          </h1>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            위치 · 크기 · 좌우 기울기를 직접 맞출 수 있어요.
          </p>
        </header>

        <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">

          {ANIMALS.flatMap(
            (animal) =>
              STAGES.map(
                (stage) => {
                  const fit =
                    fits[animal.key][stage.key];

                  const selected =
                    selectedAnimal === animal.key &&
                    selectedStage === stage.key;

                  return (
                    <button
                      key={`${animal.key}-${stage.key}`}
                      type="button"
                      onClick={() => {
                        setSelectedAnimal(
                          animal.key
                        );

                        setSelectedStage(
                          stage.key
                        );
                      }}
                      className={`rounded-[24px] border bg-white p-3 text-left shadow-sm transition ${
                        selected
                          ? "border-pink-400 ring-2 ring-pink-100"
                          : "border-pink-100"
                      }`}
                    >

                      <div className="mb-2 flex items-center justify-between gap-2">

                        <p className="truncate text-sm font-bold">
                          {animal.label}
                        </p>

                        <span className="shrink-0 text-[11px] text-gray-400">
                          {stage.label}
                        </span>

                      </div>

                      <div className="relative mx-auto h-[190px] overflow-hidden rounded-[20px] bg-gradient-to-b from-white to-pink-50 sm:h-[220px]">

                        <img
                          src={`/characters/${animal.key}/${stage.key}.png`}
                          alt={`${animal.label} ${stage.label}`}
                          className="absolute bottom-2 left-1/2 max-h-[92%] max-w-[92%] -translate-x-1/2 object-contain"
                        />

                        <img
                          src="/store/hats/red-beanie.png"
                          alt=""
                          aria-hidden="true"
                          className="pointer-events-none absolute object-contain"
                          style={{
                            left: `${fit.x}%`,
                            top: `${fit.y}%`,
                            width: `${fit.scale}%`,

                            transform: `
                              translate(-50%, -50%)
                              rotate(${fit.rotation}deg)
                            `,

                            transformOrigin:
                              "center center",
                          }}
                        />

                      </div>

                      <div className="mt-2 text-[9px] leading-4 text-gray-400 sm:text-[10px]">
                        x {fit.x}
                        {" / "}
                        y {fit.y}
                        {" / "}
                        크기 {fit.scale}
                        {" / "}
                        회전 {fit.rotation}°
                      </div>

                    </button>
                  );
                }
              )
          )}

        </section>

        <section className="sticky bottom-3 z-30 mt-6 rounded-[28px] border border-pink-100 bg-white/95 p-4 shadow-xl backdrop-blur sm:p-5">

          <div className="flex items-start justify-between gap-3">

            <div>
              <p className="text-[10px] font-semibold tracking-[0.14em] text-pink-400">
                현재 조정
              </p>

              <p className="mt-1 text-lg font-bold">
                {selectedAnimalLabel}
                {" · "}
                {selectedStageLabel}
              </p>

              <p className="mt-1 text-[11px] text-gray-400">
                x {current.x}
                {" · "}
                y {current.y}
                {" · "}
                크기 {current.scale}
                {" · "}
                회전 {current.rotation}°
              </p>
            </div>

            <button
              type="button"
              onClick={resetAll}
              className="shrink-0 rounded-xl bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-500"
            >
              전체 초기화
            </button>

          </div>

          <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4">

            {/* 방향키 */}
            <div className="justify-self-center">

              <div className="grid grid-cols-3 gap-2">

                <div />

                <ControlButton
                  label="↑"
                  onClick={() =>
                    moveY(-1)
                  }
                />

                <div />

                <ControlButton
                  label="←"
                  onClick={() =>
                    moveX(-1)
                  }
                />

                <ControlButton
                  label="◎"
                  onClick={
                    centerCurrent
                  }
                  pink
                />

                <ControlButton
                  label="→"
                  onClick={() =>
                    moveX(1)
                  }
                />

                <div />

                <ControlButton
                  label="↓"
                  onClick={() =>
                    moveY(1)
                  }
                />

                <div />

              </div>

              <p className="mt-2 text-center text-[10px] text-gray-400">
                위치
              </p>

            </div>

            <div className="h-28 w-px bg-pink-100" />

            {/* 회전 + 크기 */}
            <div className="space-y-4">

              <div>

                <p className="mb-2 text-center text-[10px] font-semibold text-gray-400">
                  기울기
                </p>

                <div className="flex items-center justify-center gap-2">

                  <ControlButton
                    label="↶"
                    onClick={() =>
                      rotate(-2)
                    }
                  />

                  <span className="min-w-12 text-center text-xs font-bold text-gray-600">
                    {current.rotation}°
                  </span>

                  <ControlButton
                    label="↷"
                    onClick={() =>
                      rotate(2)
                    }
                  />

                </div>

              </div>

              <div>

                <p className="mb-2 text-center text-[10px] font-semibold text-gray-400">
                  크기
                </p>

                <div className="flex items-center justify-center gap-2">

                  <ControlButton
                    label="－"
                    onClick={() =>
                      resize(-2)
                    }
                  />

                  <span className="min-w-12 text-center text-xs font-bold text-gray-600">
                    {current.scale}
                  </span>

                  <ControlButton
                    label="＋"
                    onClick={() =>
                      resize(2)
                    }
                  />

                </div>

              </div>

            </div>

          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">

            <button
              type="button"
              onClick={
                resetCurrent
              }
              className="rounded-2xl border border-pink-100 bg-white px-4 py-3 text-sm font-semibold text-gray-500"
            >
              이 캐릭터 초기화
            </button>

            <button
              type="button"
              onClick={() => {
                navigator.clipboard
                  ?.writeText(
                    JSON.stringify(
                      current,
                      null,
                      2
                    )
                  );
              }}
              className="rounded-2xl bg-pink-500 px-4 py-3 text-sm font-semibold text-white"
            >
              현재 값 복사
            </button>

          </div>

        </section>

      </div>
    </main>
  );
}

function ControlButton({
  label,
  onClick,
  pink = false,
}: {
  label: string;
  onClick: () => void;
  pink?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`flex h-11 w-11 items-center justify-center rounded-2xl text-lg font-bold shadow-sm transition active:scale-95 ${
        pink
          ? "bg-pink-500 text-white"
          : "border border-pink-100 bg-white text-gray-600"
      }`}
    >
      {label}
    </button>
  );
}
