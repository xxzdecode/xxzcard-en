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

export function teacherUserId(userClaims: unknown): string {
  requireTeacher(userClaims);
  const subject = asClaims(userClaims).sub;
  if (
    typeof subject !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(subject)
  ) {
    throw new HomeworkWorkerError(
      "teacher_identity_invalid",
      403,
      "The teacher identity is invalid.",
      false,
    );
  }
  return subject;
}
