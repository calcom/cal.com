export default function _validationFailure(errors) {
  console.error("❌ Invalid environment variables:\n", ...errors);
  if (process.env.CRASH_ON_INVALID_ENV_VARS === "true") {
    throw new Error("Invalid environment variables");
  } else {
    console.error(
      "Continuing with invalid environment variables. This is not recommended. Set CRASH_ON_INVALID_ENV_VARS to 'true' to crash the build on invalid environment variables."
    );
  }
}
