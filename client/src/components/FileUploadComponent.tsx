import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Upload, File } from "lucide-react";

interface FileUploadComponentProps {
  onSuccess: () => void;
}

export function FileUploadComponent({ onSuccess }: FileUploadComponentProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("파일 크기는 10MB 이하여야 합니다");
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("파일을 선택하세요");
      return;
    }

    setIsUploading(true);
    try {
      const fileContent = await selectedFile.text();
      const mimeType = selectedFile.type || "text/plain";

      uploadFileMutation.mutate({
        filename: selectedFile.name,
        content: fileContent,
        mimeType,
      });
    } catch (error) {
      toast.error("파일을 읽을 수 없습니다");
    } finally {
      setIsUploading(false);
    }
  };

  const supportedFormats = [
    { ext: ".txt", type: "text/plain", label: "텍스트 파일" },
    { ext: ".pdf", type: "application/pdf", label: "PDF" },
    { ext: ".docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", label: "Word" },
    { ext: ".doc", type: "application/msword", label: "Word (구버전)" },
    { ext: ".pptx", type: "application/vnd.openxmlformats-officedocument.presentationml.presentation", label: "PowerPoint" },
    { ext: ".ppt", type: "application/vnd.ms-powerpoint", label: "PowerPoint (구버전)" },
    { ext: ".md", type: "text/markdown", label: "마크다운" },
    { ext: ".json", type: "application/json", label: "JSON" },
  ];

  return (
    <div className="space-y-4">
      <Card className="p-6 border-2 border-dashed">
        <div className="space-y-4">
          <div className="flex items-center justify-center">
            <Upload className="w-8 h-8 text-gray-400 mr-2" />
            <span className="text-sm text-gray-600">파일을 선택하거나 드래그하여 업로드</span>
          </div>

          <Input
            type="file"
            onChange={handleFileSelect}
            accept=".txt,.pdf,.docx,.doc,.pptx,.ppt,.md,.json"
            className="w-full"
          />

          {selectedFile && (
            <div className="p-3 bg-blue-50 rounded-lg flex items-center">
              <File className="w-4 h-4 mr-2 text-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">{selectedFile.name}</p>
                <p className="text-xs text-blue-700">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
          )}

          <Button
            onClick={handleUpload}
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
      </Card>

      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="text-sm font-semibold mb-2">지원하는 파일 형식:</p>
        <div className="grid grid-cols-2 gap-2">
          {supportedFormats.map((format) => (
            <div key={format.ext} className="text-xs text-gray-600">
              <span className="font-medium">{format.ext}</span> - {format.label}
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-3">최대 파일 크기: 10MB</p>
      </div>
    </div>
  );
}
