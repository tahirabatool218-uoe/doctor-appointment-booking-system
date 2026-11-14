"use client";
import { useMemo, useState } from "react";
import { Users as UsersIcon } from "lucide-react";
import { Avatar, Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, PageHeader, PageLoader, Select, Table, TBody, Td, Th, THead, Tr, useToast } from "@/components/ui";
import { useAuth } from "@/features/auth/AuthProvider";
import { useFetch } from "@/hooks/useFetch";
import { getErrorMessage } from "@/lib/axios";
import { userService } from "@/services";
import { formatDate } from "@/lib/utils";
import type { Role, User } from "@/types";

const roleTone = { admin: "brand", doctor: "teal", patient: "slate" } as const;

export default function AdminUsersPage() {
  const toast = useToast();
  const { user: me } = useAuth();
  const [q, setQ] = useState("");
  const [role, setRole] = useState<"" | Role>("");
  const [target, setTarget] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const { data, loading, error, reload } = useFetch(() => userService.list(), []);

  const rows = useMemo(() => (data?.data ?? []).filter((u) => (!role || u.role === role) && (!q.trim() || `${u.name} ${u.email}`.toLowerCase().includes(q.trim().toLowerCase()))), [data, q, role]);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try { await fn(); toast.success(ok); setTarget(null); reload(); } catch (e) { toast.error(getErrorMessage(e)); } finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title="Manage users" description="Activate or deactivate accounts and change roles." />
      <Card>
        <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email" aria-label="Search users"
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 sm:w-72" />
          <Select aria-label="Filter by role" value={role} onChange={(e) => setRole(e.target.value as "" | Role)} wrapperClassName="w-full sm:w-44">
            <option value="">All roles</option><option value="patient">Patients</option><option value="doctor">Doctors</option><option value="admin">Admins</option>
          </Select>
        </div>
        {loading ? <PageLoader /> : error ? <div className="p-5"><ErrorState message={error} onRetry={reload} /></div>
          : rows.length === 0 ? <div className="p-5"><EmptyState icon={<UsersIcon className="h-6 w-6" />} title="No users found" description="Adjust the search or role filter." /></div>
          : (
            <Table>
              <THead><tr><Th>User</Th><Th>Role</Th><Th>Phone</Th><Th>Joined</Th><Th>Status</Th><Th className="text-right">Actions</Th></tr></THead>
              <TBody>
                {rows.map((u) => (
                  <Tr key={u._id}>
                    <Td><div className="flex items-center gap-3"><Avatar name={u.name} size="sm" /><div><p className="font-medium">{u.name}</p><p className="text-xs text-ink-soft">{u.email}</p></div></div></Td>
                    <Td>
                      <select aria-label={`Role for ${u.name}`} value={u.role} disabled={u._id === me?._id || u.role === "doctor" || busy}
                        title={u.role === "doctor" ? "Doctor accounts are managed from the Doctors page" : undefined}
                        onChange={(e) => run(() => userService.update(u._id, { role: e.target.value as Role }), "Role updated")}
                        className="h-8 rounded-md border border-slate-300 bg-white px-2 text-sm disabled:bg-slate-100">
                        {u.role === "doctor" ? <option value="doctor">Doctor</option> : <><option value="patient">Patient</option><option value="admin">Admin</option></>}
                      </select>
                    </Td>
                    <Td className="text-ink-soft">{u.phone ?? "None"}</Td>
                    <Td className="text-ink-soft">{formatDate(u.createdAt.slice(0, 10))}</Td>
                    <Td><Badge tone={u.isActive ? roleTone[u.role] : "slate"}>{u.isActive ? "Active" : "Deactivated"}</Badge></Td>
                    <Td className="text-right">
                      {u._id === me?._id ? <span className="text-xs text-ink-mute">You</span>
                        : <Button size="sm" variant={u.isActive ? "outline" : "secondary"} onClick={() => (u.isActive ? setTarget(u) : run(() => userService.update(u._id, { isActive: true }), "Account activated"))}>{u.isActive ? "Deactivate" : "Activate"}</Button>}
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
      </Card>
      <ConfirmDialog open={!!target} danger loading={busy} title="Deactivate account?" confirmLabel="Deactivate"
        message={`${target?.name} will be signed out and unable to log in until you reactivate the account.`}
        onClose={() => setTarget(null)} onConfirm={() => target && run(() => userService.update(target._id, { isActive: false }), "Account deactivated")} />
    </>
  );
}
