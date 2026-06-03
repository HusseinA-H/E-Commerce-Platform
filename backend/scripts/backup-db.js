const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.join(__dirname, '..', '.env');
let databaseUrl = 'sqlserver://localhost:1433;database=apexluxe;user=SA;password=StrongPassword123!';
let saPassword = 'StrongPassword123!';
let dbName = 'apexluxe';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const dbUrlMatch = envContent.match(/DATABASE_URL=["']?([^"'\n]+)/);
  if (dbUrlMatch) {
    databaseUrl = dbUrlMatch[1];
    // Extract password and DB name from connection string
    // Format: sqlserver://localhost:1433;database=apexluxe;user=SA;password=StrongPassword123!;...
    const passMatch = databaseUrl.match(/password=([^;]+)/);
    if (passMatch) saPassword = passMatch[1];
    const dbMatch = databaseUrl.match(/database=([^;]+)/);
    if (dbMatch) dbName = dbMatch[1];
  }
}

const backupDir = path.join(__dirname, '..', 'backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFilename = `${dbName}-backup-${timestamp}.bak`;
const backupPath = path.join(backupDir, backupFilename);

console.log('==================================================');
console.log('APEX LUXE — Database Backup System');
console.log('==================================================');
console.log(`Database Name: ${dbName}`);
console.log(`Target Output: ${backupPath}`);

// Check if docker mssql container is running
let containerName = null;
try {
  const runningContainers = execSync('docker ps --format "{{.Names}}"').toString();
  if (runningContainers.includes('apex_luxe_mssql')) {
    containerName = 'apex_luxe_mssql';
  } else if (runningContainers.includes('apex-luxe-mssql')) {
    containerName = 'apex-luxe-mssql';
  }
} catch (e) {
  // Docker not available or not running
}

if (containerName) {
  console.log(`\nFound SQL Server container running: ${containerName}`);
  try {
    console.log('Executing database backup inside container...');
    const sqlCmd = `/opt/mssql-tools18/bin/sqlcmd -S localhost -U SA -P "${saPassword}" -C -Q "BACKUP DATABASE [${dbName}] TO DISK = '/var/opt/mssql/${backupFilename}' WITH FORMAT, INIT, SKIP, NOFORMAT, NOHEADER, COPY_ONLY;"`;
    execSync(`docker exec -t ${containerName} ${sqlCmd}`, { stdio: 'inherit' });
    
    console.log('Copying backup file from container to host...');
    execSync(`docker cp ${containerName}:/var/opt/mssql/${backupFilename} "${backupPath}"`);
    
    console.log('Cleaning up backup file inside container...');
    execSync(`docker exec -t ${containerName} rm -f /var/opt/mssql/${backupFilename}`);
    
    console.log(`\nBackup completed successfully! Saved as: ${backupFilename}`);
  } catch (err) {
    console.error(`\nBackup failed: ${err.message}`);
    process.exit(1);
  }
} else {
  console.log('\nNo SQL Server container found. Attempting local backup...');
  try {
    const sqlCmd = `sqlcmd -S localhost -U SA -P "${saPassword}" -C -Q "BACKUP DATABASE [${dbName}] TO DISK = '${backupPath}' WITH FORMAT, INIT, COPY_ONLY;"`;
    execSync(sqlCmd, { stdio: 'inherit' });
    console.log(`\nBackup completed successfully! Saved as: ${backupFilename}`);
  } catch (err) {
    console.error(`\nBackup failed. Please ensure sqlcmd is on your PATH or SQL Server container is running. Error: ${err.message}`);
    process.exit(1);
  }
}
console.log('==================================================');
