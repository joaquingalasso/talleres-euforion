
import { Workshop, PaymentLogEntry, FileSystemDirectoryHandle, StudentDetail } from '../types';
import { WORKSHOP_XLSX_HEADERS, STUDENT_XLSX_HEADERS, PAYMENT_LOG_XLSX_HEADERS } from '../constants';

const XLSX_LIB_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';

let sheetJsPromise: Promise<typeof import('xlsx')> | null = null;

const loadSheetJS = (): Promise<typeof import('xlsx')> => {
  if (typeof (window as any).XLSX !== 'undefined') {
    return Promise.resolve((window as any).XLSX as typeof import('xlsx'));
  }
  if (!sheetJsPromise) {
    sheetJsPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = XLSX_LIB_URL;
      script.async = true;
      script.onload = () => {
        if (typeof (window as any).XLSX !== 'undefined') {
          resolve((window as any).XLSX as typeof import('xlsx'));
        } else {
          reject(new Error('SheetJS library failed to load from window.XLSX.'));
        }
      };
      script.onerror = (err) => {
        console.error("SheetJS script loading error:", err);
        reject(new Error('Failed to load SheetJS library from CDN. Check network and adblockers.'));
      };
      document.head.appendChild(script);
    });
  }
  return sheetJsPromise;
};


const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        resolve(event.target.result as ArrayBuffer);
      } else {
        reject(new Error("Error reading file: result is null."));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

const safeString = (value: any): string => {
    if (value === null || typeof value === 'undefined') {
        return '';
    }
    return String(value).trim();
};


const processSheet = (XLSX: typeof import('xlsx'), sheet: import('xlsx').WorkSheet, expectedHeaders: string[]): any[] => {
  const jsonDataRaw = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: null });
  if (!jsonDataRaw || jsonDataRaw.length === 0) {
    return []; 
  }

  const headerRow = (jsonDataRaw[0] as any[]).map(header => safeString(header).toLowerCase()); // Normalize headers to lowercase
  const expectedHeadersLower = expectedHeaders.map(h => h.toLowerCase()); // Normalize expected headers

  // Declare flags here for wider scope
  const isOldPaymentLogFormat = 
      expectedHeaders === PAYMENT_LOG_XLSX_HEADERS && 
      headerRow.includes("paymentmonth") && 
      !headerRow.includes("detalle_meses_pagados");

  const isStudentFileMissingTags = 
      expectedHeaders === STUDENT_XLSX_HEADERS &&
      !headerRow.includes("tags_alumno") && 
      headerRow.includes("nombre_alumno"); // Check if it's students file missing only tags

  const missingHeaders = expectedHeadersLower.filter(h => !headerRow.includes(h));
  
  if (missingHeaders.length > 0) {
    if (!isOldPaymentLogFormat && !isStudentFileMissingTags) { 
        throw new Error(`Faltan cabeceras requeridas: ${missingHeaders.join(', ')}. Cabeceras encontradas: ${headerRow.join(', ')}`);
    } else if (isStudentFileMissingTags) {
        console.warn("Procesando 'inscriptos.xlsx' sin la columna 'tags_alumno'. Los tags estarán vacíos.");
    } else if (isOldPaymentLogFormat) { 
        console.warn("Procesando un registro de pagos con un formato de cabeceras anterior. Algunos campos nuevos podrían estar vacíos.");
    }
  }
  
  // Use a custom header mapping to handle case-insensitivity and find correct original header name
  const headerMap: Record<string, string> = {};
  const originalHeaderRow = (jsonDataRaw[0] as any[]).map(header => safeString(header));
  expectedHeaders.forEach(expectedH_originalCase => {
      const expectedH_lower = expectedH_originalCase.toLowerCase();
      const foundOriginalH = originalHeaderRow.find(origH => safeString(origH).toLowerCase() === expectedH_lower);
      if (foundOriginalH) {
          headerMap[expectedH_lower] = safeString(foundOriginalH);
      } else if (expectedH_originalCase === "tags_alumno" && isStudentFileMissingTags) {
          // Allow "tags_alumno" to be missing for backward compatibility
      } else if (expectedH_originalCase === "detalle_meses_pagados" && isOldPaymentLogFormat) {
          // Allow new payment log fields to be missing
      }
  });


  const jsonData = XLSX.utils.sheet_to_json(sheet, { 
    raw: false, 
    defval: null,
    header: expectedHeaders.map(h => h.toLowerCase()) // Use normalized headers for parsing
  }); 

  // Remap keys to original casing if necessary, or ensure expected keys are present
  return jsonData.map((row: any) => {
    const newRow: any = {};
    expectedHeaders.forEach(expectedH_originalCase => {
        const expectedH_lower = expectedH_originalCase.toLowerCase();
        newRow[expectedH_originalCase] = row[expectedH_lower] !== undefined ? row[expectedH_lower] : null;
    });
    return newRow;
  });
};


