import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../utils/prisma";
import { sendSuccess, sendError, sendPaginated } from "../utils/response";

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(1000).optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  dueDate: z.string().datetime().optional().nullable(),
});

export const updateTaskSchema = createTaskSchema.partial();

export async function getTasks(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user!.id;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
  const status = req.query.status as string | undefined;
  const search = (req.query.search as string) || "";
  const priority = req.query.priority as string | undefined;

  const where: Record<string, unknown> = { userId };
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (search) where.title = { contains: search };

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
    prisma.task.count({ where }),
  ]);

  sendPaginated(res, tasks, total, page, limit);
}

export async function getTask(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = (req as any).user!.id;
  const task = await prisma.task.findFirst({ where: { id, userId } });
  if (!task) { sendError(res, "Task not found", 404); return; }
  sendSuccess(res, task);
}

export async function createTask(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user!.id;
  const { title, description, status, priority, dueDate } = req.body;
  const task = await prisma.task.create({
    data: {
      title,
      description,
      status: status || "PENDING",
      priority: priority || "MEDIUM",
      dueDate: dueDate ? new Date(dueDate) : null,
      userId,
    },
  });
  sendSuccess(res, task, "Task created", 201);
}

export async function updateTask(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = (req as any).user!.id;
  const existing = await prisma.task.findFirst({ where: { id, userId } });
  if (!existing) { sendError(res, "Task not found", 404); return; }
  const { title, description, status, priority, dueDate } = req.body;
  const task = await prisma.task.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(status !== undefined && { status }),
      ...(priority !== undefined && { priority }),
      ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
    },
  });
  sendSuccess(res, task, "Task updated");
}

export async function deleteTask(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = (req as any).user!.id;
  const existing = await prisma.task.findFirst({ where: { id, userId } });
  if (!existing) { sendError(res, "Task not found", 404); return; }
  await prisma.task.delete({ where: { id } });
  sendSuccess(res, null, "Task deleted");
}

export async function toggleTask(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = (req as any).user!.id;
  const existing = await prisma.task.findFirst({ where: { id, userId } });
  if (!existing) { sendError(res, "Task not found", 404); return; }
  const newStatus = existing.status === "COMPLETED" ? "PENDING" : "COMPLETED";
  const task = await prisma.task.update({ where: { id }, data: { status: newStatus } });
  sendSuccess(res, task, `Task marked as ${newStatus.toLowerCase()}`);
}
