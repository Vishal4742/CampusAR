export const USER_ROLES = Object.freeze({
  VISITOR: 'visitor',
  STUDENT: 'student',
  STAFF: 'staff',
  FACULTY: 'faculty',
  VERIFIED_MAPPER: 'verified_mapper',
  ADMIN: 'admin'
});

export const CONTRIBUTION_COOLDOWN_DAYS = 7;

export const VERIFIED_REGISTRATION_ROLES = Object.freeze([
  USER_ROLES.STUDENT,
  USER_ROLES.STAFF,
  USER_ROLES.FACULTY
]);

export const ROLE_CAPABILITIES = Object.freeze({
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

export const canContribute = ({ role, verified, createdAt, now = new Date() }) => {
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

export const isAdmin = (user) => user?.primaryRole === USER_ROLES.ADMIN;

export const isVerifiedRole = (role) => VERIFIED_REGISTRATION_ROLES.includes(role);
