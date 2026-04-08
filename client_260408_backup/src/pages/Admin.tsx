import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Loader2, Trash2, Check, X, ArrowLeft, Settings } from "lucide-react";
import { EditUserModal } from "@/components/EditUserModal";
import { GroupMembersModal } from "@/components/GroupMembersModal";
import { FileUploadComponent } from "@/components/FileUploadComponent";

export default function Admin() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("pending");
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [groupMembersOpen, setGroupMembersOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Admin queries and mutations
  const pendingUsersQuery = trpc.admin.getPendingUsers.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const allUsersQuery = trpc.admin.getAllUsers.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const userGroupsQuery = trpc.admin.getUserGroups.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const internalFilesQuery = trpc.files.getAll.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  // Mutations
  const approveUserMutation = trpc.admin.approveUser.useMutation({
    onSuccess: () => {
      toast.success("User approved");
      pendingUsersQuery.refetch();
      allUsersQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const rejectUserMutation = trpc.admin.rejectUser.useMutation({
    onSuccess: () => {
      toast.success("User rejected");
      pendingUsersQuery.refetch();
      allUsersQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const createGroupMutation = trpc.admin.createUserGroup.useMutation({
    onSuccess: () => {
      toast.success("Group created");
      userGroupsQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteFileMutation = trpc.files.delete.useMutation({
    onSuccess: () => {
      toast.success("File deleted");
      internalFilesQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Check if user is admin
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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">관리자 패널 (Admin Dashboard)</h1>
            <p className="text-gray-600">사용자 승인, 그룹 관리, 파일 관리</p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            홈으로
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pending">회원가입 승인</TabsTrigger>
            <TabsTrigger value="users">사용자 관리</TabsTrigger>
            <TabsTrigger value="groups">그룹 관리</TabsTrigger>
            <TabsTrigger value="files">파일 관리</TabsTrigger>
          </TabsList>

          {/* Pending Users Tab */}
          <TabsContent value="pending" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>회원가입 승인 대기</CardTitle>
                <CardDescription>
                  {pendingUsersQuery.data?.length || 0}명의 대기 중인 사용자
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingUsersQuery.isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : pendingUsersQuery.data?.length === 0 ? (
                  <p className="text-gray-500">대기 중인 사용자가 없습니다.</p>
                ) : (
                  <div className="space-y-4">
                    {pendingUsersQuery.data?.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <p className="font-semibold">{user.name}</p>
                          <p className="text-sm text-gray-600">{user.username}</p>
                          <p className="text-xs text-gray-500">
                            {user.email || "No email"}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => approveUserMutation.mutate({ userId: user.id })}
                            disabled={approveUserMutation.isPending}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            승인
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              const reason = prompt("거절 사유를 입력하세요:");
                              if (reason) {
                                rejectUserMutation.mutate({
                                  userId: user.id,
                                  reason,
                                });
                              }
                            }}
                            disabled={rejectUserMutation.isPending}
                          >
                            <X className="w-4 h-4 mr-1" />
                            거절
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* All Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>사용자 관리</CardTitle>
                <CardDescription>
                  총 {allUsersQuery.data?.length || 0}명의 사용자
                </CardDescription>
              </CardHeader>
              <CardContent>
                {allUsersQuery.isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-4">이름</th>
                          <th className="text-left py-2 px-4">사용자명</th>
                          <th className="text-left py-2 px-4">이메일</th>
                          <th className="text-left py-2 px-4">역할</th>
                          <th className="text-left py-2 px-4">상태</th>
                          <th className="text-left py-2 px-4">가입일</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allUsersQuery.data?.map((u: any) => (
                          <tr
                            key={u.id}
                            className="border-b hover:bg-gray-50 cursor-pointer"
                            onDoubleClick={() => {
                              setSelectedUser(u);
                              setEditUserOpen(true);
                            }}
                          >
                            <td className="py-2 px-4">{u.name}</td>
                            <td className="py-2 px-4">{u.username}</td>
                            <td className="py-2 px-4">{u.email || "-"}</td>
                            <td className="py-2 px-4">
                              <span
                                className={`px-2 py-1 rounded text-xs font-semibold ${
                                  u.role === "admin"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {u.role === "admin" ? "관리자" : "사용자"}
                              </span>
                            </td>
                            <td className="py-2 px-4">
                              <span
                                className={`px-2 py-1 rounded text-xs font-semibold ${
                                  u.status === "approved"
                                    ? "bg-green-100 text-green-800"
                                    : u.status === "pending"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-red-100 text-red-800"
                                }`}
                              >
                                {u.status === "approved"
                                  ? "승인"
                                  : u.status === "pending"
                                    ? "대기"
                                    : "거절"}
                              </span>
                            </td>
                            <td className="py-2 px-4">
                              {new Date(u.createdAt).toLocaleDateString("ko-KR")}
                            </td>
                            <td className="py-2 px-4">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="gap-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/admin/users/${u.id}`);
                                }}
                              >
                                <Settings className="w-4 h-4" />
                                설정
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Groups Tab */}
          <TabsContent value="groups" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>그룹 관리</CardTitle>
                <CardDescription>
                  {userGroupsQuery.data?.length || 0}개의 그룹
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <h3 className="font-semibold">새 그룹 생성</h3>
                  <CreateGroupForm onSuccess={() => userGroupsQuery.refetch()} />
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">기존 그룹</h3>
                  {userGroupsQuery.isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : userGroupsQuery.data?.length === 0 ? (
                    <p className="text-gray-500">생성된 그룹이 없습니다.</p>
                  ) : (
                    <div className="space-y-3">
                      {userGroupsQuery.data?.map((group: any) => (
                        <div
                          key={group.id}
                          className="p-4 border rounded-lg flex justify-between items-center"
                        >
                          <div>
                            <p className="font-semibold">{group.name}</p>
                            <p className="text-sm text-gray-600">
                              {group.description || "설명 없음"}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedGroup(group);
                              setGroupMembersOpen(true);
                            }}
                          >
                            멤버 관리
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>내부 파일 관리</CardTitle>
                <CardDescription>
                  {internalFilesQuery.data?.length || 0}개의 파일
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <h3 className="font-semibold">파일 업로드</h3>
                  <FileUploadComponent onSuccess={() => internalFilesQuery.refetch()} />
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">업로드된 파일</h3>
                  {internalFilesQuery.isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : internalFilesQuery.data?.length === 0 ? (
                    <p className="text-gray-500">업로드된 파일이 없습니다.</p>
                  ) : (
                    <div className="space-y-3">
                      {internalFilesQuery.data?.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div>
                            <p className="font-semibold">{file.filename}</p>
                            <p className="text-xs text-gray-500">
                              {(file.fileSize || 0) / 1024} KB •{" "}
                              {new Date(file.uploadedAt).toLocaleDateString("ko-KR")}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteFileMutation.mutate({ fileId: file.id })}
                            disabled={deleteFileMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      {selectedUser && (
        <EditUserModal
          open={editUserOpen}
          onOpenChange={setEditUserOpen}
          user={selectedUser}
          groups={userGroupsQuery.data || []}
          onSuccess={() => {
            allUsersQuery.refetch();
            setSelectedUser(null);
          }}
        />
      )}

      {selectedGroup && (
        <GroupMembersModal
          open={groupMembersOpen}
          onOpenChange={setGroupMembersOpen}
          group={selectedGroup}
          allUsers={allUsersQuery.data || []}
          onSuccess={() => {
            userGroupsQuery.refetch();
            allUsersQuery.refetch();
          }}
        />
      )}
    </div>
  );
}

// Helper Components
function CreateGroupForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const createGroupMutation = trpc.admin.createUserGroup.useMutation({
    onSuccess: () => {
      toast.success("Group created");
      setName("");
      setDescription("");
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <div className="space-y-3">
      <Input
        placeholder="그룹 이름"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Textarea
        placeholder="그룹 설명 (선택사항)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <Button
        onClick={() => {
          if (!name.trim()) {
            toast.error("그룹 이름을 입력하세요");
            return;
          }
          createGroupMutation.mutate({ name, description: description || undefined });
        }}
        disabled={createGroupMutation.isPending}
        className="w-full"
      >
        {createGroupMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            생성 중...
          </>
        ) : (
          "그룹 생성"
        )}
      </Button>
    </div>
  );
}


