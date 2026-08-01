import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { CrudManager } from "@/components/admin/CrudManager";

export const Route = createFileRoute("/_authenticated/admin/trainers")({
  head: () => ({
    meta: [
      { title: "Trainer Management — New Fitness Zone Admin" },
      { name: "description", content: "Add, edit and remove trainers and coach photos shown on the New Fitness Zone website." },
      { property: "og:title", content: "Trainer Management — New Fitness Zone Admin" },
      { property: "og:description", content: "Manage the coaching team shown on the website." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TrainersAdmin,
});

function TrainersAdmin() {
  return (
    <AdminShell title="TRAINERS" subtitle="Manage the coaching team, photos, specialities and display order.">
      <CrudManager
        table="trainers"
        itemLabel="Trainer"
        defaults={{ name: "", role: "", photo_url: "", tags: [], experience: "", bio: "", is_head: false, is_active: true, sort_order: 0 }}
        fields={[
          { key: "name", label: "Name", type: "text", required: true },
          { key: "role", label: "Role", type: "text", placeholder: "Strength Coach" },
          { key: "photo_url", label: "Photo", type: "image", folder: "trainers" },
          { key: "tags", label: "Specialities (one per line)", type: "tags", placeholder: "Weight Lifting\nStrength Training" },
          { key: "experience", label: "Experience label", type: "text", placeholder: "Head Coach" },
          { key: "bio", label: "Bio", type: "textarea" },
          { key: "is_head", label: "Head trainer", type: "boolean" },
          { key: "is_active", label: "Show on website", type: "boolean" },
          { key: "sort_order", label: "Sort order", type: "number" },
        ]}
        columns={[
          {
            key: "photo_url",
            label: "Photo",
            render: (r) =>
              r.photo_url ? (
                <img src={String(r.photo_url)} alt="" className="h-10 w-10 rounded-lg object-cover" />
              ) : (
                <span className="text-white/30">—</span>
              ),
          },
          { key: "name", label: "Name" },
          { key: "role", label: "Role" },
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
