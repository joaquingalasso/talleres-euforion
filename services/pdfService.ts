import jsPDF from 'jspdf';
import { ReceiptData, Workshop, MonthlyPaymentDetail } from '../types';
import { INSTITUTION_DETAILS } from '../constants';

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const RECEIPT_HEIGHT_MM = A4_HEIGHT_MM / 2;
const MARGIN_MM = 10;
const CONTENT_WIDTH_MM = A4_WIDTH_MM - 2 * MARGIN_MM;

const sanitizeForPathSegment = (text: string): string => {
  if (!text) return '';
  let s = text.normalize("NFD");
  s = s.replace(/[\u0300-\u036f]/g, "");
  s = s.replace(/[^a-zA-Z0-9\s_-]/g, '_');
  s = s.replace(/\s+/g, '_');
  s = s.replace(/_+/g, '_');
  s = s.replace(/^_+|_+$/g, '');
  return s;
};


interface ParsedName {
  firstName: string;
  lastName: string;
}

const parseStudentName = (fullName: string): ParsedName => {
  const normalizedFullName = fullName.trim();
  let firstName = '';
  let lastName = '';

  const commaIndex = normalizedFullName.indexOf(',');
  if (commaIndex !== -1) {
    lastName = normalizedFullName.substring(0, commaIndex).trim();
    firstName = normalizedFullName.substring(commaIndex + 1).trim();
  } else {
    const parts = normalizedFullName.split(/\s+/);
    if (parts.length > 0) {
      firstName = parts[0];
      if (parts.length > 1) {
        lastName = parts.slice(1).join(' ');
      }
    }
  }
  return { firstName, lastName };
};

const formatMonthYearForDisplay = (monthYear: string): string => {
  if (!monthYear || !/^\d{4}-\d{2}$/.test(monthYear)) return monthYear; 
  const [year, month] = monthYear.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleString('es-AR', { month: 'long', year: 'numeric' });
};


