
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PaymentMethod, ReceiptData, MonthlyPaymentDetail, StudentDetail } from '../types';

const MONTHS_ES = [
  { value: '01', label: 'Enero' }, { value: '02', label: 'Febrero' }, { value: '03', label: 'Marzo' },
  { value: '04', label: 'Abril' }, { value: '05', label: 'Mayo' }, { value: '06', label: 'Junio' },
  { value: '07', label: 'Julio' }, { value: '08', label: 'Agosto' }, { value: '09', label: 'Septiembre' },
  { value: '10', label: 'Octubre' }, { value: '11', label: 'Noviembre' }, { value: '12', label: 'Diciembre' }
];

// SVG Icons
const PlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
    </svg>
);

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
);

const TagIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 ml-1.5 text-gray-500 hover:text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
        <path d="M17.293 4.293A1 1 0 0016.586 4H13V2.414a1 1 0 00-1.707-.707l-7 7A1 1 0 004 9.414V17a1 1 0 001 1h7.586a1 1 0 00.707-.293l7-7a1 1 0 000-1.414l-2-2zM12 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
);

interface PaymentFormProps {
  formData: Omit<ReceiptData, 'workshopId' | 'receiptNumber' | 'paymentDate' | 'totalAmountPaid'>;
  onFormChange: (
    field: keyof Omit<ReceiptData, 'workshopId' | 'receiptNumber' | 'paymentDate' | 'totalAmountPaid'>, 
    value: any
  ) => void;
  paymentDate: Date; 
  selectedWorkshopId: string | null;
  studentSuggestionList: StudentDetail[];
  calculatedTotalAmount: string; 
  onMonthlyPaymentsChange: (monthlyPayments: MonthlyPaymentDetail[]) => void;
  allUniqueTags: string[];
  onStudentTagsChange: (studentName: string, newTags: string[]) => void;
  onStudentListChangeForReceipt: (studentNamesString: string) => void;
}

interface StudentTagEditModalState {
    isOpen: boolean;
    student: StudentDetail | null;
    currentTagInput: string;
    filteredTagSuggestions: string[];
}

