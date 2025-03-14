CREATE TABLE temp_jobs (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    customer_id VARCHAR(36),
    sales_rep_id VARCHAR(36),
    main_rep_email VARCHAR(255),
    is_new_customer BOOLEAN DEFAULT FALSE,
    customer_full_name VARCHAR(255) NOT NULL,
    customer_first_name VARCHAR(255) NOT NULL,
    customer_last_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50),
    customer_email VARCHAR(255),
    customer_address TEXT,
    referred_by VARCHAR(255),
    customer_notes TEXT,
    is_customer_address_matching_job BOOLEAN DEFAULT FALSE,
    project_address TEXT,
    roof_type VARCHAR(100),
    is_split_job BOOLEAN DEFAULT FALSE,
    split_percentage DECIMAL(5,2) DEFAULT 0,
    project_notes TEXT,
    business_name VARCHAR(255),
    company_name VARCHAR(255),
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_temp_jobs_updated_at
    BEFORE UPDATE ON temp_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add indexes for common search fields
CREATE INDEX idx_temp_jobs_name ON temp_jobs(name);
CREATE INDEX idx_temp_jobs_customer_full_name ON temp_jobs(customer_full_name);
CREATE INDEX idx_temp_jobs_customer_email ON temp_jobs(customer_email);
CREATE INDEX idx_temp_jobs_customer_phone ON temp_jobs(customer_phone);