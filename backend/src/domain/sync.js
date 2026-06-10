export const SYNC_RESULT = Object.freeze({
  ACCEPTED: 'accepted',
  DUPLICATE: 'duplicate',
  REJECTED: 'rejected',
  CONFLICT: 'conflict'
});

export const RELAY_PACKET_STATE = Object.freeze({
  FIRST_SEEN: 'first_seen',
  UPLOADED: 'uploaded',
  DUPLICATE: 'duplicate',
  REJECTED: 'rejected'
});

export const SYNC_CONTRACT_NOTES = Object.freeze([
  'Delta sync uses server-issued cursors or change tokens.',
  'Relay uploads are idempotent and keyed by packet hash.',
  'Server returns accepted, duplicate, rejected, or conflict per packet.',
  'Offline navigation uses cached graph data and does not call live route APIs.'
]);

export const normalizeCursor = (cursor) => {
  const parsed = Number.parseInt(cursor ?? '0', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};
