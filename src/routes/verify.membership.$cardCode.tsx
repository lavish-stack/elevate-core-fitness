import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Dumbbell, HelpCircle, Loader2, XCircle } from "lucide-react";
import { useSiteSettings } from "@/lib/site-data";
import { verifyMembershipCard } from "@/lib/membership-verify.functions";

export const Route = createFileRoute("/verify/membership/$cardCode")({
  head: () => ({
    meta: [
      { title: "Membership Verification — New Fitness Zone" },
      { name: "description", content: "Verify a New Fitness Zone membership card." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: VerifyMembershipPage,
});

function VerifyMembershipPage() {
  const { cardCode } = Route.useParams();
  const { settings } = useSiteSettings();
  const verify = useServerFn(verifyMembershipCard);

  const query = useQuery({
    queryKey: ["verify_membership", cardCode],
    queryFn: () => verify({ data: { cardCode } }),
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-primary to-red-700 shadow-lg">
            <Dumbbell className="h-5 w-5 text-white" />
          </div>
          <span className="font-display text-lg tracking-widest">
            {settings.name_part1} <span className="text-primary">{settings.name_part2}</span>
          </span>
        </Link>

        <div className="card-premium p-8 text-center">
          <div className="text-xs uppercase tracking-[0.25em] text-white/50">Membership Verification</div>

          {query.isLoading && (
            <div className="mt-8 flex flex-col items-center gap-3 text-white/60">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-sm">Checking card…</span>
            </div>
          )}

          {query.isError && (
            <div className="mt-8 flex flex-col items-center gap-3">
              <HelpCircle className="h-10 w-10 text-white/40" />
              <p className="text-sm text-white/60">Could not verify this card right now. Please try again.</p>
            </div>
          )}

          {query.data && !query.data.found && (
            <div className="mt-8 flex flex-col items-center gap-3">
              <HelpCircle className="h-10 w-10 text-white/40" />
              <p className="font-display text-2xl">Card Not Recognized</p>
              <p className="text-sm text-white/50">This membership card could not be found.</p>
            </div>
          )}

          {query.data?.found && (
            <div className="mt-8 flex flex-col items-center gap-4">
              {query.data.status === "active" ? (
                <CheckCircle2 className="h-12 w-12 text-emerald-400" />
              ) : (
                <XCircle className="h-12 w-12 text-primary" />
              )}

              <div>
                <p
                  className={`font-display text-3xl ${
                    query.data.status === "active" ? "text-emerald-400" : "text-primary"
                  }`}
                >
                  {query.data.status === "active" ? "Active" : query.data.status === "expired" ? "Expired" : "Cancelled"}
                </p>
                {query.data.memberFirstName && (
                  <p className="mt-1 text-white/80">{query.data.memberFirstName}</p>
                )}
              </div>

              <div className="w-full rounded-2xl bg-white/5 px-5 py-4 text-left text-sm">
                <div className="flex justify-between border-b border-white/10 py-2">
                  <span className="text-white/50">Plan</span>
                  <span className="text-white/85">{query.data.planName}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-white/50">Expires</span>
                  <span className="text-white/85">
                    {new Date(`${query.data.expiresAt}T00:00:00Z`).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-white/30">
          {settings.name_part1} {settings.name_part2} · Front desk verification only
        </p>
      </div>
    </div>
  );
}
