import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema for updating a temp job
const updateTempJobSchema = z.object({
  name: z.string().min(1, "Job name is required").optional(),
  customerId: z.string().optional().nullable(),
  salesRepId: z.string().optional().nullable(),
  mainRepEmail: z.string().optional().nullable(),
  isNewCustomer: z.boolean().optional(),
  customerFullName: z.string().min(1, "Customer name is required").optional(),
  customerFirstName: z.string().min(1, "Customer first name is required").optional(),
  customerLastName: z.string().min(1, "Customer last name is required").optional(),
  customerPhone: z.string().optional().nullable(),
  customerEmail: z.string().optional().nullable(),
  customerAddress: z.string().optional().nullable(),
  referredBy: z.string().optional().nullable(),
  customerNotes: z.string().optional().nullable(),
  isCustomerAddressMatchingJob: z.boolean().optional(),
  projectAddress: z.string().optional().nullable(),
  roofType: z.string().optional().nullable(),
  isSplitJob: z.boolean().optional(),
  splitPercentage: z.number().optional(),
  projectNotes: z.string().optional().nullable(),
  businessName: z.string().optional().nullable(),
  companyName: z.string().optional().nullable(),
  isSubmitted: z.boolean().optional(),
});

// Convert frontend camelCase to database snake_case
function convertToDatabaseFormat(data: any) {
  return {
    name: data.name,
    customer_id: data.customerId,
    sales_rep_id: data.salesRepId,
    main_rep_email: data.mainRepEmail,
    is_new_customer: data.isNewCustomer,
    customer_full_name: data.customerFullName,
    customer_first_name: data.customerFirstName,
    customer_last_name: data.customerLastName,
    customer_phone: data.customerPhone,
    customer_email: data.customerEmail,
    customer_address: data.customerAddress,
    referred_by: data.referredBy,
    customer_notes: data.customerNotes,
    is_customer_address_matching_job: data.isCustomerAddressMatchingJob,
    project_address: data.projectAddress,
    roof_type: data.roofType,
    is_split_job: data.isSplitJob,
    split_percentage: data.splitPercentage,
    project_notes: data.projectNotes,
    business_name: data.businessName,
    company_name: data.companyName,
    is_submitted: data.isSubmitted,
    updated_at: new Date(),
  };
}

// Convert database snake_case to frontend camelCase
function convertToFrontendFormat(job: any) {
  return {
    id: job.id,
    name: job.name,
    createdAt: job.created_at,
    customerId: job.customer_id,
    salesRepId: job.sales_rep_id,
    mainRepEmail: job.main_rep_email,
    isNewCustomer: job.is_new_customer,
    customerFullName: job.customer_full_name,
    customerFirstName: job.customer_first_name,
    customerLastName: job.customer_last_name,
    customerPhone: job.customer_phone,
    customerEmail: job.customer_email,
    customerAddress: job.customer_address,
    referredBy: job.referred_by,
    customerNotes: job.customer_notes,
    isCustomerAddressMatchingJob: job.is_customer_address_matching_job,
    projectAddress: job.project_address,
    roofType: job.roof_type,
    isSplitJob: job.is_split_job,
    splitPercentage: job.split_percentage ? Number(job.split_percentage) : 0,
    projectNotes: job.project_notes,
    businessName: job.business_name,
    companyName: job.company_name,
    isSubmitted: job.is_submitted,
    updatedAt: job.updated_at
  };
}

// GET /api/temp-jobs/[id] - Get a specific temp job
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const tempJob = await prisma.temp_jobs.findUnique({
      where: { id }
    });

    if (!tempJob) {
      return NextResponse.json(
        { error: 'Temp job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(convertToFrontendFormat(tempJob));
  } catch (error) {
    console.error('Error fetching temp job:', error);
    return NextResponse.json(
      { error: 'Failed to fetch temp job' },
      { status: 500 }
    );
  }
}

// PATCH /api/temp-jobs/[id] - Update a temp job
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    
    // Validate request body
    const validatedData = updateTempJobSchema.parse(body);
    
    // Convert to database format
    const dbData = convertToDatabaseFormat(validatedData);
    
    // Update the temp job
    const updatedTempJob = await prisma.temp_jobs.update({
      where: { id },
      data: dbData
    });
    
    return NextResponse.json(convertToFrontendFormat(updatedTempJob));
  } catch (error) {
    console.error('Error updating temp job:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update temp job' },
      { status: 500 }
    );
  }
}

// DELETE /api/temp-jobs/[id] - Delete a temp job
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    await prisma.temp_jobs.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting temp job:', error);
    return NextResponse.json(
      { error: 'Failed to delete temp job' },
      { status: 500 }
    );
  }
} 