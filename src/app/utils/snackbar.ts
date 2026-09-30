export interface CustomSnackbarConfig<D = any> {
  duration?: number;
  verticalPosition: 'top' | 'bottom';
  data?: D | null;
  panelClass: string[];
  icon?: string;
}

export interface SnackbarContent {
  title?: string;
  code?: number;
  snackBarMessageData: SnackBarMessage[];
}

export interface SnackBarMessage {
  message: string;
  panelClasses?: string | string[] | undefined;
  icon?: string;
}

/** Error snack bar */
export const SNACKBARCONFIG_ERROR: CustomSnackbarConfig = {
  duration: 5000,
  verticalPosition: 'top',
  panelClass: ['error'],
  icon: 'error',
};

/** Warn snack bar */
export const SNACKBARCONFIG_WARN: CustomSnackbarConfig = {
  duration: 3000,
  verticalPosition: 'top',
  panelClass: ['warning'],
  icon: 'warning',
};

/** Success snack bar */
export const SNACKBARCONFIG_SUCCESS: CustomSnackbarConfig = {
  duration: 3000,
  verticalPosition: 'top',
  panelClass: ['success'],
  icon: 'done',
};
