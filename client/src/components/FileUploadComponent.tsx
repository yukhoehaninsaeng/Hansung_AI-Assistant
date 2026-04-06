import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Upload, File, PenLine } from "lucide-react";

interface FileUploadComponentProps {
  onSuccess: () => void;
}

export function FileUploadComponent({ onSuccess }: FileUploadComponentProps) {
  const [tab, setTab] = useState<"file" | "text">("text");

  // ── 파일 업로드 상태 ──
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // ── 텍스트 직접 입력 상태 ──
  const [textTitle, setTextTitle] = useState("");
  const [textContent, setTextContent] = useState("");

  // ── 뮤테이션 ──
  const uploadFileMutation = trpc.files.upload.useMutation({
    onSuccess: () => {
      toast.success("파일이 업로드되었습니다");
      setSelectedFile(null);
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error?.message || "파일 업로드에 실패했습니다");
    },
  });

  const saveTextMutation = trpc.files.saveText.useMutation({
    onSuccess: () => {
      toast.success("텍스트가 저장되었습니다");
      setTextTitle("");
      setTextContent("");
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error?.message || "텍스트 저장에 실패했습니다");
    },
  });

  // ── 핸들러 ──
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("파일 크기는 10MB 이하여야 합니다");
      return;
    }
    setSelectedFile(file);
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return toast.error("파일을 선택하세요");
    setIsUploading(true);
    try {
      const fileContent = await selectedFile.text();
      uploadFileMutation.mutate({
        filename: selectedFile.name,
        content: fileContent,
        mimeType: selectedFile.type || "text/plain",
      });
    } catch {
      toast.error("파일을 읽을 수 없습니다");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveText = () => {
    if (!textTitle.trim()) return toast.error("제목을 입력하세요");
    if (!textContent.trim()) return toast.error("내용을 입력하세요");
    saveTextMutation.mutate({ title: textTitle.trim(), content: textContent.trim() });
  };

  return (
    <div className="space-y-4">
      {/* 탭 선택 */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
        <button
          onClick={() => setTab("text")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === "text"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <PenLine size={14} />
          텍스트 직접 입력
        </button>
        <button
          onClick={() => setTab("file")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === "file"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Upload size={14} />
          파일 업로드
        </button>
      </div>

      {/* 텍스트 직접 입력 탭 */}
      {tab === "text" && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              문서 제목
            </label>
            <Input
              placeholder="예: 2026학년도 수강신청 안내"
              value={textTitle}
              onChange={(e) => setTextTitle(e.target.value)}
              disabled={saveTextMutation.isPending}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              내용
              <span className="ml-2 text-xs text-gray-400 font-normal">
                ({textContent.length}자)
              </span>
            </label>
            <Textarea
              placeholder={"AI가 참고할 내용을 여기에 입력하세요.\n\n예:\n- 수강신청 기간: 2026년 2월 10일 ~ 2월 14일\n- 수강신청 시스템: portal.hansung.ac.kr\n- 문의: 교무처 02-760-5600"}
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              disabled={saveTextMutation.isPending}
              rows={10}
              className="resize-y font-mono text-sm"
            />
          </div>

          <Button
            onClick={handleSaveText}
            disabled={!textTitle.trim() || !textContent.trim() || saveTextMutation.isPending}
            className="w-full"
          >
            {saveTextMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                저장 중...
              </>
            ) : (
              "저장하기"
            )}
          </Button>

          <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg p-3">
            💡 저장된 내용은 AI가 질문에 답변할 때 <strong>최우선으로 참고</strong>합니다.
            공지사항, 학사 일정, 규정 등을 직접 입력하면 정확한 답변이 가능합니다.
          </p>
        </div>
      )}

      {/* 파일 업로드 탭 */}
      {tab === "file" && (
        <div className="space-y-4">
          <div className="p-6 border-2 border-dashed rounded-xl space-y-4">
            <div className="flex items-center justify-center text-gray-400">
              <Upload className="w-8 h-8 mr-2" />
              <span className="text-sm">파일을 선택하거나 드래그하여 업로드</span>
            </div>

            <Input
              type="file"
              onChange={handleFileSelect}
              accept=".txt,.md,.json"
              className="w-full"
            />

            {selectedFile && (
              <div className="p-3 bg-blue-50 rounded-lg flex items-center gap-2">
                <File className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-blue-900 truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-blue-700">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
            )}

            <Button
              onClick={handleFileUpload}
              disabled={!selectedFile || isUploading || uploadFileMutation.isPending}
              className="w-full"
            >
              {isUploading || uploadFileMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  업로드 중...
                </>
              ) : (
                "파일 업로드"
              )}
            </Button>
          </div>

          <p className="text-xs text-gray-500">
            지원 형식: .txt, .md, .json · 최대 10MB
          </p>
        </div>
      )}
    </div>
  );
}
