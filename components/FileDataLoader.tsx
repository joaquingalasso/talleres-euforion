

import React, { useState, useCallback } from 'react';
import { Workshop, PaymentLogEntry, FileSystemDirectoryHandle, StudentDetail } from '../types'; 
import { 
  parseWorkshopsXlsx, 
  parseStudentsXlsx, 
  parsePaymentLogXlsx,
  generateWorkshopsXlsx, 
  generateStudentsXlsx,  
  generatePaymentLogXlsx, 
  saveFileInDirectory     
} from '../services/fileService';
import { EXPECTED_XLSX_FILES } from '../constants';

interface FileDataLoaderProps {
  onWorkshopsLoaded: (workshops: Workshop[], fileName: string) => void;
  onStudentsLoaded: (studentLists: Record<string, StudentDetail[]>, fileName: string) => void;
  onPaymentLogLoaded: (logEntries: PaymentLogEntry[], fileName: string) => void;
  onLoadingError: (error: string) => void;
  onProcessingMessage: (message: string) => void;
  onDirectorySelected: (directoryHandle: FileSystemDirectoryHandle | null, directoryName: string | null) => void; 
}

// Check for File System Access API support
const supportsFileSystemAccessAPI = 'showDirectoryPicker' in window;

const FileDataLoader: React.FC<FileDataLoaderProps> = ({
  onWorkshopsLoaded,
  onStudentsLoaded,
  onPaymentLogLoaded,
  onLoadingError,
  onProcessingMessage,
  onDirectorySelected,
}) => {
  const [selectedDirectoryName, setSelectedDirectoryName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiUnsupportedMessage, setApiUnsupportedMessage] = useState<string | null>(null);

  const handleDirectoryPick = useCallback(async () => {
    if (!supportsFileSystemAccessAPI) {
      const message = "Tu navegador no es compatible con la API de Acceso al Sistema de Archivos. Algunas funciones como guardar directamente en la carpeta no estarán disponibles. Los archivos se descargarán de la forma tradicional.";
      setApiUnsupportedMessage(message);
      onLoadingError(message); 
      onDirectorySelected(null, null); 
      return;
    }
    setApiUnsupportedMessage(null);

    try {
      const directoryHandle = await (window as any).showDirectoryPicker();
      if (!directoryHandle) {
        onProcessingMessage("No se seleccionó ninguna carpeta.");
        onDirectorySelected(null, null);
        return;
      }
      
      setIsLoading(true);
      onLoadingError(''); 
      onProcessingMessage(`Procesando carpeta: ${directoryHandle.name}...`);
      setSelectedDirectoryName(directoryHandle.name);
      onDirectorySelected(directoryHandle, directoryHandle.name);

      let filesFoundCount = 0;
      let filesCreatedCount = 0;
      let errors: string[] = [];
      let messages: string[] = [];

      // Process Workshops File
      try {
        let workshopsFileHandle = await directoryHandle.getFileHandle(EXPECTED_XLSX_FILES.workshops).catch(() => null);
        if (workshopsFileHandle) {
          const file = await workshopsFileHandle.getFile();
          const workshopsData = await parseWorkshopsXlsx(file);
          onWorkshopsLoaded(workshopsData, file.name);
          messages.push(`Talleres cargados desde ${file.name} (${workshopsData.length}).`);
          filesFoundCount++;
        } else {
          messages.push(`Archivo ${EXPECTED_XLSX_FILES.workshops} no encontrado. Creando archivo vacío...`);
          const emptyWorkshopsBlob = await generateWorkshopsXlsx([]);
          await saveFileInDirectory(directoryHandle, [], EXPECTED_XLSX_FILES.workshops, emptyWorkshopsBlob);
          onWorkshopsLoaded([], EXPECTED_XLSX_FILES.workshops);
          messages.push(`${EXPECTED_XLSX_FILES.workshops} creado con éxito.`);
          filesCreatedCount++;
        }
      } catch (error: any) {
        errors.push(`Error al procesar/crear ${EXPECTED_XLSX_FILES.workshops}: ${error.message}`);
         onWorkshopsLoaded([], EXPECTED_XLSX_FILES.workshops); 
      }

      // Process Students File
      try {
        let studentsFileHandle = await directoryHandle.getFileHandle(EXPECTED_XLSX_FILES.students).catch(() => null);
        if (studentsFileHandle) {
          const file = await studentsFileHandle.getFile();
          const studentsData = await parseStudentsXlsx(file);
          onStudentsLoaded(studentsData, file.name);
          const studentCount = Object.values(studentsData).reduce((acc, list) => acc + list.length, 0);
          messages.push(`Alumnos cargados desde ${file.name} (${studentCount} en ${Object.keys(studentsData).length} listas).`);
          filesFoundCount++;
        } else {
          messages.push(`Archivo ${EXPECTED_XLSX_FILES.students} no encontrado. Creando archivo vacío...`);
          const emptyStudentsBlob = await generateStudentsXlsx({});
          await saveFileInDirectory(directoryHandle, [], EXPECTED_XLSX_FILES.students, emptyStudentsBlob);
          onStudentsLoaded({}, EXPECTED_XLSX_FILES.students);
          messages.push(`${EXPECTED_XLSX_FILES.students} creado con éxito.`);
          filesCreatedCount++;
        }
      } catch (error: any) {
        errors.push(`Error al procesar/crear ${EXPECTED_XLSX_FILES.students}: ${error.message}`);
        onStudentsLoaded({}, EXPECTED_XLSX_FILES.students); 
      }

      // Process Payment Log File
      try {
        let paymentLogFileHandle = await directoryHandle.getFileHandle(EXPECTED_XLSX_FILES.paymentLog).catch(() => null);
        if (paymentLogFileHandle) {
          const file = await paymentLogFileHandle.getFile();
          const paymentLogData = await parsePaymentLogXlsx(file);
          onPaymentLogLoaded(paymentLogData, file.name);
          messages.push(`Registro de pagos cargado desde ${file.name} (${paymentLogData.length} entradas).`);
          filesFoundCount++;
        } else {
          messages.push(`Archivo ${EXPECTED_XLSX_FILES.paymentLog} no encontrado. Creando archivo vacío...`);
          const emptyPaymentLogBlob = await generatePaymentLogXlsx([]);
          await saveFileInDirectory(directoryHandle, [], EXPECTED_XLSX_FILES.paymentLog, emptyPaymentLogBlob);
          onPaymentLogLoaded([], EXPECTED_XLSX_FILES.paymentLog);
          messages.push(`${EXPECTED_XLSX_FILES.paymentLog} creado con éxito.`);
          filesCreatedCount++;
        }
      } catch (error: any) {
        errors.push(`Error al procesar/crear ${EXPECTED_XLSX_FILES.paymentLog}: ${error.message}`);
        onPaymentLogLoaded([], EXPECTED_XLSX_FILES.paymentLog); 
      }

      if (errors.length > 0) {
        onLoadingError(errors.join(' '));
      }
      
      let finalMessage = "";
      if (filesFoundCount === 0 && filesCreatedCount === 0 && errors.length === 0) {
        finalMessage = `No se pudieron leer ni crear los archivos esperados en la carpeta: ${directoryHandle.name}. Verifique los permisos.`;
      } else if (messages.length > 0) {
        finalMessage = messages.join(' ');
      }
      if (finalMessage) onProcessingMessage(finalMessage);
      
    } catch (err: any) {
      if (err.name === 'AbortError') {
        onProcessingMessage('Selección de carpeta cancelada.');
      } else {
        console.error('Error al seleccionar la carpeta:', err);
        onLoadingError(`Error al seleccionar la carpeta: ${err.message}`);
      }
      setSelectedDirectoryName(null);
      onDirectorySelected(null, null);
    } finally {
      setIsLoading(false);
    }
  }, [onWorkshopsLoaded, onStudentsLoaded, onPaymentLogLoaded, onLoadingError, onProcessingMessage, onDirectorySelected]);

  return (
    <div className="h-full flex flex-col"> 
      <h2 className="text-lg font-semibold text-gray-700 mb-3">Cargar Datos desde Carpeta (XLSX)</h2>
      <div className="space-y-3">
        <div>
          <button
            type="button"
            onClick={handleDirectoryPick}
            className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out disabled:opacity-60"
            disabled={isLoading}
            aria-describedby="folder-input-help"
          >
            {isLoading ? 'Procesando...' : 'Seleccionar Carpeta de Trabajo'}
          </button>
          
          {selectedDirectoryName && !isLoading && (
            <p className="mt-2 text-sm text-green-700 bg-green-50 p-2 rounded-md">
              Carpeta de trabajo actual: <strong>{selectedDirectoryName}</strong>
            </p>
          )}
          {apiUnsupportedMessage && (
            <p className="mt-2 text-sm text-yellow-700 bg-yellow-50 p-2 rounded-md">
              {apiUnsupportedMessage}
            </p>
          )}
          <p id="folder-input-help" className="mt-3 text-xs text-gray-600">
            Al seleccionar una carpeta:
            <ul className="list-disc list-inside ml-2 mt-1">
              <li>Se buscarán: <code>{EXPECTED_XLSX_FILES.workshops}</code>, <code>{EXPECTED_XLSX_FILES.students}</code>, y <code>{EXPECTED_XLSX_FILES.paymentLog}</code>.</li>
              <li>Si no se encuentran, se crearán vacíos con las cabeceras correspondientes.</li>
              <li>Los datos existentes en la aplicación serán reemplazados.</li>
              <li>Si la API es compatible, los recibos PDF y el registro de pagos se guardarán directamente en esta carpeta.</li>
            </ul>
          </p>
        </div>
      </div>
    </div>
  );
};

export default FileDataLoader;