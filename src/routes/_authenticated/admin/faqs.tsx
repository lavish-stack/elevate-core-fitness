import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { CrudManager } from "@/components/admin/CrudManager";

export const Route = createFileRoute("/_authenticated/admin/faqs")({
  head: () => ({
    meta: [
      { title: "FAQ Management — New Fitness Zone Admin" },
      { name: "description", content: "Create and edit the frequently asked questions shown on the New Fitness Zone website." },
      { property: "og:title", content: "FAQ Management — New Fitness Zone Admin" },
      { property: "og:description", content: "Manage questions and answers shown on the website." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FaqsAdmin,
});

function FaqsAdmin() {
  return (
    <AdminShell title="FAQS" subtitle="Manage the questions and answers in the FAQ accordion.">
      <CrudManager
        table="faqs"
        itemLabel="FAQ"
        defaults={{ question: "", answer: "", is_active: true, sort_order: 0 }}
        fields={[
          { key: "question", label: "Question", type: "text", required: true },
          { key: "answer", label: "Answer", type: "textarea", required: true },
          { key: "is_active", label: "Show on website", type: "boolean" },
          { key: "sort_order", label: "Sort order", type: "number" },
        ]}
        columns={[
          { key: "question", label: "Question" },
          {
            key: "answer",
            label: "Answer",
            render: (r) => <span className="line-clamp-1 max-w-[20rem]">{String(r.answer)}</span>,
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
