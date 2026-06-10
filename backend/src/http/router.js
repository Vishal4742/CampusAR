const compilePath = (path) => {
  const names = [];
  const pattern = path
    .split('/')
    .map((part) => {
      if (part.startsWith(':')) {
        names.push(part.slice(1));
        return '([^/]+)';
      }
      return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');

  return {
    names,
    regex: new RegExp(`^${pattern}$`)
  };
};

export const createRouter = (routes) => {
  const compiled = routes.map((route) => ({
    ...route,
    compiled: compilePath(route.path)
  }));

  return {
    match(method, path) {
      for (const route of compiled) {
        if (route.method !== method) {
          continue;
        }

        const match = route.compiled.regex.exec(path);
        if (!match) {
          continue;
        }

        const params = Object.fromEntries(
          route.compiled.names.map((name, index) => [name, decodeURIComponent(match[index + 1])])
        );

        return { route, params };
      }

      return null;
    }
  };
};
