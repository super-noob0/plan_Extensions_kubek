import { Database } from "bun:sqlite";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import type {
  ExtRequest,
  ExtResponse,
  KubekExtensionContext,
} from "@kubekpanel/extension-sdk";

const EXT_ID = "com.example.plan-bridge";
const ONLINE_AFTER_MS = 120_000;
const MAX_RANGE_MS = 31 * 24 * 60 * 60 * 1000;

const PLAN_PERMISSION = {
  view: "ext.plan.view",
  performance: "ext.plan.performance",
  activity: "ext.plan.activity",
  audience: "ext.plan.audience",
  playerDetails: "ext.plan.player-details",
  worlds: "ext.plan.worlds",
  plugins: "ext.plan.plugins",
  extensions: "ext.plan.extensions",
  moderation: "ext.plan.moderation",
  connection: "ext.plan.connection",
  manage: "ext.plan.manage",
} as const;

type PlanPermissionKey = keyof typeof PLAN_PERMISSION;

interface Binding {
  kubek_server_id: string;
  plan_server_uuid: string;
  created_at: number;
  updated_at: number;
}

interface PlanServer {
  id: number;
  uuid: string;
  name: string | null;
  is_installed: number;
  is_proxy: number;
  plan_version: string | null;
}

interface MetricRow {
  date: number;
  tps: number;
  players_online: number;
  cpu_usage: number;
  ram_usage: number;
  entities: number;
  chunks_loaded: number;
  free_disk_space: number;
  // Plan 5.6 does not persist MSPT; this stays null until a dedicated Agent collector is added.
  mspt_average: number | null;
}

interface NetworkPerformanceSeriesRow extends MetricRow {
  server_uuid: string;
  server_name: string | null;
}

interface DatabaseHealth {
  schemaReady: boolean;
  journalMode: string;
  fileSizeBytes: number;
  walSizeBytes: number;
  pageCount: number;
  pageSize: number;
  busyTimeoutMs: number;
  latestMetricAt: number | null;
  latestAgentHeartbeatAt: number | null;
}

interface NetworkSummary {
  players: number;
  sessions: number;
  active_playtime: number;
  deaths: number;
  mob_kills: number;
  online: number;
  average_tps: number | null;
  cpu_usage: number;
  ram_usage: number;
  entities: number;
  chunks_loaded: number;
  free_disk_space: number | null;
}

interface NetworkPlayer {
  uuid: string;
  name: string;
  last_seen: number;
  active_playtime: number;
  deaths: number;
  mob_kills: number;
  server_count: number;
  latest_server_uuid: string | null;
}

interface NetworkSession {
  id: number;
  player_uuid: string;
  player_name: string;
  server_uuid: string;
  server_name: string | null;
  session_start: number;
  session_end: number;
  active_playtime: number;
  afk_time: number;
  deaths: number;
  mob_kills: number;
}

interface NetworkKill {
  id: number;
  killer_uuid: string;
  killer_name: string;
  victim_uuid: string;
  victim_name: string;
  server_uuid: string;
  server_name: string | null;
  weapon: string | null;
  date: number;
}

interface NetworkActivitySummary {
  sessions: number;
  unique_players: number;
  active_playtime: number;
  afk_time: number;
  deaths: number;
  mob_kills: number;
  pvp_kills: number;
  new_players: number;
}

interface PlayerbaseSummary {
  active_players: number;
  new_players: number;
  returning_players: number;
}

interface PlayerbaseTrend {
  date: number;
  active_players: number;
  new_players: number;
}

interface NetworkPlugin {
  plugin_name: string;
  versions: string;
  server_count: number;
  servers: string;
  last_seen: number;
}

interface AgentInventorySnapshot {
  id: number;
  captured_at: number;
  reason: string;
  content_hash: string;
}

interface AgentInventoryItem {
  slot: number;
  item_type: string;
  amount: number;
  metadata: string;
}

interface ExtensionValue {
  plugin_name: string;
  provider_name: string;
  text: string | null;
  group_value: string | null;
  string_value: string | null;
  component_value: string | null;
  double_value: number | null;
  long_value: number | null;
}

interface ExtensionGroup {
  plugin_name: string;
  provider_name: string;
  group_name: string | null;
}

interface KubekLifecycleEvent {
  event: "STARTING" | "RUNNING" | "STOPPED" | "CRASHED";
  at: number;
}

interface AgentServerHeartbeat {
  last_started_at: number;
  last_stopped_at: number;
  last_event: string;
}

interface DescribedServer {
  id: string;
  name: string;
  kubekStatus?: string;
  lastKubekEvent?: KubekLifecycleEvent;
  agentHeartbeat?: AgentServerHeartbeat | null;
  status: "waiting_for_plan" | "not_bound" | "missing" | "connected" | "active";
  binding?: Binding;
  planServer?: PlanServer;
  latest?: MetricRow | null;
  hasRecentMetric?: boolean;
}

let planDb: Database | null = null;
let databasePath = "";
const kubekLifecycleEvents = new Map<string, KubekLifecycleEvent>();
let lifecycleUnsubscribers: Array<() => void> = [];

