import React from 'react';
import { X, Download } from 'lucide-react';

interface ImageViewerModalProps {
  imageUrl: string;
  onClose: () => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({ imageUrl, onClose }) => {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute top-4 right-4 flex items-center gap-3 z-10">
        <a
          href={imageUrl}
          download="convora-image.jpg"
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="p-2.5 rounded-full bg-white/20 text-white hover:bg-white/30 backdrop-blur transition-colors"
          title="Download image"
        >
          <Download className="w-5 h-5" />
        </a>
        <button
          onClick={onClose}
          className="p-2.5 rounded-full bg-white/20 text-white hover:bg-white/30 backdrop-blur transition-colors"
          title="Close viewer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div
        className="max-w-4xl max-h-[88vh] overflow-hidden rounded-2xl shadow-2xl flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt="Shared media"
          className="max-h-[85vh] max-w-full object-contain rounded-xl"
        />
      </div>
    </div>
  );
};
