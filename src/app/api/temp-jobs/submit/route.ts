import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema for job IDs
const submitJobsSchema = z.object({
  jobIds: z.array(z.string()).min(1, "At least one job ID is required"),
  shouldDelete: z.boolean().optional().default(false)
});

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

// POST /api/temp-jobs/submit - Submit jobs to webhook
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validatedData = submitJobsSchema.parse(body);
    const { jobIds, shouldDelete } = validatedData;
    
    // Fetch jobs from database
    const jobs = await prisma.temp_jobs.findMany({
      where: {
        id: {
          in: jobIds
        }
      }
    });
    
    if (jobs.length === 0) {
      return NextResponse.json(
        { error: 'No jobs found with the provided IDs' },
        { status: 404 }
      );
    }
    
    // Convert to frontend format
    const transformedJobs = jobs.map(convertToFrontendFormat);
    
    // Submit to webhook
    const webhookUrl = 'https://hook.us1.make.com/ccjun1bj3a6i7h8zybz7sbiic5if0vkc';
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transformedJobs),
    });
    
    if (!webhookResponse.ok) {
      throw new Error(`Webhook response error: ${webhookResponse.status}`);
    }
    
    // If not deleting, mark jobs as submitted
    if (!shouldDelete) {
      await prisma.temp_jobs.updateMany({
        where: {
          id: {
            in: jobIds
          }
        },
        data: {
          is_submitted: true,
          updated_at: new Date()
        }
      });
    }
    // Delete jobs if requested
    else {
      await prisma.temp_jobs.deleteMany({
        where: {
          id: {
            in: jobIds
          }
        }
      });
    }
    
    return NextResponse.json({ 
      success: true,
      message: `Successfully submitted ${jobs.length} jobs`,
      deletedJobs: shouldDelete ? jobs.length : 0,
      markedAsSubmitted: !shouldDelete ? jobs.length : 0
    });
  } catch (error) {
    console.error('Error submitting jobs:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to submit jobs', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 