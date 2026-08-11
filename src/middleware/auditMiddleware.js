import { prisma } from '../config/database.js';

export async function auditLogMiddleware(action, entity, getEntityId, getOldData, getNewData) {
  return async (req, res, next) => {
    const originalSend = res.send;
    const oldData = getOldData ? await getOldData(req) : null;

    res.send = function (body) {
      const response = JSON.parse(body);
      const newData = getNewData ? getNewData(req, response) : null;
      const entityId = getEntityId(req, response);

      if (entityId && response.success) {
        prisma.auditLog.create({
          data: {
            userId: req.user?.id,
            action,
            entity,
            entityId,
            oldData,
            newData,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
          },
        }).catch(() => {});
      }

      return originalSend.call(this, body);
    };

    next();
  };
}

export async function createAuditLog(userId, action, entity, entityId, oldData, newData, req) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      entity,
      entityId,
      oldData,
      newData,
      ipAddress: req?.ip,
      userAgent: req?.get('user-agent'),
    },
  });
}