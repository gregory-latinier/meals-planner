export type AuthFormState = {
  ok: boolean;
  error?: string;
  message?: string;
};

export const initialAuthFormState: AuthFormState = {
  ok: false,
};