export async function activate(ctx: KubekExtensionContext): Promise<void> {
  databasePath = join(ctx.dataDir, "plan.sqlite");
  planDb = new Database(databasePath, { create: true });
  planDb.exec("PRAGMA journal_mode = WAL;");
  planDb.exec("PRAGMA foreign_keys = ON;");
  planDb.exec("PRAGMA busy_timeout = 5000;");
  planDb.exec(`
    CREATE TABLE IF NOT EXISTS plan_bridge_bindings (
      kubek_server_id TEXT PRIMARY KEY,
      plan_server_uuid TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_plan_bridge_bindings_uuid
      ON plan_bridge_bindings(plan_server_uuid);
  `);

  ctx.logger.info(`Plan Bridge database opened at ${databasePath}`);

  lifecycleUnsubscribers = [
    ctx.events.on("server.started", ({ serverId }) => recordKubekLifecycle(serverId, "STARTING")),
    ctx.events.on("server.running", ({ serverId }) => recordKubekLifecycle(serverId, "RUNNING")),
    ctx.events.on("server.stopped", ({ serverId }) => recordKubekLifecycle(serverId, "STOPPED")),
    ctx.events.on("server.crashed", ({ serverId }) => recordKubekLifecycle(serverId, "CRASHED")),
  ];

  ctx.http.registerRoutes([
    {
      // This is intentionally the only request made before client data queries.
      // It contains no Plan rows, only booleans derived from Kubek's current user.
      method: "GET",
      path: "/access",
      handler: (req: ExtRequest, res: ExtResponse) => {
        const access = Object.fromEntries(
          (Object.entries(PLAN_PERMISSION) as Array<[PlanPermissionKey, string]>).map(([key, permission]) => [
            key,
            ctx.permissions.has(req.user, permission),
          ]),
        );
        res.json({ access });
      },
    },
    {
      method: "GET",
      path: "/status",
      permission: PLAN_PERMISSION.view,
      handler: (_req: ExtRequest, res: ExtResponse) => {
        const servers = ctx.servers.list().map((server) => describeServer(server.id, server.name, server.status));
        const connected = servers.filter((server) => server.status === "connected" || server.status === "active").length;
        const active = servers.filter((server) => server.status === "active").length;
        res.json({
          schemaReady: hasPlanSchema(),
          connected,
          active,
          total: servers.length,
          updatedAt: Math.max(
            0,
            ...[...kubekLifecycleEvents.values()].map((event) => event.at),
            ...servers.map((server) => Math.max(
              Number(server.agentHeartbeat?.last_started_at ?? 0),
              Number(server.agentHeartbeat?.last_stopped_at ?? 0)
            ))
          ),
          servers,
        });
      },
    },
    {
      method: "GET",
      path: "/health",
      permission: PLAN_PERMISSION.manage,
      handler: (_req: ExtRequest, res: ExtResponse) => {
        res.json(getDatabaseHealth());
      },
    },
    {
      method: "GET",
      path: "/network/performance",
      permission: PLAN_PERMISSION.performance,
      handler: (req: ExtRequest, res: ExtResponse) => {
        const servers = ctx.servers.list().map((server) => describeServer(server.id, server.name, server.status, true));
        const boundUuids = servers
          .map((server) => server.binding?.plan_server_uuid)
          .filter((uuid): uuid is string => Boolean(uuid));
        const now = Date.now();
        // GraphJSONCreator in Plan always returns optimized full history so
        // Highstock can switch 12h/24h/7d/30d/All without another page fetch.
        const allHistory = req.query.all === "true";
        const from = allHistory ? 0 : numberQuery(req.query.from, now - 24 * 60 * 60 * 1000);
        const to = numberQuery(req.query.to, now);
        if (to < from || (!allHistory && to - from > MAX_RANGE_MS)) {
          res.status(400).json({ error: "Requested range is invalid or exceeds 31 days" });
          return;
        }
        const freshMetrics = servers.map((server) => server.latest).filter((metric): metric is MetricRow => Boolean(metric && serverIsFreshMetric(metric)));
        res.json({
          from,
          to,
          current: summarizePerformance(freshMetrics),
          trend: allHistory ? [] : queryNetworkMetrics(boundUuids, from, to),
          series: allHistory ? queryNetworkPerformanceSeriesOptimized(boundUuids, to) : queryNetworkPerformanceSeries(boundUuids, from, to),
        });
      },
    },
    {
      method: "GET",
      path: "/network/activity",
      permission: PLAN_PERMISSION.activity,
      handler: (req: ExtRequest, res: ExtResponse) => {
        const servers = ctx.servers.list().map((server) => describeServer(server.id, server.name));
        const planServerUuids = servers
          .map((server) => server.binding?.plan_server_uuid)
          .filter((uuid): uuid is string => Boolean(uuid));
        const now = Date.now();
        const from = numberQuery(req.query.from, now - 7 * 24 * 60 * 60 * 1000);
        const to = numberQuery(req.query.to, now);
        if (to < from || to - from > MAX_RANGE_MS) {
          res.status(400).json({ error: "Requested range is invalid or exceeds 31 days" });
          return;
        }
        res.json({
          from,
          to,
          summary: queryNetworkActivitySummary(planServerUuids, from, to),
          sessions: queryNetworkSessions(planServerUuids, from, to, 50),
          kills: queryNetworkKills(planServerUuids, from, to, 50),
        });
      },
    },
    {
      method: "GET",
      path: "/network/playerbase",
      permission: PLAN_PERMISSION.audience,
      handler: (req: ExtRequest, res: ExtResponse) => {
        const planServerUuids = ctx.servers.list()
          .map((server) => describeServer(server.id, server.name, server.status).binding?.plan_server_uuid)
          .filter((uuid): uuid is string => Boolean(uuid));
        const now = Date.now();
        const from = numberQuery(req.query.from, now - 30 * 24 * 60 * 60 * 1000);
        const to = numberQuery(req.query.to, now);
        if (to < from || to - from > MAX_RANGE_MS) {
          res.status(400).json({ error: "Requested range is invalid or exceeds 31 days" });
          return;
        }
        res.json({ from, to, summary: queryPlayerbaseSummary(planServerUuids, from, to), trend: queryPlayerbaseTrend(planServerUuids, from, to) });
      },
    },
    {
      method: "GET",
      path: "/network/plugins",
      permission: PLAN_PERMISSION.plugins,
      handler: (_req: ExtRequest, res: ExtResponse) => {
        const planServerUuids = ctx.servers.list()
          .map((server) => describeServer(server.id, server.name, server.status).binding?.plan_server_uuid)
          .filter((uuid): uuid is string => Boolean(uuid));
        res.json({ rows: queryNetworkPlugins(planServerUuids) });
      },
    },
    {
      method: "GET",
      path: "/network/worlds",
      permission: PLAN_PERMISSION.worlds,
      handler: (_req: ExtRequest, res: ExtResponse) => {
        const planServerUuids = boundPlanServerUuids(ctx);
        res.json(queryNetworkWorlds(planServerUuids));
      },
    },
    {
      method: "GET",
      path: "/network/plugin-history",
      permission: PLAN_PERMISSION.plugins,
      handler: (_req: ExtRequest, res: ExtResponse) => {
        res.json({ rows: queryNetworkPluginHistory(boundPlanServerUuids(ctx)) });
      },
    },
    {
      method: "GET",
      path: "/network/moderation",
      permission: PLAN_PERMISSION.moderation,
      handler: (_req: ExtRequest, res: ExtResponse) => {
        res.json({ allowlistBounces: queryAllowlistBounces(boundPlanServerUuids(ctx)) });
      },
    },
    {
      method: "GET",
      path: "/network/extensions",
      permission: PLAN_PERMISSION.extensions,
      handler: (_req: ExtRequest, res: ExtResponse) => {
        res.json({ serverValues: queryServerExtensionValues(boundPlanServerUuids(ctx)) });
      },
    },
    {
      method: "GET",
      path: "/network/players",
      permission: PLAN_PERMISSION.audience,
      handler: (_req: ExtRequest, res: ExtResponse) => {
        const planServerUuids = ctx.servers.list()
          .map((server) => describeServer(server.id, server.name, server.status).binding?.plan_server_uuid)
          .filter((uuid): uuid is string => Boolean(uuid));
        res.json({ rows: queryNetworkPlayers(planServerUuids, 500) });
      },
    },
    {
      method: "GET",
      path: "/network/players/:uuid/extensions",
      permission: PLAN_PERMISSION.extensions,
      handler: (req: ExtRequest, res: ExtResponse) => {
        res.json(queryNetworkPlayerExtensions(boundPlanServerUuids(ctx), req.params.uuid));
      },
    },
    {
      method: "GET",
      path: "/network/players/:uuid/moderation",
      permission: PLAN_PERMISSION.moderation,
      handler: (req: ExtRequest, res: ExtResponse) => {
        res.json(queryPlayerModeration(boundPlanServerUuids(ctx), req.params.uuid));
      },
    },
    {
      method: "GET",
      path: "/network/players/:uuid/connections",
      permission: PLAN_PERMISSION.connection,
      handler: (req: ExtRequest, res: ExtResponse) => {
        res.json(queryPlayerConnections(boundPlanServerUuids(ctx), req.params.uuid));
      },
    },
    {
      method: "GET",
      path: "/network/players/:uuid",
      permission: PLAN_PERMISSION.playerDetails,
      handler: (req: ExtRequest, res: ExtResponse) => {
        const planServerUuids = ctx.servers.list()
          .map((server) => describeServer(server.id, server.name, server.status).binding?.plan_server_uuid)
          .filter((uuid): uuid is string => Boolean(uuid));
        if (!hasPlayerSchema()) {
          res.status(503).json({ error: "Plan player schema is not initialized yet" });
          return;
        }
        const profile = queryNetworkPlayerProfile(planServerUuids, req.params.uuid);
        if (!profile) {
          res.status(404).json({ error: "Player was not found on bound Plan servers" });
          return;
        }
        res.json(profile);
      },
    },
    {
      method: "GET",
      path: "/servers/:id",
      permission: PLAN_PERMISSION.view,
      handler: (req: ExtRequest, res: ExtResponse) => {
        const server = ctx.servers.get(req.params.id);
        if (!server) {
          res.status(404).json({ error: "Kubek server not found" });
          return;
        }
        res.json(describeServer(server.id, server.name, server.status));
      },
    },
    {
      method: "GET",
      path: "/servers/:id/metrics",
      permission: PLAN_PERMISSION.performance,
      handler: (req: ExtRequest, res: ExtResponse) => {
        const binding = getBinding(req.params.id);
        if (!binding) {
          res.status(404).json({ error: "Plan is not bound to this Kubek server" });
          return;
        }
        if (!hasPlanSchema()) {
          res.status(503).json({ error: "Plan schema is not initialized yet" });
          return;
        }
        const now = Date.now();
        const from = numberQuery(req.query.from, now - 24 * 60 * 60 * 1000);
        const to = numberQuery(req.query.to, now);
        if (to < from || to - from > MAX_RANGE_MS) {
          res.status(400).json({ error: "Requested range is invalid or exceeds 31 days" });
          return;
        }
        const rows = queryMetrics(binding.plan_server_uuid, from, to);
        res.json({ serverId: req.params.id, planServerUuid: binding.plan_server_uuid, from, to, rows });
      },
    },
    {
      method: "GET",
      path: "/servers/:id/players",
      permission: PLAN_PERMISSION.audience,
      handler: (req: ExtRequest, res: ExtResponse) => {
        const binding = getBinding(req.params.id);
        if (!binding) {
          res.status(404).json({ error: "Plan is not bound to this Kubek server" });
          return;
        }
        if (!hasPlayerSchema()) {
          res.json({ rows: [] });
          return;
        }
        res.json({ rows: queryPlayers(binding.plan_server_uuid) });
      },
    },
    {
      method: "GET",
      path: "/servers/:id/players/:uuid",
      permission: PLAN_PERMISSION.playerDetails,
      handler: (req: ExtRequest, res: ExtResponse) => {
        const binding = getBinding(req.params.id);
        if (!binding) {
          res.status(404).json({ error: "Plan is not bound to this Kubek server" });
          return;
        }
        if (!hasPlayerSchema()) {
          res.status(503).json({ error: "Plan player schema is not initialized yet" });
          return;
        }
        const profile = queryPlayerProfile(binding.plan_server_uuid, req.params.uuid);
        if (!profile) {
          res.status(404).json({ error: "Player was not found on this Plan server" });
          return;
        }
        res.json(profile);
      },
    },
    {
      method: "GET",
      path: "/configuration",
      permission: PLAN_PERMISSION.manage,
      handler: (_req: ExtRequest, res: ExtResponse) => {
        const servers = ctx.servers.list().map((server) => describeServer(server.id, server.name, server.status));
        res.json({
          databasePath,
          schemaReady: hasPlanSchema(),
          connected: servers.filter((server) => server.status === "connected" || server.status === "active").length,
          active: servers.filter((server) => server.status === "active").length,
          total: servers.length,
          servers,
        });
      },
    },
    {
      method: "GET",
      path: "/plan-servers",
      permission: PLAN_PERMISSION.manage,
      handler: (_req: ExtRequest, res: ExtResponse) => {
        if (!hasPlanSchema()) {
          res.json({ ready: false, servers: [] });
          return;
        }
        res.json({ ready: true, servers: getPlanServers() });
      },
    },
    {
      method: "POST",
      path: "/servers/:id/bind",
      permission: PLAN_PERMISSION.manage,
      handler: (req: ExtRequest, res: ExtResponse) => {
        const kubekServer = ctx.servers.get(req.params.id);
        if (!kubekServer) {
          res.status(404).json({ error: "Kubek server not found" });
          return;
        }
        if (!hasPlanSchema()) {
          res.status(503).json({ error: "Plan has not initialized plan.sqlite yet" });
          return;
        }
        const planServerUuid = String((req.body as { planServerUuid?: string } | null)?.planServerUuid ?? "").trim();
        if (!planServerUuid) {
          res.status(400).json({ error: "planServerUuid is required" });
          return;
        }
        const planServer = getPlanServer(planServerUuid);
        if (!planServer) {
          res.status(404).json({ error: "Unknown Plan server UUID" });
          return;
        }
        upsertBinding(kubekServer.id, planServerUuid);
        res.json({ ok: true, binding: getBinding(kubekServer.id), planServer });
      },
    },
    {
      method: "DELETE",
      path: "/servers/:id/bind",
      permission: PLAN_PERMISSION.manage,
      handler: (req: ExtRequest, res: ExtResponse) => {
        const db = requireDb();
        db.prepare("DELETE FROM plan_bridge_bindings WHERE kubek_server_id = ?").run(req.params.id);
        res.json({ ok: true });
      },
    },
  ]);
}

