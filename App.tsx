

import React, { useState, useCallback, useEffect } from 'react';
import { Workshop, ReceiptData, PaymentMethod, PaymentLogEntry, FileSystemDirectoryHandle, MonthlyPaymentDetail, StudentDetail } from './types';
import { INSTITUTION_DETAILS, DEFAULT_WORKSHOPS, EXPECTED_XLSX_FILES, RECEIPTS_DIR } from './constants';
import WorkshopSelector from './components/WorkshopSelector';
import WorkshopDetailsDisplay from './components/WorkshopDetailsDisplay';
import PaymentForm from './components/PaymentForm';
import FileDataLoader from './components/FileDataLoader';
import LogoUploader from './components/LogoUploader';
import WorkshopManagementModal from './components/WorkshopManagementModal';
import { generateReceiptPdfBlob, generatePdfFilename, sanitizeWorkshopNameForFolder } from './services/pdfService';
import { 
  generatePaymentLogXlsx, 
  saveFileInDirectory, 
  downloadFile,
  generateWorkshopsXlsx, 
  generateStudentsXlsx   
} from './services/fileService';

const formatMonthYearForLog = (monthYear: string): string => {
  if (!monthYear || !/^\d{4}-\d{2}$/.test(monthYear)) return monthYear;
  const [year, month] = monthYear.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  const formatted = date.toLocaleString('es-AR', { month: 'long', year: 'numeric' });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

const LOCAL_STORAGE_LOGO_KEY = 'euforionReceiptAppLogo';

const ChevronDownIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
);

const ChevronUpIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
  </svg>
);

const PlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
    </svg>
);

const SaveIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" />
         <path d="M4 3a2 2 0 012-2h6a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V3z" />
    </svg>
);


const PencilIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
    </svg>
);

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
);


