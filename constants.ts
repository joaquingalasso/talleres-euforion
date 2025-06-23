import { Workshop } from './types';

export const INSTITUTION_DETAILS = {
  name: "Biblioteca Euforión",
  addressLine1: "Calle Diagonal 79 Nro. 371",
  addressLine2: "CP. 1900, La Plata, Buenos Aires",
  email: "secretariaeuforion@gmail.com",
  phone: "2214372736",
};

export const DEFAULT_WORKSHOPS: Workshop[] = [
];

export const EXAMPLE_STUDENT_LIST: string[] = [
];

// Expected XLSX File Names
export const EXPECTED_XLSX_FILES = {
  workshops: "talleres.xlsx", 
  students: "inscriptos.xlsx", 
  paymentLog: "registro_pagos.xlsx", 
};

// Root directory for generated receipts
export const RECEIPTS_DIR = "Recibos";

// Expected Column Headers within XLSX files (these define the structure of the first sheet)
export const WORKSHOP_XLSX_HEADERS = ["id_taller", "nombre_taller", "detalles_taller", "aranceles_taller"];
export const STUDENT_XLSX_HEADERS = ["id_taller", "nombre_alumno", "tags_alumno"];
export const PAYMENT_LOG_XLSX_HEADERS = ["fecha_pago", "nombres_alumnos", "nombre_taller", "monto_abonado", "detalle_meses_pagados", "numero_recibo", "notas_generales"];