import { useCallback, useState } from 'react';
import { Upload, FileArchive } from 'lucide-react';

interface UploadDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  label?: string;
  sublabel?: string;
}

export default function UploadDropzone({
  onFilesSelected,
  accept = '.zip,.xml',
  multiple = false,
  label = 'Arraste arquivos aqui ou clique para selecionar',
  sublabel = 'Aceita arquivos ZIP ou XML',
}: UploadDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFilesSelected(files);
    }
  }, [onFilesSelected]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      onFilesSelected(files);
    }
  }, [onFilesSelected]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => document.getElementById('file-input')?.click()}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-all duration-300 ${
        isDragOver
          ? 'border-[#38bdf8] bg-[#38bdf8]/10'
          : 'border-[#334155] bg-[#1e293b] hover:border-[#475569] hover:bg-[#1e293b]/80'
      }`}
    >
      <input
        id="file-input"
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        className="hidden"
      />
      {isDragOver ? (
        <FileArchive className="mb-3 h-12 w-12 text-[#38bdf8]" />
      ) : (
        <Upload className="mb-3 h-12 w-12 text-[#94a3b8]" />
      )}
      <p className="text-center text-sm font-medium text-[#f1f5f9]">{label}</p>
      <p className="mt-1 text-center text-xs text-[#94a3b8]">{sublabel}</p>
    </div>
  );
}
