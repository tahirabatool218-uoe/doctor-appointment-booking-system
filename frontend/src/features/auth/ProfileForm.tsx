"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Card, CardBody, CardHeader, Input, useToast } from "@/components/ui";
import { getErrorMessage } from "@/lib/axios";
import { userService } from "@/services";
import { useAuth } from "./AuthProvider";
import { profileSchema, type ProfileForm as Values } from "./schemas";

/** Account details shared by every role (name, phone). */
export function ProfileForm() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const { register, handleSubmit, formState: { errors, isSubmitting, isDirty } } = useForm<Values>({
    resolver: zodResolver(profileSchema), defaultValues: { name: user?.name ?? "", phone: user?.phone ?? "" },
  });
  const onSubmit = handleSubmit(async (v) => {
    try {
      const updated = await userService.updateMe({ name: v.name, phone: v.phone ?? "" });
      setUser({ ...user!, ...updated }); toast.success("Profile saved");
    } catch (e) { toast.error(getErrorMessage(e)); }
  });
  return (
    <Card>
      <CardHeader title="Account details" description="Your name and phone number appear on appointments." />
      <CardBody>
        <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
          <Input label="Full name" error={errors.name?.message} {...register("name")} />
          <Input label="Email" value={user?.email ?? ""} disabled readOnly hint="Email can't be changed." />
          <Input label="Phone" type="tel" error={errors.phone?.message} {...register("phone")} />
          <div className="flex items-end sm:col-span-2"><Button type="submit" loading={isSubmitting} disabled={!isDirty}>Save changes</Button></div>
        </form>
      </CardBody>
    </Card>
  );
}
