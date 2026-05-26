import { http, HttpResponse, delay } from 'msw';
import { mockServers, mockGroups, mockActivity, mockFiles, mockFileContents } from './data';
import type { Server, ActivityEntry, FileEntry } from '../types';

const BASE = import.meta.env.VITE_API_URL ?? '/api';

let servers = [...mockServers];
let activities = [...mockActivity];
const fileStore: Record<string, FileEntry[]> = Object.fromEntries(
  Object.entries(mockFiles).map(([k, v]) => [k, [...v]])
);

let _id = 100;
const uid = () => String(++_id);

export const handlers = [
  // ── Auth ──────────────────────────────────────────────────────────────────
  http.post(`${BASE}/auth/login`, async ({ request }) => {
    await delay(600);
    const body = await request.json() as { username: string; password: string };
    if (body.username === 'admin' && body.password === 'admin') {
      return HttpResponse.json({
        token: 'mock-jwt-token-craftpanel',
        user: { id: 'u1', username: 'admin', name: 'Administrator', role: 'admin' },
      });
    }
    return HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 });
  }),

  // ── Groups ────────────────────────────────────────────────────────────────
  http.get(`${BASE}/groups`, async () => {
    await delay(150);
    return HttpResponse.json(mockGroups);
  }),

  // ── Servers ───────────────────────────────────────────────────────────────
  http.get(`${BASE}/servers`, async () => {
    await delay(300);
    return HttpResponse.json(servers);
  }),

  http.get(`${BASE}/servers/:id`, async ({ params }) => {
    await delay(200);
    const found = servers.find(s => s.id === params.id);
    if (!found) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    return HttpResponse.json(found);
  }),

  http.post(`${BASE}/servers`, async ({ request }) => {
    await delay(500);
    const body = await request.json() as Omit<Server, 'id' | 'status' | 'players' | 'createdAt'>;
    const created: Server = {
      ...body,
      id: uid(),
      status: 'offline',
      players: 0,
      createdAt: new Date().toISOString(),
    };
    servers = [...servers, created];
    return HttpResponse.json(created, { status: 201 });
  }),

  http.put(`${BASE}/servers/:id`, async ({ request, params }) => {
    await delay(400);
    const body = await request.json() as Partial<Server>;
    const idx = servers.findIndex(s => s.id === params.id);
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    servers = servers.map((s, i) => (i === idx ? { ...s, ...body } : s));
    return HttpResponse.json(servers[idx]);
  }),

  http.delete(`${BASE}/servers/:id`, async ({ params }) => {
    await delay(300);
    if (!servers.find(s => s.id === params.id))
      return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    servers = servers.filter(s => s.id !== params.id);
    return new HttpResponse(null, { status: 204 });
  }),

  // ── Activity ──────────────────────────────────────────────────────────────
  http.get(`${BASE}/activity`, async ({ request }) => {
    await delay(300);
    const serverId = new URL(request.url).searchParams.get('serverId');
    const result = serverId ? activities.filter(a => a.serverId === serverId) : activities;
    return HttpResponse.json(
      [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    );
  }),

  http.post(`${BASE}/activity`, async ({ request }) => {
    await delay(150);
    const body = await request.json() as Omit<ActivityEntry, 'id' | 'createdAt'>;
    const entry: ActivityEntry = { ...body, id: uid(), createdAt: new Date().toISOString() };
    activities = [entry, ...activities];
    return HttpResponse.json(entry, { status: 201 });
  }),

  // ── Files ─────────────────────────────────────────────────────────────────
  http.get(`${BASE}/files`, async ({ request }) => {
    await delay(250);
    const serverId = new URL(request.url).searchParams.get('serverId') ?? '';
    return HttpResponse.json(fileStore[serverId] ?? []);
  }),

  http.get(`${BASE}/files/content`, async ({ request }) => {
    await delay(200);
    const path = new URL(request.url).searchParams.get('path') ?? '';
    const content = mockFileContents[path] ?? `# ${path}\n`;
    return HttpResponse.json({ path, content });
  }),

  http.post(`${BASE}/files`, async ({ request }) => {
    await delay(400);
    const body = await request.json() as { serverId: string; name: string; content: string };
    const file: FileEntry = {
      name: body.name, path: body.name, type: 'file',
      size: body.content.length, modified: new Date().toISOString(),
    };
    fileStore[body.serverId] = [...(fileStore[body.serverId] ?? []), file];
    return HttpResponse.json(file, { status: 201 });
  }),

  http.delete(`${BASE}/files`, async ({ request }) => {
    await delay(300);
    const url = new URL(request.url);
    const serverId = url.searchParams.get('serverId') ?? '';
    const path = url.searchParams.get('path') ?? '';
    fileStore[serverId] = (fileStore[serverId] ?? []).filter(f => f.path !== path);
    return new HttpResponse(null, { status: 204 });
  }),
];
