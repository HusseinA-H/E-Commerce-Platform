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
    const passMatch = databaseUrl.match(/password=([^;]+)/);
    if (passMatch) saPassword = passMatch[1];
    const dbMatch = databaseUrl.match(/database=([^;]+)/);
    if (dbMatch) dbName = dbMatch[1];
  }
}

const backupDir = path.join(__dirname, '..', 'backups');
if (!fs.existsSync(backupDir)) {
  console.error(`Backup directory does not exist: ${backupDir}`);
  process.exit(1);
}

// Find backup files
const files = fs.readdirSync(backupDir)
  .filter(f => f.endsWith('.bak'))
  .map(f => ({ name: f, time: fs.statSync(path.join(backupDir, f)).mtime.getTime() }))
  .sort((a, b) => b.time - a.time);

if (files.length === 0) {
  console.error('No database backup files found (*.bak) in the backups/ directory.');
  process.exit(1);
}

// Select the latest file or the one specified in CLI args
const selectedFile = process.argv[2] || files[0].name;
const backupPath = path.join(backupDir, selectedFile);

if (!fs.existsSync(backupPath)) {
  console.error(`Specified backup file does not exist: ${backupPath}`);
  process.exit(1);
}

console.log('==================================================');
console.log('APEX LUXE — Database Restore System');
console.log('==================================================');
console.log(`Database Name: ${dbName}`);
console.log(`Backup File:   ${selectedFile}`);
console.log(`Full Path:     ${backupPath}`);

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
  // Docker not available
}

if (containerName) {
  console.log(`\nFound SQL Server container running: ${containerName}`);
  try {
    console.log('Copying backup file into container...');
    execSync(`docker cp "${backupPath}" ${containerName}:/var/opt/mssql/${selectedFile}`);

    console.log('Terminating active connections and executing restore...');
    const restoreSql = `
      ALTER DATABASE [${dbName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
      RESTORE DATABASE [${dbName}] FROM DISK = '/var/opt/mssql/${selectedFile}' WITH REPLACE;
      ALTER DATABASE [${dbName}] SET MULTI_USER;
    `;
    const sqlCmd = `/opt/mssql-tools18/bin/sqlcmd -S localhost -U SA -P "${saPassword}" -C -Q "${restoreSql}"`;
    execSync(`docker exec -t ${containerName} ${sqlCmd}`, { stdio: 'inherit' });

    console.log('Cleaning up backup file inside container...');
    execSync(`docker exec -t ${containerName} rm -f /var/opt/mssql/${selectedFile}`);

    console.log('\nRestore completed successfully!');
  } catch (err) {
    console.error(`\nRestore failed: ${err.message}`);
    process.exit(1);
  }
} else {
  console.log('\nNo SQL Server container found. Attempting local restore...');
  try {
    const restoreSql = `
      ALTER DATABASE [${dbName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
      RESTORE DATABASE [${dbName}] FROM DISK = '${backupPath}' WITH REPLACE;
      ALTER DATABASE [${dbName}] SET MULTI_USER;
    `;
    const sqlCmd = `sqlcmd -S localhost -U SA -P "${saPassword}" -C -Q "${restoreSql}"`;
    execSync(sqlCmd, { stdio: 'inherit' });
    console.log('\nRestore completed successfully!');
  } catch (err) {
    console.error(`\nRestore failed. Error: ${err.message}`);
    process.exit(1);
  }
}
console.log('==================================================');