const drawReceiptSection = (
  doc: jsPDF,
  data: ReceiptData,
  selectedWorkshop: Workshop | undefined,
  yOffset: number,
  copyType: "ORIGINAL" | "COPIA",
  logoDataUrl?: string | null
) => {
  const sectionStartY = yOffset + MARGIN_MM / 2;
  const sectionHeight = RECEIPT_HEIGHT_MM - MARGIN_MM;

  doc.setLineWidth(0.2);
  doc.setDrawColor(150); 
  doc.roundedRect(MARGIN_MM / 2, sectionStartY, A4_WIDTH_MM - MARGIN_MM, sectionHeight, 3, 3, 'S');

  const logoX = MARGIN_MM;
  const logoY = sectionStartY + MARGIN_MM / 2;
  let textStartXAfterLogo = logoX + 15 + 5; 

  if (logoDataUrl) {
    try {
      const imgProps = doc.getImageProperties(logoDataUrl);
      if (!imgProps || !imgProps.width || !imgProps.height) {
        throw new Error('Invalid image properties obtained from logo data.');
      }
      const aspectRatio = imgProps.width / imgProps.height;
      
      const maxLogoDisplayWidth = 25; 
      const maxLogoDisplayHeight = 15; 

      let logoDisplayWidth = maxLogoDisplayWidth;
      let logoDisplayHeight = logoDisplayWidth / aspectRatio;

      if (logoDisplayHeight > maxLogoDisplayHeight) {
        logoDisplayHeight = maxLogoDisplayHeight;
        logoDisplayWidth = logoDisplayHeight * aspectRatio;
      }
      
      let imageFormat: 'PNG' | 'JPEG' = 'JPEG'; 
      if (logoDataUrl.startsWith('data:image/png')) {
        imageFormat = 'PNG';
      } else if (logoDataUrl.startsWith('data:image/jpeg')) {
        imageFormat = 'JPEG';
      } else {
        throw new Error('Unsupported image format for logo.');
      }
      doc.addImage(logoDataUrl, imageFormat, logoX, logoY, logoDisplayWidth, logoDisplayHeight);
      textStartXAfterLogo = logoX + logoDisplayWidth + 5; 
    } catch (e: any) {
      console.error("Error adding logo image to PDF:", e.message);
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.text("[Error Logo]", logoX, logoY + 7.5, { baseline: 'middle' });
      textStartXAfterLogo = logoX + 15 + 5; 
    }
  } else {
    doc.setFontSize(10); 
    doc.setFont("helvetica", "bold");
    doc.text("[Logo]", logoX, logoY + 7.5, { baseline: 'middle' });
    textStartXAfterLogo = logoX + 15 + 5;
  }

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(INSTITUTION_DETAILS.name, textStartXAfterLogo, logoY + 3);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(INSTITUTION_DETAILS.addressLine1, textStartXAfterLogo, logoY + 7);
  doc.text(INSTITUTION_DETAILS.addressLine2, textStartXAfterLogo, logoY + 10);
  doc.text(`Email: ${INSTITUTION_DETAILS.email} / Tel: ${INSTITUTION_DETAILS.phone}`, textStartXAfterLogo, logoY + 13);

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("RECIBO DE PAGO", A4_WIDTH_MM / 2, logoY + 15 + 10, { align: "center" });

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(copyType, A4_WIDTH_MM - MARGIN_MM, logoY + 5, { align: "right" });
  
  let currentY = logoY + 15 + 20; 
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  doc.text(`Fecha: ${data.paymentDate.toLocaleDateString('es-AR')} ${data.paymentDate.toLocaleTimeString('es-AR')}`, MARGIN_MM, currentY);
  doc.text(`Recibo Nro: ${data.receiptNumber}`, A4_WIDTH_MM - MARGIN_MM, currentY, { align: "right" });
  currentY += 7;

  doc.text(`Recibimos de: ${data.payerName}`, MARGIN_MM, currentY);
  currentY += 7;
  doc.text(`Alumno/s: ${data.studentNames}`, MARGIN_MM, currentY);
  currentY += 7;

  if (selectedWorkshop) {
    doc.text(`Taller: "${selectedWorkshop.nombre_taller}"`, MARGIN_MM, currentY); // Changed to nombre_taller
    currentY += 7;
  }

  if (data.monthlyPayments && data.monthlyPayments.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.text("Desglose de Pagos Mensuales:", MARGIN_MM, currentY);
    currentY += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    data.monthlyPayments.forEach((payment) => {
      const monthDisplay = formatMonthYearForDisplay(payment.monthYear);
      const amountDisplay = parseFloat(payment.amount).toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
      let paymentLine = `Mes: ${monthDisplay} - Monto: $ ${amountDisplay}`;
      doc.text(paymentLine, MARGIN_MM + 2, currentY);
      currentY += 4.5;
      if (payment.itemNotes) {
        doc.setFontSize(8);
        doc.setTextColor(80); 
        doc.text(`  Nota: ${payment.itemNotes}`, MARGIN_MM + 4, currentY, { maxWidth: CONTENT_WIDTH_MM - 10 });
        currentY += getTextHeight(doc, payment.itemNotes, CONTENT_WIDTH_MM - 10, 8) + 1.5;
        doc.setTextColor(0); 
        doc.setFontSize(9);
      }
    });
    currentY += 3; 
  }
  doc.setFontSize(10);

  doc.setFont("helvetica", "bold");
  doc.text(`Monto Total Abonado: $ ${parseFloat(data.totalAmountPaid).toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, MARGIN_MM, currentY);
  doc.setFont("helvetica", "normal");
  currentY += 7;

  doc.text(`Forma de Pago: ${data.paymentMethod}`, MARGIN_MM, currentY);
  currentY += 7;

  if (data.notes) { 
    doc.text("Notas Generales:", MARGIN_MM, currentY);
    currentY += 5;
    doc.setFontSize(9);
    doc.text(data.notes, MARGIN_MM, currentY, { maxWidth: CONTENT_WIDTH_MM });
    currentY += getTextHeight(doc, data.notes, CONTENT_WIDTH_MM, 9) + 2; 
    doc.setFontSize(10);
  }
  
  const signatureY = sectionStartY + sectionHeight - MARGIN_MM - 10;
  doc.line(MARGIN_MM, signatureY, A4_WIDTH_MM - MARGIN_MM - 50, signatureY); 
  doc.text("Firma Aclaración", MARGIN_MM, signatureY + 5);
  doc.line(A4_WIDTH_MM - MARGIN_MM - 45, signatureY, A4_WIDTH_MM - MARGIN_MM, signatureY); 
  doc.text("Sello", A4_WIDTH_MM - MARGIN_MM - 45 + 10, signatureY + 5);
};

const getTextHeight = (doc: jsPDF, text: string, maxWidth: number, fontSize: number): number => {
  doc.setFontSize(fontSize);
  const lines = doc.splitTextToSize(text, maxWidth);
  const fontSizeMm = fontSize * 0.352778;
  return lines.length * fontSizeMm * 1.2; 
};

export const generateReceiptPdfBlob = ( 
  data: ReceiptData, 
  allWorkshops: Workshop[], 
  includeCopy: boolean,
  logoDataUrl?: string | null 
): Blob | null => { 
  if (!data.workshopId) {
    console.error("Por favor, seleccione un taller."); 
    return null;
  }
  
  const workshopsToUse = allWorkshops || [];
  const selectedWorkshop = workshopsToUse.find(w => w.id_taller === data.workshopId); // Changed to id_taller

  if (!selectedWorkshop) {
    console.error("No se pudo encontrar el taller seleccionado.");
    return null;
  }

  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
  });

  drawReceiptSection(doc, data, selectedWorkshop, 0, "ORIGINAL", logoDataUrl);

  if (includeCopy) {
    doc.setLineDashPattern([2, 2], 0);
    doc.setLineWidth(0.3);
    doc.setDrawColor(100);
    doc.line(MARGIN_MM / 2, RECEIPT_HEIGHT_MM, A4_WIDTH_MM - MARGIN_MM / 2, RECEIPT_HEIGHT_MM); 
    doc.setLineDashPattern([], 0);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("-- Cortar por aquí --", A4_WIDTH_MM / 2, RECEIPT_HEIGHT_MM - 1, { align: "center" });
    doc.setTextColor(0);

    drawReceiptSection(doc, data, selectedWorkshop, RECEIPT_HEIGHT_MM, "COPIA", logoDataUrl);
  }

  return doc.output('blob');
};

export const generatePdfFilename = (data: ReceiptData, selectedWorkshop: Workshop | undefined, isDigitalVersion: boolean = false): string => {
   const studentNamesArray = data.studentNames.split(',').map(s => s.trim()).filter(s => s);
  
  const studentFilenameParts = studentNamesArray.map(name => {
    const { firstName, lastName } = parseStudentName(name);
    let studentIdPart = '';

    if (firstName && lastName) {
      const fnSanitized = sanitizeForPathSegment(firstName.substring(0, 3).toUpperCase());
      const lnSanitized = sanitizeForPathSegment(lastName.toUpperCase().replace(/\s+/g, ''));
      studentIdPart = `${fnSanitized}-${lnSanitized}`;
    } else if (firstName) {
      studentIdPart = sanitizeForPathSegment(firstName.substring(0, 3).toUpperCase());
    } else if (lastName) {
      studentIdPart = sanitizeForPathSegment(lastName.substring(0, 3).toUpperCase().replace(/\s+/g, ''));
    } else {
      return 'Alumno'; 
    }
    return studentIdPart;
  }).filter(part => part && part.length > 0);

  const studentSection = studentFilenameParts.length > 0 ? studentFilenameParts.join('_') : 'Alumnos';

  let workshopNameForFile = 'Taller';
  if (selectedWorkshop) {
      const commonPrefixes = ["Taller de ", "Talleres ", "Taller "];
      let specificName = selectedWorkshop.nombre_taller; // Changed to nombre_taller
      for (const prefix of commonPrefixes) {
          if (specificName.toLowerCase().startsWith(prefix.toLowerCase())) {
              specificName = specificName.substring(prefix.length);
              break;
          }
      }
      workshopNameForFile = specificName.split(' ').slice(0,2).join(' '); 
  }
  const cleanedWorkshopNamePart = sanitizeForPathSegment(workshopNameForFile);

  const paymentMonth = (data.paymentDate.getMonth() + 1).toString().padStart(2, '0'); 
  const paymentYearShort = data.paymentDate.getFullYear().toString().slice(-2); 
  const monthYearPart = `${paymentMonth}${paymentYearShort}`; 
  
  const digitalSuffix = isDigitalVersion ? '_Digital' : '';
  return `${studentSection}_${cleanedWorkshopNamePart}_${monthYearPart}${digitalSuffix}_${data.receiptNumber}.pdf`;
}

export const sanitizeWorkshopNameForFolder = (workshopName: string): string => {
  let specificName = workshopName;
  const commonPrefixes = ["Taller de ", "Talleres ", "Taller "];
  for (const prefix of commonPrefixes) {
      if (specificName.toLowerCase().startsWith(prefix.toLowerCase())) {
          specificName = specificName.substring(prefix.length);
          break;
      }
  }
  const nameParts = specificName.split(' ');
  let folderNamePart = nameParts.slice(0, 3).join(' '); 
  if (nameParts.length > 3) folderNamePart += '...';
  
  return sanitizeForPathSegment(folderNamePart);
};