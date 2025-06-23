
import React from 'react';
import { Workshop } from '../types';

interface WorkshopDetailsDisplayProps {
  workshop: Workshop | undefined;
}

const WorkshopDetailsDisplay: React.FC<WorkshopDetailsDisplayProps> = ({ workshop }) => {
  if (!workshop) {
    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-md border border-gray-200">
        <p className="text-sm text-gray-500">Seleccione un taller para ver los detalles.</p>
      </div>
    );
  }

  return (
    <div className="mt-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200 shadow">
      <h3 className="text-lg font-semibold text-indigo-700">{workshop.nombre_taller}</h3> {/* Changed to nombre_taller */}
      <p className="mt-2 text-sm text-gray-600 whitespace-pre-line">{workshop.detalles_taller}</p> {/* Changed to detalles_taller */}
      <p className="mt-2 text-sm font-medium text-gray-700 bg-yellow-100 p-2 rounded">{workshop.aranceles_taller}</p> {/* Changed to aranceles_taller */}
    </div>
  );
};

export default WorkshopDetailsDisplay;