import { ensureDatabaseInitialized } from './index.ts';

const run = async () => {
  const ok = await ensureDatabaseInitialized();
  if (ok) {
    console.log('✅ PostgreSQL ceda_db schema and seed data verified.');
    process.exit(0);
  } else {
    console.error('❌ Failed to initialize PostgreSQL ceda_db.');
    process.exit(1);
  }
};

run();

