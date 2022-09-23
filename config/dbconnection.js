import mysql from 'mysql';
import { DB_HOST, DB_USERNAME, DB_DATABASE_NAME, DB_PASSWORD} from './config';

export const dbconnection = () => {
  return mysql.createConnection({
    host: DB_HOST,
    user: DB_USERNAME,
    password: DB_PASSWORD,
    database: DB_DATABASE_NAME
  })
}