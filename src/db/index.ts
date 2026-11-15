import { drizzle } from 'drizzle-orm/node-postgres';
import * as dotenv from 'dotenv';
import { Pool } from 'pg';
import * as schema from './schema.ts';

dotenv.config();

declare global {
  var _postgresPool: Pool | undefined;
}

export const createPool = () => {
  if (!global._postgresPool) {
    global._postgresPool = new Pool(
      process.env.DATABASE_URL
        ? {
            connectionString: process.env.DATABASE_URL,
            max: 10,
            connectionTimeoutMillis: 15000,
          }
        : {
            host: process.env.SQL_HOST || process.env.PGHOST || 'localhost',
            port: Number(process.env.SQL_PORT || process.env.PGPORT || 5432),
            user: process.env.SQL_USER || process.env.PGUSER,
            password: process.env.SQL_PASSWORD || process.env.PGPASSWORD,
            database: process.env.SQL_DB_NAME || process.env.PGDATABASE,
            max: 10,
            connectionTimeoutMillis: 15000,
          }
    );

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

const pool = createPool();
export const db = drizzle(pool, { schema });

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  firebase_uid TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'Submitter',
  department TEXT DEFAULT 'General',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  category_name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS innovations (
  id SERIAL PRIMARY KEY,
  innovation_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category_id INTEGER REFERENCES categories(id),
  submitter_id INTEGER REFERENCES users(id),
  current_stage TEXT NOT NULL DEFAULT 'submission',
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT NOT NULL DEFAULT 'MEDIUM',
  funding_requested INTEGER DEFAULT 0,
  projected_jobs INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evaluations (
  id SERIAL PRIMARY KEY,
  innovation_id INTEGER NOT NULL REFERENCES innovations(id),
  evaluator_id INTEGER NOT NULL REFERENCES users(id),
  innovation_score INTEGER NOT NULL,
  feasibility_score INTEGER NOT NULL,
  impact_score INTEGER NOT NULL,
  scalability_score INTEGER NOT NULL,
  comments TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS adjudications (
  id SERIAL PRIMARY KEY,
  innovation_id INTEGER NOT NULL REFERENCES innovations(id),
  adjudicator_id INTEGER NOT NULL REFERENCES users(id),
  decision TEXT NOT NULL,
  remarks TEXT NOT NULL,
  decision_date TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS innovation_comments (
  id SERIAL PRIMARY KEY,
  innovation_id INTEGER NOT NULL REFERENCES innovations(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  comment TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS innovation_history (
  id SERIAL PRIMARY KEY,
  innovation_id INTEGER NOT NULL REFERENCES innovations(id),
  action TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  changed_by INTEGER REFERENCES users(id),
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  innovation_id INTEGER NOT NULL REFERENCES innovations(id),
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_by INTEGER REFERENCES users(id),
  upload_date TIMESTAMP DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id INTEGER NOT NULL REFERENCES users(id),
  state_json TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspace_members (
  id SERIAL PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'collaborator',
  status TEXT NOT NULL DEFAULT 'active',
  invite_token TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_invitations (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'Evaluator',
  department TEXT DEFAULT 'General',
  token TEXT NOT NULL UNIQUE,
  workspace_id TEXT,
  invited_by INTEGER REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
`;

export const ensureDatabaseInitialized = async (): Promise<boolean> => {
  const dbName = process.env.SQL_DB_NAME || process.env.PGDATABASE || 'ceda_db';

  const seedInitialData = async () => {
    // 1. Seed the 6 normalized CEDA innovation categories
    const defaultCategories = [
      { categoryName: 'Agriculture', description: 'Smart agriculture, drought-resistant crops, livestock telemetry, and food security.' },
      { categoryName: 'Health', description: 'Telemedicine, diagnostics, pharmaceutical supply chain, and rural healthcare delivery.' },
      { categoryName: 'FinTech', description: 'Digital payments, micro-lending, cross-border remittances, and citizen financial inclusion.' },
      { categoryName: 'Education', description: 'EdTech platforms, vocational training, STEM learning tools, and digital literacy.' },
      { categoryName: 'Energy', description: 'Solar microgrids, clean energy storage, off-grid electrification, and green transition.' },
      { categoryName: 'Public Service', description: 'E-government services, civic infrastructure, water management, and public sector efficiency.' },
    ];

    for (const cat of defaultCategories) {
      await pool.query(
        `INSERT INTO categories (category_name, description)
         VALUES ($1, $2)
         ON CONFLICT (category_name) DO UPDATE SET description = EXCLUDED.description`,
        [cat.categoryName, cat.description]
      );
    }

    // 2. Seed core CEDA RBAC personas if not present
    const defaultUsers = [
      { firebaseUid: 'admin-uid-001', firstName: 'Kabo', lastName: 'Sechele', email: 'admin@ceda.co.bw', role: 'Administrator', department: 'Executive Platform Operations' },
      { firebaseUid: 'evaluator-uid-001', firstName: 'Dr. Monametsi', lastName: 'Tau', email: 'evaluator@ceda.co.bw', role: 'Evaluator', department: 'Technical & Commercial Due Diligence' },
      { firebaseUid: 'adjudicator-uid-001', firstName: 'Hon. Kenalemang', lastName: 'Sechele', email: 'adjudicator@ceda.co.bw', role: 'Adjudicator', department: 'National Innovation Board' },
      { firebaseUid: 'submitter-uid-001', firstName: 'Lesego', lastName: 'Modise', email: 'submitter@ceda.co.bw', role: 'Submitter', department: 'Kalahari SunPower Enterprises' },
      { firebaseUid: 'agent-uid-001', firstName: 'Thabo', lastName: 'Kgosidintsi', email: 'agent.thabo@ceda.co.bw', role: 'Agent', department: 'Citizen Enquiries & Support Desk' },
    ];

    for (const u of defaultUsers) {
      await pool.query(
        `INSERT INTO users (firebase_uid, first_name, last_name, email, role, department)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (email) DO NOTHING`,
        [u.firebaseUid, u.firstName, u.lastName, u.email, u.role, u.department]
      );
    }
  };

  try {
    await pool.query(SCHEMA_SQL);
    await seedInitialData();
    return true;
  } catch (err: any) {
    // Error code 3D000 = database does not exist
    if (err?.code === '3D000') {
      try {
        const adminPool = new Pool({
          host: process.env.SQL_HOST || process.env.PGHOST || 'localhost',
          port: Number(process.env.SQL_PORT || process.env.PGPORT || 5432),
          user: process.env.SQL_USER || process.env.PGUSER || 'postgres',
          password: process.env.SQL_PASSWORD || process.env.PGPASSWORD,
          database: 'postgres',
        });
        await adminPool.query(`CREATE DATABASE "${dbName}"`);
        await adminPool.end();
        await pool.query(SCHEMA_SQL);
        await seedInitialData();
        console.log(`Database "${dbName}" created, schema initialized, and seed data loaded.`);
        return true;
      } catch (createErr: any) {
        console.warn('Could not auto-create database:', createErr?.message || createErr);
        return false;
      }
    }
    console.warn('Database initialization notice:', err?.message || err);
    return false;
  }
};
