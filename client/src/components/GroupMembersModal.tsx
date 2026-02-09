import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";

interface GroupMembersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: any;
  allUsers: any[];
  onSuccess: () => void;
}

export function GroupMembersModal({ open, onOpenChange, group, allUsers, onSuccess }: GroupMembersModalProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const groupMembersQuery = trpc.admin.getGroupMembers.useQuery(
    { groupId: group?.id },
    { enabled: open && !!group }
  );

  const addUserMutation = trpc.admin.assignUserToGroup.useMutation({
    onSuccess: () => {
      toast.success("멤버가 추가되었습니다");
      setSelectedUserId("");
      groupMembersQuery.refetch();
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error?.message || "오류가 발생했습니다");
    },
  });

  const removeUserMutation = trpc.admin.removeUserFromGroup.useMutation({
    onSuccess: () => {
      toast.success("멤버가 제거되었습니다");
      groupMembersQuery.refetch();
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error?.message || "오류가 발생했습니다");
    },
  });

  const handleAddUser = () => {
    if (!selectedUserId) {
      toast.error("사용자를 선택하세요");
      return;
    }
    addUserMutation.mutate({
      userId: Number(selectedUserId),
      groupId: group.id,
    });
  };

  // Get users not in this group
  const membersIds = new Set((groupMembersQuery.data || []).map((m: any) => m.id));
  const availableUsers = allUsers.filter((u) => !membersIds.has(u.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>그룹 멤버 관리</DialogTitle>
          <DialogDescription>
            {group?.name} 그룹의 멤버를 관리합니다
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add member section */}
          <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-sm">멤버 추가</h3>
            <div className="flex gap-2">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="사용자 선택" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.id} value={String(user.id)}>
                      {user.name} ({user.username})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleAddUser}
                disabled={addUserMutation.isPending || !selectedUserId}
              >
                {addUserMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "추가"
                )}
              </Button>
            </div>
          </div>

          {/* Members list */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">현재 멤버 ({groupMembersQuery.data?.length || 0})</h3>
            {groupMembersQuery.isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            ) : groupMembersQuery.data?.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">멤버가 없습니다</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {groupMembersQuery.data?.map((member: any) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">{member.name}</p>
                      <p className="text-xs text-gray-500">{member.username}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removeUserMutation.mutate({ userId: member.id })}
                      disabled={removeUserMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            닫기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
