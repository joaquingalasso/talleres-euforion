import React, { useState, useEffect, FormEvent } from 'react';
import { Workshop } from '../types';

interface WorkshopManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (workshop: Workshop) => void;
  workshopToEdit: Workshop | null;
}

const WorkshopManagementModal: React.FC<WorkshopManagementModalProps> = ({
  isOpen,
  onClose,
  onSave,
  workshopToEdit,
}) => {
  const [id_taller, setIdTaller] = useState(''); // Changed from id
  const [nombre_taller, setNombreTaller] = useState(''); // Changed from name
  const [detalles_taller, setDetallesTaller] = useState(''); // Changed from details
  const [aranceles_taller, setArancelesTaller] = useState(''); // Changed from fees
  const [idManuallySet, setIdManuallySet] = useState(false);

  useEffect(() => {
    if (workshopToEdit) {
      setIdTaller(workshopToEdit.id_taller);
      setNombreTaller(workshopToEdit.nombre_taller);
      setDetallesTaller(workshopToEdit.detalles_taller);
      setArancelesTaller(workshopToEdit.aranceles_taller);
      setIdManuallySet(true); 
    } else {
      setIdTaller('');
      setNombreTaller('');
      setDetallesTaller('');
      setArancelesTaller('');
      setIdManuallySet(false);
    }
  }, [workshopToEdit, isOpen]); 

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!nombre_taller.trim()) {
        alert("El nombre del taller es obligatorio.");
        return;
    }
    onSave({ 
      id_taller: id_taller.trim(), 
      nombre_taller: nombre_taller.trim(), 
      detalles_taller: detalles_taller.trim(), 
      aranceles_taller: aranceles_taller.trim() 
    });
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-40 flex items-center justify-center">
      <div className="relative mx-auto p-8 border w-full max-w-lg shadow-xl rounded-md bg-white">
        <h3 className="text-2xl font-semibold mb-6 text-gray-800">
          {workshopToEdit ? 'Editar Taller' : 'Añadir Nuevo Taller'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="workshopId" className="block text-sm font-medium text-gray-700">
              ID del Taller (dejar vacío para autogenerar al añadir)
            </label>
            <input
              type="text"
              id="workshopId"
              value={id_taller}
              onChange={(e) => {
                setIdTaller(e.target.value);
                if (!workshopToEdit) setIdManuallySet(e.target.value.trim() !== ''); 
              }}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 disabled:bg-gray-100"
              disabled={!!workshopToEdit} 
              placeholder={workshopToEdit ? '' : 'Ej: patin_artistico (opcional)'}
            />
             {!workshopToEdit && <p className="text-xs text-gray-500 mt-1">Si se deja vacío, se generará un ID automático (ej: taller_xxxx).</p>}
          </div>
          <div>
            <label htmlFor="workshopName" className="block text-sm font-medium text-gray-700">
              Nombre del Taller <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="workshopName"
              value={nombre_taller}
              onChange={(e) => setNombreTaller(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
              required
              placeholder="Ej: Taller de Dibujo Infantil"
            />
          </div>
          <div>
            <label htmlFor="workshopDetails" className="block text-sm font-medium text-gray-700">
              Detalles del Taller (Opcional)
            </label>
            <textarea
              id="workshopDetails"
              rows={3}
              value={detalles_taller}
              onChange={(e) => setDetallesTaller(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
              placeholder="Ej: Horarios, descripción breve, requisitos, etc."
            />
          </div>
          <div>
            <label htmlFor="workshopFees" className="block text-sm font-medium text-gray-700">
              Aranceles del Taller (Opcional)
            </label>
            <textarea
              id="workshopFees"
              rows={2}
              value={aranceles_taller}
              onChange={(e) => setArancelesTaller(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
              placeholder="Ej: Cuota mensual: $XXXX. Descuentos, etc."
            />
          </div>
          <div className="mt-8 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {workshopToEdit ? 'Guardar Cambios' : 'Añadir Taller'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WorkshopManagementModal;