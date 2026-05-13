export function sanitizeUser<T extends Record<string, any>>(user: T) {
  if (!user) {
    return user;
  }

  const { password: _password, refreshTokenHash: _refreshTokenHash, ...safeUser } = user;
  return safeUser;
}
