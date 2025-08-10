import { TestDatabase } from "./test-database";

async function globalSetup() {
  if (process.env.CI === "true") {
    console.log("Skipping test DB setup");
    return;
  }
  console.log("Running global setup...");

  // Start the PostgreSQL test container
  await TestDatabase.start();

  return async () => {
    console.log("Running global teardown...");
    // Stop and remove the PostgreSQL container
    await TestDatabase.stop();
  };
}

export default globalSetup;
