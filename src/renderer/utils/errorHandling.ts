/**
 * Extracts the actual error message from IPC-wrapped errors.
 *
 * When errors are thrown in Electron's main process IPC handlers,
 * they get wrapped with "Error invoking remote method 'methodName': " prefix.
 * This function extracts the actual error message for better user experience.
 *
 * @param error - The error object or unknown error
 * @returns The extracted error message
 */
export const extractErrorMessage = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return "Unknown error";
  }

  const message = error.message;

  // Check if this is an IPC-wrapped error
  // Pattern: "Error invoking remote method 'methodName': actualError"
  const ipcErrorPattern = /^Error invoking remote method '[^']+': (.+)$/;
  const match = message.match(ipcErrorPattern);

  if (match && match[1]) {
    if (match[1].startsWith("Error: ")) {
      return match[1].slice(7);
    }
    return match[1];
  }

  return message;
};
