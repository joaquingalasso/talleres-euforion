
import React from 'react';
import { Workshop } from '../types';

interface WorkshopSelectorProps {
  selectedWorkshopId: string | null;
  onWorkshopChange: (workshopId: string) => void;
  workshops: Workshop[]; 
}

const WorkshopSelector: React.FC<WorkshopSelectorProps> = ({ selectedWorkshopId, onWorkshopChange, workshops }) => {
  return (
    <div>
      <label htmlFor="workshop" className="block text-sm font-medium text-gray-700">
        Seleccionar Taller
      </label>
      <select
        id="workshop"
        name="workshop"
        value={selectedWorkshopId || ''}
        onChange={(e) => onWorkshopChange(e.target.value)}
        className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
        disabled={workshops.length === 0}
      >
        <option value="" disabled>
          {workshops.length === 0 ? "-- Cargue datos (talleres.xlsx) --" : "-- Elija un taller --"}
        </option>
        {workshops.map((workshop: Workshop) => (
          <option key={workshop.id_taller} value={workshop.id_taller}> {/* Changed to id_taller */}
            {workshop.nombre_taller} {/* Changed to nombre_taller */}
          </option>
        ))}
      </select>
       {workshops.length === 0 && (
        <p className="mt-1 text-xs text-red-600">
          No hay talleres cargados. Por favor, cargue datos desde la carpeta (buscando talleres.xlsx).
        </p>
      )}
    </div>
  );
};

export default WorkshopSelector;