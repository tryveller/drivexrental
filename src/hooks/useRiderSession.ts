import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type SessionState = { loading: boolean; userId: string | null; phone: string | null };

function phoneOf(session: { user?: { user_metadata?: Record<string, unknown> } } | null) {
  const value = session?.user?.user_metadata?.["phone"];
  return typeof value === "string" ? value : null;
}

export function useRiderSession() {
  const [state, setState] = useState<SessionState>({
    loading: true,
    userId: null,
    phone: null,
  });

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active)
        setState({
          loading: false,
          userId: data.session?.user.id ?? null,
          phone: phoneOf(data.session),
        });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({
        loading: false,
        userId: session?.user.id ?? null,
        phone: phoneOf(session),
      });
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