export const parseWorkshopsXlsx = async (file: File): Promise<Workshop[]> => {
  const XLSX = await loadSheetJS();
  const data = await readFileAsArrayBuffer(file);
  const workbook = XLSX.read(data, { type: 'array', codepage: 65001 });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  
  const jsonData = processSheet(XLSX, worksheet, WORKSHOP_XLSX_HEADERS);

  return jsonData.map((row: any) => ({
    id_taller: safeString(row.id_taller || `taller_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`), 
    nombre_taller: safeString(row.nombre_taller || 'Taller sin nombre'), 
    detalles_taller: safeString(row.detalles_taller), 
    aranceles_taller: safeString(row.aranceles_taller), 
  })).filter((w: Workshop) => w.id_taller && w.nombre_taller);
};

export const parseStudentsXlsx = async (file: File): Promise<Record<string, StudentDetail[]>> => {
  const XLSX = await loadSheetJS();
  const data = await readFileAsArrayBuffer(file);
  const workbook = XLSX.read(data, { type: 'array', codepage: 65001 });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  const jsonData = processSheet(XLSX, worksheet, STUDENT_XLSX_HEADERS);
  
  const studentLists: Record<string, StudentDetail[]> = {};
  jsonData.forEach((row: any) => {
    const workshopId = safeString(row.id_taller); 
    const studentName = safeString(row.nombre_alumno); 
    const tagsString = safeString(row.tags_alumno);
    
    if (workshopId && studentName) {
      if (!studentLists[workshopId]) {
        studentLists[workshopId] = [];
      }
      const existingStudent = studentLists[workshopId].find(s => s.name === studentName);
      if (!existingStudent) {
        studentLists[workshopId].push({
          name: studentName,
          tags: tagsString ? tagsString.split(',').map(tag => tag.trim()).filter(Boolean) : []
        });
      } else {
        // Potentially merge tags if student appears multiple times, though typically each row is unique.
        // For now, first entry wins for tags.
      }
    }
  });
  return studentLists;
};

export const parsePaymentLogXlsx = async (file: File): Promise<PaymentLogEntry[]> => {
  const XLSX = await loadSheetJS();
  const data = await readFileAsArrayBuffer(file);
  const workbook = XLSX.read(data, { type: 'array', codepage: 65001 });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  let jsonData: any[] = [];
  try {
    if (worksheet && worksheet['!ref'] && XLSX.utils.decode_range(worksheet['!ref']).e.r > 0) { 
        jsonData = processSheet(XLSX, worksheet, PAYMENT_LOG_XLSX_HEADERS);
    } else if (worksheet && (!worksheet['!ref'] || XLSX.utils.decode_range(worksheet['!ref']).e.r === 0)) {
        const headerTest = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: null });
        if (headerTest.length > 0) {
             const headerRow = (headerTest[0] as any[]).map(header => safeString(header).toLowerCase());
             const expectedHeadersLower = PAYMENT_LOG_XLSX_HEADERS.map(h => h.toLowerCase());
             const missingHeaders = expectedHeadersLower.filter(h => !headerRow.includes(h));
             const isOldFormat = headerRow.includes("paymentmonth") && !headerRow.includes("detalle_meses_pagados");

             if (missingHeaders.length > 0 && headerRow.some(h => h) && !isOldFormat) {
                 throw new Error(`Faltan cabeceras requeridas en el registro de pagos: ${missingHeaders.join(', ')}. Cabeceras encontradas: ${headerRow.join(', ')}`);
             }
        }
    }
  } catch (e: any) {
    throw e;
  }

  return jsonData.map((row: any) => ({
    fecha_pago: safeString(row.fecha_pago || row.paymentDate), 
    nombres_alumnos: safeString(row.nombres_alumnos || row.studentNames), 
    nombre_taller: safeString(row.nombre_taller || row.workshopName), 
    monto_abonado: safeString(row.monto_abonado || row.amountPaid), 
    detalle_meses_pagados: safeString(row.detalle_meses_pagados || row.paidForMonthsDetails || row.paymentMonth), 
    numero_recibo: safeString(row.numero_recibo || row.receiptNumber), 
    notas_generales: safeString(row.notas_generales || row.overallNotes || row.notes), 
  })).filter((entry: PaymentLogEntry) => entry.fecha_pago && entry.nombres_alumnos && entry.nombre_taller && entry.numero_recibo);
};

