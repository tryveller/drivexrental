import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Bike,
  CalendarClock,
  FileText,
  Gauge,
  Loader2,
  ReceiptText,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/drivex/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRiderSession } from "@/hooks/useRiderSession";
import {
  bookService,
  completeReturn,
  getMyBike,
  payChallan,
  payRent,
  requestReturn,
} from "@/lib/rental.functions";
import { SERVICE_INTERVAL_DAYS, SERVICE_INTERVAL_KM } from "@/lib/pricing";
import { longDate, modelTitle, rupees, shortDate } from "@/lib/format";

export const Route = createFileRoute("/my-bike")({
  head: () => ({
    meta: [
      { title: "My Bike — DriveX" },
      {
        name: "description",
        content:
          "Your DriveX rental in one place: kilometres used, bike health, servicing, payments, challans and return.",
      },
      { property: "og:title", content: "My Bike — DriveX" },
      {
        property: "og:description",
        content: "Track kilometres, servicing, payments and challans for your DriveX rental.",
      },
    ],
  }),
  component: MyBikePage,
});

function MyBikePage() {
  const navigate = useNavigate();
  const session = useRiderSession();
  const queryClient = useQueryClient();

  const bike = useQuery({
    queryKey: ["my-bike"],
    queryFn: () => getMyBike(),
    enabled: Boolean(session.userId),
  });

  useEffect(() => {
    if (!session.loading && !session.userId) navigate({ to: "/auth" });
  }, [session, navigate]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["my-bike"] });

  if (session.loading || bike.isLoading) {
    return (
      <AppShell subtitle="My Bike">
        <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading your bike…
        </div>
      </AppShell>
    );
  }

  const data = bike.data;
  if (!data) {
    return (
      <AppShell subtitle="My Bike">
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <Bike className="mx-auto h-8 w-8 text-primary" />
          <h1 className="mt-3 text-lg font-semibold">No active rental yet</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Once you collect a bike from the hub, everything about it shows up here.
          </p>
          <Button className="mt-4" onClick={() => navigate({ to: "/journey" })}>
            View my booking
          </Button>
        </div>
      </AppShell>
    );
  }

  const { rental, vehicle, plan, model, hub, km, health, challans, services, dues } = data;
  const pendingChallans = challans.filter((row) => row.status === "PENDING");
  const healthTone =
    health.status === "Good"
      ? "bg-accent text-accent-foreground"
      : health.status === "Service Due Soon"
        ? "bg-secondary text-secondary-foreground"
        : "bg-destructive/10 text-destructive";

  return (
    <AppShell subtitle="My Bike">
      <header className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">
              {model ? modelTitle(model.brand, model.name) : "Your bike"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {vehicle.registration_number} ·{" "}
              {vehicle.condition === "NEW" ? "New bike" : "Refurbished bike"}
            </p>
          </div>
          <Badge className={healthTone} variant="secondary">
            {health.status}
          </Badge>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Odometer {vehicle.odometer_km.toLocaleString("en-IN")} km · fuel {vehicle.fuel_percent}%
          {vehicle.telemetry_updated_at
            ? ` · updated ${longDate(vehicle.telemetry_updated_at)}`
            : ""}
        </p>
      </header>

      <Tabs defaultValue="overview" className="mt-5">
        <TabsList className="w-full">
          <TabsTrigger value="overview" className="flex-1">
            Overview
          </TabsTrigger>
          <TabsTrigger value="service" className="flex-1">
            Service
          </TabsTrigger>
          <TabsTrigger value="money" className="flex-1">
            Payments
          </TabsTrigger>
          <TabsTrigger value="return" className="flex-1">
            Return
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card icon={<Gauge className="h-5 w-5 text-primary" />} title="Kilometres this period">
            <Progress value={km.percentUsed} className="mt-1" />
            <p className="mt-2 text-sm text-muted-foreground">
              {km.usedKm.toLocaleString("en-IN")} of {km.includedKm.toLocaleString("en-IN")} km used
              {km.overKm > 0
                ? ` · ${km.overKm} km over, ${rupees(km.overageAmount)} in extra charges so far`
                : ` · ${km.remainingKm.toLocaleString("en-IN")} km left`}
            </p>
            {rental.period_resets_on && (
              <p className="mt-1 text-xs text-muted-foreground">
                Allowance resets on {shortDate(rental.period_resets_on)}
              </p>
            )}
          </Card>

          <Card icon={<Wrench className="h-5 w-5 text-primary" />} title="Bike health">
            <p className="text-sm text-muted-foreground">
              Servicing is required every {SERVICE_INTERVAL_DAYS} days or{" "}
              {SERVICE_INTERVAL_KM.toLocaleString("en-IN")} km, whichever comes first.
            </p>
            <p className="mt-2 text-sm">
              {health.status === "Service Overdue"
                ? `Service is overdue by ${health.detail}. Please book a slot now.`
                : `Next service due in ${health.detail}.`}
            </p>
          </Card>

          {pendingChallans.length > 0 && (
            <Card
              icon={<AlertTriangle className="h-5 w-5 text-destructive" />}
              title="Traffic challans to pay"
            >
              <ul className="space-y-3">
                {pendingChallans.map((challan) => (
                  <li key={challan.id} className="flex items-start justify-between gap-3">
                    <span className="text-sm">
                      <span className="block font-medium">{challan.violation}</span>
                      <span className="block text-xs text-muted-foreground">
                        {challan.challan_no} · {shortDate(challan.challan_date)}
                        {challan.location ? ` · ${challan.location}` : ""}
                      </span>
                    </span>
                    <PayButton
                      label={rupees(challan.amount)}
                      run={() => payChallan({ data: { challanId: challan.id } })}
                      onDone={refresh}
                    />
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="service" className="space-y-4">
          <ServiceBooking rentalId={rental.id} hubId={hub?.id ?? ""} onDone={refresh} />
          <Card icon={<CalendarClock className="h-5 w-5 text-primary" />} title="Service history">
            {services.length === 0 ? (
              <p className="text-sm text-muted-foreground">No services booked yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {services.map((service) => (
                  <li key={service.id} className="flex justify-between gap-3">
                    <span>
                      {shortDate(service.scheduled_on)} · {service.slot}
                    </span>
                    <Badge variant="secondary">{service.status.toLowerCase()}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="money" className="space-y-4">
          <Card icon={<ReceiptText className="h-5 w-5 text-primary" />} title="Next payment">
            <p className="text-sm text-muted-foreground">
              {rupees(dues.rent)} due
              {rental.next_payment_due_on ? ` on ${shortDate(rental.next_payment_due_on)}` : ""}.
              Late payments attract {rupees(plan.late_fee_per_day)} per day.
            </p>
            <div className="mt-3">
              <PayButton
                label={`Pay ${rupees(dues.rent)}`}
                run={() => payRent({ data: { rentalId: rental.id } })}
                onDone={refresh}
              />
            </div>
          </Card>

          <Card icon={<FileText className="h-5 w-5 text-primary" />} title="Payment history">
            {data.ledger.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing here yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {data.ledger.map((entry) => (
                  <li key={entry.id} className="flex justify-between gap-3">
                    <span>
                      <span className="block font-medium">
                        {entry.entry_type.replaceAll("_", " ").toLowerCase()}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {entry.note ?? shortDate(entry.created_at)}
                      </span>
                    </span>
                    <span className="font-medium">{rupees(entry.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="return" className="space-y-4">
          <Card icon={<Bike className="h-5 w-5 text-primary" />} title="Return your bike">
            <p className="text-sm text-muted-foreground">
              Return to {hub?.name ?? "your hub"}. We'll inspect the bike with you and compare it
              against the photos taken at handover.
            </p>
            <dl className="mt-3 space-y-1.5 text-sm">
              <Row label="Refundable security deposit" value={rupees(plan.deposit_amount)} />
              <Row label="Pending challans" value={rupees(dues.challans)} />
              <Row label="Extra kilometre charges" value={rupees(dues.kmOverage)} />
              <Row
                label="Estimated refund before inspection"
                value={rupees(
                  Math.max(0, plan.deposit_amount - dues.challans - dues.kmOverage),
                )}
              />
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">
              Damage charges, if any, are added after the return inspection.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              {rental.status === "ACTIVE" ? (
                <PayButton
                  label="Request a return slot"
                  run={() =>
                    requestReturn({
                      data: {
                        rentalId: rental.id,
                        hubId: hub?.id ?? "",
                        slot: new Date(Date.now() + 86_400_000).toISOString(),
                      },
                    })
                  }
                  onDone={refresh}
                />
              ) : (
                <PayButton
                  label="Complete return inspection"
                  run={() => completeReturn({ data: { rentalId: rental.id } })}
                  onDone={async () => {
                    await refresh();
                    toast.success("Return recorded. Your refund is being processed.");
                  }}
                />
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function Card({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          {icon}
        </span>
        <h2 className="font-semibold">{title}</h2>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function PayButton<T>({
  label,
  run,
  onDone,
}: {
  label: string;
  run: () => Promise<T>;
  onDone: () => void | Promise<void>;
}) {
  const mutation = useMutation({
    mutationFn: run,
    onSuccess: async () => {
      await onDone();
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Something went wrong."),
  });

  return (
    <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
      {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {label}
    </Button>
  );
}

function ServiceBooking({
  rentalId,
  hubId,
  onDone,
}: {
  rentalId: string;
  hubId: string;
  onDone: () => void;
}) {
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("10:00 AM – 12:00 PM");

  const book = useMutation({
    mutationFn: () =>
      bookService({ data: { rentalId, hubId, scheduledOn: date, slot } }),
    onSuccess: () => {
      toast.success("Service slot booked.");
      onDone();
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Could not book that slot."),
  });

  return (
    <Card icon={<Wrench className="h-5 w-5 text-primary" />} title="Book a service slot">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="service-date">Date</Label>
          <Input
            id="service-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="service-slot">Slot</Label>
          <select
            id="service-slot"
            value={slot}
            onChange={(event) => setSlot(event.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option>10:00 AM – 12:00 PM</option>
            <option>12:00 PM – 2:00 PM</option>
            <option>3:00 PM – 5:00 PM</option>
            <option>5:00 PM – 7:00 PM</option>
          </select>
        </div>
      </div>
      <Button
        className="mt-3"
        onClick={() => book.mutate()}
        disabled={!date || !hubId || book.isPending}
      >
        {book.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Book slot
      </Button>
    </Card>
  );
}