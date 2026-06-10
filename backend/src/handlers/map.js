export const buildings = ({ services }) => ({ body: { buildings: services.store.campus.buildings } });
export const floors = ({ services }) => ({ body: { floors: services.store.campus.floors } });
export const locations = ({ services }) => ({ body: { locations: services.store.campus.locations } });
export const edges = ({ services }) => ({ body: { edges: services.store.campus.edges } });
export const qrAnchors = ({ services }) => ({ body: { qrAnchors: services.store.campus.qrAnchors } });
