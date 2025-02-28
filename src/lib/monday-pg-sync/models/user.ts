import db from '../utils/db';

export interface User {
  id?: number;
  monday_id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  shirt_size?: string;
  role?: string;
  team_id?: number;
  created_at?: Date;
  updated_at?: Date;
}

export async function createUser(user: User) {
  const { monday_id, first_name, last_name, email, phone, address, city, state, zip, shirt_size, role, team_id } = user;
  
  const query = `
    INSERT INTO users (
      monday_id, first_name, last_name, email, phone, address, city, state, zip, shirt_size, role, team_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    ON CONFLICT (monday_id) 
    DO UPDATE SET
      first_name = $2,
      last_name = $3,
      email = $4,
      phone = $5,
      address = $6,
      city = $7,
      state = $8,
      zip = $9,
      shirt_size = $10,
      role = $11,
      team_id = $12,
      updated_at = CURRENT_TIMESTAMP
    RETURNING id, monday_id
  `;
  
  const values = [monday_id, first_name, last_name, email, phone, address, city, state, zip, shirt_size, role, team_id];
  
  try {
    const result = await db.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Error creating/updating user:', error);
    throw error;
  }
}

export async function getUserById(id: number) {
  const query = 'SELECT * FROM users WHERE id = $1';
  
  try {
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting user by ID:', error);
    throw error;
  }
}

export async function getUserByMondayId(mondayId: string) {
  const query = 'SELECT * FROM users WHERE monday_id = $1';
  
  try {
    const result = await db.query(query, [mondayId]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting user by Monday ID:', error);
    throw error;
  }
}

export async function getUserByEmail(email: string) {
  const query = 'SELECT * FROM users WHERE email = $1';
  
  try {
    const result = await db.query(query, [email]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting user by email:', error);
    throw error;
  }
}

export async function getAllUsers() {
  const query = 'SELECT * FROM users ORDER BY updated_at DESC';
  
  try {
    const result = await db.query(query);
    return result.rows;
  } catch (error) {
    console.error('Error getting all users:', error);
    throw error;
  }
}

export async function getUsersByTeamId(teamId: number) {
  const query = 'SELECT * FROM users WHERE team_id = $1 ORDER BY updated_at DESC';
  
  try {
    const result = await db.query(query, [teamId]);
    return result.rows;
  } catch (error) {
    console.error('Error getting users by team ID:', error);
    throw error;
  }
}

export async function deleteUser(id: number) {
  const query = 'DELETE FROM users WHERE id = $1 RETURNING id';
  
  try {
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}

export async function assignUserToProject(userId: number, projectId: number, role: string) {
  const query = `
    INSERT INTO project_users (project_id, user_id, role)
    VALUES ($1, $2, $3)
    ON CONFLICT (project_id, user_id, role) 
    DO UPDATE SET
      updated_at = CURRENT_TIMESTAMP
    RETURNING id
  `;
  
  try {
    const result = await db.query(query, [projectId, userId, role]);
    return result.rows[0];
  } catch (error) {
    console.error('Error assigning user to project:', error);
    throw error;
  }
}

export default {
  createUser,
  getUserById,
  getUserByMondayId,
  getUserByEmail,
  getAllUsers,
  getUsersByTeamId,
  deleteUser,
  assignUserToProject
};
