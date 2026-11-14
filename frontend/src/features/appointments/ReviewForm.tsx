"use client";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, StarInput, Textarea, useToast } from "@/components/ui";
import { getErrorMessage } from "@/lib/axios";
import { reviewService } from "@/services";

const schema = z.object({
  rating: z.number({ invalid_type_error: "Choose a rating" }).int().min(1, "Choose a star rating").max(5),
  comment: z.string().max(500, "Keep it under 500 characters").optional(),
});
type Values = z.infer<typeof schema>;

export function ReviewForm({ appointmentId, onDone }: { appointmentId: string; onDone: () => void }) {
  const toast = useToast();
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { rating: 0, comment: "" } });
  const submit = handleSubmit(async (v) => {
    try { await reviewService.create({ appointment: appointmentId, rating: v.rating, comment: v.comment?.trim() || undefined }); toast.success("Thanks for your review"); onDone(); }
    catch (e) { toast.error(getErrorMessage(e)); }
  });
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div>
        <StarInput value={watch("rating")} onChange={(n) => setValue("rating", n, { shouldValidate: true })} />
        {errors.rating && <p role="alert" className="mt-1.5 text-sm text-red-600">{errors.rating.message}</p>}
      </div>
      <Textarea aria-label="Your review" placeholder="How was your visit? (optional)" error={errors.comment?.message} {...register("comment")} />
      <Button type="submit" loading={isSubmitting}>Submit review</Button>
    </form>
  );
}
