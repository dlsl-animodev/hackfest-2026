import { domAnimation, type Transition, type Variants } from "framer-motion";

export const CHAT_MOTION = {
  features: domAnimation,
  ease: [0.22, 1, 0.36, 1] as const,
  durations: {
    brisk: 0.22,
    fast: 0.32,
    base: 0.44,
    slow: 0.58,
  },
  delays: {
    assistant: 0.08,
    stage: 0.06,
  },
  spring: {
    type: "spring",
    stiffness: 280,
    damping: 30,
    mass: 0.9,
  } satisfies Transition,
  layout: {
    duration: 0.42,
    ease: [0.22, 1, 0.36, 1],
  } satisfies Transition,
};

export function getSettleMotion(
  reduceMotion: boolean,
  delay = 0,
  y = 16,
) {
  return reduceMotion
    ? {
        initial: { opacity: 0 },
        animate: {
          opacity: 1,
          transition: {
            duration: CHAT_MOTION.durations.fast,
            ease: CHAT_MOTION.ease,
            delay,
          },
        },
      }
    : {
        initial: {
          opacity: 0,
          y,
          filter: "blur(10px)",
        },
        animate: {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          transition: {
            duration: CHAT_MOTION.durations.base,
            ease: CHAT_MOTION.ease,
            delay,
          },
        },
      };
}

export function getWorkspaceRevealMotion(reduceMotion: boolean) {
  return reduceMotion
    ? {
        initial: { opacity: 0 },
        animate: {
          opacity: 1,
          transition: {
            duration: CHAT_MOTION.durations.fast,
            ease: CHAT_MOTION.ease,
          },
        },
      }
    : {
        initial: {
          opacity: 0,
          y: 20,
          clipPath: "inset(0 0 10% 0 round 1.7rem)",
        },
        animate: {
          opacity: 1,
          y: 0,
          clipPath: "inset(0 0 0% 0 round 1.7rem)",
          transition: {
            duration: CHAT_MOTION.durations.slow,
            ease: CHAT_MOTION.ease,
          },
        },
      };
}

export function getStaggerContainerVariants(
  reduceMotion: boolean,
  childDelay = 0,
): Variants {
  return {
    hidden: reduceMotion
      ? { opacity: 0 }
      : { opacity: 0, y: 18, filter: "blur(12px)" },
    visible: reduceMotion
      ? {
          opacity: 1,
          transition: {
            duration: CHAT_MOTION.durations.fast,
            ease: CHAT_MOTION.ease,
            when: "beforeChildren",
            staggerChildren: CHAT_MOTION.delays.stage,
            delayChildren: childDelay,
          },
        }
      : {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          transition: {
            duration: CHAT_MOTION.durations.base,
            ease: CHAT_MOTION.ease,
            when: "beforeChildren",
            staggerChildren: CHAT_MOTION.delays.stage,
            delayChildren: childDelay,
          },
        },
  };
}

export function getFadeUpVariants(reduceMotion: boolean): Variants {
  return {
    hidden: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14 },
    visible: reduceMotion
      ? {
          opacity: 1,
          transition: {
            duration: CHAT_MOTION.durations.fast,
            ease: CHAT_MOTION.ease,
          },
        }
      : {
          opacity: 1,
          y: 0,
          transition: {
            duration: CHAT_MOTION.durations.base,
            ease: CHAT_MOTION.ease,
          },
        },
  };
}
