import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema for temp job
const tempJobSchema = z.object({
  name: z.string().min(1, "Job name is required"),
  customerId: z.string().optional().nullable(),
  salesRepId: z.string().optional().nullable(),
  mainRepEmail: z.string().optional().nullable(),
  isNewCustomer: z.boolean().optional().default(false),
  customerFullName: z.string().min(1, "Customer name is required"),
  customerFirstName: z.string().min(1, "Customer first name is required"),
  customerLastName: z.string().min(1, "Customer last name is required"),
  customerPhone: z.string().optional().nullable(),
  customerEmail: z.string().optional().nullable(),
  customerAddress: z.string().optional().nullable(),
  referredBy: z.string().optional().nullable(),
  customerNotes: z.string().optional().nullable(),
  isCustomerAddressMatchingJob: z.boolean().optional().default(false),
  projectAddress: z.string().optional().nullable(),
  roofType: z.string().optional().nullable(),
  isSplitJob: z.boolean().optional().default(false),
  splitPercentage: z.number().optional().default(0),
  projectNotes: z.string().optional().nullable(),
  businessName: z.string().optional().nullable(),
  companyName: z.string().optional().nullable(),
  isSubmitted: z.boolean().optional().default(false),
});

// GET /api/temp-jobs - List all temp jobs
export async function GET() {
  try {
    const tempJobs = await prisma.temp_jobs.findMany({
      orderBy: {
        created_at: 'desc'
      }
    });

    // Transform db records (snake_case) to camelCase for frontend
    const transformedJobs = tempJobs.map(job => ({
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
    }));

    return NextResponse.json(transformedJobs);
  } catch (error) {
    console.error('Error fetching temp jobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch temp jobs' },
      { status: 500 }
    );
  }
}

// POST /api/temp-jobs - Create a new temp job
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validatedData = tempJobSchema.parse(body);
    
    // Create the temp job
    const tempJob = await prisma.temp_jobs.create({
      data: {
        id: crypto.randomUUID(),
        name: validatedData.name,
        customer_id: validatedData.customerId || null,
        sales_rep_id: validatedData.salesRepId || null,
        main_rep_email: validatedData.mainRepEmail || null,
        is_new_customer: validatedData.isNewCustomer || false,
        customer_full_name: validatedData.customerFullName,
        customer_first_name: validatedData.customerFirstName,
        customer_last_name: validatedData.customerLastName,
        customer_phone: validatedData.customerPhone || null,
        customer_email: validatedData.customerEmail || null,
        customer_address: validatedData.customerAddress || null,
        referred_by: validatedData.referredBy || null,
        customer_notes: validatedData.customerNotes || null,
        is_customer_address_matching_job: validatedData.isCustomerAddressMatchingJob || false,
        project_address: validatedData.projectAddress || null,
        roof_type: validatedData.roofType || null,
        is_split_job: validatedData.isSplitJob || false,
        split_percentage: validatedData.splitPercentage || 0,
        project_notes: validatedData.projectNotes || null,
        business_name: validatedData.businessName || null,
        company_name: validatedData.companyName || null,
        is_submitted: validatedData.isSubmitted || false,
      }
    });
    
    // Transform to camelCase for frontend
    const transformedJob = {
      id: tempJob.id,
      name: tempJob.name,
      createdAt: tempJob.created_at,
      customerId: tempJob.customer_id,
      salesRepId: tempJob.sales_rep_id,
      mainRepEmail: tempJob.main_rep_email,
      isNewCustomer: tempJob.is_new_customer,
      customerFullName: tempJob.customer_full_name,
      customerFirstName: tempJob.customer_first_name,
      customerLastName: tempJob.customer_last_name,
      customerPhone: tempJob.customer_phone,
      customerEmail: tempJob.customer_email,
      customerAddress: tempJob.customer_address,
      referredBy: tempJob.referred_by,
      customerNotes: tempJob.customer_notes,
      isCustomerAddressMatchingJob: tempJob.is_customer_address_matching_job,
      projectAddress: tempJob.project_address,
      roofType: tempJob.roof_type,
      isSplitJob: tempJob.is_split_job,
      splitPercentage: tempJob.split_percentage ? Number(tempJob.split_percentage) : 0,
      projectNotes: tempJob.project_notes,
      businessName: tempJob.business_name,
      companyName: tempJob.company_name,
      isSubmitted: tempJob.is_submitted,
      updatedAt: tempJob.updated_at
    };
    
    return NextResponse.json(transformedJob);
  } catch (error) {
    console.error('Error creating temp job:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create temp job' },
      { status: 500 }
    );
  }
} 