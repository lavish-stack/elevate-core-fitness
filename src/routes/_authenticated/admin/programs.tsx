import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { CrudManager } from "@/components/admin/CrudManager";

export const Route = createFileRoute("/_authenticated/admin/programs")({
  head: () => ({
    meta: [
      { title: "Programs Management — New Fitness Zone Admin" },
      { name: "description", content: "Manage training programs, descriptions, icons and featured specialities on the website." },
      { property: "og:title", content: "Programs Management — New Fitness Zone Admin" },
      { property: "og:description", content: "Manage the training programs shown on the website." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProgramsAdmin,
});

function ProgramsAdmin() {
  return (
    <AdminShell title="PROGRAMS" subtitle="Manage training programs and mark your specialities as featured.">
      <CrudManager
        table="programs"
        itemLabel="Program"
        defaults={{ title: "", description: "", icon: "Dumbbell", is_featured: false, is_active: true, sort_order: 0 }}
        fields={[
          { key: "title", label: "Title", type: "text", required: true },
          { key: "description", label: "Description", type: "textarea" },
          {
            key: "icon",
            label: "Icon name",
            type: "text",
            help: "One of: Dumbbell, Trophy, Zap, Target, Flame, Activity, Heart, Users",
          },
          { key: "is_featured", label: "Featured speciality", type: "boolean" },
          { key: "is_active", label: "Show on website", type: "boolean" },
          { key: "sort_order", label: "Sort order", type: "number" },
        ]}
        columns={[
          { key: "title", label: "Title" },
          { key: "icon", label: "Icon" },
          {
            key: "is_featured",
            label: "Featured",
            render: (r) => (r.is_featured ? <span className="text-primary">Yes</span> : "No"),
          },
          { key: "sort_order", label: "Order" },
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
