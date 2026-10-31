import assert from 'node:assert/strict';
import test from 'node:test';
import type { TerminalSession, Workspace } from '../../domain/models';
import { collectSessionIds } from '../../domain/workspace';
import { moveSessionPaneState } from './moveSessionPane';

const pane = (id: string) => ({ id: `pane-${id}`, type: 'pane' as const, sessionId: id });
const workspace = (id: string, ids: string[]): Workspace => ({
  id,
  title: id,
  root: { id: `split-${id}`, type: 'split', direction: 'vertical', children: ids.map(pane) },
  focusedSessionId: ids[0],
  focusSessionOrder: ids,
});
const session = (id: string, workspaceId?: string) => ({ id, workspaceId } as TerminalSession);
const hint = { direction: 'vertical' as const, position: 'right' as const, targetSessionId: 'b' };

test('moves a pane within a workspace while retaining its session', () => {
  const sessions = [session('a', 'one'), session('b', 'one'), session('c', 'one')];
  const workspaces = [workspace('one', ['a', 'b', 'c'])];
  const result = moveSessionPaneState({ sessions, workspaces, sessionId: 'a', targetWorkspaceId: 'one', hint });
  assert.equal(result.changed, true);
  assert.equal(result.sessions, sessions);
  assert.deepEqual(collectSessionIds(result.workspaces[0].root), ['b', 'a', 'c']);
  assert.deepEqual(collectSessionIds(workspaces[0].root), ['a', 'b', 'c']);
});

test('moves a pane across workspaces and dissolves a two-pane source', () => {
  const sessions = [session('a', 'source'), session('c', 'source'), session('b', 'target'), session('d', 'target')];
  const workspaces = [workspace('source', ['a', 'c']), workspace('target', ['b', 'd'])];
  const result = moveSessionPaneState({ sessions, workspaces, sessionId: 'a', targetWorkspaceId: 'target', hint });
  assert.equal(result.changed, true);
  assert.equal(result.dissolvedWorkspaceId, 'source');
  assert.deepEqual(result.replacementTabIds, ['a', 'c']);
  assert.equal(result.workspaces.some((item) => item.id === 'source'), false);
  assert.deepEqual(collectSessionIds(result.workspaces[0].root), ['b', 'a', 'd']);
  assert.equal(result.sessions.find((item) => item.id === 'a')?.workspaceId, 'target');
  assert.equal(result.sessions.find((item) => item.id === 'c')?.workspaceId, undefined);
});

test('ignores a drop onto the source pane', () => {
  const sessions = [session('a', 'one'), session('b', 'one')];
  const workspaces = [workspace('one', ['a', 'b'])];
  const result = moveSessionPaneState({
    sessions, workspaces, sessionId: 'a', targetWorkspaceId: 'one',
    hint: { ...hint, targetSessionId: 'a' },
  });
  assert.equal(result.changed, false);
  assert.equal(result.workspaces, workspaces);
});
