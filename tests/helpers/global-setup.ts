import { TestDatabase } from './test-database'

async function globalSetup() {
  console.log('Running global setup...')
  
  // Start the PostgreSQL test container
  await TestDatabase.start()
  
  // Store the config for tests to use
  process.env.TEST_DB_HOST = TestDatabase.config.host
  process.env.TEST_DB_PORT = TestDatabase.config.port
  process.env.TEST_DB_NAME = TestDatabase.config.database
  process.env.TEST_DB_USER = TestDatabase.config.username
  process.env.TEST_DB_PASS = TestDatabase.config.password
  
  return async () => {
    console.log('Running global teardown...')
    // Stop and remove the PostgreSQL container
    await TestDatabase.stop()
  }
}

export default globalSetup