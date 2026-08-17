import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useRiderSession() {
  const [state, setState] = useState<{ loading: boolean; userId: string | null }>({
    loading: true,
    userId: null,
  });

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setState({ loading: false, userId: data.session?.user.id ?? null });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ loading: false, userId: session?.user.id ?? null });
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}