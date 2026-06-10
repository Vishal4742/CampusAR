import { badRequest } from '../http/errors.js';
import { normalizeCursor } from '../domain/sync.js';
import { requireUser } from './auth.js';

export const manifest = ({ services }) => ({
  body: services.store.getManifest()
});

export const changes = ({ url, services }) => {
  const cursor = normalizeCursor(url.searchParams.get('since'));
  const changesSince = services.store.getChangesSince(cursor);

  return {
    body: {
      cursor,
      latestChangeId: services.store.getManifest().latestChangeId,
      changes: changesSince
    }
  };
};

export const submitChanges = (context) => {
  const user = requireUser(context);
  const changesInput = context.body.changes;

  if (!Array.isArray(changesInput)) {
    throw badRequest('changes must be an array');
  }

  return {
    statusCode: 202,
    body: {
      results: context.services.store.acceptClientChanges(changesInput, user),
      latestChangeId: context.services.store.getManifest().latestChangeId
    }
  };
};

export const relayPackets = (context) => {
  const user = requireUser(context);
  const packets = context.body.packets;

  if (!Array.isArray(packets)) {
    throw badRequest('packets must be an array');
  }

  return {
    statusCode: 202,
    body: {
      results: context.services.store.acceptRelayPackets(packets, user),
      latestChangeId: context.services.store.getManifest().latestChangeId
    }
  };
};
