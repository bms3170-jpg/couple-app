export type CharacterAnimal =
  | "dog"
  | "cat"
  | "penguin"
  | "red-panda";

export type CharacterStage =
  | "baby"
  | "child"
  | "teen"
  | "adult";

export const CHARACTERS = {
  dog: {
    name: "강아지",
    stages: {
      baby: "/characters/dog/baby.png",
      child: "/characters/dog/child.png",
      teen: "/characters/dog/teen.png",
      adult: "/characters/dog/adult.png",
    },
  },

  cat: {
    name: "고양이",
    stages: {
      baby: "/characters/cat/baby.png",
      child: "/characters/cat/child.png",
      teen: "/characters/cat/teen.png",
      adult: "/characters/cat/adult.png",
    },
  },

  penguin: {
    name: "펭귄",
    stages: {
      baby: "/characters/penguin/baby.png",
      child: "/characters/penguin/child.png",
      teen: "/characters/penguin/teen.png",
      adult: "/characters/penguin/adult.png",
    },
  },

  "red-panda": {
    name: "레서판다",
    stages: {
      baby: "/characters/red-panda/baby.png",
      child: "/characters/red-panda/child.png",
      teen: "/characters/red-panda/teen.png",
      adult: "/characters/red-panda/adult.png",
    },
  },
} as const;