export async function deactivate(): Promise<void> {
  lifecycleUnsubscribers.forEach((unsubscribe) => unsubscribe());
  lifecycleUnsubscribers = [];
  kubekLifecycleEvents.clear();
  if (planDb) {
    planDb.close();
    planDb = null;
  }
}

function requireDb(): Database {
  if (!planDb) throw new Error("Plan Bridge database is not open");
  return planDb;
}

function hasTable(name: string): boolean {
  return Boolean(requireDb().query("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(name));
}

function hasPlanSchema(): boolean {
  const db = requireDb();
  const table = db
    .query("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'plan_servers'")
    .get() as { name: string } | null;
  const tps = db
    .query("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'plan_tps'")
    .get() as { name: string } | null;
  return Boolean(table && tps);
}

function hasPlayerSchema(): boolean {
  const db = requireDb();
  const users = db
    .query("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'plan_users'")
    .get() as { name: string } | null;
  const sessions = db
    .query("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'plan_sessions'")
    .get() as { name: string } | null;
  return Boolean(users && sessions);
}

function getBinding(kubekServerId: string): Binding | null {
  return requireDb()
    .query("SELECT * FROM plan_bridge_bindings WHERE kubek_server_id = ?")
    .get(kubekServerId) as Binding | null;
}

function upsertBinding(kubekServerId: string, planServerUuid: string): void {
  const now = Date.now();
  requireDb()
    .prepare(`
      INSERT INTO plan_bridge_bindings (kubek_server_id, plan_server_uuid, created_at, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(kubek_server_id) DO UPDATE SET
        plan_server_uuid = excluded.plan_server_uuid,
        updated_at = excluded.updated_at
    `)
    .run(kubekServerId, planServerUuid, now, now);
}

function getPlanServers(): PlanServer[] {
  return requireDb()
    .query("SELECT id, uuid, name, is_installed, is_proxy, plan_version FROM plan_servers ORDER BY name COLLATE NOCASE")
    .all() as PlanServer[];
}

function getPlanServer(uuid: string): PlanServer | null {
  return requireDb()
    .query("SELECT id, uuid, name, is_installed, is_proxy, plan_version FROM plan_servers WHERE uuid = ?")
    .get(uuid) as PlanServer | null;
}

function queryNetworkSummary(planServerUuids: string[], freshMetrics: MetricRow[]): NetworkSummary {
  const empty: NetworkSummary = { players: 0, sessions: 0, active_playtime: 0, deaths: 0, mob_kills: 0, online: 0, average_tps: null, cpu_usage: 0, ram_usage: 0, entities: 0, chunks_loaded: 0, free_disk_space: null };
  if (!hasPlayerSchema() || planServerUuids.length === 0) return empty;
  const placeholders = listPlaceholders(planServerUuids.length);
  const totals = requireDb().query(`
      SELECT COUNT(DISTINCT u.uuid) AS players,
        COUNT(s.id) AS sessions,
        COALESCE(SUM(MAX(0, s.session_end - s.session_start - s.afk_time)), 0) AS active_playtime,
        COALESCE(SUM(s.deaths), 0) AS deaths,
        COALESCE(SUM(s.mob_kills), 0) AS mob_kills
      FROM plan_sessions s
      JOIN plan_users u ON u.id = s.user_id
      JOIN plan_servers server ON server.id = s.server_id
      WHERE server.uuid IN (${placeholders})
    `).get(...planServerUuids) as Omit<NetworkSummary, "online" | "average_tps" | "cpu_usage" | "ram_usage">;
  return { ...totals, ...summarizePerformance(freshMetrics) };
}

function summarizePerformance(freshMetrics: MetricRow[]): Pick<NetworkSummary, "online" | "average_tps" | "cpu_usage" | "ram_usage" | "entities" | "chunks_loaded" | "free_disk_space"> {
  return {
    online: freshMetrics.reduce((sum, metric) => sum + Number(metric.players_online ?? 0), 0),
    average_tps: freshMetrics.length ? freshMetrics.reduce((sum, metric) => sum + Number(metric.tps ?? 0), 0) / freshMetrics.length : null,
    cpu_usage: freshMetrics.reduce((sum, metric) => sum + Number(metric.cpu_usage ?? 0), 0),
    ram_usage: freshMetrics.reduce((sum, metric) => sum + Number(metric.ram_usage ?? 0), 0),
    entities: freshMetrics.reduce((sum, metric) => sum + Number(metric.entities ?? 0), 0),
    chunks_loaded: freshMetrics.reduce((sum, metric) => sum + Number(metric.chunks_loaded ?? 0), 0),
    free_disk_space: freshMetrics.length ? Math.min(...freshMetrics.map((metric) => Number(metric.free_disk_space ?? 0))) : null,
  };
}

function queryNetworkMetrics(planServerUuids: string[], from: number, to: number): MetricRow[] {
  if (!hasPlanSchema() || planServerUuids.length === 0) return [];
  const placeholders = listPlaceholders(planServerUuids.length);
  return requireDb().query(`
      SELECT CAST(t.date / 60000 AS INTEGER) * 60000 AS date,
        AVG(t.tps) AS tps,
        SUM(t.players_online) AS players_online,
        SUM(t.cpu_usage) AS cpu_usage,
        SUM(t.ram_usage) AS ram_usage,
        SUM(t.entities) AS entities,
        SUM(t.chunks_loaded) AS chunks_loaded,
        MIN(t.free_disk_space) AS free_disk_space,
        NULL AS mspt_average
      FROM plan_tps t
      JOIN plan_servers server ON server.id = t.server_id
      WHERE server.uuid IN (${placeholders}) AND t.date BETWEEN ? AND ?
      GROUP BY CAST(t.date / 60000 AS INTEGER)
      ORDER BY date ASC
    `).all(...planServerUuids, from, to) as MetricRow[];
}

function queryNetworkPerformanceSeries(planServerUuids: string[], from: number, to: number): NetworkPerformanceSeriesRow[] {
  if (!hasPlanSchema() || planServerUuids.length === 0) return [];
  const placeholders = listPlaceholders(planServerUuids.length);
  return requireDb().query(`
      SELECT server.uuid AS server_uuid, server.name AS server_name,
        t.date, t.tps, t.players_online, t.cpu_usage, t.ram_usage,
        t.entities, t.chunks_loaded, t.free_disk_space, NULL AS mspt_average
      FROM plan_tps t
      JOIN plan_servers server ON server.id = t.server_id
      WHERE server.uuid IN (${placeholders}) AND t.date BETWEEN ? AND ?
      ORDER BY t.date ASC
    `).all(...planServerUuids, from, to) as NetworkPerformanceSeriesRow[];
}

/**
 * Direct port of GraphJSONCreator.optimizedPerformanceGraphJSON. Plan reduces
 * data older than 60 days to 20-minute buckets, 60–30 days to 5-minute
 * buckets, and leaves the latest 30 days at collection resolution.
 */
function queryNetworkPerformanceSeriesOptimized(planServerUuids: string[], to: number): NetworkPerformanceSeriesRow[] {
  if (!hasPlanSchema() || planServerUuids.length === 0) return [];
  const placeholders = listPlaceholders(planServerUuids.length);
  const twoMonthsAgo = to - 60 * 24 * 60 * 60 * 1000;
  const monthAgo = to - 30 * 24 * 60 * 60 * 1000;
  const bucket = (resolutionMs: number, predicate: string) => `
      SELECT server.uuid AS server_uuid, server.name AS server_name,
        MIN(t.date) AS date, MIN(t.tps) AS tps,
        MAX(t.players_online) AS players_online, MAX(t.cpu_usage) AS cpu_usage,
        MAX(t.ram_usage) AS ram_usage, MAX(t.entities) AS entities,
        MAX(t.chunks_loaded) AS chunks_loaded, MAX(t.free_disk_space) AS free_disk_space,
        NULL AS mspt_average
      FROM plan_tps t
      JOIN plan_servers server ON server.id = t.server_id
      WHERE server.uuid IN (${placeholders}) AND ${predicate}
      GROUP BY server.uuid, CAST(t.date / ${resolutionMs} AS INTEGER)
    `;
  const early = bucket(20 * 60_000, "t.date < ?");
  const middle = bucket(5 * 60_000, "t.date >= ? AND t.date < ?");
  const recent = `
      SELECT server.uuid AS server_uuid, server.name AS server_name,
        t.date, t.tps, t.players_online, t.cpu_usage, t.ram_usage,
        t.entities, t.chunks_loaded, t.free_disk_space, NULL AS mspt_average
      FROM plan_tps t
      JOIN plan_servers server ON server.id = t.server_id
      WHERE server.uuid IN (${placeholders}) AND t.date >= ? AND t.date <= ?
    `;
  return requireDb().query(`${early} UNION ALL ${middle} UNION ALL ${recent} ORDER BY date ASC`).all(
    ...planServerUuids, twoMonthsAgo,
    ...planServerUuids, twoMonthsAgo, monthAgo,
    ...planServerUuids, monthAgo, to,
  ) as NetworkPerformanceSeriesRow[];
}

function boundPlanServerUuids(ctx: KubekExtensionContext): string[] {
  return ctx.servers.list()
    .map((server) => describeServer(server.id, server.name, server.status).binding?.plan_server_uuid)
    .filter((uuid): uuid is string => Boolean(uuid));
}

function queryNetworkWorlds(planServerUuids: string[]) {
  if (planServerUuids.length === 0 || !hasTable("plan_worlds") || !hasTable("plan_world_times")) return { worlds: [], gameModes: null };
  const placeholders = listPlaceholders(planServerUuids.length);
  const db = requireDb();
  const worlds = db.query(`
      SELECT w.world_name, w.server_uuid, server.name AS server_name,
        COALESCE(SUM(wt.survival_time), 0) AS survival_time,
        COALESCE(SUM(wt.creative_time), 0) AS creative_time,
        COALESCE(SUM(wt.adventure_time), 0) AS adventure_time,
        COALESCE(SUM(wt.spectator_time), 0) AS spectator_time,
        COALESCE(SUM(wt.survival_time + wt.creative_time + wt.adventure_time + wt.spectator_time), 0) AS total_time,
        COUNT(DISTINCT wt.user_id) AS player_count
      FROM plan_worlds w
      JOIN plan_servers server ON server.uuid = w.server_uuid
      LEFT JOIN plan_world_times wt ON wt.world_id = w.id
      WHERE w.server_uuid IN (${placeholders})
      GROUP BY w.id
      ORDER BY total_time DESC, w.world_name ASC
    `).all(...planServerUuids);
  const gameModes = db.query(`
      SELECT COALESCE(SUM(wt.survival_time), 0) AS survival_time,
        COALESCE(SUM(wt.creative_time), 0) AS creative_time,
        COALESCE(SUM(wt.adventure_time), 0) AS adventure_time,
        COALESCE(SUM(wt.spectator_time), 0) AS spectator_time
      FROM plan_world_times wt
      JOIN plan_servers server ON server.id = wt.server_id
      WHERE server.uuid IN (${placeholders})
    `).get(...planServerUuids);
  return { worlds, gameModes };
}

function queryNetworkPluginHistory(planServerUuids: string[]) {
  if (planServerUuids.length === 0 || !hasPluginSchema()) return [];
  const placeholders = listPlaceholders(planServerUuids.length);
  return requireDb().query(`
      SELECT server.uuid AS server_uuid, server.name AS server_name,
        pv.plugin_name, pv.version, pv.modified
      FROM plan_plugin_versions pv
      JOIN plan_servers server ON server.id = pv.server_id
      WHERE server.uuid IN (${placeholders})
      ORDER BY pv.modified DESC, pv.plugin_name ASC
      LIMIT 1000
    `).all(...planServerUuids);
}

function queryAllowlistBounces(planServerUuids: string[]) {
  if (planServerUuids.length === 0 || !hasTable("plan_allowlist_bounce")) return [];
  const placeholders = listPlaceholders(planServerUuids.length);
  return requireDb().query(`
      SELECT bounce.uuid, bounce.name, bounce.times, bounce.last_bounce,
        server.uuid AS server_uuid, server.name AS server_name
      FROM plan_allowlist_bounce bounce
      JOIN plan_servers server ON server.id = bounce.server_id
      WHERE server.uuid IN (${placeholders})
      ORDER BY bounce.last_bounce DESC
      LIMIT 500
    `).all(...planServerUuids);
}

function queryServerExtensionValues(planServerUuids: string[]) {
  if (planServerUuids.length === 0 || !hasTable("plan_extension_server_values") || !hasTable("plan_extension_providers") || !hasTable("plan_extension_plugins")) return [];
  const placeholders = listPlaceholders(planServerUuids.length);
  return requireDb().query(`
      SELECT plugin.server_uuid, plugin.name AS plugin_name, provider.name AS provider_name,
        provider.text, provider.description, provider.format_type,
        value.boolean_value, value.double_value, value.percentage_value, value.long_value,
        value.string_value, value.component_value, value.group_value
      FROM plan_extension_server_values value
      JOIN plan_extension_providers provider ON provider.id = value.provider_id
      JOIN plan_extension_plugins plugin ON plugin.id = provider.plugin_id
      WHERE plugin.server_uuid IN (${placeholders}) AND provider.hidden = 0
      ORDER BY plugin.name ASC, provider.priority DESC, provider.name ASC
    `).all(...planServerUuids);
}

function queryNetworkPlayerExtensions(planServerUuids: string[], playerUuid: string) {
  if (planServerUuids.length === 0) return { extensions: [], extensionGroups: [] };
  const placeholders = listPlaceholders(planServerUuids.length);
  const db = requireDb();
  const extensions = hasExtensionSchema() ? db.query(`
      SELECT plugin.name AS plugin_name, provider.name AS provider_name, provider.text,
        value.group_value, value.string_value, value.component_value, value.double_value, value.long_value
      FROM plan_extension_user_values value
      JOIN plan_extension_providers provider ON provider.id = value.provider_id
      JOIN plan_extension_plugins plugin ON plugin.id = provider.plugin_id
      WHERE value.uuid = ? AND plugin.server_uuid IN (${placeholders}) AND provider.hidden = 0
      ORDER BY plugin.name COLLATE NOCASE, provider.name COLLATE NOCASE
    `).all(playerUuid, ...planServerUuids) as ExtensionValue[] : [];
  const extensionGroups = hasExtensionGroupSchema() ? db.query(`
      SELECT plugin.name AS plugin_name, provider.name AS provider_name, groups.group_name
      FROM plan_extension_groups groups
      JOIN plan_extension_providers provider ON provider.id = groups.provider_id
      JOIN plan_extension_plugins plugin ON plugin.id = provider.plugin_id
      WHERE groups.uuid = ? AND plugin.server_uuid IN (${placeholders}) AND provider.hidden = 0
      ORDER BY plugin.name COLLATE NOCASE, provider.name COLLATE NOCASE, groups.group_name COLLATE NOCASE
    `).all(playerUuid, ...planServerUuids) as ExtensionGroup[] : [];
  return { extensions, extensionGroups };
}

function queryPlayerModeration(planServerUuids: string[], playerUuid: string) {
  if (planServerUuids.length === 0 || !hasTable("plan_user_info")) return { rows: [] };
  const placeholders = listPlaceholders(planServerUuids.length);
  return { rows: requireDb().query(`
      SELECT server.uuid AS server_uuid, server.name AS server_name,
        info.registered, info.opped, info.banned, user.times_kicked
      FROM plan_users user
      JOIN plan_user_info info ON info.user_id = user.id
      JOIN plan_servers server ON server.id = info.server_id
      WHERE user.uuid = ? AND server.uuid IN (${placeholders})
      ORDER BY info.registered DESC
    `).all(playerUuid, ...planServerUuids) };
}

function queryPlayerConnections(planServerUuids: string[], playerUuid: string) {
  if (planServerUuids.length === 0 || !hasTable("plan_user_info")) return { addresses: [], geolocations: [] };
  const placeholders = listPlaceholders(planServerUuids.length);
  const db = requireDb();
  const addresses = db.query(`
      SELECT DISTINCT info.join_address, server.uuid AS server_uuid, server.name AS server_name, info.registered
      FROM plan_users user
      JOIN plan_user_info info ON info.user_id = user.id
      JOIN plan_servers server ON server.id = info.server_id
      WHERE user.uuid = ? AND server.uuid IN (${placeholders}) AND info.join_address IS NOT NULL AND info.join_address <> ''
      ORDER BY info.registered DESC
    `).all(playerUuid, ...planServerUuids);
  const geolocations = hasTable("plan_geolocations") ? db.query(`
      SELECT geo.geolocation, geo.last_used
      FROM plan_users user
      JOIN plan_geolocations geo ON geo.user_id = user.id
      WHERE user.uuid = ?
      ORDER BY geo.last_used DESC
    `).all(playerUuid) : [];
  return { addresses, geolocations };
}

function queryNetworkPlayers(planServerUuids: string[], limit: number): NetworkPlayer[] {
  if (!hasPlayerSchema() || planServerUuids.length === 0) return [];
  const placeholders = listPlaceholders(planServerUuids.length);
  return requireDb().query(`
      SELECT u.uuid, u.name,
        MAX(s.session_end) AS last_seen,
        COALESCE(SUM(MAX(0, s.session_end - s.session_start - s.afk_time)), 0) AS active_playtime,
        COALESCE(SUM(s.deaths), 0) AS deaths,
        COALESCE(SUM(s.mob_kills), 0) AS mob_kills,
        COUNT(DISTINCT server.id) AS server_count,
        (
          SELECT latest_server.uuid
          FROM plan_sessions recent
          JOIN plan_servers latest_server ON latest_server.id = recent.server_id
          WHERE recent.user_id = u.id AND latest_server.uuid IN (${placeholders})
          ORDER BY recent.session_end DESC LIMIT 1
        ) AS latest_server_uuid
      FROM plan_sessions s
      JOIN plan_users u ON u.id = s.user_id
      JOIN plan_servers server ON server.id = s.server_id
      WHERE server.uuid IN (${placeholders})
      GROUP BY u.id, u.uuid, u.name
      ORDER BY last_seen DESC
      LIMIT ?
    `).all(...planServerUuids, ...planServerUuids, limit) as NetworkPlayer[];
}

function queryPlayerbaseSummary(planServerUuids: string[], from: number, to: number): PlayerbaseSummary {
  const empty: PlayerbaseSummary = { active_players: 0, new_players: 0, returning_players: 0 };
  if (!hasPlayerSchema() || planServerUuids.length === 0) return empty;
  const placeholders = listPlaceholders(planServerUuids.length);
  return requireDb().query(`
      SELECT COUNT(DISTINCT u.uuid) AS active_players,
        COUNT(DISTINCT CASE WHEN u.registered BETWEEN ? AND ? THEN u.uuid END) AS new_players,
        COUNT(DISTINCT CASE WHEN u.registered < ? THEN u.uuid END) AS returning_players
      FROM plan_sessions s
      JOIN plan_users u ON u.id = s.user_id
      JOIN plan_servers server ON server.id = s.server_id
      WHERE server.uuid IN (${placeholders}) AND s.session_end BETWEEN ? AND ?
    `).get(from, to, from, ...planServerUuids, from, to) as PlayerbaseSummary;
}

function queryPlayerbaseTrend(planServerUuids: string[], from: number, to: number): PlayerbaseTrend[] {
  if (!hasPlayerSchema() || planServerUuids.length === 0) return [];
  const placeholders = listPlaceholders(planServerUuids.length);
  return requireDb().query(`
      SELECT CAST(s.session_end / 86400000 AS INTEGER) * 86400000 AS date,
        COUNT(DISTINCT u.uuid) AS active_players,
        COUNT(DISTINCT CASE WHEN u.registered >= CAST(s.session_end / 86400000 AS INTEGER) * 86400000
          AND u.registered < (CAST(s.session_end / 86400000 AS INTEGER) + 1) * 86400000 THEN u.uuid END) AS new_players
      FROM plan_sessions s
      JOIN plan_users u ON u.id = s.user_id
      JOIN plan_servers server ON server.id = s.server_id
      WHERE server.uuid IN (${placeholders}) AND s.session_end BETWEEN ? AND ?
      GROUP BY CAST(s.session_end / 86400000 AS INTEGER)
      ORDER BY date ASC
    `).all(...planServerUuids, from, to) as PlayerbaseTrend[];
}

function queryNetworkPlugins(planServerUuids: string[]): NetworkPlugin[] {
  if (!hasPluginSchema() || planServerUuids.length === 0) return [];
  const placeholders = listPlaceholders(planServerUuids.length);
  return requireDb().query(`
      SELECT pv.plugin_name,
        GROUP_CONCAT(DISTINCT pv.version) AS versions,
        COUNT(DISTINCT server.id) AS server_count,
        GROUP_CONCAT(DISTINCT server.name) AS servers,
        MAX(pv.modified) AS last_seen
      FROM plan_plugin_versions pv
      JOIN plan_servers server ON server.id = pv.server_id
      WHERE server.uuid IN (${placeholders})
      GROUP BY pv.plugin_name
      ORDER BY pv.plugin_name COLLATE NOCASE
    `).all(...planServerUuids) as NetworkPlugin[];
}

function queryNetworkActivitySummary(planServerUuids: string[], from: number, to: number): NetworkActivitySummary {
  const empty: NetworkActivitySummary = { sessions: 0, unique_players: 0, active_playtime: 0, afk_time: 0, deaths: 0, mob_kills: 0, pvp_kills: 0, new_players: 0 };
  if (!hasPlayerSchema() || planServerUuids.length === 0) return empty;
  const placeholders = listPlaceholders(planServerUuids.length);
  const sessions = requireDb().query(`
      SELECT COUNT(s.id) AS sessions,
        COUNT(DISTINCT u.uuid) AS unique_players,
        COALESCE(SUM(MAX(0, s.session_end - s.session_start - s.afk_time)), 0) AS active_playtime,
        COALESCE(SUM(s.afk_time), 0) AS afk_time,
        COALESCE(SUM(s.deaths), 0) AS deaths,
        COALESCE(SUM(s.mob_kills), 0) AS mob_kills
      FROM plan_sessions s
      JOIN plan_users u ON u.id = s.user_id
      JOIN plan_servers server ON server.id = s.server_id
      WHERE server.uuid IN (${placeholders}) AND s.session_end BETWEEN ? AND ?
    `).get(...planServerUuids, from, to) as Omit<NetworkActivitySummary, "pvp_kills" | "new_players">;
  const newPlayers = requireDb().query(`
      SELECT COUNT(DISTINCT u.uuid) AS count
      FROM plan_users u
      JOIN plan_sessions s ON s.user_id = u.id
      JOIN plan_servers server ON server.id = s.server_id
      WHERE server.uuid IN (${placeholders}) AND u.registered BETWEEN ? AND ?
    `).get(...planServerUuids, from, to) as { count: number };
  const pvp = hasKillSchema() ? requireDb().query(`
      SELECT COUNT(k.id) AS count
      FROM plan_kills k
      JOIN plan_servers server ON server.uuid = k.server_uuid
      WHERE server.uuid IN (${placeholders}) AND k.date BETWEEN ? AND ?
    `).get(...planServerUuids, from, to) as { count: number } : { count: 0 };
  return { ...sessions, pvp_kills: Number(pvp.count ?? 0), new_players: Number(newPlayers.count ?? 0) };
}

function queryNetworkSessions(planServerUuids: string[], from: number, to: number, limit: number): NetworkSession[] {
  if (!hasPlayerSchema() || planServerUuids.length === 0) return [];
  const placeholders = listPlaceholders(planServerUuids.length);
  return requireDb().query(`
      SELECT s.id, u.uuid AS player_uuid, u.name AS player_name,
        server.uuid AS server_uuid, server.name AS server_name,
        s.session_start, s.session_end,
        MAX(0, s.session_end - s.session_start - s.afk_time) AS active_playtime,
        s.afk_time, s.deaths, s.mob_kills
      FROM plan_sessions s
      JOIN plan_users u ON u.id = s.user_id
      JOIN plan_servers server ON server.id = s.server_id
      WHERE server.uuid IN (${placeholders}) AND s.session_end BETWEEN ? AND ?
      ORDER BY s.session_end DESC
      LIMIT ?
    `).all(...planServerUuids, from, to, limit) as NetworkSession[];
}

function queryNetworkKills(planServerUuids: string[], from: number, to: number, limit: number): NetworkKill[] {
  if (!hasKillSchema() || planServerUuids.length === 0) return [];
  const placeholders = listPlaceholders(planServerUuids.length);
  return requireDb().query(`
      SELECT k.id, k.killer_uuid, COALESCE(killer.name, k.killer_uuid) AS killer_name,
        k.victim_uuid, COALESCE(victim.name, k.victim_uuid) AS victim_name,
        server.uuid AS server_uuid, server.name AS server_name, k.weapon, k.date
      FROM plan_kills k
      JOIN plan_servers server ON server.uuid = k.server_uuid
      LEFT JOIN plan_users killer ON killer.uuid = k.killer_uuid
      LEFT JOIN plan_users victim ON victim.uuid = k.victim_uuid
      WHERE server.uuid IN (${placeholders}) AND k.date BETWEEN ? AND ?
      ORDER BY k.date DESC
      LIMIT ?
    `).all(...planServerUuids, from, to, limit) as NetworkKill[];
}

function listPlaceholders(count: number): string {
  return Array.from({ length: count }, () => "?").join(", ");
}

function queryMetrics(planServerUuid: string, from: number, to: number): MetricRow[] {
  return requireDb()
    .query(`
      SELECT t.date, t.tps, t.players_online, t.cpu_usage, t.ram_usage, t.entities, t.chunks_loaded, t.free_disk_space, NULL AS mspt_average
      FROM plan_tps t
      JOIN plan_servers s ON s.id = t.server_id
      WHERE s.uuid = ? AND t.date BETWEEN ? AND ?
      ORDER BY t.date ASC
    `)
    .all(planServerUuid, from, to) as MetricRow[];
}

function queryPlayers(planServerUuid: string) {
  return requireDb()
    .query(`
      SELECT u.uuid, u.name,
        MAX(s.session_end) AS last_seen,
        SUM(MAX(0, s.session_end - s.session_start - s.afk_time)) AS active_playtime,
        SUM(s.deaths) AS deaths,
        SUM(s.mob_kills) AS mob_kills
      FROM plan_sessions s
      JOIN plan_users u ON u.id = s.user_id
      JOIN plan_servers server ON server.id = s.server_id
      WHERE server.uuid = ?
      GROUP BY u.id, u.uuid, u.name
      ORDER BY last_seen DESC
      LIMIT 20
    `)
    .all(planServerUuid);
}

function queryNetworkPlayerProfile(planServerUuids: string[], playerUuid: string) {
  if (!hasPlayerSchema() || planServerUuids.length === 0) return null;
  const db = requireDb();
  const placeholders = listPlaceholders(planServerUuids.length);
  const player = db.query(`
      SELECT u.uuid, u.name, MIN(u.registered) AS registered, MAX(u.times_kicked) AS times_kicked,
        MAX(s.session_end) AS last_seen,
        COALESCE(SUM(MAX(0, s.session_end - s.session_start)), 0) AS playtime,
        COALESCE(SUM(MAX(0, s.session_end - s.session_start - s.afk_time)), 0) AS active_playtime,
        COALESCE(SUM(s.afk_time), 0) AS afk_time,
        COUNT(s.id) AS session_count,
        COALESCE(MAX(s.session_end - s.session_start), 0) AS longest_session,
        COALESCE(SUM(s.deaths), 0) AS deaths,
        COALESCE(SUM(s.mob_kills), 0) AS mob_kills
      FROM plan_users u
      JOIN plan_sessions s ON s.user_id = u.id
      JOIN plan_servers server ON server.id = s.server_id
      WHERE u.uuid = ? AND server.uuid IN (${placeholders})
      GROUP BY u.uuid, u.name
    `).get(playerUuid, ...planServerUuids) as Record<string, unknown> | null;
  if (!player) return null;

  const sessions = db.query(`
      SELECT s.id, server.uuid AS server_uuid, server.name AS server_name,
        s.session_start, s.session_end,
        MAX(0, s.session_end - s.session_start - s.afk_time) AS active_playtime,
        s.afk_time, s.deaths, s.mob_kills
      FROM plan_sessions s
      JOIN plan_users u ON u.id = s.user_id
      JOIN plan_servers server ON server.id = s.server_id
      WHERE u.uuid = ? AND server.uuid IN (${placeholders})
      ORDER BY s.session_end DESC LIMIT 60
    `).all(playerUuid, ...planServerUuids) as Record<string, unknown>[];
  const medianSource = sessions.map((row) => Math.max(0, Number(row.session_end) - Number(row.session_start))).sort((a, b) => a - b);
  const middle = Math.floor(medianSource.length / 2);
  const session_median = medianSource.length ? (medianSource.length % 2 ? medianSource[middle] : Math.round((medianSource[middle - 1] + medianSource[middle]) / 2)) : 0;

  const activity = (days: number) => {
    const from = Date.now() - days * 24 * 60 * 60 * 1000;
    return db.query(`
        SELECT COUNT(s.id) AS sessions,
          COALESCE(SUM(MAX(0, s.session_end - s.session_start)), 0) AS playtime,
          COALESCE(SUM(MAX(0, s.session_end - s.session_start - s.afk_time)), 0) AS active_playtime,
          COALESCE(SUM(s.afk_time), 0) AS afk_time,
          COALESCE(SUM(s.deaths), 0) AS deaths,
          COALESCE(SUM(s.mob_kills), 0) AS mob_kills
        FROM plan_sessions s
        JOIN plan_users u ON u.id = s.user_id
        JOIN plan_servers server ON server.id = s.server_id
        WHERE u.uuid = ? AND server.uuid IN (${placeholders}) AND s.session_end >= ?
      `).get(playerUuid, ...planServerUuids, from) as Record<string, unknown>;
  };

  const servers = db.query(`
      SELECT server.uuid AS server_uuid, server.name AS server_name,
        COUNT(s.id) AS session_count,
        MAX(s.session_end) AS last_seen,
        COALESCE(SUM(MAX(0, s.session_end - s.session_start)), 0) AS playtime,
        COALESCE(SUM(MAX(0, s.session_end - s.session_start - s.afk_time)), 0) AS active_playtime,
        COALESCE(SUM(s.afk_time), 0) AS afk_time,
        COALESCE(SUM(s.deaths), 0) AS deaths,
        COALESCE(SUM(s.mob_kills), 0) AS mob_kills
      FROM plan_sessions s
      JOIN plan_users u ON u.id = s.user_id
      JOIN plan_servers server ON server.id = s.server_id
      WHERE u.uuid = ? AND server.uuid IN (${placeholders})
      GROUP BY server.uuid, server.name
      ORDER BY playtime DESC
    `).all(playerUuid, ...planServerUuids) as Record<string, unknown>[];

  const ping = hasPingSchema() ? db.query(`
      SELECT AVG(p.avg_ping) AS average_ping, MIN(p.min_ping) AS best_ping, MAX(p.max_ping) AS worst_ping
      FROM plan_ping p
      JOIN plan_users u ON u.id = p.user_id
      JOIN plan_servers server ON server.id = p.server_id
      WHERE u.uuid = ? AND server.uuid IN (${placeholders})
    `).get(playerUuid, ...planServerUuids) : null;
  const pingSeries = hasPingSchema() ? db.query(`
      SELECT p.date, server.uuid AS server_uuid, server.name AS server_name, p.min_ping, p.avg_ping, p.max_ping
      FROM plan_ping p
      JOIN plan_users u ON u.id = p.user_id
      JOIN plan_servers server ON server.id = p.server_id
      WHERE u.uuid = ? AND server.uuid IN (${placeholders})
      ORDER BY p.date DESC LIMIT 240
    `).all(playerUuid, ...planServerUuids).reverse() : [];

  const pvpKills = hasKillSchema() ? db.query(`
      SELECT k.id, COALESCE(victim.name, k.victim_uuid) AS opponent_name, server.name AS server_name, k.weapon, k.date
      FROM plan_kills k
      JOIN plan_servers server ON server.uuid = k.server_uuid
      LEFT JOIN plan_users victim ON victim.uuid = k.victim_uuid
      WHERE k.killer_uuid = ? AND server.uuid IN (${placeholders})
      ORDER BY k.date DESC LIMIT 30
    `).all(playerUuid, ...planServerUuids) : [];
  const pvpDeaths = hasKillSchema() ? db.query(`
      SELECT k.id, COALESCE(killer.name, k.killer_uuid) AS opponent_name, server.name AS server_name, k.weapon, k.date
      FROM plan_kills k
      JOIN plan_servers server ON server.uuid = k.server_uuid
      LEFT JOIN plan_users killer ON killer.uuid = k.killer_uuid
      WHERE k.victim_uuid = ? AND server.uuid IN (${placeholders})
      ORDER BY k.date DESC LIMIT 30
    `).all(playerUuid, ...planServerUuids) : [];
  const pvp = { kills: pvpKills.length, deaths: pvpDeaths.length };

  const nicknames = db.query(`
      SELECT nickname, MAX(last_used) AS last_used
      FROM plan_nicknames
      WHERE uuid = ? AND server_uuid IN (${placeholders})
      GROUP BY nickname
      ORDER BY last_used DESC LIMIT 20
    `).all(playerUuid, ...planServerUuids);
  const agentReady = hasAgentSchema();
  const chat = agentReady ? db.query(`
      SELECT COALESCE(SUM(message_count), 0) AS message_count, MAX(last_message_at) AS last_message_at
      FROM plan_agent_chat_count WHERE player_uuid = ? AND server_uuid IN (${placeholders})
    `).get(playerUuid, ...planServerUuids) : null;
  const snapshots = agentReady ? db.query(`
      SELECT id, server_uuid, captured_at, reason, content_hash FROM plan_agent_inventory_snapshot
      WHERE player_uuid = ? AND server_uuid IN (${placeholders}) ORDER BY captured_at DESC LIMIT 10
    `).all(playerUuid, ...planServerUuids) as AgentInventorySnapshot[] : [];
  const newest = snapshots[0];
  const inventory = newest ? db.query(`
      SELECT slot, item_type, amount, metadata FROM plan_agent_inventory_item WHERE snapshot_id = ? ORDER BY slot ASC
    `).all(newest.id) as AgentInventoryItem[] : [];
  return { player: { ...player, session_median, pvp_kills: pvp.kills, pvp_deaths: pvp.deaths }, activity: { days7: activity(7), days30: activity(30) }, sessions, servers, ping, pingSeries, pvp: { kills: pvpKills, deaths: pvpDeaths }, nicknames, agentReady, chat, snapshots, inventory, extensions: [], extensionGroups: [] };
}

function queryPlayerProfile(planServerUuid: string, playerUuid: string) {
  const db = requireDb();
  const player = db.query(`
      SELECT u.uuid, u.name, u.registered, u.times_kicked,
        MAX(s.session_end) AS last_seen,
        SUM(MAX(0, s.session_end - s.session_start - s.afk_time)) AS active_playtime,
        SUM(s.afk_time) AS afk_time,
        SUM(s.deaths) AS deaths,
        SUM(s.mob_kills) AS mob_kills
      FROM plan_sessions s
      JOIN plan_users u ON u.id = s.user_id
      JOIN plan_servers server ON server.id = s.server_id
      WHERE server.uuid = ? AND u.uuid = ?
      GROUP BY u.id, u.uuid, u.name, u.registered, u.times_kicked
    `).get(planServerUuid, playerUuid) as Record<string, unknown> | null;
  if (!player) return null;

  const agentReady = hasAgentSchema();
  const chat = agentReady ? db.query(`
      SELECT COALESCE(SUM(message_count), 0) AS message_count, MAX(last_message_at) AS last_message_at
      FROM plan_agent_chat_count WHERE player_uuid = ? AND server_uuid = ?
    `).get(playerUuid, planServerUuid) : null;
  const snapshots = agentReady ? db.query(`
      SELECT id, captured_at, reason, content_hash FROM plan_agent_inventory_snapshot
      WHERE player_uuid = ? AND server_uuid = ? ORDER BY id DESC LIMIT 10
    `).all(playerUuid, planServerUuid) as AgentInventorySnapshot[] : [];
  const newest = snapshots[0];
  const inventory = newest ? db.query(`
      SELECT slot, item_type, amount, metadata FROM plan_agent_inventory_item
      WHERE snapshot_id = ? ORDER BY slot ASC
    `).all(newest.id) as AgentInventoryItem[] : [];
  const extensions = hasExtensionSchema() ? db.query(`
      SELECT plugin.name AS plugin_name, provider.name AS provider_name, provider.text,
        value.group_value, value.string_value, value.component_value, value.double_value, value.long_value
      FROM plan_extension_user_values value
      JOIN plan_extension_providers provider ON provider.id = value.provider_id
      JOIN plan_extension_plugins plugin ON plugin.id = provider.plugin_id
      WHERE value.uuid = ?
      ORDER BY plugin.name COLLATE NOCASE, provider.name COLLATE NOCASE
    `).all(playerUuid) as ExtensionValue[] : [];
  const extensionGroups = hasExtensionGroupSchema() ? db.query(`
      SELECT plugin.name AS plugin_name, provider.name AS provider_name, groups.group_name
      FROM plan_extension_groups groups
      JOIN plan_extension_providers provider ON provider.id = groups.provider_id
      JOIN plan_extension_plugins plugin ON plugin.id = provider.plugin_id
      WHERE groups.uuid = ?
      ORDER BY plugin.name COLLATE NOCASE, provider.name COLLATE NOCASE, groups.group_name COLLATE NOCASE
    `).all(playerUuid) as ExtensionGroup[] : [];

  return { player, agentReady, chat, snapshots, inventory, extensions, extensionGroups };
}

function getDatabaseHealth(): DatabaseHealth {
  const db = requireDb();
  const journal = db.query("PRAGMA journal_mode").get() as { journal_mode?: string } | null;
  const pageCount = db.query("PRAGMA page_count").get() as { page_count?: number } | null;
  const pageSize = db.query("PRAGMA page_size").get() as { page_size?: number } | null;
  const latestMetric = hasPlanSchema() ? db.query("SELECT MAX(date) AS value FROM plan_tps").get() as { value: number | null } : { value: null };
  const latestHeartbeat = hasAgentHeartbeatSchema() ? db.query("SELECT MAX(CASE WHEN last_started_at > last_stopped_at THEN last_started_at ELSE last_stopped_at END) AS value FROM plan_agent_server_heartbeat").get() as { value: number | null } : { value: null };
  return {
    schemaReady: hasPlanSchema(),
    journalMode: String(journal?.journal_mode ?? "unknown").toLowerCase(),
    fileSizeBytes: sizeOf(databasePath),
    walSizeBytes: sizeOf(`${databasePath}-wal`),
    pageCount: Number(pageCount?.page_count ?? 0),
    pageSize: Number(pageSize?.page_size ?? 0),
    busyTimeoutMs: 5000,
    latestMetricAt: latestMetric.value ?? null,
    latestAgentHeartbeatAt: latestHeartbeat.value ?? null,
  };
}

function sizeOf(path: string): number {
  try {
    return existsSync(path) ? statSync(path).size : 0;
  } catch {
    return 0;
  }
}

function getAgentHeartbeat(serverUUID: string): AgentServerHeartbeat | null {
  if (!hasAgentHeartbeatSchema()) return null;
  return requireDb().query(`
      SELECT last_started_at, last_stopped_at, last_event
      FROM plan_agent_server_heartbeat WHERE server_uuid = ?
    `).get(serverUUID) as AgentServerHeartbeat | null;
}

function hasAgentHeartbeatSchema(): boolean {
  return Boolean(requireDb().query("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'plan_agent_server_heartbeat'").get());
}

function hasAgentSchema(): boolean {
  const db = requireDb();
  const required = ["plan_agent_inventory_snapshot", "plan_agent_inventory_item", "plan_agent_chat_count"];
  return required.every((name) => Boolean(db.query("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(name)));
}

function hasPingSchema(): boolean {
  return Boolean(requireDb().query("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'plan_ping'").get());
}

function hasPluginSchema(): boolean {
  return Boolean(requireDb().query("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'plan_plugin_versions'").get());
}

function hasKillSchema(): boolean {
  return Boolean(requireDb().query("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'plan_kills'").get());
}

function hasExtensionSchema(): boolean {
  return Boolean(requireDb().query("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'plan_extension_user_values'").get());
}

function hasExtensionGroupSchema(): boolean {
  return Boolean(requireDb().query("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'plan_extension_groups'").get());
}

function latestMetric(planServerUuid: string): MetricRow | null {
  return requireDb()
    .query(`
      SELECT t.date, t.tps, t.players_online, t.cpu_usage, t.ram_usage, t.entities, t.chunks_loaded, t.free_disk_space, NULL AS mspt_average
      FROM plan_tps t
      JOIN plan_servers s ON s.id = t.server_id
      WHERE s.uuid = ?
      ORDER BY t.date DESC
      LIMIT 1
    `)
    .get(planServerUuid) as MetricRow | null;
}

function describeServer(kubekServerId: string, kubekServerName: string, kubekStatus?: string, includeLatest = false): DescribedServer {
  const lifecycle = kubekLifecycleEvents.get(kubekServerId);
  if (!hasPlanSchema()) {
    return { id: kubekServerId, name: kubekServerName, kubekStatus, lastKubekEvent: lifecycle, status: "waiting_for_plan" as const };
  }

  // A matching name gives a safe automatic first binding. Manual binding remains available
  // when a Kubek server and a Plan server intentionally have different names.
  const binding = getBinding(kubekServerId) ?? autoBindByServerName(kubekServerId, kubekServerName);
  if (!binding) {
    return { id: kubekServerId, name: kubekServerName, kubekStatus, lastKubekEvent: lifecycle, status: "not_bound" as const };
  }

  const planServer = getPlanServer(binding.plan_server_uuid);
  if (!planServer) {
    return { id: kubekServerId, name: kubekServerName, kubekStatus, lastKubekEvent: lifecycle, status: "missing" as const, binding };
  }

  const latest = latestMetric(binding.plan_server_uuid);
  const fresh = latest ? serverIsFreshMetric(latest) : false;
  const agentHeartbeat = getAgentHeartbeat(binding.plan_server_uuid);
  return {
    id: kubekServerId,
    name: kubekServerName,
    kubekStatus,
    lastKubekEvent: lifecycle,
    agentHeartbeat,
    // A database binding is a connection. A fresh sample only tells whether telemetry is current.
    status: fresh ? ("active" as const) : ("connected" as const),
    binding,
    planServer,
    ...(includeLatest ? { latest } : {}),
    hasRecentMetric: fresh,
  };
}

function recordKubekLifecycle(serverId: string, event: KubekLifecycleEvent["event"]): void {
  kubekLifecycleEvents.set(serverId, { event, at: Date.now() });
}

function serverIsFreshMetric(metric: MetricRow): boolean {
  return Date.now() - Number(metric.date) <= ONLINE_AFTER_MS;
}

function autoBindByServerName(kubekServerId: string, kubekServerName: string): Binding | null {
  const candidates = requireDb()
    .query("SELECT uuid FROM plan_servers WHERE lower(name) = lower(?)")
    .all(kubekServerName.trim()) as Array<{ uuid: string }>;
  if (candidates.length !== 1) return null;

  // Do not steal a Plan record already deliberately bound to another Kubek server.
  const existing = requireDb()
    .query("SELECT kubek_server_id FROM plan_bridge_bindings WHERE plan_server_uuid = ?")
    .get(candidates[0].uuid) as { kubek_server_id: string } | null;
  if (existing && existing.kubek_server_id !== kubekServerId) return null;

  upsertBinding(kubekServerId, candidates[0].uuid);
  return getBinding(kubekServerId);
}

function numberQuery(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const metadata = { id: EXT_ID };
