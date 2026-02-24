import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Loader2, RotateCcw, Save } from "lucide-react";

type Props = {
  userId: number;
};

type FormState = {
  id: number;
  username: string;
  openId: string;
  name: string;
  email: string;
  loginMethod: string;
  role: "user" | "admin";
  status: "pending" | "approved" | "rejected";
  rejectionReason: string;
  groupId: string;
  createdAt: string;
  updatedAt: string;
  lastSignedIn: string;
};

function toLocalDateTimeInput(value?: string | Date | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIso(value: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

export default function AdminUserSettings({ userId }: Props) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [form, setForm] = useState<FormState | null>(null);

  const isValidUserId = Number.isFinite(userId) && userId > 0;

  const userQuery = trpc.admin.getUserById.useQuery(
    { userId },
    { enabled: user?.role === "admin" && isValidUserId }
  );

  const groupsQuery = trpc.admin.getUserGroups.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  useEffect(() => {
    const data = userQuery.data;
    if (!data) return;

    setForm({
      id: data.id,
      username: data.username ?? "",
      openId: data.openId ?? "",
      name: data.name ?? "",
      email: data.email ?? "",
      loginMethod: data.loginMethod ?? "",
      role: data.role ?? "user",
      status: data.status ?? "pending",
      rejectionReason: data.rejectionReason ?? "",
      groupId: data.groupId == null ? "" : String(data.groupId),
      createdAt: toLocalDateTimeInput(data.createdAt),
      updatedAt: toLocalDateTimeInput(data.updatedAt),
      lastSignedIn: toLocalDateTimeInput(data.lastSignedIn),
    });
  }, [userQuery.data]);

  const updateMutation = trpc.admin.updateUser.useMutation({
    onSuccess: async () => {
      toast.success("사용자 정보가 저장되었습니다.");
      await userQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resetPasswordMutation = trpc.admin.resetUserPassword.useMutation({
    onSuccess: async (result) => {
      toast.success(`비밀번호가 사용자 ID(${result.temporaryPassword})로 초기화되었습니다.`);
      await userQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-600">Only administrators can access this page.</p>
        </div>
      </div>
    );
  }

  if (!isValidUserId) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <Button variant="outline" onClick={() => navigate("/admin")} className="gap-2 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Invalid user id.
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSave = () => {
    if (!form) return;
    if (!form.username.trim()) {
      toast.error("username is required");
      return;
    }

    updateMutation.mutate({
      userId: form.id,
      username: form.username.trim(),
      openId: form.openId.trim() || null,
      name: form.name.trim() || undefined,
      email: form.email.trim() || null,
      loginMethod: form.loginMethod.trim() || null,
      role: form.role,
      status: form.status,
      rejectionReason: form.rejectionReason.trim() || null,
      groupId: form.groupId ? Number(form.groupId) : null,
      createdAt: toIso(form.createdAt),
      updatedAt: toIso(form.updatedAt),
      lastSignedIn: toIso(form.lastSignedIn),
    });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">User Settings</h1>
            <p className="text-muted-foreground">Edit user table fields and reset password</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/admin")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Admin
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
            <CardDescription>
              Primary key (`id`) and `passwordHash` are not directly editable. Use password reset.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {userQuery.isLoading || !form ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : userQuery.error ? (
              <div className="text-sm text-red-600">{userQuery.error.message}</div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="id">ID</Label>
                    <Input id="id" value={String(form.id)} readOnly />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={form.username}
                      onChange={(e) => setField("username", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setField("name", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setField("email", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="openId">Open ID</Label>
                    <Input
                      id="openId"
                      value={form.openId}
                      onChange={(e) => setField("openId", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="loginMethod">Login Method</Label>
                    <Input
                      id="loginMethod"
                      value={form.loginMethod}
                      onChange={(e) => setField("loginMethod", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <select
                      id="role"
                      className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                      value={form.role}
                      onChange={(e) => setField("role", e.target.value as FormState["role"])}
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <select
                      id="status"
                      className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                      value={form.status}
                      onChange={(e) => setField("status", e.target.value as FormState["status"])}
                    >
                      <option value="pending">pending</option>
                      <option value="approved">approved</option>
                      <option value="rejected">rejected</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="groupId">Group</Label>
                    <select
                      id="groupId"
                      className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                      value={form.groupId}
                      onChange={(e) => setField("groupId", e.target.value)}
                    >
                      <option value="">none</option>
                      {(groupsQuery.data || []).map((group: any) => (
                        <option key={group.id} value={String(group.id)}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="passwordHash">Password Hash</Label>
                    <Input id="passwordHash" value="Hidden (use reset button)" readOnly />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rejectionReason">Rejection Reason</Label>
                  <Textarea
                    id="rejectionReason"
                    value={form.rejectionReason}
                    onChange={(e) => setField("rejectionReason", e.target.value)}
                    placeholder="Optional"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="createdAt">Created At</Label>
                    <Input
                      id="createdAt"
                      type="datetime-local"
                      value={form.createdAt}
                      onChange={(e) => setField("createdAt", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="updatedAt">Updated At</Label>
                    <Input
                      id="updatedAt"
                      type="datetime-local"
                      value={form.updatedAt}
                      onChange={(e) => setField("updatedAt", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastSignedIn">Last Signed In</Label>
                    <Input
                      id="lastSignedIn"
                      type="datetime-local"
                      value={form.lastSignedIn}
                      onChange={(e) => setField("lastSignedIn", e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => resetPasswordMutation.mutate({ userId: form.id })}
                    disabled={resetPasswordMutation.isPending}
                    className="gap-2"
                  >
                    {resetPasswordMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RotateCcw className="w-4 h-4" />
                    )}
                    Reset Password to User ID
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                    className="gap-2"
                  >
                    {updateMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
