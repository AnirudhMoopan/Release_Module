import { useState, useEffect, useRef } from 'react';

interface DocumentViewerProps {
  base64Data: string;
  contentType: string;
  fileName: string;
  onClose: () => void;
}

const guessMimeType = (base64: string): string => {
  if (!base64) return 'application/pdf';
  if (base64.startsWith('JVBER')) return 'application/pdf';
  if (base64.startsWith('/9j/')) return 'image/jpeg';
  if (base64.startsWith('iVBORw0KGgo')) return 'image/png';
  if (base64.startsWith('R0lGOD')) return 'image/gif';
  if (base64.startsWith('UklGR')) return 'image/webp';
  return 'application/pdf';
};

/**
 * Convert base64 string to a Blob URL.
 * Using Blob URLs instead of data: URIs prevents the browser from embedding
 * potentially megabytes of base64 text directly into the DOM, which causes
 * freezing and massive memory usage.
 */
function base64ToBlobUrl(base64: string, mimeType: string): string {
  try {
    const byteChars = atob(base64);
    const byteArray = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteArray[i] = byteChars.charCodeAt(i);
    }
    const blob = new Blob([byteArray.buffer as ArrayBuffer], { type: mimeType });
    return URL.createObjectURL(blob);
  } catch {
    // Fallback to data URI if atob fails
    return `data:${mimeType};base64,${base64}`;
  }
}

export default function DocumentViewer({ base64Data, contentType, fileName, onClose }: DocumentViewerProps) {
  const [zoom, setZoom] = useState(1);
  const blobUrlRef = useRef<string | null>(null);
  const [isLight, setIsLight] = useState(() => document.documentElement.classList.contains('light'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsLight(document.documentElement.classList.contains('light'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // If the provided type is default/empty, try to guess it from the base64 signature
  const defaultOrEmpty = !contentType || contentType === 'application/pdf';
  const mimeType = defaultOrEmpty ? guessMimeType(base64Data) : contentType;

  // Create Blob URL on mount, revoke on unmount to prevent memory leaks
  useEffect(() => {
    blobUrlRef.current = base64ToBlobUrl(base64Data, mimeType);
    return () => {
      if (blobUrlRef.current && blobUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, [base64Data, mimeType]);

  const objectUrl = blobUrlRef.current || `data:${mimeType};base64,${base64Data}`;

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleZoomReset = () => setZoom(1);

  const isImage = mimeType.startsWith('image/');

  // Get proper file extension from mime type
  const getExtension = (mime: string): string => {
    const map: Record<string, string> = {
      'application/pdf': '.pdf',
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
    };
    return map[mime] || '.pdf';
  };

  const handleDownload = async () => {
    const ext = getExtension(mimeType);
    const name = (fileName || 'document') + (fileName?.includes('.') ? '' : ext);

    // Convert base64 to byte array
    const byteChars = atob(base64Data);
    const byteArray = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteArray[i] = byteChars.charCodeAt(i);
    }
    const blob = new Blob([byteArray], { type: mimeType });

    // Try File System Access API (native Save As dialog)
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: name,
          types: [{
            description: isImage ? 'Image' : 'PDF Document',
            accept: { [mimeType]: [ext] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (e: any) {
        // User cancelled the dialog
        if (e?.name === 'AbortError') return;
      }
    }

    // Fallback: anchor click
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  };

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col backdrop-blur-xl fade-in ${isLight ? 'bg-white/80' : 'bg-black/80'}`}>
      {/* Toolbar */}
      <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 shadow-xl ${isLight ? 'bg-white/90 border-slate-200' : 'bg-slate-900/40 border-white/10'}`}>
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
            {isImage ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            )}
          </div>
          <div>
            <h3 className={`font-semibold flex items-center gap-2 ${isLight ? 'text-slate-800' : 'text-white'}`}>{fileName || 'Document'}</h3>
            <p className={`text-xs font-mono hidden sm:block ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>{mimeType}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Zoom Controls */}
          <div className={`flex items-center rounded-xl p-1 border shadow-inner ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-black/40 border-white/10'}`}>
            <button onClick={handleZoomOut} className={`p-2 transition-colors rounded-lg ${isLight ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-200' : 'text-gray-400 hover:text-white hover:bg-white/10'}`} title="Zoom Out">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"></path></svg>
            </button>
            <button onClick={handleZoomReset} className={`px-4 text-xs font-bold font-mono transition-colors ${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-gray-300 hover:text-white'}`} title="Reset Zoom">
              {Math.round(zoom * 100)}%
            </button>
            <button onClick={handleZoomIn} className={`p-2 transition-colors rounded-lg ${isLight ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-200' : 'text-gray-400 hover:text-white hover:bg-white/10'}`} title="Zoom In">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"></path></svg>
            </button>
          </div>

          <div className={`w-px h-8 mx-1 ${isLight ? 'bg-slate-200' : 'bg-white/10'}`}></div>

          <button onClick={handleDownload} className="px-4 py-2 bg-[#0084FF]/10 hover:bg-[#0084FF]/20 border border-[#0084FF]/30 text-[#0084FF] rounded-xl transition-all flex items-center gap-2 hover:shadow-[0_0_15px_rgba(0,132,255,0.3)] cursor-pointer" title="Download Document">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            <span className="text-sm font-bold hidden sm:block">Download</span>
          </button>

          <button onClick={onClose} className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 rounded-xl transition-all flex items-center gap-2 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)]" title="Close Viewer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            <span className="text-sm font-bold hidden sm:block">Close</span>
          </button>
        </div>
      </div>

      {/* Document Area */}
      <div 
        className="flex-1 overflow-auto relative flex items-center justify-center p-8 custom-scrollbar scroll-smooth"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* We use a wrapper centered with Flexbox that scales via CSS transform */}
        <div 
          className="transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] flex items-center justify-center min-h-full min-w-full"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
        >
          {isImage ? (
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
              <img 
                src={objectUrl} 
                alt={fileName} 
                className="relative max-w-full shadow-2xl bg-white/5 object-contain rounded-xl border border-white/10 backdrop-blur-sm"
              />
            </div>
          ) : (
            <div className="relative group w-full h-full min-h-[85vh] min-w-[85vw] max-w-[1400px]">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
              <object 
                data={`${objectUrl}#toolbar=0`} 
                type={mimeType} 
                className="relative w-full h-full min-h-[85vh] bg-white rounded-xl shadow-2xl overflow-hidden border border-white/10"
              >
              {/* Fallback if object element is not supported or PDF plugin missing */}
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-slate-900/80 backdrop-blur-md rounded-xl border border-slate-700/50">
                <div className="w-16 h-16 mb-4 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                </div>
                <p className="text-slate-300 mb-6 font-medium tracking-wide">Unable to display document directly in browser.</p>
                <button 
                  onClick={handleDownload}
                  className="px-8 py-3 bg-gradient-to-r from-[#0084FF] to-cyan-500 hover:from-[#0073e6] hover:to-cyan-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/25 transition-all inline-flex items-center gap-2 transform hover:-translate-y-0.5 cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                  Download to View
                </button>
              </div>
            </object>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
