-- ============================================================================
-- CEDA Innovation Canvas OS — Normalized PostgreSQL Schema (ceda_db)
-- ============================================================================

-- 1. Users Table (Stores Firebase Authentication UID)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  firebase_uid TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'Submitter',
  department TEXT DEFAULT 'General',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Categories Table (Agriculture, Health, FinTech, Education, Energy, Public Service)
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  category_name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL
);

-- 3. Innovations Table
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

-- 4. Evaluations Table
CREATE TABLE IF NOT EXISTS evaluations (
  id SERIAL PRIMARY KEY,
  innovation_id INTEGER NOT NULL REFERENCES innovations(id) ON DELETE CASCADE,
  evaluator_id INTEGER NOT NULL REFERENCES users(id),
  innovation_score INTEGER NOT NULL CHECK (innovation_score BETWEEN 1 AND 10),
  feasibility_score INTEGER NOT NULL CHECK (feasibility_score BETWEEN 1 AND 10),
  impact_score INTEGER NOT NULL CHECK (impact_score BETWEEN 1 AND 10),
  scalability_score INTEGER NOT NULL CHECK (scalability_score BETWEEN 1 AND 10),
  comments TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Adjudications Table
CREATE TABLE IF NOT EXISTS adjudications (
  id SERIAL PRIMARY KEY,
  innovation_id INTEGER NOT NULL REFERENCES innovations(id) ON DELETE CASCADE,
  adjudicator_id INTEGER NOT NULL REFERENCES users(id),
  decision TEXT NOT NULL,
  remarks TEXT NOT NULL,
  decision_date TIMESTAMP DEFAULT NOW()
);

-- 6. Innovation Comments Table
CREATE TABLE IF NOT EXISTS innovation_comments (
  id SERIAL PRIMARY KEY,
  innovation_id INTEGER NOT NULL REFERENCES innovations(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  comment TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 7. Innovation History Table
CREATE TABLE IF NOT EXISTS innovation_history (
  id SERIAL PRIMARY KEY,
  innovation_id INTEGER NOT NULL REFERENCES innovations(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  changed_by INTEGER REFERENCES users(id),
  timestamp TIMESTAMP DEFAULT NOW()
);

-- 8. Documents Table
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  innovation_id INTEGER NOT NULL REFERENCES innovations(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_by INTEGER REFERENCES users(id),
  upload_date TIMESTAMP DEFAULT NOW()
);

-- Seed Default Categories
INSERT INTO categories (category_name, description) VALUES
  ('Agriculture', 'Smart agriculture, drought-resistant crops, livestock telemetry, and food security.'),
  ('Health', 'Telemedicine, diagnostics, pharmaceutical supply chain, and rural healthcare delivery.'),
  ('FinTech', 'Digital payments, micro-lending, cross-border remittances, and citizen financial inclusion.'),
  ('Education', 'EdTech platforms, vocational training, STEM learning tools, and digital literacy.'),
  ('Energy', 'Solar microgrids, clean energy storage, off-grid electrification, and green transition.'),
  ('Public Service', 'E-government services, civic infrastructure, water management, and public sector efficiency.')
ON CONFLICT (category_name) DO UPDATE SET description = EXCLUDED.description;

