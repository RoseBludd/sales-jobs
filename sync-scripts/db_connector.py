import os
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Dict, List, Any, Optional, Tuple

# Get database connection string from environment
DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://neondb_owner:npg_Y0CM8vIVoilD@ep-young-sun-a52te82c-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require')

class DBConnector:
    def __init__(self, connection_string: Optional[str] = None):
        """Initialize database connector with connection string."""
        self.connection_string = connection_string or DATABASE_URL
        self.conn = None
        self.cursor = None
    
    def connect(self):
        """Establish a connection to the database."""
        try:
            self.conn = psycopg2.connect(self.connection_string)
            self.cursor = self.conn.cursor(cursor_factory=RealDictCursor)
            print("✅ Connected to PostgreSQL database")
        except Exception as e:
            print(f"❌ Error connecting to PostgreSQL database: {str(e)}")
            raise
    
    def disconnect(self):
        """Close the database connection."""
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()
            print("👋 Disconnected from PostgreSQL database")
    
    def execute_query(self, query: str, params: Tuple = None) -> List[Dict[str, Any]]:
        """Execute a query and return results as a list of dictionaries."""
        if not self.conn or self.conn.closed:
            self.connect()
        
        try:
            self.cursor.execute(query, params)
            
            # Check if it's a SELECT query by looking for the RETURNING clause or SELECT keyword
            if query.strip().upper().startswith('SELECT') or 'RETURNING' in query.upper():
                return self.cursor.fetchall()
            else:
                self.conn.commit()
                return []
        except Exception as e:
            self.conn.rollback()
            print(f"❌ Error executing query: {str(e)}")
            raise
    
    def execute_transaction(self, queries: List[Tuple[str, Tuple]]) -> bool:
        """Execute multiple queries as a single transaction."""
        if not self.conn or self.conn.closed:
            self.connect()
        
        try:
            for query, params in queries:
                self.cursor.execute(query, params)
            
            self.conn.commit()
            return True
        except Exception as e:
            self.conn.rollback()
            print(f"❌ Error executing transaction: {str(e)}")
            raise
    
    def get_client(self):
        """Get the connection object for direct usage."""
        if not self.conn or self.conn.closed:
            self.connect()
        return self.conn
    
    def table_exists(self, table_name: str) -> bool:
        """Check if a table exists in the database."""
        query = """
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = %s
        )
        """
        result = self.execute_query(query, (table_name,))
        return result[0]['exists'] if result else False
    
    def create_sync_mapping_table(self):
        """Create the sync_mapping table if it doesn't exist."""
        if not self.table_exists('sync_mapping'):
            query = """
            CREATE TABLE IF NOT EXISTS sync_mapping (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                entity_type VARCHAR(50) NOT NULL,
                system_id UUID NOT NULL,
                monday_id VARCHAR(50) NOT NULL,
                sync_status VARCHAR(20) DEFAULT 'success',
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(entity_type, system_id),
                UNIQUE(entity_type, monday_id)
            );
            
            CREATE INDEX IF NOT EXISTS idx_sync_mapping_entity_system 
            ON sync_mapping(entity_type, system_id);
            
            CREATE INDEX IF NOT EXISTS idx_sync_mapping_entity_monday 
            ON sync_mapping(entity_type, monday_id);
            """
            self.execute_query(query)
            print("✅ Created sync_mapping table")
    
    def create_sync_logs_table(self):
        """Create the sync_logs table if it doesn't exist."""
        if not self.table_exists('sync_logs'):
            query = """
            CREATE TABLE IF NOT EXISTS sync_logs (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                entity_type VARCHAR(50) NOT NULL,
                monday_id VARCHAR(50) NOT NULL,
                operation VARCHAR(20) NOT NULL,
                status VARCHAR(20) NOT NULL,
                error_message TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
            
            CREATE INDEX IF NOT EXISTS idx_sync_logs_entity_monday 
            ON sync_logs(entity_type, monday_id);
            
            CREATE INDEX IF NOT EXISTS idx_sync_logs_status 
            ON sync_logs(status);
            """
            self.execute_query(query)
            print("✅ Created sync_logs table")
    
    def add_sync_mapping(self, entity_type: str, system_id: str, monday_id: str):
        """Add a new mapping between system ID and Monday.com ID."""
        query = """
        INSERT INTO sync_mapping 
        (entity_type, system_id, monday_id) 
        VALUES (%s, %s, %s)
        ON CONFLICT (entity_type, system_id) 
        DO UPDATE SET 
            monday_id = EXCLUDED.monday_id,
            updated_at = NOW()
        RETURNING id
        """
        result = self.execute_query(query, (entity_type, system_id, monday_id))
        return result[0]['id'] if result else None
    
    def get_monday_id(self, entity_type: str, system_id: str) -> Optional[str]:
        """Get the Monday.com ID for a given system entity."""
        query = """
        SELECT monday_id FROM sync_mapping 
        WHERE entity_type = %s AND system_id = %s
        """
        result = self.execute_query(query, (entity_type, system_id))
        return result[0]['monday_id'] if result else None
    
    def get_system_id(self, entity_type: str, monday_id: str) -> Optional[str]:
        """Get the system ID for a given Monday.com entity."""
        query = """
        SELECT system_id FROM sync_mapping 
        WHERE entity_type = %s AND monday_id = %s
        """
        result = self.execute_query(query, (entity_type, monday_id))
        return result[0]['system_id'] if result else None
    
    def log_sync_operation(self, entity_type: str, monday_id: str, operation: str, 
                          status: str, error_message: Optional[str] = None):
        """Log a sync operation."""
        query = """
        INSERT INTO sync_logs 
        (entity_type, monday_id, operation, status, error_message)
        VALUES (%s, %s, %s, %s, %s)
        """
        self.execute_query(query, (entity_type, monday_id, operation, status, error_message))

# Create an instance of the DB connector
db = DBConnector()
