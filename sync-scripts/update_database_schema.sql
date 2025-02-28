-- Script to update database schema for Monday.com integration
-- Creates missing tables and adds required columns

-- Create pa_law table
CREATE TABLE IF NOT EXISTS pa_law (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create policies table
CREATE TABLE IF NOT EXISTS policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id),
    policy_number VARCHAR(100),
    insurance_id UUID,
    start_date DATE,
    end_date DATE,
    coverage_amount NUMERIC,
    status VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create insurances table
CREATE TABLE IF NOT EXISTS insurances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255),
    company_phone VARCHAR(50),
    company_email VARCHAR(255),
    adjuster_name VARCHAR(255),
    adjuster_phone VARCHAR(50),
    adjuster_email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint after table creation
ALTER TABLE policies ADD CONSTRAINT fk_insurance_id
    FOREIGN KEY (insurance_id) REFERENCES insurances(id);

-- Update projects table
ALTER TABLE projects 
    ADD COLUMN IF NOT EXISTS link VARCHAR(255),
    ADD COLUMN IF NOT EXISTS company_cam_link VARCHAR(255),
    ADD COLUMN IF NOT EXISTS total_payment NUMERIC;

-- Update users table
ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS address VARCHAR(255),
    ADD COLUMN IF NOT EXISTS city VARCHAR(100),
    ADD COLUMN IF NOT EXISTS state VARCHAR(2),
    ADD COLUMN IF NOT EXISTS zip VARCHAR(10),
    ADD COLUMN IF NOT EXISTS identification_files JSONB,
    ADD COLUMN IF NOT EXISTS onboarding_files JSONB,
    ADD COLUMN IF NOT EXISTS shirt_size VARCHAR(10);

-- Update properties table
ALTER TABLE properties 
    ADD COLUMN IF NOT EXISTS measurements JSONB,
    ADD COLUMN IF NOT EXISTS one_click_codes JSONB;
