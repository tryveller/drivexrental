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