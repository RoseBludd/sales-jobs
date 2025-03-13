import { ChevronDown } from 'lucide-react';

interface ClassificationFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export const ClassificationFilter = ({ value, onChange }: ClassificationFilterProps) => (
  <div className="relative group w-72">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="appearance-none block w-full bg-white dark:bg-gray-800 rounded-xl pl-11 pr-10 py-3
                text-sm text-gray-900 dark:text-gray-100
                border border-gray-200 dark:border-gray-700 shadow-sm
                transition-all duration-200
                hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md
                focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-blue-400/10 focus:shadow-md
                focus:outline-none cursor-pointer font-medium"
    >
      <option value="">All Classifications</option>
      <option value="Prospects">Prospects</option>
      <option value="Sold">Sold</option>
      <option value="Estimating">Estimating</option>
      <option value="Production">Production</option>
      <option value="Accounting">Accounting</option>
      <option value="Completed">Completed</option>
      <option value="Unclassified">Unclassified</option>
    </select>
    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
      <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z" clipRule="evenodd" />
      </svg>
    </div>
    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
      <ChevronDown className="h-5 w-5 text-gray-400 dark:text-gray-500" />
    </div>
  </div>
); 