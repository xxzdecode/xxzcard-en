import { HomeworkWorkerError } from "./errors.ts";

type Claims = Record<string, unknown>;

function asClaims(value: unknown): Claims {
  return value !== null && typeof value === "object" ? value as Claims : {};
}

export function hasTeacherRole(userClaims: unknown): boolean {
  const claims = asClaims(userClaims);
  const appMetadata = asClaims(claims.app_metadata);
  const directRole = appMetadata.role;
  const roles = appMetadata.roles;

  return directRole === "teacher" ||
    (Array.isArray(roles) && roles.includes("teacher"));
}

export function requireTeacher(userClaims: unknown): void {
  if (!hasTeacherRole(userClaims)) {
    throw new HomeworkWorkerError(
      "teacher_access_required",
      403,
      "Teacher authorization is required.",
      false,
    );
  }
}
