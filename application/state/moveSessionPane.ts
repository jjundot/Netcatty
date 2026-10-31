import type { TerminalSession, Workspace } from '../../domain/models';
import {
  collectSessionIds,
  insertPaneIntoWorkspace,
  movePaneInWorkspace,
  type SplitHint,
} from '../../domain/workspace';
import { detachSessionFromWorkspaceState } from './sessionWorkspaceDetach';

interface MoveSessionPaneOptions {
  sessions: TerminalSession[];
  workspaces: Workspace[];
  sessionId: string;
  targetWorkspaceId: string;
  hint: SplitHint;
}

export function moveSessionPaneState({
  sessions, workspaces, sessionId, targetWorkspaceId, hint,
}: MoveSessionPaneOptions) {
  const session = sessions.find((item) => item.id === sessionId);
  const target = workspaces.find((item) => item.id === targetWorkspaceId);
  if (!session || !target || !hint.targetSessionId || sessionId === hint.targetSessionId
    || !collectSessionIds(target.root).includes(hint.targetSessionId)) {
    return { changed: false, sessions, workspaces };
  }

  if (session.workspaceId === targetWorkspaceId) {
    const root = movePaneInWorkspace(target.root, sessionId, hint);
    if (root === target.root) return { changed: false, sessions, workspaces };
    return {
      changed: true,
      sessions,
      workspaces: workspaces.map((item) => item.id === targetWorkspaceId
        ? { ...item, root, focusedSessionId: sessionId }
        : item),
    };
  }

  const detached = session.workspaceId
    ? detachSessionFromWorkspaceState({ sessions, workspaces, sessionId })
    : { changed: false, sessions, workspaces, dissolvedWorkspaceId: undefined, replacementTabIds: undefined };
  if (session.workspaceId && !detached.changed) {
    return { changed: false, sessions, workspaces };
  }
  const targetAfterDetach = detached.workspaces.find((item) => item.id === targetWorkspaceId);
  if (!targetAfterDetach) return { changed: false, sessions, workspaces };

  return {
    changed: true,
    sessions: detached.sessions.map((item) => item.id === sessionId
      ? { ...item, workspaceId: targetWorkspaceId }
      : item),
    workspaces: detached.workspaces.map((item) => item.id === targetWorkspaceId
      ? {
          ...item,
          root: insertPaneIntoWorkspace(item.root, sessionId, hint),
          focusedSessionId: sessionId,
          focusSessionOrder: [...(item.focusSessionOrder ?? collectSessionIds(item.root)), sessionId],
        }
      : item),
    dissolvedWorkspaceId: detached.dissolvedWorkspaceId,
    replacementTabIds: detached.replacementTabIds,
  };
}
