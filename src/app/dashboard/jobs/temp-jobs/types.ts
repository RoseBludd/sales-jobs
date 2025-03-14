export interface TempJob {
  id: string;
  name: string;
  createdAt: Date;
  customerId?: string;
  salesRepId?: string;
  mainRepEmail?: string;
  isNewCustomer?: boolean;
  customerFullName: string;
  customerFirstName: string;
  customerLastName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  referredBy?: string;
  customerNotes?: string;
  isCustomerAddressMatchingJob?: boolean;
  projectAddress?: string;
  roofType?: string;
  isSplitJob?: boolean;
  splitPercentage?: number;
  projectNotes?: string;
  businessName?: string;
  companyName?: string;
  isSubmitted?: boolean;
  updatedAt?: Date;
} 