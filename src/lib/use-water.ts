import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { toFa } from "./fa";
import { undoWatering, waterPlant } from "./plants.functions";

/** Water a plant; warns (with undo) when it is watered again too soon. */
export function useWaterAction() {
  const qc = useQueryClient();
  const waterFn = useServerFn(waterPlant);
  const undoFn = useServerFn(undoWatering);

  const refresh = (id: string) =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["plants"] }),
      qc.invalidateQueries({ queryKey: ["waterings"] }),
      qc.invalidateQueries({ queryKey: ["plant", id] }),
    ]);

  return async (id: string, name: string) => {
    try {
      const res = await waterFn({ data: { id } });
      await refresh(id);
      if (!res.overwatered) {
        toast.success("آبیاری ثبت شد");
        return;
      }
      toast.error(`نه! ${name} زیاد آب خورده`, {
        description: `خاکش باید خشک بشه؛ تا ${toFa(res.waitDays)} روز دیگه بهش آب نده.`,
        duration: 8000,
        action: {
          label: "برگردون",
          onClick: async () => {
            try {
              await undoFn({
                data: {
                  id,
                  last_watered: res.previous.last_watered,
                  overwatered_on: res.previous.overwatered_on ?? null,
                },
              });
              await refresh(id);
              toast.success("آبیاری آخر برگردونده شد");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "خطا");
            }
          },
        },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا");
    }
  };
}
