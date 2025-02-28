import db from '../utils/db';

export interface Project {
  id?: number;
  monday_id: string;
  job_progress_link?: string;
  job_progress_name?: string;
  job_progress_description?: string;
  company_cam_link?: string;
  total_price?: number;
  total_payment?: number;
  created_at?: Date;
  updated_at?: Date;
}

export async function createProject(project: Project) {
  const { monday_id, job_progress_link, job_progress_name, job_progress_description, 
          company_cam_link, total_price, total_payment } = project;
  
  const query = `
    INSERT INTO projects (
      monday_id, job_progress_link, job_progress_name, job_progress_description,
      company_cam_link, total_price, total_payment
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (monday_id) 
    DO UPDATE SET
      job_progress_link = $2,
      job_progress_name = $3,
      job_progress_description = $4,
      company_cam_link = $5,
      total_price = $6,
      total_payment = $7,
      updated_at = CURRENT_TIMESTAMP
    RETURNING id, monday_id
  `;
  
  const values = [
    monday_id, job_progress_link, job_progress_name, job_progress_description,
    company_cam_link, total_price, total_payment
  ];
  
  try {
    const result = await db.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Error creating/updating project:', error);
    throw error;
  }
}

export async function getProjectById(id: number) {
  const query = 'SELECT * FROM projects WHERE id = $1';
  
  try {
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting project by ID:', error);
    throw error;
  }
}

export async function getProjectByMondayId(mondayId: string) {
  const query = 'SELECT * FROM projects WHERE monday_id = $1';
  
  try {
    const result = await db.query(query, [mondayId]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting project by Monday ID:', error);
    throw error;
  }
}

export async function getAllProjects() {
  const query = 'SELECT * FROM projects ORDER BY updated_at DESC';
  
  try {
    const result = await db.query(query);
    return result.rows;
  } catch (error) {
    console.error('Error getting all projects:', error);
    throw error;
  }
}

export async function deleteProject(id: number) {
  const query = 'DELETE FROM projects WHERE id = $1 RETURNING id';
  
  try {
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error deleting project:', error);
    throw error;
  }
}

export default {
  createProject,
  getProjectById,
  getProjectByMondayId,
  getAllProjects,
  deleteProject
};
