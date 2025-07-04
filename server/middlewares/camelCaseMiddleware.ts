import camelcaseKeys from 'camelcase-keys';
import { Request, Response, NextFunction } from 'express';

export function camelCaseResponseMiddleware(req: Request, res: Response, next: NextFunction) {
  const oldJson = res.json;

  res.json = function (data: any) {
    const camelCasedData = camelcaseKeys(data, { deep: true });
    return oldJson.call(this, camelCasedData);
  };

  next();
}
