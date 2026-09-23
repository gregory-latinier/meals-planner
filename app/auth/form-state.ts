export type AuthFormState = {
  ok: boolean;
  error?: string;
  message?: string;
  nextHref?: string;
  nextLabel?: string;
};

export const initialAuthFormState: AuthFormState = {
  ok: false,
};