const App: React.FC = () => {
  const [workshops, setWorkshops] = useState<Workshop[]>(DEFAULT_WORKSHOPS);
  const [studentLists, setStudentLists] = useState<Record<string, StudentDetail[]>>({});
  const [paymentLog, setPaymentLog] = useState<PaymentLogEntry[]>([]);
  const [allUniqueTags, setAllUniqueTags] = useState<string[]>([]);
  
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Omit<ReceiptData, 'workshopId' | 'receiptNumber' | 'paymentDate' | 'totalAmountPaid'>>({
    payerName: '',
    studentNames: '', // This will still be a string of names for the receipt
    paymentMethod: PaymentMethod.Efectivo,
    notes: '', 
    monthlyPayments: [],
  });
  const [paymentDate, setPaymentDate] = useState<Date>(new Date()); 
  const [formKey, setFormKey] = useState<number>(Date.now());
  
  const [notification, setNotification] = useState<{type: 'success' | 'error' | 'info', message: string} | null>(null);
  const [currentDirectoryHandle, setCurrentDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [currentDirectoryName, setCurrentDirectoryName] = useState<string | null>(null);
  const [fsaApiSupported, setFsaApiSupported] = useState<boolean>(true); 
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);

  const [showDataLoadingConfigUI, setShowDataLoadingConfigUI] = useState<boolean>(true);
  const [showWorkshopManagementUI, setShowWorkshopManagementUI] = useState<boolean>(false);
  
  const [isWorkshopModalOpen, setIsWorkshopModalOpen] = useState<boolean>(false);
  const [editingWorkshop, setEditingWorkshop] = useState<Workshop | null>(null);


  useEffect(() => {
    const storedLogo = localStorage.getItem(LOCAL_STORAGE_LOGO_KEY);
    if (storedLogo) {
      setLogoDataUrl(storedLogo);
    }
  }, []);

  const selectedWorkshopObject = workshops.find(w => w.id_taller === selectedWorkshopId); 

  const calculatedTotalAmount = formData.monthlyPayments.reduce((sum, item) => {
    const amount = parseFloat(item.amount);
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0).toFixed(2);

  useEffect(() => {
    const timerId = setInterval(() => setPaymentDate(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);

  const showAppNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info', duration: number = 5000) => {
    setNotification({ message, type });
    const effectiveDuration = type === 'error' ? Math.max(duration, 7000) : duration;
    setTimeout(() => setNotification(null), effectiveDuration);
  }, []);

  const handleDirectorySelected = useCallback((directoryHandle: FileSystemDirectoryHandle | null, directoryName: string | null) => {
    setCurrentDirectoryHandle(directoryHandle);
    setCurrentDirectoryName(directoryName);
    if (directoryHandle) {
      setFsaApiSupported(true);
    } else {
      setFsaApiSupported(false);
    }
  }, []);

  const handleWorkshopsLoaded = useCallback((loadedWorkshops: Workshop[], fileName: string) => {
    setWorkshops(loadedWorkshops);
    setSelectedWorkshopId(null); 
  }, []);

  const handleStudentsLoaded = useCallback((loadedStudentLists: Record<string, StudentDetail[]>, fileName: string) => {
    setStudentLists(loadedStudentLists);
    // Extract all unique tags
    const tags = new Set<string>();
    Object.values(loadedStudentLists).forEach(studentsInWorkshop => {
      studentsInWorkshop.forEach(student => {
        student.tags.forEach(tag => tags.add(tag));
      });
    });
    setAllUniqueTags(Array.from(tags));
  }, []);

  const handlePaymentLogLoaded = useCallback((loadedPaymentLog: PaymentLogEntry[], fileName: string) => {
    setPaymentLog(loadedPaymentLog);
  }, []);
  
  const handleLoadingError = useCallback((errorMsg: string) => {
    if (errorMsg) showAppNotification(errorMsg, 'error');
  }, [showAppNotification]);

  const handleProcessingMessage = useCallback((message: string) => {
     if(message) showAppNotification(message, 'info', 6000);
  }, [showAppNotification]);

  const handleWorkshopChange = useCallback((workshopId: string) => {
    setSelectedWorkshopId(workshopId);
    setFormData(prev => ({ 
      ...prev, 
      studentNames: '', // Clear student names for the receipt
      monthlyPayments: [] 
    }));
    // Note: selectedStudents in PaymentForm will be cleared by its own useEffect on selectedWorkshopId change
  }, []);

  const handleFormChange = useCallback((
    field: keyof Omit<ReceiptData, 'workshopId' | 'receiptNumber' | 'paymentDate' | 'totalAmountPaid' | 'monthlyPayments'>, 
    value: string | PaymentMethod
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleMonthlyPaymentsChange = useCallback((monthlyPayments: MonthlyPaymentDetail[]) => {
    setFormData(prev => ({ ...prev, monthlyPayments }));
  }, []);
  
  const updateStudentsFile = useCallback(async () => {
    if (!currentDirectoryHandle && !fsaApiSupported) {
        showAppNotification(`${EXPECTED_XLSX_FILES.students} actualizado en memoria. Para guardar, descargue o seleccione carpeta.`, 'info');
        return; 
    }
    if (Object.keys(studentLists).length === 0) return; 

    try {
        const studentsBlob = await generateStudentsXlsx(studentLists);
        if (currentDirectoryHandle && fsaApiSupported) {
            const savedPath = await saveFileInDirectory(currentDirectoryHandle, [], EXPECTED_XLSX_FILES.students, studentsBlob);
            showAppNotification(`Inscriptos actualizados en: ${savedPath}`, 'success');
        } else {
            downloadFile(studentsBlob, EXPECTED_XLSX_FILES.students);
            showAppNotification(`Archivo ${EXPECTED_XLSX_FILES.students} descargado.`, 'success');
        }
    } catch (error: any) {
        console.error(`Error updating ${EXPECTED_XLSX_FILES.students}:`, error);
        showAppNotification(`Error al actualizar ${EXPECTED_XLSX_FILES.students}: ${error.message}`, 'error');
    }
  }, [currentDirectoryHandle, fsaApiSupported, studentLists, showAppNotification]);

  const handleStudentTagsChange = useCallback((workshopId: string, studentName: string, newTags: string[]) => {
    setStudentLists(prev => {
      const updatedWorkshopStudents = (prev[workshopId] || []).map(student => 
        student.name === studentName ? { ...student, tags: newTags } : student
      );
      return { ...prev, [workshopId]: updatedWorkshopStudents };
    });

    const currentTags = new Set(allUniqueTags);
    newTags.forEach(tag => currentTags.add(tag));
    setAllUniqueTags(Array.from(currentTags));

    // Schedule update for students file
    setTimeout(updateStudentsFile, 100); 
  }, [allUniqueTags, updateStudentsFile]);


  const handleLogoChange = (newLogoDataUrl: string | null) => {
    setLogoDataUrl(newLogoDataUrl);
    if (newLogoDataUrl) {
      localStorage.setItem(LOCAL_STORAGE_LOGO_KEY, newLogoDataUrl);
      showAppNotification('Logo actualizado y guardado.', 'success', 3000);
    } else {
      localStorage.removeItem(LOCAL_STORAGE_LOGO_KEY);
      showAppNotification('Logo eliminado.', 'info', 3000);
    }
  };


  const processAndGenerateReceipt = async (includeCopy: boolean, isDigitalVersion: boolean) => {
    if (!selectedWorkshopId || !selectedWorkshopObject) {
      showAppNotification('Por favor, seleccione un taller.', 'error');
      return;
    }
    if (workshops.length === 0 && DEFAULT_WORKSHOPS.length === 0) {
      showAppNotification('No hay talleres cargados.', 'error');
      return;
    }
    if (formData.monthlyPayments.length === 0 || parseFloat(calculatedTotalAmount) <= 0) {
      showAppNotification('Agregue al menos un pago mensual con un monto válido.', 'error');
      return;
    }
    if (formData.monthlyPayments.some(p => !p.monthYear || parseFloat(p.amount) <= 0)) {
        showAppNotification('Cada pago mensual debe tener un mes y un monto válido mayor a cero.', 'error');
        return;
    }
    if (!formData.payerName.trim()) {
      showAppNotification('Ingrese el nombre de quien paga.', 'error');
      return;
    }
    if (!formData.studentNames.trim()) { // This now refers to the comma-separated string from PaymentForm
      showAppNotification('Ingrese el nombre del alumno/s.', 'error');
      return;
    }

    const currentTransactionDate = new Date();
    const receiptNumber = `RE-${Date.now().toString().slice(-8)}`;

    const fullReceiptData: ReceiptData = {
      ...formData,
      workshopId: selectedWorkshopId,
      paymentDate: currentTransactionDate,
      receiptNumber: receiptNumber,
      totalAmountPaid: calculatedTotalAmount,
    };
    
    const pdfBlob = generateReceiptPdfBlob(fullReceiptData, workshops, includeCopy, logoDataUrl);
    if (!pdfBlob) {
      showAppNotification('Error al generar el archivo PDF del recibo.', 'error');
      return;
    }

    const pdfFilename = generatePdfFilename(fullReceiptData, selectedWorkshopObject, isDigitalVersion);
    let savedPathMessage = `Recibo ${pdfFilename} generado.`;

    if (currentDirectoryHandle && fsaApiSupported) {
      try {
        const year = currentTransactionDate.getFullYear().toString();
        const monthForFolder = (currentTransactionDate.toLocaleString('es-AR', { month: 'long' })).charAt(0).toUpperCase() + (currentTransactionDate.toLocaleString('es-AR', { month: 'long' })).slice(1);
        const workshopFolderName = sanitizeWorkshopNameForFolder(selectedWorkshopObject.nombre_taller); 
        
        const pathSegments = [RECEIPTS_DIR, year, monthForFolder, workshopFolderName];
        const savedToPath = await saveFileInDirectory(currentDirectoryHandle, pathSegments, pdfFilename, pdfBlob);
        savedPathMessage = `Recibo guardado en: ${savedToPath}`;
      } catch (saveError: any) {
        console.error("Error saving PDF to directory:", saveError);
        showAppNotification(`Error al guardar PDF en carpeta: ${saveError.message}. Se descargará.`, 'error');
        downloadFile(pdfBlob, pdfFilename);
        savedPathMessage = `Recibo ${pdfFilename} descargado (error al guardar en carpeta).`;
      }
    } else {
      downloadFile(pdfBlob, pdfFilename);
      savedPathMessage = `Recibo ${pdfFilename} descargado. ${!fsaApiSupported && !currentDirectoryHandle ? '(Seleccione carpeta para habilitar guardado directo)' : ''}`;
    }
    
    const detalleMesesPagados = formData.monthlyPayments.map(p => { 
      const monthDisplay = formatMonthYearForLog(p.monthYear);
      const amountDisplay = parseFloat(p.amount).toLocaleString('es-AR', {minimumFractionDigits:2});
      let detail = `${monthDisplay} ($${amountDisplay})`;
      if (p.itemNotes) detail += ` [Nota: ${p.itemNotes.substring(0,50)}${p.itemNotes.length > 50 ? '...' : ''}]`;
      return detail;
    }).join('; ');

    const transactionDateFormatted = `${currentTransactionDate.getFullYear()}-${(currentTransactionDate.getMonth() + 1).toString().padStart(2, '0')}-${currentTransactionDate.getDate().toString().padStart(2, '0')}`;

    const newLogEntry: PaymentLogEntry = {
      fecha_pago: transactionDateFormatted, 
      nombres_alumnos: formData.studentNames, 
      nombre_taller: selectedWorkshopObject.nombre_taller, 
      monto_abonado: calculatedTotalAmount, 
      detalle_meses_pagados: detalleMesesPagados, 
      numero_recibo: receiptNumber, 
      notas_generales: formData.notes, 
    };
    setPaymentLog(prevLog => [...prevLog, newLogEntry]);
    showAppNotification(`${savedPathMessage} y agregado al registro.`, 'success');

    // Student list update logic (add new students, no tag changes here as tags are managed separately)
    const studentsInReceiptArray = formData.studentNames.split(',').map(s => s.trim()).filter(s => s);
    let newStudentsAddedToWorkshopList = false;
    
    setStudentLists(prevStudentLists => {
        const workshopStudents = prevStudentLists[selectedWorkshopId as string] || [];
        let updatedWorkshopStudents = [...workshopStudents];
        
        studentsInReceiptArray.forEach(studentName => {
            if (!workshopStudents.some(s => s.name === studentName)) {
                updatedWorkshopStudents.push({ name: studentName, tags: [] });
                newStudentsAddedToWorkshopList = true;
            }
        });
        if (newStudentsAddedToWorkshopList) {
          return { ...prevStudentLists, [selectedWorkshopId as string]: updatedWorkshopStudents };
        }
        return prevStudentLists; // No change if no new students were added
    });
    
    if (newStudentsAddedToWorkshopList) {
      setTimeout(updateStudentsFile, 100); 
    }

    setFormData({
      payerName: '',
      studentNames: '',
      paymentMethod: PaymentMethod.Efectivo,
      notes: '',
      monthlyPayments: [],
    });
    setFormKey(Date.now()); 
  };

  const handleSavePaymentLog = async () => {
    if (paymentLog.length === 0) {
      showAppNotification('No hay pagos registrados para guardar/descargar.', 'info');
      return;
    }
    try {
      const xlsxBlob = await generatePaymentLogXlsx(paymentLog);
      let message = `Registro de pagos ${EXPECTED_XLSX_FILES.paymentLog} generado.`;

      if (currentDirectoryHandle && fsaApiSupported) {
        try {
          const savedToPath = await saveFileInDirectory(currentDirectoryHandle, [], EXPECTED_XLSX_FILES.paymentLog, xlsxBlob);
          message = `Registro de pagos actualizado en: ${savedToPath}`;
        } catch (saveError: any) {
          console.error("Error saving payment log to directory:", saveError);
          showAppNotification(`Error al guardar registro: ${saveError.message}. Se descargará.`, 'error');
          downloadFile(xlsxBlob, EXPECTED_XLSX_FILES.paymentLog);
          message = `Registro ${EXPECTED_XLSX_FILES.paymentLog} descargado (error al guardar en carpeta).`;
        }
      } else {
        downloadFile(xlsxBlob, EXPECTED_XLSX_FILES.paymentLog);
        message = `Registro ${EXPECTED_XLSX_FILES.paymentLog} descargado. ${!fsaApiSupported && !currentDirectoryHandle ? '(Seleccione carpeta para habilitar guardado directo)' : ''}`;
      }
      showAppNotification(message, 'success');
    } catch (error: any) {
      console.error("Error generating payment log XLSX:", error);
      showAppNotification('Error al generar el archivo XLSX del registro de pagos.', 'error');
    }
  };

  const handleOpenWorkshopModal = (workshop?: Workshop) => {
    setEditingWorkshop(workshop || null);
    setIsWorkshopModalOpen(true);
  };

  const handleCloseWorkshopModal = () => {
    setIsWorkshopModalOpen(false);
    setEditingWorkshop(null);
  };

  const handleSaveWorkshop = (workshopData: Workshop) => {
    let newWorkshopData = { ...workshopData };
    if (!newWorkshopData.id_taller && !editingWorkshop) { 
        newWorkshopData.id_taller = `taller_${Date.now()}`; 
    }

    setWorkshops(prev => {
      const existingIndex = prev.findIndex(w => w.id_taller === newWorkshopData.id_taller); 
      if (existingIndex > -1) { 
        const updated = [...prev];
        updated[existingIndex] = newWorkshopData;
        return updated;
      } else { 
        return [...prev, newWorkshopData];
      }
    });
    showAppNotification(`Taller "${newWorkshopData.nombre_taller}" ${editingWorkshop ? 'actualizado' : 'añadido'}.`, 'success'); 
    handleCloseWorkshopModal();
  };

  const handleDeleteWorkshop = (workshopId: string) => {
    const workshopToDelete = workshops.find(w => w.id_taller === workshopId); 
    if (workshopToDelete && window.confirm(`¿Está seguro que desea eliminar el taller "${workshopToDelete.nombre_taller}"? Esta acción no se puede deshacer.`)) { 
      setWorkshops(prev => prev.filter(w => w.id_taller !== workshopId)); 
      if (selectedWorkshopId === workshopId) {
        setSelectedWorkshopId(null); 
      }
      showAppNotification(`Taller "${workshopToDelete.nombre_taller}" eliminado.`, 'success'); 
    }
  };

  const handleSaveChangesToWorkshopsXlsx = async () => {
    if (workshops.length === 0 && DEFAULT_WORKSHOPS.length > 0) { 
        
    } else if (workshops.length === 0) {
        showAppNotification('No hay talleres para guardar.', 'info');
        return;
    }

    try {
      const workshopsBlob = await generateWorkshopsXlsx(workshops);
      let message = `${EXPECTED_XLSX_FILES.workshops} generado.`;
      if (currentDirectoryHandle && fsaApiSupported) {
        try {
          const savedPath = await saveFileInDirectory(currentDirectoryHandle, [], EXPECTED_XLSX_FILES.workshops, workshopsBlob);
          message = `Talleres guardados en: ${savedPath}`;
        } catch (saveError: any) {
          console.error(`Error saving ${EXPECTED_XLSX_FILES.workshops} to directory:`, saveError);
          showAppNotification(`Error al guardar ${EXPECTED_XLSX_FILES.workshops}: ${saveError.message}. Se descargará.`, 'error');
          downloadFile(workshopsBlob, EXPECTED_XLSX_FILES.workshops);
          message = `${EXPECTED_XLSX_FILES.workshops} descargado (error al guardar en carpeta).`;
        }
      } else {
        downloadFile(workshopsBlob, EXPECTED_XLSX_FILES.workshops);
        message = `${EXPECTED_XLSX_FILES.workshops} descargado. ${!fsaApiSupported && !currentDirectoryHandle ? '(Seleccione carpeta para habilitar guardado directo)' : ''}`;
      }
      showAppNotification(message, 'success');
    } catch (error: any) {
      console.error(`Error generating ${EXPECTED_XLSX_FILES.workshops}:`, error);
      showAppNotification(`Error al generar ${EXPECTED_XLSX_FILES.workshops}: ${error.message}`, 'error');
    }
  };
  
  const currentStudentSuggestionList: StudentDetail[] = selectedWorkshopId ? (studentLists[selectedWorkshopId] || []) : [];

  const getNotificationStyles = () => {
    if (!notification) return 'opacity-0 transform translate-y-2'; 
    return 'opacity-100 transform translate-y-0'; 
  };
  
  const getNotificationBgColor = () => {
    if (!notification) return 'bg-gray-700';
     switch (notification.type) {
      case 'success': return 'bg-green-500';
      case 'error': return 'bg-red-600';
      case 'info': return 'bg-blue-500';
      default: return 'bg-gray-700';
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 py-8 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-indigo-700">{INSTITUTION_DETAILS.name}</h1>
        <p className="text-xl text-gray-600">Generador de Recibos de Pago</p>
      </header>

      {notification && (
        <div 
          className={`fixed top-4 right-4 text-white py-3 px-6 rounded-lg shadow-xl transition-all duration-500 ease-out z-50 max-w-md ${getNotificationStyles()} ${getNotificationBgColor()}`}
          role="alert"
          onClick={() => setNotification(null)}
          style={{cursor: 'pointer'}}
        >
          {notification.message}
        </div>
      )}
      
      <div className="w-full max-w-3xl mx-auto">
        <button
            onClick={() => setShowDataLoadingConfigUI(!showDataLoadingConfigUI)}
            className="w-full mb-4 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-md flex items-center justify-center"
        >
            {showDataLoadingConfigUI ? <ChevronUpIcon /> : <ChevronDownIcon />}
            <span className="ml-2">{showDataLoadingConfigUI ? 'Ocultar' : 'Mostrar'} Configuración y Carga de Datos</span>
        </button>
        {showDataLoadingConfigUI && (
            <div className="flex flex-col md:flex-row md:space-x-6 space-y-6 md:space-y-0 mb-6 bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <div className="md:w-1/2">
                    <FileDataLoader
                        onWorkshopsLoaded={handleWorkshopsLoaded}
                        onStudentsLoaded={handleStudentsLoaded}
                        onPaymentLogLoaded={handlePaymentLogLoaded}
                        onLoadingError={handleLoadingError}
                        onProcessingMessage={handleProcessingMessage}
                        onDirectorySelected={handleDirectorySelected}
                    />
                </div>
                
                <div className="md:w-1/2">
                    <LogoUploader currentLogo={logoDataUrl} onLogoChange={handleLogoChange} />
                </div>
                
            </div>
        )}
         {showDataLoadingConfigUI && currentDirectoryName && (
          <div className="w-full text-center mb-4">
            <p className="text-sm text-indigo-700 font-medium">
              Carpeta de trabajo activa: <strong>{currentDirectoryName}</strong>
              {!fsaApiSupported && currentDirectoryHandle === null && " (Modo descarga: API de archivos no compatible, no concedida o selección fallida)"}
            </p>
          </div>
        )}
      </div>


      <div className="w-full max-w-3xl mx-auto my-4"> 
        <button
            onClick={() => setShowWorkshopManagementUI(!showWorkshopManagementUI)}
            className="w-full mb-4 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg shadow-md flex items-center justify-center"
        >
            {showWorkshopManagementUI ? <ChevronUpIcon /> : <ChevronDownIcon />}
            <span className="ml-2">{showWorkshopManagementUI ? 'Ocultar' : 'Mostrar'} Gestión de Talleres</span>
        </button>

        {showWorkshopManagementUI && (
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <h2 className="text-2xl font-semibold text-gray-800 mb-6">Gestionar Talleres</h2>
                <div className="flex flex-wrap gap-3 mb-6">
                    <button
                        onClick={() => handleOpenWorkshopModal()}
                        className="flex items-center px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-md shadow-sm"
                        aria-label="Añadir nuevo taller"
                    >
                        <PlusIcon /> Añadir Taller
                    </button>
                    <button
                        onClick={handleSaveChangesToWorkshopsXlsx}
                        className="flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-md shadow-sm disabled:opacity-50"
                        disabled={workshops.length === 0 && DEFAULT_WORKSHOPS.length > 0 && !(DEFAULT_WORKSHOPS.length > 0 && workshops.length === 0)} 
                        aria-label="Guardar cambios en talleres"
                    >
                        <SaveIcon /> {currentDirectoryHandle && fsaApiSupported ? 'Guardar Cambios' : `Descargar ${EXPECTED_XLSX_FILES.workshops}`}
                    </button>
                </div>

                {workshops.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Taller</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre Taller</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aranceles</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {workshops.map(workshop => (
                                    <tr key={workshop.id_taller}> 
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{workshop.id_taller}</td> 
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{workshop.nombre_taller}</td> 
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{workshop.aranceles_taller}</td> 
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3 text-right">
                                            <button onClick={() => handleOpenWorkshopModal(workshop)} className="text-indigo-600 hover:text-indigo-800 p-1 rounded-md hover:bg-indigo-100" aria-label={`Editar taller ${workshop.nombre_taller}`}> 
                                                <PencilIcon />
                                            </button>
                                            <button onClick={() => handleDeleteWorkshop(workshop.id_taller)} className="text-red-600 hover:text-red-800 p-1 rounded-md hover:bg-red-100" aria-label={`Eliminar taller ${workshop.nombre_taller}`}> 
                                                <TrashIcon />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-gray-500">No hay talleres definidos. Añada uno o cargue {EXPECTED_XLSX_FILES.workshops}.</p>
                )}
            </div>
        )}
      </div>

      {isWorkshopModalOpen && (
        <WorkshopManagementModal
            isOpen={isWorkshopModalOpen}
            onClose={handleCloseWorkshopModal}
            onSave={handleSaveWorkshop}
            workshopToEdit={editingWorkshop}
        />
      )}


      <main className="w-full max-w-3xl bg-white p-6 sm:p-10 rounded-xl shadow-2xl mt-2">
        <form key={formKey} onSubmit={(e) => e.preventDefault()}> 
          <div className="space-y-8">
            <WorkshopSelector
              selectedWorkshopId={selectedWorkshopId}
              onWorkshopChange={handleWorkshopChange}
              workshops={workshops} 
            />

            {selectedWorkshopId && <WorkshopDetailsDisplay workshop={selectedWorkshopObject} />}
            
            <PaymentForm 
              formData={formData}
              onFormChange={handleFormChange}
              paymentDate={paymentDate}
              selectedWorkshopId={selectedWorkshopId}
              studentSuggestionList={currentStudentSuggestionList}
              calculatedTotalAmount={calculatedTotalAmount}
              onMonthlyPaymentsChange={handleMonthlyPaymentsChange}
              allUniqueTags={allUniqueTags}
              onStudentTagsChange={(studentName, newTags) => {
                if(selectedWorkshopId) {
                  handleStudentTagsChange(selectedWorkshopId, studentName, newTags);
                }
              }}
              onStudentListChangeForReceipt={(studentNamesString) => {
                 handleFormChange('studentNames', studentNamesString);
              }}
            />
          </div>

          <div className="mt-10 pt-6 border-t border-gray-200 space-y-4">
             <button
              type="button"
              onClick={() => processAndGenerateReceipt(false, true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!selectedWorkshopId || formData.monthlyPayments.length === 0 || parseFloat(calculatedTotalAmount) <= 0 || !formData.payerName || !formData.studentNames || workshops.length === 0}
              aria-label="Generar PDF versión digital y registrar el pago"
            >
              Generar PDF (Digital) y Registrar
            </button>
            <button
              type="button"
              onClick={() => processAndGenerateReceipt(true, false)}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!selectedWorkshopId || formData.monthlyPayments.length === 0 || parseFloat(calculatedTotalAmount) <= 0 || !formData.payerName || !formData.studentNames || workshops.length === 0}
              aria-label="Generar PDF versión para imprimir con copia y registrar el pago"
            >
              Generar PDF (Imprimir) y Registrar
            </button>
            <button
              type="button"
              onClick={handleSavePaymentLog}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-150 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={paymentLog.length === 0}
              aria-label="Guardar el registro de todos los pagos en la carpeta seleccionada o descargarlo"
            >
              {currentDirectoryHandle && fsaApiSupported ? 'Guardar Registro en Carpeta' : 'Descargar Registro'} ({EXPECTED_XLSX_FILES.paymentLog}) ({paymentLog.length} {paymentLog.length === 1 ? 'entrada' : 'entradas'})
            </button>
          </div>
        </form>
      </main>
      <footer className="mt-12 text-center text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} {INSTITUTION_DETAILS.name}. Todos los derechos reservados.</p>
        <p>{INSTITUTION_DETAILS.addressLine1}, {INSTITUTION_DETAILS.addressLine2}</p>
        <p>Email: {INSTITUTION_DETAILS.email} | Tel: {INSTITUTION_DETAILS.phone}</p>
      </footer>
    </div>
  );
};

export default App;