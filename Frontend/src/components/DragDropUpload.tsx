import React, { useState, useRef } from "react";

interface DragDropUploadProps {
  id: string;
  label: string;
  accept: string;
  file: File | null;
  onFileSelect: (file: File | null) => void;
}

export default function DragDropUpload({ id, label, accept, file, onFileSelect }: DragDropUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB

  const validateAndSelectFile = (selectedFile: File) => {
    if (selectedFile.size > MAX_FILE_SIZE) {
      alert("File size exceeds 1MB limit.");
      return;
    }
    const fileExt = '.' + selectedFile.name.split('.').pop()?.toLowerCase();
    if (accept.includes(fileExt) || accept === "*") {
      onFileSelect(selectedFile);
    } else {
      alert("Invalid file type. Allowed types: " + accept);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSelectFile(e.dataTransfer.files[0]);
    }
  };

  const handleContainerClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div>
      <label className="field-label mb-2 block">{label}</label>
      <div 
        className={`relative w-full h-32 rounded-2xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center cursor-pointer overflow-hidden group
          ${isDragging 
            ? 'border-[#0084FF] bg-[#0084FF]/10 scale-[1.02] shadow-[0_0_20px_rgba(0,132,255,0.2)]' 
            : file 
              ? 'border-emerald-500/50 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500' 
              : 'border-white/10 bg-black/20 hover:bg-white/5 hover:border-white/30'
          }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleContainerClick}
      >
        <input 
          ref={fileInputRef}
          type="file" 
          id={id} 
          className="hidden" 
          accept={accept} 
          onChange={e => {
            if (e.target.files && e.target.files.length > 0) {
              validateAndSelectFile(e.target.files[0]);
              e.target.value = ''; // Reset to allow re-selection
            } else {
              onFileSelect(null);
            }
          }} 
        />
        
        {file ? (
          <div className="flex flex-col items-center animate-in zoom-in duration-300">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-2 text-emerald-400 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <span className="text-sm font-bold text-white max-w-[200px] truncate px-4">{file.name}</span>
            <span className="text-[10px] text-emerald-400/80 font-mono mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB • Click to replace</span>
          </div>
        ) : (
          <div className="flex flex-col items-center pointer-events-none">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-all duration-300 ${isDragging ? 'bg-[#0084FF]/20 text-[#0084FF] scale-110 shadow-[0_0_15px_rgba(0,132,255,0.4)] animate-bounce' : 'bg-white/5 text-gray-400 group-hover:text-white group-hover:bg-white/10'}`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
            </div>
            <span className={`text-sm font-bold tracking-wide transition-colors ${isDragging ? 'text-[#0084FF]' : 'text-gray-300'}`}>
              {isDragging ? 'Drop file here!' : 'Click or drag file here'}
            </span>
            <span className="text-[10px] text-gray-500 font-mono mt-1">Supports: {accept.replace(/\./g, '').toUpperCase()} (Max 1MB)</span>
          </div>
        )}
      </div>
    </div>
  );
}
