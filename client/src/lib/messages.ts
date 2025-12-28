import { toast } from "@/hooks/use-toast";

export type MessageType = "success" | "warning" | "error" | "info";

interface MessageConfig {
  title: string;
  description?: string;
}

/**
 * Show a success message (Green)
 * Use for successful operations like create, update, delete confirmations
 */
export function showSuccessMessage(config: MessageConfig) {
  toast({
    title: config.title,
    description: config.description,
    variant: "success",
  });
}

/**
 * Show a warning message (Yellow)
 * Use for validation errors, warnings, and alerts
 */
export function showWarningMessage(config: MessageConfig) {
  toast({
    title: config.title,
    description: config.description,
    variant: "warning",
  });
}

/**
 * Show an error message (Red)
 * Use for deletion confirmations, critical errors, and dangerous operations
 */
export function showErrorMessage(config: MessageConfig) {
  toast({
    title: config.title,
    description: config.description,
    variant: "destructive",
  });
}

/**
 * Show an info message (Blue)
 * Use for general information, reminders, and neutral updates
 */
export function showInfoMessage(config: MessageConfig) {
  toast({
    title: config.title,
    description: config.description,
    variant: "info",
  });
}

/**
 * Standardized message library for consistent user communication
 */
export const messages = {
  // Success Messages
  success: {
    created: (entity: string) => ({
      title: `${entity} created successfully`,
      description: `The ${entity.toLowerCase()} has been added to the system.`,
    }),
    updated: (entity: string) => ({
      title: `${entity} updated successfully`,
      description: `The ${entity.toLowerCase()} information has been updated.`,
    }),
    deleted: (entity: string) => ({
      title: `${entity} deleted successfully`,
      description: `The ${entity.toLowerCase()} has been removed from the system.`,
    }),
    saved: (entity: string) => ({
      title: `${entity} saved successfully`,
      description: `Your changes have been saved.`,
    }),
    loggedIn: (username?: string) => ({
      title: "Login successful",
      description: username ? `Welcome back, ${username}` : "You have been logged in.",
    }),
    synced: () => ({
      title: "Data refreshed successfully",
      description: "The latest data has been loaded from the server.",
    }),
  },

  // Warning Messages
  warning: {
    validation: (field: string) => ({
      title: "Validation warning",
      description: `Please check the ${field} field.`,
    }),
    required: (field: string) => ({
      title: "Required field",
      description: `The ${field} field is required.`,
    }),
    conflict: (entity: string) => ({
      title: "Conflict detected",
      description: `A ${entity.toLowerCase()} with these details already exists.`,
    }),
    dateRange: () => ({
      title: "Invalid date range",
      description: "The end date must be after the start date.",
    }),
  },

  // Error Messages
  error: {
    failed: (action: string) => ({
      title: `${action} failed`,
      description: "An unexpected error occurred. Please try again.",
    }),
    delete: (entity: string) => ({
      title: `Unable to delete ${entity}`,
      description: `The ${entity.toLowerCase()} could not be removed. Please try again.`,
    }),
    create: (entity: string) => ({
      title: `Unable to create ${entity}`,
      description: `The ${entity.toLowerCase()} could not be created. Please try again.`,
    }),
    update: (entity: string) => ({
      title: `Unable to update ${entity}`,
      description: `The ${entity.toLowerCase()} could not be updated. Please try again.`,
    }),
    fetch: (entity: string) => ({
      title: `Failed to load ${entity}`,
      description: `Unable to retrieve ${entity.toLowerCase()} data. Please try again.`,
    }),
    login: () => ({
      title: "Login failed",
      description: "Invalid username or password. Please try again.",
    }),
    network: () => ({
      title: "Connection error",
      description: "Unable to connect to the server. Please check your connection.",
    }),
    unauthorized: () => ({
      title: "Unauthorized access",
      description: "You do not have permission to perform this action.",
    }),
  },

  // Info Messages
  info: {
    loading: (entity: string) => ({
      title: `Loading ${entity}`,
      description: "Please wait while we retrieve the data.",
    }),
    noData: (entity: string) => ({
      title: `No ${entity} found`,
      description: `There are currently no ${entity.toLowerCase()} to display.`,
    }),
    confirm: (action: string) => ({
      title: "Confirm action",
      description: `Are you sure you want to ${action}?`,
    }),
    inProgress: (action: string) => ({
      title: `${action} in progress`,
      description: "Please wait while this action is being completed.",
    }),
  },
};
