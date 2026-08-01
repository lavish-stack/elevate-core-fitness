import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { CrudManager } from "@/components/admin/CrudManager";

export const Route = createFileRoute("/_authenticated/admin/gallery")({
  head: () => ({
    meta: [
      { title: "Gallery Management — New Fitness Zone Admin" },
      { name: "description", content: "Upload, reorder and remove gym gallery photos shown on the New Fitness Zone website." },
      { property: "og:title", content: "Gallery Management — New Fitness Zone Admin" },
      { property: "og:description", content: "Manage the gym photo gallery." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: GalleryAdmin,
});

function GalleryAdmin() {
  return (
    <AdminShell title="GALLERY" subtitle="Upload gym photos, set alt text for SEO and control the display order.">
      <CrudManager
        table="gallery_images"
        itemLabel="Image"
        defaults={{ image_url: "", alt_text: "", is_active: true, sort_order: 0 }}
        fields={[
          { key: "image_url", label: "Image", type: "image", folder: "gallery", required: true },
          { key: "alt_text", label: "Alt text", type: "text", placeholder: "Heavy deadlift session" },
          { key: "is_active", label: "Show on website", type: "boolean" },
          { key: "sort_order", label: "Sort order", type: "number" },
        ]}
        columns={[
          {
            key: "image_url",
            label: "Image",
            render: (r) => <img src={String(r.image_url)} alt="" className="h-12 w-16 rounded-lg object-cover" />,
          },
          { key: "alt_text", label: "Alt text" },
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