export const generatePaymentLogXlsx = async (logEntries: PaymentLogEntry[]): Promise<Blob> => {
  const XLSX = await loadSheetJS();
  const entriesForSheet = logEntries.map(entry => ({
      fecha_pago: entry.fecha_pago,
      nombres_alumnos: entry.nombres_alumnos,
      nombre_taller: entry.nombre_taller,
      monto_abonado: entry.monto_abonado,
      detalle_meses_pagados: entry.detalle_meses_pagados,
      numero_recibo: entry.numero_recibo,
      notas_generales: entry.notas_generales || '',
  }));
  const worksheet = XLSX.utils.json_to_sheet(entriesForSheet, { header: PAYMENT_LOG_XLSX_HEADERS });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'RegistroPagos');
  
  const xlsxData = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([xlsxData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

export const generateWorkshopsXlsx = async (workshops: Workshop[]): Promise<Blob> => {
  const XLSX = await loadSheetJS();
  const dataForSheet = workshops.map(w => ({
    id_taller: w.id_taller,
    nombre_taller: w.nombre_taller,
    detalles_taller: w.detalles_taller,
    aranceles_taller: w.aranceles_taller,
  }));
  const worksheet = XLSX.utils.json_to_sheet(dataForSheet, { header: WORKSHOP_XLSX_HEADERS });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Talleres');
  const xlsxData = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([xlsxData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

export const generateStudentsXlsx = async (studentLists: Record<string, StudentDetail[]>): Promise<Blob> => {
  const XLSX = await loadSheetJS();
  const flatStudentList: { id_taller: string; nombre_alumno: string; tags_alumno: string }[] = []; 
  for (const workshopId in studentLists) {
    studentLists[workshopId].forEach(student => {
      flatStudentList.push({ 
        id_taller: workshopId, 
        nombre_alumno: student.name,
        tags_alumno: student.tags.join(',') 
      });
    });
  }
  const worksheet = XLSX.utils.json_to_sheet(flatStudentList, { header: STUDENT_XLSX_HEADERS });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Inscriptos'); 
  const xlsxData = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([xlsxData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

export const downloadFile = (blob: Blob, filename: string) => {
  const link = document.createElement('a');
  if (typeof link.download !== 'undefined') {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } else {
    (window as any).navigator.msSaveBlob(blob, filename);
  }
};

export async function saveFileInDirectory(
  rootDirectoryHandle: FileSystemDirectoryHandle,
  filePathSegments: string[], 
  fileName: string,
  blob: Blob
): Promise<string> { 
  let currentDirHandle = rootDirectoryHandle;
  for (const segment of filePathSegments) {
    if (!segment) continue; 
    currentDirHandle = await currentDirHandle.getDirectoryHandle(segment, { create: true });
  }

  const fileHandle = await currentDirHandle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
  
  const fullPath = [rootDirectoryHandle.name, ...filePathSegments, fileName].filter(Boolean).join('/');
  return fullPath;
}