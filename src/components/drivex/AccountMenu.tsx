import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Bike, ClipboardList, History, LogOut, Menu, MessageSquare, Star, User } from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRiderSession } from "@/hooks/useRiderSession";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export function AccountMenu() {
  const session = useRiderSession();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  if (session.loading || !session.userId) return null;

  const label = session.phone ? `+91 ${session.phone}` : t("accountMenu");

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success(t("signedOutToast"));
    navigate({ to: "/", replace: true });
  }

  const go = (to: "/journey" | "/my-bike" | "/account", hash?: string) =>
    navigate(hash ? { to, hash } : { to });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("accountMenu")}
        className="flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-2.5 py-1.5 text-xs font-medium backdrop-blur transition-colors hover:bg-secondary"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15">
          <User className="h-3 w-3 text-primary" />
        </span>
        <Menu className="h-3.5 w-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="space-y-0.5">
          <span className="block text-[11px] font-normal text-muted-foreground">
            {t("signedInAs")}
          </span>
          <span className="block text-sm">{label}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => go("/eligibility")}>
          <ShieldCheck className="mr-2 h-4 w-4" /> {t("checkEligibilityAnytime")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => go("/journey")}>
          <ClipboardList className="mr-2 h-4 w-4" /> {t("currentBookings")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => go("/my-bike")}>
          <Bike className="mr-2 h-4 w-4" /> {t("openMyBike")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => go("/account", "previous")}>
          <History className="mr-2 h-4 w-4" /> {t("previousBookings")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => go("/account", "services")}>
          <History className="mr-2 h-4 w-4" /> {t("serviceHistory")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => go("/account", "complaints")}>
          <MessageSquare className="mr-2 h-4 w-4" /> {t("complaints")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => go("/account", "feedback")}>
          <Star className="mr-2 h-4 w-4" /> {t("feedbackGiven")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOut()}>
          <LogOut className="mr-2 h-4 w-4" /> {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
