import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BackButton, Segmented } from "@/components/garden-ui";
import { PlantForm } from "@/components/plant-form";
import { createPlant } from "@/lib/plants.functions";

export const Route = createFileRoute("/_authenticated/add-plant")({
  head: () => ({
    meta: [
      { title: "Goldoon" },
      { name: "description", content: "گیاه جدیدی به مجموعه‌ات اضافه کن." },
    ],
  }),
  component: AddPlantPage,
});

function AddPlantPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const createFn = useServerFn(createPlant);

  return (
    <div className="px-4 pt-[18px]">
      <header className="mb-5 flex items-center justify-between gap-3">
        <BackButton onClick={() => navigate({ to: "/home" })} />
        <Segmented value="new" options={[{ value: "new", label: "گیاه جدید" }]} />
      </header>
      <h1 className="mb-3.5 text-2xl font-extrabold">افزودن گیاه</h1>

      <PlantForm
        submitLabel="افزودن گیاه"
        onSubmit={async (values) => {
          await createFn({ data: values });
          qc.invalidateQueries({ queryKey: ["plants"] });
          toast.success("گیاه اضافه شد");
          navigate({ to: "/home" });
        }}
      />
    </div>
  );
}
