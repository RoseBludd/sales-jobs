import { Save, X, PlusCircle, User, Briefcase, Phone, Mail, MapPin, AlertCircle, HelpCircle, Percent } from 'lucide-react';
import { TempJob } from '../types';

interface TempJobFormProps {
  editingJob: TempJob | null;
  newJob: Omit<TempJob, 'id' | 'createdAt'>;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onBooleanChange: (name: string, value: boolean) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function TempJobForm({
  editingJob,
  newJob,
  onInputChange,
  onBooleanChange,
  onSave,
  onCancel
}: TempJobFormProps) {
  const job = editingJob || newJob;
  const fieldGroupClasses = "space-y-4";
  
  return (
    <>
      <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100 flex items-center">
        {editingJob ? (
          <>
            <Briefcase className="h-5 w-5 mr-2 text-blue-500" />
            Edit Potential Customer
          </>
        ) : (
          <>
            <PlusCircle className="h-5 w-5 mr-2 text-green-500" />
            Add Potential Customer  
          </>
        )}
      </h2>
      
      <div className="space-y-6">
        {/* Basic Information Section */}
        <div className={fieldGroupClasses}>
          <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3 pb-1 border-b border-gray-200 dark:border-gray-700">
            Basic Information
          </h3>
          
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Job Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Briefcase className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={job.name}
                  onChange={onInputChange}
                  className="w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                          shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 
                          dark:bg-gray-700 dark:text-white text-sm"
                  placeholder="Enter job name"
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="customerId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Customer ID
                </label>
                <input
                  type="text"
                  id="customerId"
                  name="customerId"
                  value={job.customerId || ''}
                  onChange={onInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                          shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 
                          dark:bg-gray-700 dark:text-white text-sm"
                  placeholder="Customer ID (if known)"
                />
              </div>
              
              <div>
                <label htmlFor="salesRepId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Sales Rep ID
                </label>
                <input
                  type="text"
                  id="salesRepId"
                  name="salesRepId"
                  value={job.salesRepId || ''}
                  onChange={onInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                          shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 
                          dark:bg-gray-700 dark:text-white text-sm"
                  placeholder="Sales rep ID"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="mainRepEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Main Rep Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="email"
                  id="mainRepEmail"
                  name="mainRepEmail"
                  value={job.mainRepEmail || ''}
                  onChange={onInputChange}
                  className="w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                          shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 
                          dark:bg-gray-700 dark:text-white text-sm"
                  placeholder="Main representative's email"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Is this a new or existing customer?
              </label>
              <div className="flex space-x-4 mt-1">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    checked={job.isNewCustomer === true}
                    onChange={() => onBooleanChange('isNewCustomer', true)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded-full"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">New Customer</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    checked={job.isNewCustomer === false}
                    onChange={() => onBooleanChange('isNewCustomer', false)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded-full"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Existing Customer</span>
                </label>
              </div>
            </div>
          </div>
        </div>
        
        {/* Customer Information Section */}
        <div className={fieldGroupClasses}>
          <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3 pb-1 border-b border-gray-200 dark:border-gray-700">
            Customer Information
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="customerFirstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="customerFirstName"
                  name="customerFirstName"
                  value={job.customerFirstName}
                  onChange={onInputChange}
                  className="w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                          shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 
                          dark:bg-gray-700 dark:text-white text-sm focus:border-blue-300"
                  placeholder="Customer first name"
                  required
                  autoComplete="given-name"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="customerLastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="customerLastName"
                  name="customerLastName"
                  value={job.customerLastName}
                  onChange={onInputChange}
                  className="w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                          shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 
                          dark:bg-gray-700 dark:text-white text-sm focus:border-blue-300"
                  placeholder="Customer last name"
                  required
                  autoComplete="family-name"
                />
              </div>
            </div>
          </div>
          
          <div>
            <label htmlFor="customerFullName" className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <span>Full Name <span className="text-red-500">*</span></span>
              <div className="ml-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                Auto-generated
              </div>
            </label>
            <div className="relative">
              <input
                type="text"
                id="customerFullName"
                name="customerFullName"
                value={job.customerFullName}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                        shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 
                        dark:bg-gray-700 dark:text-white text-sm bg-gray-50 dark:bg-gray-600"
                placeholder="Auto-generated from first and last name"
                readOnly
                required
                title="This field is automatically generated from the First Name and Last Name fields"
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                  Auto
                </div>
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              This field is automatically generated from First Name and Last Name
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="customerEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="email"
                  id="customerEmail"
                  name="customerEmail"
                  value={job.customerEmail || ''}
                  onChange={onInputChange}
                  className="w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                          shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 
                          dark:bg-gray-700 dark:text-white text-sm"
                  placeholder="Customer email address"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="tel"
                  id="customerPhone"
                  name="customerPhone"
                  value={job.customerPhone || ''}
                  onChange={onInputChange}
                  className="w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                          shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 
                          dark:bg-gray-700 dark:text-white text-sm"
                  placeholder="Customer phone number"
                />
              </div>
            </div>
          </div>
          
          <div>
            <label htmlFor="customerAddress" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Customer Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MapPin className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                id="customerAddress"
                name="customerAddress"
                value={job.customerAddress || ''}
                onChange={onInputChange}
                className="w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                        shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 
                        dark:bg-gray-700 dark:text-white text-sm"
                placeholder="Customer's address"
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="referredBy" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Referred By
            </label>
            <input
              type="text"
              id="referredBy"
              name="referredBy"
              value={job.referredBy || ''}
              onChange={onInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                      shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 
                      dark:bg-gray-700 dark:text-white text-sm"
              placeholder="How did the customer find us?"
            />
          </div>
        </div>

        {/* Project Information Section */}
        <div className={fieldGroupClasses}>
          <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3 pb-1 border-b border-gray-200 dark:border-gray-700">
            Project Information
          </h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Is the Customer Address the same as the project address?
            </label>
            <div className="flex space-x-4 mt-1">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  checked={job.isCustomerAddressMatchingJob === true}
                  onChange={() => onBooleanChange('isCustomerAddressMatchingJob', true)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded-full"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Yes</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  checked={job.isCustomerAddressMatchingJob === false}
                  onChange={() => onBooleanChange('isCustomerAddressMatchingJob', false)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded-full"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">No</span>
              </label>
            </div>
          </div>
          
          {!job.isCustomerAddressMatchingJob && (
            <div>
              <label htmlFor="projectAddress" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Project Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="projectAddress"
                  name="projectAddress"
                  value={job.projectAddress || ''}
                  onChange={onInputChange}
                  className="w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                          shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 
                          dark:bg-gray-700 dark:text-white text-sm"
                  placeholder="Address where work will be done"
                />
              </div>
            </div>
          )}
          
          <div>
            <label htmlFor="roofType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Roof Type
            </label>
            <input
              type="text"
              id="roofType"
              name="roofType"
              value={job.roofType || ''}
              onChange={onInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                      shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 
                      dark:bg-gray-700 dark:text-white text-sm"
              placeholder="Type of roof (e.g., shingle, metal, flat)"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Is this project being split with another Sales Rep?
            </label>
            <div className="flex space-x-4 mt-1">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  checked={job.isSplitJob === true}
                  onChange={() => onBooleanChange('isSplitJob', true)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded-full"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Yes</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  checked={job.isSplitJob === false}
                  onChange={() => onBooleanChange('isSplitJob', false)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded-full"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">No</span>
              </label>
            </div>
          </div>
          
          {job.isSplitJob && (
            <div>
              <label htmlFor="splitPercentage" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                How Much Percentage Is Being Split?
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Percent className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="number"
                  id="splitPercentage"
                  name="splitPercentage"
                  min="0"
                  max="100"
                  value={job.splitPercentage || 0}
                  onChange={onInputChange}
                  className="w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                          shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 
                          dark:bg-gray-700 dark:text-white text-sm"
                  placeholder="Enter percentage (0-100)"
                />
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Business Name
              </label>
              <input
                type="text"
                id="businessName"
                name="businessName"
                value={job.businessName || ''}
                onChange={onInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                        shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 
                        dark:bg-gray-700 dark:text-white text-sm"
                placeholder="Business name (if applicable)"
              />
            </div>
            
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Company Name
              </label>
              <input
                type="text"
                id="companyName"
                name="companyName"
                value={job.companyName || ''}
                onChange={onInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                        shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 
                        dark:bg-gray-700 dark:text-white text-sm"
                placeholder="Company name (if applicable)"
              />
            </div>
          </div>
        </div>
        
        {/* Notes Section */}
        <div className={fieldGroupClasses}>
          <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3 pb-1 border-b border-gray-200 dark:border-gray-700">
            Notes
          </h3>
          
          <div>
            <label htmlFor="customerNotes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Customer Notes
            </label>
            <textarea
              id="customerNotes"
              name="customerNotes"
              value={job.customerNotes || ''}
              onChange={onInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                      shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 
                      dark:bg-gray-700 dark:text-white text-sm"
              placeholder="Additional notes about the customer"
            ></textarea>
          </div>
          
          <div>
            <label htmlFor="projectNotes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Project Notes
            </label>
            <textarea
              id="projectNotes"
              name="projectNotes"
              value={job.projectNotes || ''}
              onChange={onInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                      shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 
                      dark:bg-gray-700 dark:text-white text-sm"
              placeholder="Notes about the project/job"
            ></textarea>
          </div>
        </div>
      </div>
      
      {/* Form Actions */}
      <div className="mt-6 flex items-center justify-end space-x-3">
        {editingJob && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600
                   text-sm font-medium rounded-md text-gray-700 dark:text-gray-200
                   bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700
                   focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <X className="h-4 w-4 mr-1.5" />
            Cancel
          </button>
        )}
        
        <button
          type="button"
          onClick={onSave}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium
                 rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 
                 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Save className="h-4 w-4 mr-1.5" />
          {editingJob ? 'Update Customer' : 'Save Customer'}
        </button>
      </div>
    </>
  );
} 