'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, File, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export function CVUploader({
  onUpload,
}: {
  onUpload: (file: File) => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB
    onDropRejected: () => toast.error('Please upload a valid PDF under 5MB'),
  });

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      await onUpload(file);
    } catch (e) {
      console.error(e);
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {!file ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              {...getRootProps()}
              className={cn(
                'drop-zone p-12 flex flex-col items-center justify-center cursor-pointer text-center relative overflow-hidden',
                isDragActive && 'drag-over',
              )}
            >
              <input {...getInputProps()} />
              
              <div className="w-16 h-16 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center mb-4">
                <UploadCloud className={cn("w-8 h-8 transition-colors", isDragActive ? "text-[#818cf8]" : "text-[var(--text-muted)]")} />
              </div>
              
              <h3 className="text-lg font-semibold mb-2">Upload your CV</h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Drag & drop your PDF here, or click to browse
              </p>
              <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
                Maximum file size: 5MB
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="file-preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-6 border-brand"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-lg bg-[rgba(99,102,241,0.1)] flex items-center justify-center shrink-0">
                <File className="w-6 h-6 text-[#818cf8]" />
              </div>
              <div className="flex-1 overflow-hidden">
                <h4 className="font-medium truncate">{file.name}</h4>
                <p className="text-xs text-[var(--text-secondary)]">
                  {(file.size / 1024 / 1024).toFixed(2)} MB • PDF Document
                </p>
              </div>
              <button
                onClick={() => setFile(null)}
                disabled={uploading}
                className="p-2 rounded-full hover:bg-[var(--glass-hover)] text-[var(--text-muted)] hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={handleUpload}
              disabled={uploading}
              className="btn-gradient w-full py-3 flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Analyzing Document...
                </>
              ) : (
                'Continue with this CV'
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
