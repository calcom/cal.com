import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";

export type CustomNextApiRequest = NextApiRequest & Request;

export type CustomNextApiResponse = NextApiResponse & Response;
