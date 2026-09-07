/**
 * Whether the signed-in user counts as an admin.
 *
 * The server decides this by looking for "admin" anywhere in a role name, which is what
 * makes both "superadmin" and "subAdmin" admins. The same test is used here so the app
 * and the server never disagree about who is one.
 *
 * The login response carries the names in user_type; older builds sent a single string,
 * so both shapes are read.
 */
export const isAdminUser = (user: any): boolean => {
  const raw = user?.user_type ?? user?.userType ?? user?.roles_name ?? [];
  const names = Array.isArray(raw) ? raw : [raw];
  return names.some(name => String(name ?? '').toLowerCase().includes('admin'));
};
