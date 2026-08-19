import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";

/**
 * Tinder-style swipe deck. The top card follows the pointer; releasing past
 * the threshold moves to the next (left swipe) or previous (right swipe) bike.
 */
export function BikeDeck({
  items,
  renderItem,
  index: controlledIndex,
  onIndexChange,
}: {
  items: { key: string }[];
  renderItem: (index: number, isTop: boolean) => React.ReactNode;
  /** Optional controlled position, so icons above the deck can jump to a bike. */
  index?: number;
  onIndexChange?: (next: number) => void;
}) {
  const { t } = useLanguage();
  const [innerIndex, setInnerIndex] = useState(0);
  const [dx, setDx] = useState(0);
  const startX = useRef<number | null>(null);

  const total = items.length;
  const index = controlledIndex ?? innerIndex;

  function setIndex(next: number) {
    setInnerIndex(next);
    onIndexChange?.(next);
  }

  useEffect(() => {
    if (index > total - 1) setIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, total]);

  function move(step: number) {
    if (total < 2) return;
    setIndex((index + step + total) % total);
  }

  function onPointerDown(event: React.PointerEvent) {
    if (total < 2) return;
    startX.current = event.clientX;
  }
  function onPointerMove(event: React.PointerEvent) {
    if (startX.current === null) return;
    setDx(event.clientX - startX.current);
  }
  function onPointerUp() {
    if (startX.current === null) return;
    const travelled = dx;
    startX.current = null;
    setDx(0);
    if (travelled < -70) move(1);
    else if (travelled > 70) move(-1);
  }

  if (total === 0) return null;

  // Show the top card plus up to two peeking behind it.
  const stack = [0, 1, 2].filter((offset) => offset < total);

  return (
    <div>
      {/* Fixed height keeps the arrows and dots anchored while cards change. */}
      <div className="relative h-[28.5rem] select-none sm:h-[30rem]" style={{ touchAction: "pan-y" }}>
        {stack
          .slice()
          .reverse()
          .map((offset) => {
            const cardIndex = (index + offset) % total;
            const isTop = offset === 0;
            return (
              <div
                key={items[cardIndex]?.key ?? cardIndex}
                className={cn(
                  "absolute inset-0 transition-transform duration-300 ease-out",
                  isTop && "z-30",
                  offset === 1 && "z-20",
                  offset === 2 && "z-10",
                )}
                style={{
                  transform: isTop
                    ? `translateX(${dx}px) rotate(${dx / 28}deg)`
                    : `translateY(${offset * 14}px) scale(${1 - offset * 0.045})`,
                  opacity: isTop ? 1 : 0.55 - (offset - 1) * 0.2,
                  transitionDuration: startX.current !== null ? "0ms" : undefined,
                  pointerEvents: isTop ? "auto" : "none",
                }}
                onPointerDown={isTop ? onPointerDown : undefined}
                onPointerMove={isTop ? onPointerMove : undefined}
                onPointerUp={isTop ? onPointerUp : undefined}
                onPointerCancel={isTop ? onPointerUp : undefined}
              >
                {renderItem(cardIndex, isTop)}
              </div>
            );
          })}
      </div>

      <div className="mt-3 flex items-center justify-center gap-4">
        <button
          type="button"
          aria-label="Previous bike"
          onClick={() => move(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/40 bg-card/70 text-primary transition-colors hover:bg-primary/10"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-1.5">
          {items.map((item, position) => (
            <span
              key={item.key}
              className={cn(
                "h-1.5 rounded-full transition-all",
                position === index ? "w-5 bg-primary" : "w-1.5 bg-primary/30",
              )}
            />
          ))}
        </div>
        <button
          type="button"
          aria-label="Next bike"
          onClick={() => move(1)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/40 bg-card/70 text-primary transition-colors hover:bg-primary/10"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        {t("swipeToBrowse")} · {t("deckCount", { index: index + 1, total })}
      </p>
    </div>
  );
}
