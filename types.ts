export interface Workshop {
  id_taller: string; 
  nombre_taller: string; 
  detalles_taller: string; 
  aranceles_taller: string; 
}

export enum PaymentMethod {
  Efectivo = "Efectivo",
  Transferencia = "Transferencia",
  Cheque = "Cheque",
}

export interface MonthlyPaymentDetail {
  id: string; 
  monthYear: string; 
  amount: string;
  itemNotes: string; 
}

export interface StudentDetail {
  name: string;
  tags: string[];
}

export interface ReceiptData {
  workshopId: string | null;
  payerName: string;
  studentNames: string; // Comma-separated string of names for the receipt
  paymentMethod: PaymentMethod;
  notes: string; 
  paymentDate: Date; 
  receiptNumber: string;
  monthlyPayments: MonthlyPaymentDetail[];
  totalAmountPaid: string; 
}

export interface PaymentLogEntry {
  fecha_pago: string; 
  nombres_alumnos: string; 
  nombre_taller: string; 
  monto_abonado: string; 
  detalle_meses_pagados: string; 
  numero_recibo: string; 
  notas_generales?: string; 
}


// For File System Access API
export interface FileSystemDirectoryHandle {
  kind: 'directory';
  name: string;
  entries: () => AsyncIterableIterator<[string, FileSystemDirectoryHandle | FileSystemFileHandle]>;
  getFileHandle: (name: string, options?: { create?: boolean }) => Promise<FileSystemFileHandle>;
  getDirectoryHandle: (name: string, options?: { create?: boolean }) => Promise<FileSystemDirectoryHandle>;
  removeEntry: (name: string, options?: { recursive?: boolean }) => Promise<void>;
  resolve: (possibleDescendant: FileSystemHandle) => Promise<string[] | null>;
  queryPermission: (descriptor?: FileSystemHandlePermissionDescriptor) => Promise<PermissionState>;
  requestPermission: (descriptor?: FileSystemHandlePermissionDescriptor) => Promise<PermissionState>;
  [Symbol.asyncIterator]: () => AsyncIterableIterator<[string, FileSystemDirectoryHandle | FileSystemFileHandle]>;
  values: () => AsyncIterableIterator<FileSystemDirectoryHandle | FileSystemFileHandle>;
}

export interface FileSystemFileHandle {
  kind: 'file';
  name: string;
  getFile: () => Promise<File>;
  createWritable: (options?: { keepExistingData?: boolean }) => Promise<FileSystemWritableFileStream>;
  queryPermission: (descriptor?: FileSystemHandlePermissionDescriptor) => Promise<PermissionState>;
  requestPermission: (descriptor?: FileSystemHandlePermissionDescriptor) => Promise<PermissionState>;
}

export interface FileSystemHandle {
  kind: 'file' | 'directory';
  name: string;
  queryPermission: (descriptor?: FileSystemHandlePermissionDescriptor) => Promise<PermissionState>;
  requestPermission: (descriptor?: FileSystemHandlePermissionDescriptor) => Promise<PermissionState>;
}

export interface FileSystemWritableFileStream extends WritableStream {
  write: (data: any) => Promise<void>; 
  seek: (position: number) => Promise<void>;
  truncate: (size: number) => Promise<void>;
}

export type PermissionState = 'granted' | 'denied' | 'prompt';

export interface FileSystemHandlePermissionDescriptor {
  mode?: 'read' | 'readwrite';
}