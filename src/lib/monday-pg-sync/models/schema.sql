-- Monday.com to PostgreSQL Sync Schema

-- Project Table
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    monday_id VARCHAR(50) UNIQUE NOT NULL,
    job_progress_link TEXT,
    job_progress_name TEXT,
    job_progress_description TEXT,
    company_cam_link TEXT,
    total_price DECIMAL(10, 2),
    total_payment DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer Table
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    monday_id VARCHAR(50) UNIQUE,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Property Table
CREATE TABLE IF NOT EXISTS properties (
    id SERIAL PRIMARY KEY,
    monday_id VARCHAR(50) UNIQUE,
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    measurements TEXT,
    one_click_codes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Note Table
CREATE TABLE IF NOT EXISTS notes (
    id SERIAL PRIMARY KEY,
    monday_id VARCHAR(50) UNIQUE,
    content TEXT,
    customer_id INTEGER REFERENCES customers(id),
    project_id INTEGER REFERENCES projects(id),
    property_id INTEGER REFERENCES properties(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sales Team Table
CREATE TABLE IF NOT EXISTS sales_teams (
    id SERIAL PRIMARY KEY,
    monday_id VARCHAR(50) UNIQUE,
    name TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    monday_id VARCHAR(50) UNIQUE,
    first_name TEXT,
    last_name TEXT,
    email TEXT UNIQUE,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    shirt_size TEXT,
    role TEXT,
    team_id INTEGER REFERENCES sales_teams(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project-User Relationship (for different roles)
CREATE TABLE IF NOT EXISTS project_users (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id),
    user_id INTEGER REFERENCES users(id),
    role TEXT, -- Project Manager, Estimator, Superintendent, Sales Rep
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, user_id, role)
);

-- PA/Law Table
CREATE TABLE IF NOT EXISTS pa_laws (
    id SERIAL PRIMARY KEY,
    monday_id VARCHAR(50) UNIQUE,
    name TEXT,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Claim Table
CREATE TABLE IF NOT EXISTS claims (
    id SERIAL PRIMARY KEY,
    monday_id VARCHAR(50) UNIQUE,
    claim_number TEXT,
    project_id INTEGER REFERENCES projects(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Policy Table
CREATE TABLE IF NOT EXISTS policies (
    id SERIAL PRIMARY KEY,
    monday_id VARCHAR(50) UNIQUE,
    policy_number TEXT,
    project_id INTEGER REFERENCES projects(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insurance Company Table
CREATE TABLE IF NOT EXISTS insurance_companies (
    id SERIAL PRIMARY KEY,
    monday_id VARCHAR(50) UNIQUE,
    name TEXT,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Adjuster Table
CREATE TABLE IF NOT EXISTS adjusters (
    id SERIAL PRIMARY KEY,
    monday_id VARCHAR(50) UNIQUE,
    name TEXT,
    phone TEXT,
    email TEXT,
    insurance_company_id INTEGER REFERENCES insurance_companies(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Storm Table
CREATE TABLE IF NOT EXISTS storms (
    id SERIAL PRIMARY KEY,
    monday_id VARCHAR(50) UNIQUE,
    date_of_loss DATE,
    project_id INTEGER REFERENCES projects(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sync Log Table (for tracking sync operations)
CREATE TABLE IF NOT EXISTS sync_logs (
    id SERIAL PRIMARY KEY,
    entity_type TEXT NOT NULL, -- 'project', 'customer', etc.
    monday_id VARCHAR(50) NOT NULL,
    operation TEXT NOT NULL, -- 'create', 'update', 'delete'
    status TEXT NOT NULL, -- 'success', 'failed'
    error_message TEXT,
    sync_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for all tables
CREATE TRIGGER update_projects_modtime
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_customers_modtime
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_properties_modtime
    BEFORE UPDATE ON properties
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_notes_modtime
    BEFORE UPDATE ON notes
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_sales_teams_modtime
    BEFORE UPDATE ON sales_teams
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_users_modtime
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_project_users_modtime
    BEFORE UPDATE ON project_users
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_pa_laws_modtime
    BEFORE UPDATE ON pa_laws
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_claims_modtime
    BEFORE UPDATE ON claims
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_policies_modtime
    BEFORE UPDATE ON policies
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_insurance_companies_modtime
    BEFORE UPDATE ON insurance_companies
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_adjusters_modtime
    BEFORE UPDATE ON adjusters
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_storms_modtime
    BEFORE UPDATE ON storms
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
