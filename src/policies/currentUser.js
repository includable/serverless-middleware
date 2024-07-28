const currentUser = ({ event }) => {
  const {
    requestContext: { authorizer },
  } = event;
  const { claims } = authorizer.jwt || authorizer; // Dealing with difference between production and sls-offline

  if (!claims || !claims.sub || !claims.sub.length) {
    throw new Error("Unauthorized");
  }

  const claimGroups = claims["cognito:groups"]
    ? claims["cognito:groups"]
    : "[]";
  const groups = Array.isArray(claimGroups) ? claimGroups : claimGroups
    .substring(1, claimGroups.length - 1)
    .split(" ")
    .filter(Boolean);

  function hasGroup(group) {
    return groups.includes(group);
  }

  return {
    ...claims,
    id: claims.sub,
    groups,
    hasGroup,
  };
};

module.exports = currentUser;