const PaymentForm: React.FC<PaymentFormProps> = ({ 
    formData, 
    onFormChange, 
    paymentDate, 
    selectedWorkshopId, 
    studentSuggestionList,
    calculatedTotalAmount,
    onMonthlyPaymentsChange,
    allUniqueTags,
    onStudentTagsChange,
    onStudentListChangeForReceipt
}) => {
  const [currentStudentInput, setCurrentStudentInput] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<StudentDetail[]>([]);
  const [filteredStudentSuggestions, setFilteredStudentSuggestions] = useState<StudentDetail[]>([]);
  const [showStudentSuggestions, setShowStudentSuggestions] = useState(false);
  const studentInputRef = useRef<HTMLInputElement>(null);
  const studentSuggestionsRef = useRef<HTMLUListElement>(null);
  
  const [monthlyPaymentItems, setMonthlyPaymentItems] = useState<MonthlyPaymentDetail[]>(formData.monthlyPayments);

  const [tagEditModal, setTagEditModal] = useState<StudentTagEditModalState>({
    isOpen: false, student: null, currentTagInput: '', filteredTagSuggestions: []
  });
  const tagInputRef = useRef<HTMLInputElement>(null);
  const tagSuggestionsRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    // Reset selected students and related form data when workshop changes or form is reset externally
    setSelectedStudents([]);
    setCurrentStudentInput('');
    onStudentListChangeForReceipt(''); // Update App.tsx's formData.studentNames
  }, [selectedWorkshopId, formData.payerName === '' && formData.studentNames === '']); // Reset on workshop change or full form reset


  useEffect(() => {
    if (JSON.stringify(formData.monthlyPayments) !== JSON.stringify(monthlyPaymentItems)) {
        setMonthlyPaymentItems(formData.monthlyPayments);
    }
  }, [formData.monthlyPayments]);

  useEffect(() => {
    // Update the studentNames string for the receipt whenever selectedStudents changes
    const studentNamesStr = selectedStudents.map(s => s.name).join(', ');
    onStudentListChangeForReceipt(studentNamesStr);
  }, [selectedStudents, onStudentListChangeForReceipt]);

  const updateAppMonthlyPayments = (items: MonthlyPaymentDetail[]) => {
    setMonthlyPaymentItems(items);
    onMonthlyPaymentsChange(items); 
  };

  const handleAddMonthlyPayment = () => {
    const currentDate = new Date();
    const defaultYear = currentDate.getFullYear().toString();
    const defaultMonth = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const newItem: MonthlyPaymentDetail = {
      id: `month-${Date.now()}`,
      monthYear: `${defaultYear}-${defaultMonth}`, 
      amount: '',
      itemNotes: ''
    };
    updateAppMonthlyPayments([...monthlyPaymentItems, newItem]);
  };

  const handleRemoveMonthlyPayment = (id: string) => {
    updateAppMonthlyPayments(monthlyPaymentItems.filter(item => item.id !== id));
  };

  const handleMonthlyPaymentChange = (id: string, field: 'monthValue' | 'yearValue' | 'amount' | 'itemNotes', value: string) => {
    const updatedItems = monthlyPaymentItems.map(item => {
      if (item.id === id) {
        let [yearStr, monthStr] = item.monthYear ? item.monthYear.split('-') : [new Date().getFullYear().toString(), (new Date().getMonth() + 1).toString().padStart(2, '0')];

        if (field === 'monthValue') { 
          monthStr = value; 
        } else if (field === 'yearValue') {
          yearStr = value.replace(/\D/g, ''); 
          if (yearStr.length > 4) yearStr = yearStr.slice(0, 4);
        } else { 
          return { ...item, [field]: value };
        }
        return { ...item, monthYear: `${yearStr}-${monthStr}` };
      }
      return item;
    });
    updateAppMonthlyPayments(updatedItems);
  };
  
 useEffect(() => {
    if (currentStudentInput.trim() && studentSuggestionList.length > 0 && document.activeElement === studentInputRef.current) {
      const filtered = studentSuggestionList.filter(student =>
        student.name.toLowerCase().includes(currentStudentInput.toLowerCase())
      );
      setFilteredStudentSuggestions(filtered);
      setShowStudentSuggestions(filtered.length > 0);
    } else {
      // setShowStudentSuggestions(false); 
    }
  }, [currentStudentInput, studentSuggestionList, selectedWorkshopId]);

  const handleGenericInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onFormChange(name as keyof typeof formData, value);
  };

  const handleStudentInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCurrentStudentInput(value);
  };

  const addStudentToList = (student: StudentDetail) => {
    if (!selectedStudents.find(s => s.name === student.name)) {
      setSelectedStudents(prev => [...prev, student]);
    }
    setCurrentStudentInput('');
    setFilteredStudentSuggestions([]);
    setShowStudentSuggestions(false); 
    studentInputRef.current?.blur(); 
  };
  
  const handleStudentKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && currentStudentInput.trim()) {
      e.preventDefault();
      // Check if student already selected or in suggestions
      const existingSelected = selectedStudents.find(s => s.name.toLowerCase() === currentStudentInput.trim().toLowerCase());
      if (existingSelected) {
         addStudentToList(existingSelected); // Re-select if needed, though usually it's to add new
         return;
      }
      const existingSuggestion = studentSuggestionList.find(s => s.name.toLowerCase() === currentStudentInput.trim().toLowerCase());
      if (existingSuggestion) {
        addStudentToList(existingSuggestion);
      } else {
        addStudentToList({ name: currentStudentInput.trim(), tags: [] });
      }
    }
  };

  const removeStudent = (studentToRemove: StudentDetail) => {
    setSelectedStudents(prev => prev.filter(student => student.name !== studentToRemove.name));
  };
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        studentInputRef.current && !studentInputRef.current.contains(event.target as Node) &&
        studentSuggestionsRef.current && !studentSuggestionsRef.current.contains(event.target as Node)
      ) {
        setShowStudentSuggestions(false);
      }
      if (tagEditModal.isOpen && tagInputRef.current && !tagInputRef.current.closest('.tag-modal-content')?.contains(event.target as Node)) {
         if (tagSuggestionsRef.current && !tagSuggestionsRef.current.contains(event.target as Node) &&
             tagInputRef.current && !tagInputRef.current.contains(event.target as Node) ) {
            setTagEditModal(prev => ({ ...prev, isOpen: false, student: null }));
         }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [tagEditModal.isOpen]);

  const handleStudentInputFocus = () => {
    if (studentSuggestionList.length > 0) {
      if (currentStudentInput.trim()) {
        const filtered = studentSuggestionList.filter(student =>
          student.name.toLowerCase().includes(currentStudentInput.toLowerCase())
        );
        setFilteredStudentSuggestions(filtered);
         setShowStudentSuggestions(filtered.length > 0);
      } else {
        setFilteredStudentSuggestions(studentSuggestionList.slice(0,5)); 
        setShowStudentSuggestions(studentSuggestionList.length > 0);
      }
    }
  };

  // Tag Management Modal Logic
  const openTagEditModal = (student: StudentDetail) => {
    setTagEditModal({ isOpen: true, student, currentTagInput: '', filteredTagSuggestions: [] });
  };

  const closeTagEditModal = () => {
    setTagEditModal({ isOpen: false, student: null, currentTagInput: '', filteredTagSuggestions: [] });
  };

  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTagEditModal(prev => ({ ...prev, currentTagInput: value }));
    if (value.trim()) {
      const filtered = allUniqueTags.filter(tag => 
        tag.toLowerCase().includes(value.toLowerCase()) &&
        !tagEditModal.student?.tags.includes(tag) 
      );
      setTagEditModal(prev => ({ ...prev, filteredTagSuggestions: filtered }));
    } else {
      setTagEditModal(prev => ({ ...prev, filteredTagSuggestions: [] }));
    }
  };

  const addTagToStudent = (tag: string) => {
    if (tagEditModal.student && tag.trim() && !tagEditModal.student.tags.includes(tag.trim())) {
      const updatedTags = [...tagEditModal.student.tags, tag.trim()];
      onStudentTagsChange(tagEditModal.student.name, updatedTags);
      // Update local state for immediate feedback if needed, or rely on prop update
       setSelectedStudents(prev => prev.map(s => s.name === tagEditModal.student!.name ? {...s, tags: updatedTags} : s));
      setTagEditModal(prev => ({ ...prev, student: { ...prev.student!, tags: updatedTags }, currentTagInput: '', filteredTagSuggestions: [] }));
    }
  };

  const removeTagFromStudent = (tagToRemove: string) => {
    if (tagEditModal.student) {
      const updatedTags = tagEditModal.student.tags.filter(tag => tag !== tagToRemove);
      onStudentTagsChange(tagEditModal.student.name, updatedTags);
      setSelectedStudents(prev => prev.map(s => s.name === tagEditModal.student!.name ? {...s, tags: updatedTags} : s));
      setTagEditModal(prev => ({ ...prev, student: { ...prev.student!, tags: updatedTags } }));
    }
  };
  
  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagEditModal.currentTagInput.trim()) {
      e.preventDefault();
      addTagToStudent(tagEditModal.currentTagInput.trim());
    }
  };


  return (
    <div className="space-y-6 mt-6">
      <div>
        <label htmlFor="payerName" className="block text-sm font-medium text-gray-700">
          Nombre del Padre/Tutor/Responsable del Pago
        </label>
        <input
          type="text"
          name="payerName"
          id="payerName"
          value={formData.payerName}
          onChange={handleGenericInputChange}
          className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
          required
        />
      </div>

      <div className="relative">
        <label htmlFor="studentNameInput" className="block text-sm font-medium text-gray-700">
          Nombre del Alumno/s
        </label>
        <input
          type="text"
          id="studentNameInput"
          ref={studentInputRef}
          value={currentStudentInput}
          onChange={handleStudentInputChange}
          onKeyDown={handleStudentKeyDown}
          onFocus={handleStudentInputFocus}
          className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
          placeholder={studentSuggestionList.length > 0 ? "Escriba o seleccione de la lista" : "Escriba y presione Enter"}
          autoComplete="off"
        />
        {showStudentSuggestions && filteredStudentSuggestions.length > 0 && (
          <ul ref={studentSuggestionsRef} className="absolute z-20 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto mt-1">
            {filteredStudentSuggestions.map(suggestion => (
              <li key={suggestion.name} onClick={() => addStudentToList(suggestion)} className="px-3 py-2 hover:bg-indigo-100 cursor-pointer text-sm text-gray-700">
                {suggestion.name}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-2 flex flex-col gap-2">
          {selectedStudents.map(student => (
            <div key={student.name} className="bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between shadow-sm">
              <div className="flex flex-col">
                <span className="font-semibold text-sm">{student.name}</span>
                {student.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {student.tags.map(tag => (
                      <span key={tag} className="bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded-full text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center">
                 <button
                    type="button"
                    onClick={() => openTagEditModal(student)}
                    className="p-1 text-gray-500 hover:text-indigo-600 focus:outline-none"
                    aria-label={`Editar tags de ${student.name}`}
                >
                    <TagIcon />
                </button>
                <button 
                  type="button" 
                  onClick={() => removeStudent(student)} 
                  className="ml-2 text-indigo-400 hover:text-indigo-600 focus:outline-none focus:bg-indigo-200 rounded-full p-0.5" 
                  aria-label={`Quitar alumno ${student.name}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
         <p className="mt-1 text-xs text-gray-500">
          {studentSuggestionList.length > 0 ? 'Puede seleccionar de la lista o escribir un nombre. ' : ''}
          Escriba un nombre y presione Enter para agregarlo. Puede agregar varios alumnos. Use el ícono de etiqueta para gestionar tags.
        </p>
      </div>

       {/* Student Tag Edit Modal */}
      {tagEditModal.isOpen && tagEditModal.student && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-30 flex items-center justify-center p-4">
          <div className="relative tag-modal-content mx-auto p-6 border w-full max-w-md shadow-xl rounded-md bg-white">
            <h4 className="text-lg font-semibold mb-1 text-gray-800">Editar Tags para:</h4>
            <p className="text-indigo-700 font-bold mb-4 text-xl">{tagEditModal.student.name}</p>
            
            <div className="mb-4">
              <label htmlFor="tagInput" className="block text-sm font-medium text-gray-700">Añadir Tag</label>
              <input
                type="text"
                id="tagInput"
                ref={tagInputRef}
                value={tagEditModal.currentTagInput}
                onChange={handleTagInputChange}
                onKeyDown={handleTagInputKeyDown}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Escriba un tag y presione Enter"
                autoComplete="off"
              />
              {tagEditModal.filteredTagSuggestions.length > 0 && (
                <ul ref={tagSuggestionsRef} className="absolute z-40 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-auto mt-1">
                  {tagEditModal.filteredTagSuggestions.map(tag => (
                    <li key={tag} onClick={() => addTagToStudent(tag)} className="px-3 py-2 hover:bg-indigo-100 cursor-pointer text-sm">
                      {tag}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mb-4">
              <p className="block text-sm font-medium text-gray-700">Tags Actuales:</p>
              {tagEditModal.student.tags.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {tagEditModal.student.tags.map(tag => (
                    <span key={tag} className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full text-xs font-medium flex items-center">
                      {tag}
                      <button type="button" onClick={() => removeTagFromStudent(tag)} className="ml-1.5 text-indigo-400 hover:text-indigo-600">
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic mt-1">Sin tags asignados.</p>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={closeTagEditModal}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="space-y-4 border-t border-b border-gray-200 py-6">
        <h3 className="text-lg font-medium text-gray-800">Detalle de Pagos Mensuales</h3>
        {monthlyPaymentItems.map((item, index) => {
          const [itemYear, itemMonth] = item.monthYear 
            ? item.monthYear.split('-') 
            : [new Date().getFullYear().toString(), (new Date().getMonth() + 1).toString().padStart(2, '0')];

          return (
            <div key={item.id} className="p-4 border border-gray-300 rounded-md shadow-sm space-y-3 bg-gray-50">
              <div className="flex justify-between items-center">
                  <p className="font-medium text-gray-700">Pago Mensual #{index + 1}</p>
                  <button
                      type="button"
                      onClick={() => handleRemoveMonthlyPayment(item.id)}
                      className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-100"
                      aria-label="Quitar este pago mensual"
                  >
                      <TrashIcon />
                  </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor={`monthValue-${item.id}`} className="block text-xs font-medium text-gray-600">
                    Mes Abonado
                  </label>
                  <select
                    id={`monthValue-${item.id}`}
                    value={itemMonth}
                    onChange={(e) => handleMonthlyPaymentChange(item.id, 'monthValue', e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
                  >
                    {MONTHS_ES.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor={`yearValue-${item.id}`} className="block text-xs font-medium text-gray-600">
                    Año
                  </label>
                  <input
                    type="number"
                    id={`yearValue-${item.id}`}
                    value={itemYear}
                    onChange={(e) => handleMonthlyPaymentChange(item.id, 'yearValue', e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
                    placeholder="YYYY"
                    min="1900"
                    max="2100" 
                  />
                </div>
              </div>
              <div>
                <label htmlFor={`amount-${item.id}`} className="block text-xs font-medium text-gray-600">
                  Monto del Mes ($)
                </label>
                <input
                  type="number"
                  id={`amount-${item.id}`}
                  value={item.amount}
                  onChange={(e) => handleMonthlyPaymentChange(item.id, 'amount', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
                  placeholder="Ej: 20000"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label htmlFor={`itemNotes-${item.id}`} className="block text-xs font-medium text-gray-600">
                  Notas Específicas del Mes (Opcional)
                </label>
                <textarea
                  id={`itemNotes-${item.id}`}
                  rows={2}
                  value={item.itemNotes}
                  onChange={(e) => handleMonthlyPaymentChange(item.id, 'itemNotes', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
                  placeholder="Ej: Beca aplicada, pago parcial"
                />
              </div>
            </div>
          );
        })}
        <button
          type="button"
          onClick={handleAddMonthlyPayment}
          className="w-full sm:w-auto px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-md shadow-sm text-sm flex items-center justify-center"
        >
          <PlusIcon /> Agregar Mes de Pago
        </button>
         {monthlyPaymentItems.length === 0 && (
            <p className="text-sm text-gray-500">Agregue al menos un mes de pago.</p>
        )}
      </div>

      <div>
        <p className="block text-sm font-medium text-gray-700">Monto Total Abonado</p>
        <input
          type="text"
          value={`$ ${parseFloat(calculatedTotalAmount).toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
          className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm sm:text-sm text-gray-700"
          readOnly
        />
      </div>

      <div>
        <p className="block text-sm font-medium text-gray-700">Fecha y Hora de Pago (Transacción)</p>
        <input
          type="text"
          value={`${paymentDate.toLocaleDateString('es-AR')} ${paymentDate.toLocaleTimeString('es-AR')}`}
          className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm sm:text-sm text-gray-700"
          readOnly
        />
         <p className="mt-1 text-xs text-gray-500">Se completa automáticamente con la fecha y hora actual.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Método de Pago</label>
        <div className="mt-2 space-y-2 sm:space-y-0 sm:flex sm:space-x-4 flex-wrap">
          {(Object.keys(PaymentMethod) as Array<keyof typeof PaymentMethod>).map((key) => (
            <div key={key} className="flex items-center mr-4 mb-2 sm:mb-0">
              <input
                id={`paymentMethod-${PaymentMethod[key]}`}
                name="paymentMethod"
                type="radio"
                value={PaymentMethod[key]}
                checked={formData.paymentMethod === PaymentMethod[key]}
                onChange={() => onFormChange('paymentMethod', PaymentMethod[key])}
                className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
              />
              <label htmlFor={`paymentMethod-${PaymentMethod[key]}`} className="ml-2 block text-sm text-gray-900">
                {PaymentMethod[key]}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
          Notas / Aclaraciones Generales (Opcional)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          value={formData.notes}
          onChange={handleGenericInputChange}
          className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
          placeholder="Ej: Descuento general aplicado, acuerdo especial, etc."
        />
      </div>
    </div>
  );
};

export default PaymentForm;