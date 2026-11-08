import { z } from "zod";

export const createRoomSchema = z
  .object({
    displayName: z.string().trim().min(1).max(40),
    passcode: z.string().trim().min(4).max(20).optional(),
    contentSet: z.enum(["demo", "production"]).default("demo"),
    expiresHours: z.number().int().min(1).max(168).default(48),
  })
  .strict();

export const joinRoomSchema = z
  .object({
    code: z.string().trim().length(6),
    displayName: z.string().trim().min(1).max(40),
  })
  .strict();

export const hostActionSchema = z
  .object({
    action: z.enum(["start", "pause", "resume", "finish", "reset-game", "reset-room", "reset-seat", "reorder", "set-game-status"]),
    gameSlug: z.string().max(40).optional(),
    gameOrder: z.array(z.string().max(40)).max(6).optional(),
  })
  .strict();

export const submitAnswerSchema = z
  .object({
    gameSlug: z.string().max(40),
    itemId: z.string().uuid(),
    answer: z.string().max(2000).optional(),
    hintsUsed: z.number().int().min(0).max(5).default(0),
    idempotencyKey: z.string().min(8).max(120),
    /** khusus catch-my-heart: input log untuk replay server */
    inputLog: z.array(z.object({ t: z.number(), x: z.number() })).max(5000).optional(),
  })
  .strict();

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type JoinRoomInput = z.infer<typeof joinRoomSchema>;
export type HostActionInput = z.infer<typeof hostActionSchema>;
export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>;
