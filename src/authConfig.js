const getRedirectUri = () => {
  if (typeof window !== 'undefined' && window.location) {
    return `${window.location.origin}/auth/callback`;
  }
  return '/auth/callback';
};

export const msalConfig = {
  auth: {
    clientId: '88c1fb59-25ac-44b3-af4c-d6da6b309c3f',
    authority: 'https://login.microsoftonline.com/a7fdc8c0-f597-4c07-9e01-344a32000d20',
    redirectUri: getRedirectUri(),
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
};

export const loginRequest = {
  scopes: ['User.Read', 'User.ReadBasic.All', 'GroupMember.Read.All', 'openid', 'profile'],
};

