import { configurationStatus } from "../src/lib/config.js";

const status = configurationStatus();
if (!status.ready) {
  console.error(`Configuration is incomplete: ${status.fields.join(", ")}`);
  process.exitCode = 1;
} else {
  console.log(`Configuration is ready for ${status.config.APP_ENV}.`);
}
