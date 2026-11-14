import { Response } from "express";

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
}

export const sendData = <T>(res: Response, data: T, status = 200): void => {
  res.status(status).json({ data });
};

export const sendList = <T>(res: Response, data: T[], meta: PageMeta): void => {
  res.status(200).json({ data, meta });
};

export const sendNoContent = (res: Response): void => {
  res.status(204).send();
};
