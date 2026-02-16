/**
 * Load .env from monorepo root. Must be imported first so env is set
 * before @clawcontractbook/database is loaded.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '../../../.env') });
config({ path: path.resolve(__dirname, '../../apps/web/.env') });
