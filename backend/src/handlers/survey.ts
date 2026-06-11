import type { FastifyRequest } from 'fastify';
import { Type } from '@sinclair/typebox';
import { badRequest } from '../http/errors.js';
import type { Services } from '../services/index.js';
import { requireAdmin } from './admin.js';

export const surveyImportSchema = Type.Object({
  schemaVersion: Type.Optional(Type.Number()),
  campusStableKey: Type.Optional(Type.String()),
  collectedBy: Type.Optional(Type.String()),
  deviceTimeZone: Type.Optional(Type.String()),
  exportedAt: Type.Optional(Type.String()),
  points: Type.Optional(Type.Array(Type.Any())),
  routes: Type.Optional(Type.Array(Type.Any()))
});

type Body = Record<string, unknown>;

export const validateSurveyImport = async (request: FastifyRequest, services: Services, body: Body) => {
  await requireAdmin(request, services);
  return { summary: services.store.validateSurveyImport(body) };
};

export const importSurvey = async (request: FastifyRequest, services: Services, body: Body) => {
  const actor = await requireAdmin(request, services);
  const result = services.store.importSurveyExport(body, actor);
  if (!result.summary.valid) {
    throw badRequest('Survey export is invalid', 'invalid_survey_export');
  }
  services.store.addAudit(actor, 'survey_imported', 'survey_export', 'field_survey', {
    importedLocationCount: result.importedLocations.length,
    importedEdgeCount: result.importedEdges.length,
    warnings: result.summary.warnings
  });
  return result;
};
