import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { CrudManager } from "@/components/admin/CrudManager";
import { formatINR } from "@/lib/site-data";

export const Route = createFileRoute("/_authenticated/admin/plans")({
  head: () => ({
    meta: [
      { title: "Membership Plans — New Fitness Zone Admin" },
      { name: "description", content: "Create and edit membership plans, pricing in rupees, durations and plan features." },
      { property: "og:title", content: "Membership Plans — New Fitness Zone Admin" },
      { property: "og:description", content: "Manage membership pricing and features." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PlansAdmin,
});

function PlansAdmin() {
  return (
    <AdminShell title="MEMBERSHIP PLANS" subtitle="Set pricing in rupees, plan duration, features and which plan is recommended.">
      <CrudManager
        table="membership_plans"
        itemLabel="Plan"
        defaults={{ name: "", price_inr: 0, period_label: "/month", duration_days: 30, tag: "", features: [], is_recommended: false, is_active: true, sort_order: 0 }}
        fields={[
          { key: "name", label: "Plan name", type: "text", required: true },
          { key: "price_inr", label: "Price (₹)", type: "number", required: true },
          { key: "period_label", label: "Period label", type: "text", placeholder: "/month" },
          { key: "duration_days", label: "Duration (days)", type: "number" },
          { key: "tag", label: "Tag", type: "text", placeholder: "Popular" },
          { key: "features", label: "Features (one per line)", type: "tags" },
          { key: "is_recommended", label: "Highlight as recommended", type: "boolean" },
          { key: "is_active", label: "Show on website", type: "boolean" },
          { key: "sort_order", label: "Sort order", type: "number" },
        ]}
        columns={[
          { key: "name", label: "Plan" },
          { key: "price_inr", label: "Price", render: (r) => `₹${formatINR(Number(r.price_inr))}` },
          { key: "period_label", label: "Period" },
          { key: "duration_days", label: "Days" },
          {
            key: "is_active",
            label: "Live",
            render: (r) => (r.is_active ? <span className="text-primary">Yes</span> : "No"),
          },
        ]}
      />
    </AdminShell>
  );
}
