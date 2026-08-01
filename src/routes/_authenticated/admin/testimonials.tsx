import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { CrudManager } from "@/components/admin/CrudManager";

export const Route = createFileRoute("/_authenticated/admin/testimonials")({
  head: () => ({
    meta: [
      { title: "Testimonials Management — New Fitness Zone Admin" },
      { name: "description", content: "Add and edit member reviews and ratings displayed on the New Fitness Zone website." },
      { property: "og:title", content: "Testimonials Management — New Fitness Zone Admin" },
      { property: "og:description", content: "Manage member reviews shown on the website." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TestimonialsAdmin,
});

function TestimonialsAdmin() {
  return (
    <AdminShell title="TESTIMONIALS" subtitle="Manage the member reviews shown in the testimonials section.">
      <CrudManager
        table="testimonials"
        itemLabel="Testimonial"
        defaults={{ name: "", role: "", text: "", rating: 5, is_active: true, sort_order: 0 }}
        fields={[
          { key: "name", label: "Member name", type: "text", required: true },
          { key: "role", label: "Role / detail", type: "text", placeholder: "Working professional" },
          { key: "text", label: "Review", type: "textarea", required: true },
          { key: "rating", label: "Rating (1–5)", type: "number", min: 1, max: 5 },
          { key: "is_active", label: "Show on website", type: "boolean" },
          { key: "sort_order", label: "Sort order", type: "number" },
        ]}
        columns={[
          { key: "name", label: "Name" },
          { key: "role", label: "Role" },
          { key: "rating", label: "Rating" },
          {
            key: "text",
            label: "Review",
            render: (r) => <span className="line-clamp-1 max-w-[18rem]">{String(r.text)}</span>,
          },
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
