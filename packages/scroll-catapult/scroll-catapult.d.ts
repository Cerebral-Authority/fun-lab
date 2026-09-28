declare namespace ScrollCatapult {
  interface Options {
    /** Press duration in ms to summon the scrollbar. Default 333. */
    holdMs?: number;
    /** Pixels of drift allowed during the hold before it counts as a normal scroll. Default 12. */
    moveTolerance?: number;
    /** No tap zone in px around the viewport edges. Default 28. */
    edgePadding?: number;
    /** Holding still after the summon: ms to reach full power. Default 1000. */
    holdFullMs?: number;
    /** Releases below this power (0 to 1) cancel. Default 0.06. */
    minPower?: number;
    /** Full power travel as a multiple of the scrollable height. Default 1.15. */
    maxTravel?: number;
    /** Flight time in ms at the lowest power. Default 900. */
    flightMinMs?: number;
    /** Flight time in ms at full power. Default 2100. */
    flightMaxMs?: number;
    /** Speed in px/s needed to detonate against the top or bottom. Default 900. */
    impactSpeed?: number;
    /** Ms after settling before the bar fades. Default 450. */
    hideDelay?: number;
    /** Fireball, shockwave and sparks on a hard landing. Default true. */
    explosions?: boolean;
    /** Pointer types that can start a gesture. Default ['touch', 'pen']. */
    pointerTypes?: Array<'touch' | 'pen' | 'mouse'>;
    /** Stay off when the visitor has prefers-reduced-motion set. Default true. */
    respectReducedMotion?: boolean;
    /** CSS selector for elements where a gesture must never start. */
    ignore?: string;
    /** Hex color for the anchor ring and resting glow. Default '#8f6fff'. */
    accentColor?: string;
    /** Hex color for the side of the bar you will fly toward. Default '#ff5fbf'. */
    destinationColor?: string;
    /** Hex color for the side of the bar you launch from. Default '#ff9040'. */
    originColor?: string;
    /** Stacking order of the overlay. Default 9000. */
    zIndex?: number;
  }

  interface Instance {
    /** Remove every listener, element and style the catapult added. */
    destroy(): void;
    /** Resume after disable(). */
    enable(): void;
    /** Pause without removing anything. Cancels any gesture or flight in progress. */
    disable(): void;
    /** False when disabled, destroyed, or paused by reduced motion. */
    isEnabled(): boolean;
  }
}

declare const ScrollCatapult: {
  readonly version: string;
  readonly defaults: Readonly<Required<ScrollCatapult.Options>>;
  /** Attach the catapult to the page. Replaces any existing instance. */
  init(options?: ScrollCatapult.Options): ScrollCatapult.Instance;
  /** Destroy the current instance, if any. */
  destroy(): void;
};

export = ScrollCatapult;
export as namespace ScrollCatapult;
