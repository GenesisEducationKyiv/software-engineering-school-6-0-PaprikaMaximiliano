const REPO_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidRepoFormat(repo: string): boolean {
  return REPO_PATTERN.test(repo);
}

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email);
}

export function isValidToken(token: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    token,
  );
}
