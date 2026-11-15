import React, { useState } from 'react';
import { 
  X, FileText, Plus, Trash2, ArrowUp, ArrowDown, 
  Eye, Sliders, CheckSquare, Sparkles, Save, 
  HelpCircle, AlertCircle, CheckCircle2, UploadCloud
} from 'lucide-react';
import { ApplicationFormField } from '../../types/ceda';

interface FormBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  fields: ApplicationFormField[];
  onSaveFields: (updatedFields: ApplicationFormField[]) => void;
}

export const FormBuilderModal: React.FC<FormBuilderModalProps> = ({
  isOpen,
  onClose,
  fields,
  onSaveFields,
}) => {
  if (!isOpen) return null;

  const [formFields, setFormFields] = useState<ApplicationFormField[]>(fields);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');

  // Add field form state
  const [isAddingField, setIsAddingField] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<'text' | 'textarea' | 'number' | 'select' | 'file'>('text');
  const [newPlaceholder, setNewPlaceholder] = useState('');
  const [newRequired, setNewRequired] = useState(true);
  const [newHelpText, setNewHelpText] = useState('');
  const [newOptions, setNewOptions] = useState('Option 1, Option 2, Option 3');

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= formFields.length) return;

    const updated = [...formFields];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setFormFields(updated);
  };

  const handleDeleteField = (fieldId: string) => {
    if (formFields.length <= 2) {
      alert('The citizen application form requires at least 2 primary fields.');
      return;
    }
    setFormFields(formFields.filter((f) => f.id !== fieldId));
  };

  const handleAddField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;

    const newField: ApplicationFormField = {
      id: `field-${Date.now()}`,
      label: newLabel.trim(),
      fieldType: newType,
      placeholder: newPlaceholder.trim() || undefined,
      required: newRequired,
      helpText: newHelpText.trim() || undefined,
      options: newType === 'select' ? newOptions.split(',').map((o) => o.trim()).filter(Boolean) : undefined,
    };

    setFormFields([...formFields, newField]);
    setNewLabel('');
    setNewPlaceholder('');
    setNewHelpText('');
    setIsAddingField(false);
  };

  const handleSave = () => {
    onSaveFields(formFields);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-xs">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-[#006194] flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Citizen Application Form Builder</h3>
              <p className="text-xs text-slate-500">Configure questions, statutory inputs & document attachments for Idea Submitters</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Strip */}
        <div className="px-6 py-2.5 border-b border-slate-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'editor'
                  ? 'bg-[#006194] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Field Architecture ({formFields.length} Fields)</span>
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'preview'
                  ? 'bg-[#006194] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Live Submitter Preview</span>
            </button>
          </div>

          {activeTab === 'editor' && (
            <button
              onClick={() => setIsAddingField(true)}
              className="px-3 py-1.5 bg-[#006194] hover:bg-[#004e75] text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Field</span>
            </button>
          )}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'editor' ? (
            <>
              {/* Add Field Inline Drawer */}
              {isAddingField && (
                <form onSubmit={handleAddField} className="p-4 bg-sky-50 border border-sky-200 rounded-xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sky-950 text-xs flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#006194]" />
                      Add New Application Field
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingField(false)}
                      className="text-slate-400 hover:text-slate-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Field Question / Label:</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Export Potential & Regional SADC Demand"
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Input Type:</label>
                      <select
                        value={newType}
                        onChange={(e) => setNewType(e.target.value as any)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md font-medium text-slate-900"
                      >
                        <option value="text">Single-line Text</option>
                        <option value="textarea">Multi-line Paragraph</option>
                        <option value="number">Numeric Currency / Value</option>
                        <option value="select">Dropdown Options</option>
                        <option value="file">Document / PDF Upload</option>
                      </select>
                    </div>
                  </div>

                  {newType === 'select' && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Dropdown Choices (comma-separated):</label>
                      <input
                        type="text"
                        value={newOptions}
                        onChange={(e) => setNewOptions(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-slate-900"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Placeholder Text:</label>
                      <input
                        type="text"
                        placeholder="e.g. Enter details..."
                        value={newPlaceholder}
                        onChange={(e) => setNewPlaceholder(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Guidance / Help Text:</label>
                      <input
                        type="text"
                        placeholder="e.g. Provide evidence from market survey..."
                        value={newHelpText}
                        onChange={(e) => setNewHelpText(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newRequired}
                        onChange={(e) => setNewRequired(e.target.checked)}
                        className="rounded border-slate-300 text-[#006194] focus:ring-[#006194]"
                      />
                      <span className="font-semibold text-slate-700">Mandatory / Required Field</span>
                    </label>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingField(false)}
                        className="px-3 py-1 text-slate-600 hover:bg-slate-200 rounded-md"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1 bg-[#006194] text-white font-bold rounded-md hover:bg-[#004e75]"
                      >
                        Add Field to Schema
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Fields List */}
              <div className="space-y-2">
                {formFields.map((field, idx) => (
                  <div
                    key={field.id}
                    className="p-3.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg flex items-center justify-between gap-3 group transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[11px]">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{field.label}</span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                            {field.fieldType}
                          </span>
                          {field.required && (
                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded-full">
                              Required *
                            </span>
                          )}
                        </div>
                        {field.helpText && (
                          <span className="text-[11px] text-slate-500 block mt-0.5">
                            {field.helpText}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleMoveField(idx, 'up')}
                        disabled={idx === 0}
                        title="Move Up"
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 rounded hover:bg-slate-100"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveField(idx, 'down')}
                        disabled={idx === formFields.length - 1}
                        title="Move Down"
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 rounded hover:bg-slate-100"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteField(field.id)}
                        title="Delete Field"
                        className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            /* Live Citizen Submitter Form Preview */
            <div className="max-w-2xl mx-auto bg-slate-50/80 p-6 rounded-xl border border-slate-200 space-y-5">
              <div className="border-b border-slate-200 pb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-block mb-1">
                  Citizen Portal Preview
                </span>
                <h4 className="text-base font-extrabold text-slate-900">
                  National Innovation Commercialization Application
                </h4>
                <p className="text-xs text-slate-500">
                  Citizen innovators fill out this dynamically rendered form to submit their proposals into the intake queue.
                </p>
              </div>

              <div className="space-y-4">
                {formFields.map((field) => (
                  <div key={field.id} className="space-y-1">
                    <label className="block font-bold text-slate-800 text-xs">
                      {field.label} {field.required && <span className="text-rose-500">*</span>}
                    </label>

                    {field.fieldType === 'text' && (
                      <input
                        type="text"
                        disabled
                        placeholder={field.placeholder || 'Text input...'}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 text-xs cursor-not-allowed opacity-90"
                      />
                    )}

                    {field.fieldType === 'number' && (
                      <input
                        type="number"
                        disabled
                        placeholder={field.placeholder || '0.00'}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 text-xs cursor-not-allowed opacity-90"
                      />
                    )}

                    {field.fieldType === 'textarea' && (
                      <textarea
                        rows={3}
                        disabled
                        placeholder={field.placeholder || 'Detailed explanation...'}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 text-xs cursor-not-allowed opacity-90 resize-none"
                      />
                    )}

                    {field.fieldType === 'select' && (
                      <select
                        disabled
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 text-xs cursor-not-allowed opacity-90"
                      >
                        {field.options?.map((opt, i) => (
                          <option key={i}>{opt}</option>
                        ))}
                      </select>
                    )}

                    {field.fieldType === 'file' && (
                      <div className="border-2 border-dashed border-slate-300 bg-white rounded-lg p-4 text-center cursor-not-allowed">
                        <UploadCloud className="w-6 h-6 mx-auto text-slate-400 mb-1" />
                        <span className="text-xs font-semibold text-slate-600 block">Click or drag PDF documents to upload</span>
                        <span className="text-[10px] text-slate-400">PDF, DOCX up to 25MB</span>
                      </div>
                    )}

                    {field.helpText && (
                      <p className="text-[11px] text-slate-500">{field.helpText}</p>
                    )}
                  </div>
                ))}

                <button
                  disabled
                  className="w-full py-2.5 bg-[#006194] text-white font-bold rounded-lg text-xs opacity-80 cursor-not-allowed mt-2"
                >
                  Submit Application to CEDA Intake Queue
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-slate-500 text-[11px]">
            <span>Changes will dynamically update the Submitter Portal and citizen application dialogs.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 font-bold text-white bg-[#006194] hover:bg-[#004e75] rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>Save & Publish Form</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
