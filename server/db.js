import Database from 'better-sqlite3'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dbPath = resolve(__dirname, '..', 'databases', 'dados.db')

const db = new Database(dbPath, { readonly: true, fileMustExist: true })

export default db
