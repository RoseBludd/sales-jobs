import db from '../utils/db';

export interface Customer {
  id?: number;
  monday_id: string;
  full_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  created_at?: Date;
  updated_at?: Date;
}

export async function createCustomer(customer: Customer) {
  const { monday_id, full_name, email, phone, address, city, state, zip } = customer;
  
  const query = `
    INSERT INTO customers (
      monday_id, full_name, email, phone, address, city, state, zip
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (monday_id) 
    DO UPDATE SET
      full_name = $2,
      email = $3,
      phone = $4,
      address = $5,
      city = $6,
      state = $7,
      zip = $8,
      updated_at = CURRENT_TIMESTAMP
    RETURNING id, monday_id
  `;
  
  const values = [monday_id, full_name, email, phone, address, city, state, zip];
  
  try {
    const result = await db.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Error creating/updating customer:', error);
    throw error;
  }
}

export async function getCustomerById(id: number) {
  const query = 'SELECT * FROM customers WHERE id = $1';
  
  try {
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting customer by ID:', error);
    throw error;
  }
}

export async function getCustomerByMondayId(mondayId: string) {
  const query = 'SELECT * FROM customers WHERE monday_id = $1';
  
  try {
    const result = await db.query(query, [mondayId]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting customer by Monday ID:', error);
    throw error;
  }
}

export async function getCustomerByEmail(email: string) {
  const query = 'SELECT * FROM customers WHERE email = $1';
  
  try {
    const result = await db.query(query, [email]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting customer by email:', error);
    throw error;
  }
}

export async function getAllCustomers() {
  const query = 'SELECT * FROM customers ORDER BY updated_at DESC';
  
  try {
    const result = await db.query(query);
    return result.rows;
  } catch (error) {
    console.error('Error getting all customers:', error);
    throw error;
  }
}

export async function deleteCustomer(id: number) {
  const query = 'DELETE FROM customers WHERE id = $1 RETURNING id';
  
  try {
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error deleting customer:', error);
    throw error;
  }
}

export default {
  createCustomer,
  getCustomerById,
  getCustomerByMondayId,
  getCustomerByEmail,
  getAllCustomers,
  deleteCustomer
};
