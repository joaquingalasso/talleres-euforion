

import React, { useState, useRef, ChangeEvent, useCallback } from 'react';

interface LogoUploaderProps {
  currentLogo: string | null;
  onLogoChange: (logoDataUrl: string | null) => void;
}

const XIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
);


const LogoUploader: React.FC<LogoUploaderProps> = ({ currentLogo, onLogoChange }) => {
  const [logoPreview, setLogoPreview] = useState<string | null>(currentLogo);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    // Sync preview if currentLogo prop changes from App.tsx (e.g., initial load from localStorage)
    setLogoPreview(currentLogo);
  }, [currentLogo]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!['image/png', 'image/jpeg'].includes(file.type)) {
        alert('Por favor, seleccione un archivo PNG o JPEG para el logo.');
        if (fileInputRef.current) {
          fileInputRef.current.value = ""; // Reset file input
        }
        return;
      }
      if (file.size > 2 * 1024 * 1024) { // 2MB size limit
        alert('El archivo del logo es demasiado grande. Por favor, elija uno menor a 2MB.');
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setLogoPreview(dataUrl);
        onLogoChange(dataUrl);
      };
      reader.onerror = () => {
        console.error("Error al leer el archivo del logo.");
        alert("Ocurrió un error al cargar el logo.");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearLogo = useCallback(() => {
    setLogoPreview(null);
    onLogoChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Reset the file input
    }
  }, [onLogoChange]);

  return (
    <div className="h-full flex flex-col"> {/* Removed styling, applied by App.tsx wrapper */}
      <h3 className="text-lg font-semibold text-gray-700 mb-3">Logo Institucional</h3>
      <div className="flex  sm:flex-row  gap-4">
        <div className="flex-shrink-0 w-24 h-24 border border-gray-300 rounded-md flex items-center justify-center bg-gray-50 overflow-hidden">
          {logoPreview ? (
            <img src={logoPreview} alt="Vista previa del Logo" className="max-w-full max-h-full object-contain" />
          ) : (
            <span className="text-xs text-gray-500">Sin logo</span>
          )}
        </div>
        <div className="flex-grow">
          <input
            type="file"
            accept="image/png, image/jpeg"
            onChange={handleFileChange}
            ref={fileInputRef}
            className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
            aria-label="Cargar logo"
          />
          <p className="mt-1 text-xs text-gray-500">Seleccione un archivo PNG o JPEG (máx. 2MB).</p>
        </div>
        {logoPreview && (
          <button
            type="button"
            onClick={handleClearLogo}
            className="sm:ml-auto p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-full shadow-sm flex items-center justify-center"
            aria-label="Quitar logo"
          >
            <XIcon />
          </button>
        )}
      </div>
    </div>
  );
};

export default LogoUploader;
