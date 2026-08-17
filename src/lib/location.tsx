import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type RiderLocation = {
  locality?: string;
  pinCode?: string;
  coords?: { lat: number; lng: number };
};

const STORAGE_KEY = "drivex.location";

type Ctx = {
  location: RiderLocation | null;
  ready: boolean;
  setLocation: (next: RiderLocation) => void;
  clearLocation: () => void;
};

const LocationContext = createContext<Ctx>({
  location: null,
  ready: false,
  setLocation: () => {},
  clearLocation: () => {},
});

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocationState] = useState<RiderLocation | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setLocationState(JSON.parse(raw) as RiderLocation);
    } catch {
      // ignore malformed storage
    }
    setReady(true);
  }, []);

  const setLocation = useCallback((next: RiderLocation) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setLocationState(next);
  }, []);

  const clearLocation = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setLocationState(null);
  }, []);

  const value = useMemo(
    () => ({ location, ready, setLocation, clearLocation }),
    [location, ready, setLocation, clearLocation],
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useRiderLocation() {
  return useContext(LocationContext);
}

export const LOCALITIES = [
  "Koramangala",
  "Indiranagar",
  "Whitefield",
  "Jayanagar",
  "HSR Layout",
];

/** Approximate centre of each launch-city locality (used only for distance). */
export const LOCALITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Koramangala: { lat: 12.9352, lng: 77.6245 },
  Indiranagar: { lat: 12.9719, lng: 77.6412 },
  Whitefield: { lat: 12.9698, lng: 77.7500 },
  Jayanagar: { lat: 12.9250, lng: 77.5938 },
  "HSR Layout": { lat: 12.9121, lng: 77.6446 },
};

/** Rough centres for common Bengaluru PIN codes, enough for an approximate distance. */
export const PIN_COORDS: Record<string, { lat: number; lng: number }> = {
  "560034": { lat: 12.9352, lng: 77.6245 },
  "560095": { lat: 12.9313, lng: 77.6205 },
  "560038": { lat: 12.9719, lng: 77.6412 },
  "560008": { lat: 12.9784, lng: 77.6207 },
  "560066": { lat: 12.9698, lng: 77.75 },
  "560011": { lat: 12.925, lng: 77.5938 },
  "560102": { lat: 12.9121, lng: 77.6446 },
  "560068": { lat: 12.9063, lng: 77.6199 },
  "560001": { lat: 12.9767, lng: 77.5993 },
  "560076": { lat: 12.8916, lng: 77.5978 },
};

/** Single launch hub — DriveX opens with one big hub. */
export const LAUNCH_HUB = {
  name: "Koramangala DriveX Hub",
  locality: "Koramangala",
  address: "80 Feet Rd, 4th Block, Koramangala, Bengaluru 560034",
  coords: { lat: 12.9352, lng: 77.6245 },
};

export const LAUNCH_HUB_MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${LAUNCH_HUB.coords.lat},${LAUNCH_HUB.coords.lng}`;
export const LAUNCH_HUB_EMBED_URL = `https://www.google.com/maps?q=${LAUNCH_HUB.coords.lat},${LAUNCH_HUB.coords.lng}&z=14&output=embed`;

/** Best-effort coordinates for a rider's chosen area or PIN code. */
export function approximateCoords(input: {
  locality?: string;
  pinCode?: string;
  coords?: { lat: number; lng: number };
}): { lat: number; lng: number } | null {
  if (input.coords) return input.coords;
  if (input.locality && LOCALITY_COORDS[input.locality]) return LOCALITY_COORDS[input.locality]!;
  if (input.pinCode && PIN_COORDS[input.pinCode]) return PIN_COORDS[input.pinCode]!;
  return null;
}