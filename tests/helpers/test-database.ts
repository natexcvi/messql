import { execSync } from 'child_process'

export interface TestDatabaseConfig {
  host: string
  port: string
  database: string
  username: string
  password: string
}

export class TestDatabase {
  private static containerName = 'messql-test-postgres'
  private static containerPort = '5433' // Use non-standard port to avoid conflicts
  
  static readonly config: TestDatabaseConfig = {
    host: 'localhost',
    port: TestDatabase.containerPort,
    database: 'world-db',
    username: 'world',
    password: 'world123'
  }

  static async start(): Promise<void> {
    console.log('Starting PostgreSQL test container...')
    
    // Check if container already exists
    try {
      execSync(`docker ps -a | grep ${this.containerName}`, { stdio: 'ignore' })
      // Container exists, remove it
      console.log('Removing existing test container...')
      execSync(`docker rm -f ${this.containerName}`, { stdio: 'inherit' })
    } catch {
      // Container doesn't exist, that's fine
    }

    // Start the container
    const command = [
      'docker run',
      '--name', this.containerName,
      '-e', `POSTGRES_USER=${this.config.username}`,
      '-e', `POSTGRES_PASSWORD=${this.config.password}`,
      '-e', `POSTGRES_DB=${this.config.database}`,
      '-p', `${this.containerPort}:5432`,
      '-d',
      'ghusta/postgres-world-db:2.11'
    ].join(' ')

    execSync(command, { stdio: 'inherit' })
    
    // Wait for PostgreSQL to be ready
    console.log('Waiting for PostgreSQL to be ready...')
    await this.waitForDatabase()
    console.log('PostgreSQL test container is ready!')
  }

  static async stop(): Promise<void> {
    console.log('Stopping PostgreSQL test container...')
    try {
      execSync(`docker stop ${this.containerName}`, { stdio: 'inherit' })
      execSync(`docker rm ${this.containerName}`, { stdio: 'inherit' })
      console.log('PostgreSQL test container stopped and removed.')
    } catch (error) {
      console.warn('Failed to stop test container:', error)
    }
  }

  private static async waitForDatabase(maxAttempts = 30): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        // Try to connect using psql
        const psqlCommand = [
          'docker exec', this.containerName,
          'psql',
          '-U', this.config.username,
          '-d', this.config.database,
          '-c', '"SELECT 1"'
        ].join(' ')
        
        execSync(psqlCommand, { stdio: 'ignore' })
        return // Success!
      } catch {
        // Not ready yet
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    throw new Error('PostgreSQL container failed to start within timeout')
  }

  static getConnectionName(testName: string): string {
    // Generate unique connection name for each test
    return `Test Connection - ${testName} - ${Date.now()}`
  }
}