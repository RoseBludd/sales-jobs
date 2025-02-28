# Monday.com to Database Mapping

This document outlines the mapping between Monday.com board columns and our database schema. It is used by the synchronization scripts to ensure data consistency between the two systems.



## Table of Contents
- [MASTER PROJECT BOARD Mapping](#master-project-board-mapping)
- [SALES STAFF BOARD Mapping](#sales-staff-board-mapping)
- [Missing Database Tables and Columns](#missing-database-tables-and-columns)

## MASTER PROJECT BOARD Mapping
Board ID: 6727219152

### Project Information
| Monday Column | Monday Column ID | Database Table | Database Column | Notes |
|---------------|------------------|----------------|-----------------|-------|
| Job Progress Link | link__1 | projects | link | |
| Job Progress Name | text01__1 | projects | name | |
| Job Progress Job Description | text40__1 | projects | description | |
| Company Cam link | text_7__1 | projects | company_cam_link | |
| Total price | numbers0 | projects | estimated_value | |
| Total Payment | qb_total_payments__1 | projects | total_payment | *Needs to be added* |

### Customer Information
| Monday Column | Monday Column ID | Database Table | Database Column | Notes |
|---------------|------------------|----------------|-----------------|-------|
| Job Progress Customer note | text43__1 | customers | notes | |
| Job Progress Contact Full Name | text65__1 | customers | name | |
| JP Contact Email | email4__1 | customers | email | |
| Jp Contact Address | dup__of_job_address0__1 | properties | street, city, state, zip | A customer can have multiple properties and multiple projects |

### Sales Teams
| Monday Column | Monday Column ID | Database Table | Database Column | Notes |
|---------------|------------------|----------------|-----------------|-------|
| Sales Team Name | job_division___1__1 | sales_teams | name | |

### User Roles and Contact Information

#### Partner
| Monday Column | Monday Column ID | Database Table | Database Column | Notes |
|---------------|------------------|----------------|-----------------|-------|
| Partner | partner_name__1 | users | name | role should be set to "Partner" |
| Partner email | partner_email__1 | users | email | role should be set to "Partner" |
| Partner phone | partner_phone____1 | users | phone | role should be set to "Partner" *Needs to be added* |

#### Project Manager
| Monday Column | Monday Column ID | Database Table | Database Column | Notes |
|---------------|------------------|----------------|-----------------|-------|
| Project manager name | text19__1 | users | name | role should be set to "Project Manager" |
| PM number | phone_13__1 | users | phone | role should be set to "Project Manager" *Needs to be added* |
| PM email | email6__1 | users | email | role should be set to "Project Manager" |

#### Estimator
| Monday Column | Monday Column ID | Database Table | Database Column | Notes |
|---------------|------------------|----------------|-----------------|-------|
| Estimator name | job_est_1_name__1 | users | name | role should be set to "Estimator" |
| Estimator Number | phone_10__1 | users | phone | role should be set to "Estimator" *Needs to be added* |
| Estimator Email | email0__1 | users | email | role should be set to "Estimator" |

#### Superintendent
| Monday Column | Monday Column ID | Database Table | Database Column | Notes |
|---------------|------------------|----------------|-----------------|-------|
| Superinteded name | dup__of_text6__1 | users | name | role should be set to "Superintendent" |
| Superintended phone | dup__of_phone_1__1 | users | phone | role should be set to "Superintendent" *Needs to be added* |
| Superintended email | dup__of_email__1 | users | email | role should be set to "Superintendent" |

#### Sales Representative
| Monday Column | Monday Column ID | Database Table | Database Column | Notes |
|---------------|------------------|----------------|-----------------|-------|
| Sales rep first name + last name | text22__1 + text49__1 | users | name | Combine first and last name, role should be set to "Sales Representative" |
| Sales rep phone | sales_rep_phone____1 | users | phone | role should be set to "Sales Representative" *Needs to be added* |
| Sales rep email | email5__1 | users | email | role should be set to "Sales Representative" |

### PA/Law Information
| Monday Column | Monday Column ID | Database Table | Database Column | Notes |
|---------------|------------------|----------------|-----------------|-------|
| Jp PA/Law | jp_pa_law_name__1 | pa_law | name | *Table needs to be created* |
| PA/Law phone | jp_pa_law_phone__1 | pa_law | phone | *Table needs to be created* |
| Pa/law email | jp_pa_law_email__1 | pa_law | email | *Table needs to be created* |

### Insurance and Claims Information
| Monday Column | Monday Column ID | Database Table | Database Column | Notes |
|---------------|------------------|----------------|-----------------|-------|
| Claim number | claim_number__1 | insurance_claims | claim_number | |
| Policy number | dup__of_text0__1 | policies | policy_number | *Table needs to be created* |
| Insurance company name | text31__1 | insurances | company_name | *Table needs to be created* |
| Insurance company phone number | phone_132__1 | insurances | company_phone | *Table needs to be created* |
| Insurance company email | email05__1 | insurances | company_email | *Table needs to be created* |
| Adjuster number | phone_17__1 | insurances | adjuster_phone | *Map to insurance_claims.adjuster_phone* |
| Adjuster email | email57__1 | insurances | adjuster_email | *Map to insurance_claims.adjuster_email* |

### Storm Information
| Monday Column | Monday Column ID | Database Table | Database Column | Notes |
|---------------|------------------|----------------|-----------------|-------|
| Date of Loss | date_19__1 | storms | date | |

### Property Information
| Monday Column | Monday Column ID | Database Table | Database Column | Notes |
|---------------|------------------|----------------|-----------------|-------|
| measurements | files9__1 | properties | measurements | *Needs to be added* |
| One click codes | files66__1 | properties | one_click_codes | *Needs to be added* |

## SALES STAFF BOARD Mapping
Board ID: 5764059860

### Sales Staff Information
| Monday Column | Monday Column ID | Database Table | Database Column | Notes |
|---------------|------------------|----------------|-----------------|-------|
| FIRST NAME + LAST NAME | text25 + text1 | users | name | Combine first and last name, role should be set to "Sales Staff" |
| RM Email | email7 | users | name | role should be set to "Sales Staff" |
| WRA Email | email__1 | users | name | role should be set to "Sales Staff" |
| TEAM NAME | status_13 | users | monday_team | role should be set to "Sales Staff" |
| IDENTIFICATION FILES | files3 | users | identification_files | role should be set to "Sales Staff" |
| ONBOARDING FILES | files_1 | users | onboarding_files | role should be set to "Sales Staff" |
| SHIRT SIZE | text6 | users | shirt_size | role should be set to "Sales Staff" |
| PHONE | phone | users | phone | role should be set to "Sales Staff" *Needs to be added* |
| ADDRESS | text | users | address | role should be set to "Sales Staff" *Needs to be added* |
| CITY | text2 | users | city | role should be set to "Sales Staff" *Needs to be added* |
| STATE | text5 | users | state | role should be set to "Sales Staff" *Needs to be added* |
| ZIP | text57 | users | zip | role should be set to "Sales Staff" *Needs to be added* |

## Missing Database Tables and Columns

### Tables to Create
1. **pa_law**
   - id (UUID, primary key)
   - name (VARCHAR(255))
   - phone (VARCHAR(50))
   - email (VARCHAR(255))
   - created_at (TIMESTAMP WITH TIME ZONE)
   - updated_at (TIMESTAMP WITH TIME ZONE)

2. **policies**
   - id (UUID, primary key)
   - customer_id (UUID, foreign key to customers.id)
   - policy_number (VARCHAR(100))
   - insurance_id (UUID, foreign key to insurances.id)
   - start_date (DATE)
   - end_date (DATE)
   - coverage_amount (NUMERIC)
   - status (VARCHAR(50))
   - created_at (TIMESTAMP WITH TIME ZONE)
   - updated_at (TIMESTAMP WITH TIME ZONE)

3. **insurances**
   - id (UUID, primary key)
   - company_name (VARCHAR(255))
   - company_phone (VARCHAR(50))
   - company_email (VARCHAR(255))
   - adjuster_name (VARCHAR(255))
   - adjuster_phone (VARCHAR(50))
   - adjuster_email (VARCHAR(255))
   - created_at (TIMESTAMP WITH TIME ZONE)
   - updated_at (TIMESTAMP WITH TIME ZONE)

### Columns to Add to Existing Tables

1. **projects**
   - link (VARCHAR(255))
   - company_cam_link (VARCHAR(255))
   - total_payment (NUMERIC)

2. **users**
   - phone (VARCHAR(50))
   - address (VARCHAR(255))
   - city (VARCHAR(100))
   - state (VARCHAR(2))
   - zip (VARCHAR(10))
   - identification_files (JSONB)
   - onboarding_files (JSONB)
   - shirt_size (VARCHAR(10))

3. **properties**
   - measurements (JSONB)
   - one_click_codes (JSONB)
