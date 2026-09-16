import { join } from "node:path";
import { OREY_PATHS } from "@/constants/paths";
import { readData, writeData } from "@/utils/data";
import type { Message } from "@/types";
import { randomUUID } from "node:crypto";

export type SessionData = {
    id: string;
    goal: string;
    cwd: string;
    createdAt: string;
    updatedAt: string;
    messages: Message[];
};

export type SessionIndexItem = {
    id: string;
    goal: string;
    cwd: string;
    createdAt: string;
    updatedAt: string;
};

export function generateSessionID(): string {
    return ("orey-session-" + randomUUID());
}

export function getSessionFilePath(id: string): string {
    return join(OREY_PATHS.sessionsDir, `${id}.json`);
}

export function loadSession(id: string): SessionData | null {
    const filePath = getSessionFilePath(id);
    try {
        const data = readData(filePath);
        if (data && data.id) {
            return data as SessionData;
        }
        return null;
    } catch {
        return null;
    }
}

export function saveSession(session: SessionData): void {
    const filePath = getSessionFilePath(session.id);
    session.updatedAt = new Date().toISOString();
    writeData(filePath, session);

    // Update sessions index
    try {
        let indexData: { sessions: SessionIndexItem[] } = { sessions: [] };
        try {
            indexData = readData(OREY_PATHS.sessionsFile);
            if (!indexData || !Array.isArray(indexData.sessions)) {
                indexData = { sessions: [] };
            }
        } catch {
            indexData = { sessions: [] };
        }

        const existingIdx = indexData.sessions.findIndex((s) => s.id === session.id);
        const indexItem: SessionIndexItem = {
            id: session.id,
            goal: session.goal,
            cwd: session.cwd,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
        };

        if (existingIdx >= 0) {
            indexData.sessions[existingIdx] = indexItem;
        } else {
            indexData.sessions.push(indexItem);
        }

        writeData(OREY_PATHS.sessionsFile, indexData);
    } catch (err) {
        console.error("Failed to update sessions index:", err);
    }
}

export function createSessionRecord(goal: string, cwd: string): SessionData {
    const id = generateSessionID();
    const now = new Date().toISOString();
    const session: SessionData = {
        id,
        goal,
        cwd,
        createdAt: now,
        updatedAt: now,
        messages: [],
    };
    saveSession(session);
    return session;
}
