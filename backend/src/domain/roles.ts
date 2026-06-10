import type { User, UserRole } from '../types.js';

export const USER_ROLES = Object.freeze({
  VISITOR: 'visitor',
  STUDENT: 'student',
  STAFF: 'staff',
  FACULTY: 'faculty',
  VERIFIED_MAPPER: 'verified_mapper',
  ADMIN: 'admin'
} satisfies Record<string, UserRole>);

export const CONTRIBUTION_COOLDOWN_DAYS = 7;

export const VERIFIED_REGISTRATION_ROLES = Object.freeze<UserRole[]>([
  USER_ROLES.STUDENT,
  USER_ROLES.STAFF,
  USER_ROLES.FACULTY
]);

export const ROLE_CAPABILITIES: Readonly<Record<UserRole, readonly string[]>> = Object.freeze({
  [USER_ROLES.VISITOR]: ['navigate'],
  [USER_ROLES.STUDENT]: ['navigate', 'confirm_location', 'buddy_tracking'],
  [USER_ROLES.STAFF]: ['navigate', 'confirm_location', 'faculty_status'],
  [USER_ROLES.FACULTY]: ['navigate', 'confirm_location', 'faculty_status'],
  [USER_ROLES.VERIFIED_MAPPER]: [
    'navigate',
    'confirm_location',
    'add_location',
    'add_path',
    'buddy_tracking'
  ],
  [USER_ROLES.ADMIN]: ['admin_all']
});

export const canContribute = ({
  role,
  verified,
  createdAt,
  now = new Date()
}: {
  role: UserRole;
  verified: boolean;
  createdAt: string;
  now?: Date;
}): boolean => {
  if (role === USER_ROLES.ADMIN) {
    return true;
  }

  if (!verified) {
    return false;
  }

  const created = new Date(createdAt);
  const cooldownEndsAt = new Date(created);
  cooldownEndsAt.setUTCDate(cooldownEndsAt.getUTCDate() + CONTRIBUTION_COOLDOWN_DAYS);

  return now >= cooldownEndsAt;
};

export const isAdmin = (user: User | null | undefined): boolean => user?.primaryRole === USER_ROLES.ADMIN;

export const isVerifiedRole = (role: string): role is UserRole => {
  return VERIFIED_REGISTRATION_ROLES.includes(role as UserRole);
};
