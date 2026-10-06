// Highstock 11.4.8 is the same chart engine used by the extracted Plan site.
// The files are vendored locally so Kubek's frontend compiler does not depend
// on a CDN or on installing packages on the panel host.
// @ts-ignore Local UMD bundle intentionally has no TypeScript declarations.
import HighstockRuntime from "./vendor/highstock.cjs";
// @ts-ignore Local UMD bundle intentionally has no TypeScript declarations.
import NoDataRuntime from "./vendor/no-data-to-display.cjs";
// @ts-ignore Local UMD bundle intentionally has no TypeScript declarations.
import AccessibilityRuntime from "./vendor/accessibility.cjs";

const EXT = "com.example.plan-bridge";
const api = (path: string) => `ext/${EXT}/${path}`;

type Metric = {
  date: number;
  tps: number;
  players_online: number;
  cpu_usage: number;
  ram_usage: number;
  entities: number;
  chunks_loaded: number;
  free_disk_space: number;
  mspt_average: number | null;
};

type DatabaseHealth = {
  schemaReady: boolean;
  journalMode: string;
  fileSizeBytes: number;
  walSizeBytes: number;
  pageCount: number;
  pageSize: number;
  busyTimeoutMs: number;
  latestMetricAt: number | null;
  latestAgentHeartbeatAt: number | null;
};

type NetworkPerformanceSeriesRow = Metric & { server_uuid: string; server_name: string | null };

type NetworkPerformance = {
  from: number;
  to: number;
  current: {
    online: number;
    average_tps: number | null;
    cpu_usage: number;
    ram_usage: number;
    entities: number;
    chunks_loaded: number;
    free_disk_space: number | null;
  };
  trend: Metric[];
  series: NetworkPerformanceSeriesRow[];
};

type Player = {
  uuid: string;
  name: string;
  last_seen: number;
  active_playtime: number;
  deaths: number;
  mob_kills: number;
};

type ExtensionValue = {
  plugin_name: string;
  provider_name: string;
  text: string | null;
  group_value: string | null;
  string_value: string | null;
  component_value: string | null;
  double_value: number | null;
  long_value: number | null;
};

type PlayerProfile = {
  player: Player & { registered: number; times_kicked: number; afk_time: number };
  agentReady: boolean;
  chat: { message_count: number; last_message_at: number | null } | null;
  snapshots: Array<{ id: number; captured_at: number; reason: string }>;
  inventory: Array<{ slot: number; item_type: string; amount: number; metadata: string }>;
  extensions?: ExtensionValue[];
  extensionGroups?: Array<{ plugin_name: string; provider_name: string; group_name: string | null }>;
};

type ServerStatus = {
  id: string;
  name: string;
  kubekStatus?: "stopped" | "running" | "starting" | "stopping";
  lastKubekEvent?: { event: "STARTING" | "RUNNING" | "STOPPED" | "CRASHED"; at: number };
  agentHeartbeat?: { last_started_at: number; last_stopped_at: number; last_event: string };
  status: "not_bound" | "waiting_for_plan" | "missing" | "connected" | "active";
  binding?: { plan_server_uuid: string };
  planServer?: { uuid: string; name: string | null; plan_version: string | null };
  latest?: Metric;
  hasRecentMetric?: boolean;
};

type PlanAccess = {
  view: boolean;
  performance: boolean;
  activity: boolean;
  audience: boolean;
  playerDetails: boolean;
  worlds: boolean;
  plugins: boolean;
  extensions: boolean;
  moderation: boolean;
  connection: boolean;
  manage: boolean;
};

type AccessResponse = { access: PlanAccess };

const hasPlanAccess = (access: PlanAccess | undefined, key: keyof PlanAccess) => access?.[key] === true;

type StatusResponse = {
  schemaReady: boolean;
  connected: number;
  active: number;
  total: number;
  updatedAt: number;
  servers: ServerStatus[];
};

type PlanServer = { uuid: string; name: string | null; plan_version: string | null };
type PlanConfiguration = StatusResponse & { databasePath: string };

type NetworkPlayer = Player & {
  server_count: number;
  latest_server_uuid: string | null;
};

type NetworkOverview = {
  schemaReady: boolean;
  generatedAt: number;
  servers: ServerStatus[];
  summary: {
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
  };
  trend: Metric[];
  players: NetworkPlayer[];
};

type Playerbase = {
  from: number;
  to: number;
  summary: { active_players: number; new_players: number; returning_players: number };
  trend: Array<{ date: number; active_players: number; new_players: number }>;
};

type NetworkPlugin = {
  plugin_name: string;
  versions: string;
  server_count: number;
  servers: string;
  last_seen: number;
};

type PlanNetworkView = "overview" | "performance" | "activity" | "playerbase" | "plugins" | "servers" | "players" | "player" | "worlds" | "moderation" | "extensions" | "database";

type NetworkWorlds = {
  worlds: Array<{ world_name: string; server_uuid: string; server_name: string | null; survival_time: number; creative_time: number; adventure_time: number; spectator_time: number; total_time: number; player_count: number }>;
  gameModes: { survival_time: number; creative_time: number; adventure_time: number; spectator_time: number } | null;
};
type PluginHistoryRow = { server_uuid: string; server_name: string | null; plugin_name: string; version: string | null; modified: number };
type AllowlistBounce = { uuid: string; name: string; times: number; last_bounce: number; server_uuid: string; server_name: string | null };
type ServerExtensionValue = { server_uuid: string; plugin_name: string; provider_name: string; text: string | null; description: string | null; format_type: string | null; boolean_value: number | null; double_value: number | null; percentage_value: number | null; long_value: number | null; string_value: string | null; component_value: string | null; group_value: string | null };


type NetworkPlayerProfile = {
  player: { uuid: string; name: string; registered: number; times_kicked: number; last_seen: number; playtime: number; active_playtime: number; afk_time: number; session_count: number; longest_session: number; session_median: number; deaths: number; mob_kills: number; pvp_kills: number; pvp_deaths: number };
  activity: { days7: { sessions: number; playtime: number; active_playtime: number; afk_time: number; deaths: number; mob_kills: number }; days30: { sessions: number; playtime: number; active_playtime: number; afk_time: number; deaths: number; mob_kills: number } };
  sessions: Array<{ id: number; server_uuid: string; server_name: string | null; session_start: number; session_end: number; active_playtime: number; afk_time: number; deaths: number; mob_kills: number }>;
  servers: Array<{ server_uuid: string; server_name: string | null; session_count: number; last_seen: number; playtime: number; active_playtime: number; afk_time: number; deaths: number; mob_kills: number }>;
  ping: { average_ping: number | null; best_ping: number | null; worst_ping: number | null } | null;
  pingSeries: Array<{ date: number; server_uuid: string; server_name: string | null; min_ping: number; avg_ping: number; max_ping: number }>;
  pvp: { kills: Array<{ id: number; opponent_name: string; server_name: string | null; weapon: string | null; date: number }>; deaths: Array<{ id: number; opponent_name: string; server_name: string | null; weapon: string | null; date: number }> };
  nicknames: Array<{ nickname: string; last_used: number }>;
  agentReady: boolean;
  chat: { message_count: number; last_message_at: number | null } | null;
  snapshots: Array<{ id: number; server_uuid: string; captured_at: number; reason: string; content_hash: string }>;
  inventory: Array<{ slot: number; item_type: string; amount: number; metadata: string }>;
  extensions: ExtensionValue[];
  extensionGroups: Array<{ plugin_name: string; provider_name: string; group_name: string | null }>;
};

type NetworkActivity = {
  from: number;
  to: number;
  summary: {
    sessions: number;
    unique_players: number;
    active_playtime: number;
    afk_time: number;
    deaths: number;
    mob_kills: number;
    pvp_kills: number;
    new_players: number;
  };
  sessions: Array<{
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
  }>;
  kills: Array<{
    id: number;
    killer_uuid: string;
    killer_name: string;
    victim_uuid: string;
    victim_name: string;
    server_uuid: string;
    server_name: string | null;
    weapon: string | null;
    date: number;
  }>;
};

function formatDate(timestamp?: number | null): string {
  return timestamp ? new Date(timestamp).toLocaleString() : "—";
}

function formatDuration(milliseconds?: number | null): string {
  const seconds = Math.max(0, Math.floor((milliseconds ?? 0) / 1000));
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  if (days) return `${days} д ${hours} ч`;
  return hours ? `${hours} ч ${minutes} мин` : `${minutes} мин`;
}

function formatMegabytes(megabytes?: number | null): string {
  const value = Number(megabytes ?? 0);
  if (!Number.isFinite(value) || value <= 0) return "—";
  return value >= 1000 ? `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)} GB` : `${Math.round(value)} MB`;
}

function formatRelativeTime(timestamp?: number | null): string {
  if (!timestamp) return "—";
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "только что";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} мин назад`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)} ч назад`;
  return `${Math.floor(seconds / 86_400)} д назад`;
}

function statusLabel(status: ServerStatus["status"]): string {
  return {
    active: "Метрики поступают",
    connected: "Подключён, ожидание метрик",
    missing: "Запись Plan не найдена",
    waiting_for_plan: "Ожидание Plan",
    not_bound: "Не привязан",
  }[status];
}

function isAvailable(status?: ServerStatus["status"]): boolean {
  return status === "active" || status === "connected";
}

function slotLabel(slot: number): string {
  if (slot >= 0 && slot <= 35) return `Инвентарь · ${slot + 1}`;
  if (slot === 100) return "Ботинки";
  if (slot === 101) return "Поножи";
  if (slot === 102) return "Нагрудник";
  if (slot === 103) return "Шлем";
  if (slot === 104) return "Левая рука";
  return `Слот ${slot}`;
}

function extensionValue(entry: ExtensionValue): string {
  const raw = entry.group_value ?? entry.string_value ?? entry.component_value ?? entry.double_value ?? entry.long_value;
  if (raw === null || raw === undefined || raw === "\"None\"" || raw === "None") return "Не задано";
  return String(raw);
}

function StatusBadge(props: { status: ServerStatus["status"] }) {
  const { React, ui } = window.Kubek!;
  return React.createElement(
    ui.Badge,
    { variant: props.status === "active" ? "default" : "secondary" },
    statusLabel(props.status),
  );
}

function PlanServerTab(props: { serverId?: string }) {
  const { React, ui, http, query, icons } = window.Kubek!;
  const e = React.createElement;
  const serverId = props.serverId ?? "";
  const [selectedPlayerUuid, setSelectedPlayerUuid] = React.useState("");
  const accessQuery = query.useQuery<AccessResponse>({
    queryKey: [EXT, "access"],
    queryFn: () => http.get<AccessResponse>(api("access")),
    refetchInterval: 30_000,
  });
  const access = accessQuery.data?.access;
  const detail = query.useQuery<ServerStatus>({
    queryKey: [EXT, "server", serverId],
    queryFn: () => http.get<ServerStatus>(api(`servers/${serverId}`)),
    enabled: Boolean(serverId) && hasPlanAccess(access, "view"),
    refetchInterval: 15_000,
  });
  const available = isAvailable(detail.data?.status);
  const metrics = query.useQuery<{ rows: Metric[] }>({
    queryKey: [EXT, "metrics", serverId],
    queryFn: () => http.get<{ rows: Metric[] }>(api(`servers/${serverId}/metrics`)),
    enabled: available && hasPlanAccess(access, "performance"),
    refetchInterval: 30_000,
  });
  const players = query.useQuery<{ rows: Player[] }>({
    queryKey: [EXT, "players", serverId],
    queryFn: () => http.get<{ rows: Player[] }>(api(`servers/${serverId}/players`)),
    enabled: available && hasPlanAccess(access, "audience"),
    refetchInterval: 60_000,
  });
  const profile = query.useQuery<PlayerProfile>({
    queryKey: [EXT, "player-profile", serverId, selectedPlayerUuid],
    queryFn: () => http.get<PlayerProfile>(api(`servers/${serverId}/players/${selectedPlayerUuid}`)),
    enabled: Boolean(selectedPlayerUuid) && available && hasPlanAccess(access, "playerDetails"),
  });

  if (accessQuery.isLoading) return e(LoadingBlock, { text: "Проверка разрешений Plan в Kubek…" });
  if (accessQuery.isError || !access || !hasPlanAccess(access, "view")) return e(AccessDeniedBlock);
  if (detail.isLoading) return e(LoadingBlock, { text: "Загрузка аналитики Plan…" });
  if (detail.isError || !detail.data) return e(ErrorBlock, { text: "Не удалось получить данные Plan Bridge. Проверьте, что расширение активно." });

  const row = detail.data;
  const latest = row.latest;
  const pointRows = metrics.data?.rows ?? [];
  const waiting = !available;
  return e(
    "div",
    { className: "flex flex-col gap-4 p-4" },
    e(
      "div",
      { className: "flex flex-wrap items-start justify-between gap-3" },
      e(
        "div",
        { className: "flex items-center gap-3" },
        e("div", { className: "rounded-lg border bg-muted/40 p-2" }, e(icons.ChartNoAxesCombined, { className: "size-5 text-primary" })),
        e(
          "div",
          null,
          e("h2", { className: "text-lg font-semibold" }, "Аналитика Plan"),
          e("p", { className: "text-sm text-muted-foreground" }, row.planServer ? `${row.planServer.name ?? row.name} · ${row.planServer.plan_version ?? "Plan"}` : "Источник аналитики ещё не назначен"),
        ),
      ),
      e(StatusBadge, { status: row.status }),
    ),
    waiting ? e(ConnectionHint, { status: row.status }) : null,
    hasPlanAccess(access, "performance") ? e(React.Fragment, null,
      e(
        "div",
        { className: "grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5" },
        e(MetricCard, { icon: icons.Gauge, label: "TPS", value: latest?.tps?.toFixed(2) ?? "—", hint: latest ? "Последний замер" : "Нет замеров" }),
        e(MetricCard, { icon: icons.Users, label: "Онлайн", value: latest ? String(latest.players_online) : "—", hint: "Игроков в момент замера" }),
        e(MetricCard, { icon: icons.Cpu, label: "CPU", value: latest ? `${latest.cpu_usage.toFixed(1)}%` : "—", hint: "Нагрузка JVM" }),
        e(MetricCard, { icon: icons.MemoryStick, label: "Память", value: latest ? `${Math.round(latest.ram_usage)} MB` : "—", hint: "Использование JVM" }),
        e(MetricCard, { icon: icons.Activity, label: "Актуальность", value: latest ? formatRelativeTime(latest.date) : "—", hint: latest ? formatDate(latest.date) : "Ожидание сэмпла" }),
      ),
      e(
        "div",
        { className: "grid gap-4 xl:grid-cols-2" },
        e(TrendCard, { title: "TPS за 24 часа", subtitle: "Стабильность сервера", rows: pointRows, value: (point: Metric) => point.tps, color: "hsl(var(--primary))", formatter: (value: number) => value.toFixed(2) }),
        e(TrendCard, { title: "Онлайн за 24 часа", subtitle: "Игроков в момент замера", rows: pointRows, value: (point: Metric) => point.players_online, color: "hsl(142 71% 45%)", formatter: (value: number) => String(Math.round(value)) }),
      ),
    ) : null,
    hasPlanAccess(access, "audience") ? e(
      ui.Card,
      null,
      e(ui.CardHeader, { className: "flex flex-row items-center justify-between gap-3 pb-2" },
        e("div", null, e(ui.CardTitle, { className: "text-base" }, "Последняя активность игроков"), e("p", { className: "mt-1 text-xs text-muted-foreground" }, hasPlanAccess(access, "playerDetails") ? "Нажмите на игрока, чтобы открыть подробный профиль." : "Подробные профили требуют отдельного права.")),
        e(ui.Badge, { variant: "secondary" }, `${players.data?.rows?.length ?? 0} игроков`),
      ),
      e(
        ui.CardContent,
        { className: "overflow-x-auto" },
        players.isLoading ? e(LoadingBlock, { text: "Загрузка игроков…" }) :
          !players.data?.rows?.length ? e("p", { className: "py-6 text-sm text-muted-foreground" }, "Plan ещё не записал завершённые сессии игроков.") :
            e(PlayerTable, { rows: players.data.rows, onSelect: hasPlanAccess(access, "playerDetails") ? setSelectedPlayerUuid : undefined }),
      ),
    ) : null,
    selectedPlayerUuid && hasPlanAccess(access, "playerDetails") ? e(PlayerProfilePanel, { profile: profile.data, loading: profile.isLoading, onClose: () => setSelectedPlayerUuid("") }) : null,
  );
}

function ConnectionHint(props: { status: ServerStatus["status"] }) {
  const { React, ui, icons } = window.Kubek!;
  const e = React.createElement;
  const text = props.status === "not_bound"
    ? "Plan найден, но запись ещё не сопоставлена с сервером Kubek. Откройте настройки Plan Bridge и создайте ручную привязку."
    : props.status === "waiting_for_plan"
      ? "База создана. Запустите Plan Agent с путём к plan.sqlite, чтобы он записал таблицы и данные сервера."
      : "Сохранённая привязка указывает на отсутствующую запись Plan. Откройте настройки и выберите сервер заново.";
  return e(ui.Card, { className: "border-dashed" }, e(ui.CardContent, { className: "flex gap-3 py-4 text-sm text-muted-foreground" }, e(icons.CircleAlert, { className: "mt-0.5 size-4 shrink-0" }), text));
}

function MetricCard(props: { icon: any; label: string; value: string; hint: string }) {
  const { React, ui } = window.Kubek!;
  const e = React.createElement;
  return e(ui.Card, null, e(ui.CardContent, { className: "py-3" }, e("div", { className: "flex items-start justify-between gap-2" }, e("div", null, e("p", { className: "text-xl font-semibold tabular-nums" }, props.value), e("p", { className: "text-xs text-muted-foreground" }, props.label)), e(props.icon, { className: "size-4 text-muted-foreground" })), e("p", { className: "mt-2 text-xs text-muted-foreground" }, props.hint)));
}

function TrendCard(props: { title: string; subtitle: string; rows: Metric[]; value: (row: Metric) => number; color: string; formatter: (value: number) => string }) {
  const { React, ui } = window.Kubek!;
  const e = React.createElement;
  const values = props.rows.map(props.value).filter((value) => Number.isFinite(value));
  const latest = values.length ? values[values.length - 1] : null;
  return e(
    ui.Card,
    null,
    e(ui.CardContent, { className: "py-4" },
      e("div", { className: "mb-3 flex items-start justify-between gap-3" }, e("div", null, e("p", { className: "text-sm font-medium" }, props.title), e("p", { className: "text-xs text-muted-foreground" }, props.subtitle)), e("span", { className: "text-lg font-semibold tabular-nums" }, latest === null ? "—" : props.formatter(latest))),
      values.length ? e(Sparkline, { values, color: props.color }) : e("div", { className: "flex h-24 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground" }, "Пока нет точек для графика"),
    ),
  );
}

function Sparkline(props: { values: number[]; color: string }) {
  const { React } = window.Kubek!;
  const e = React.createElement;
  const values = props.values.slice(-120);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = Math.max(max - min, 0.01);
  const points = values.map((value, index) => {
    const x = values.length === 1 ? 50 : (index / (values.length - 1)) * 100;
    const y = 92 - ((value - min) / spread) * 78;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
  return e("svg", { viewBox: "0 0 100 100", preserveAspectRatio: "none", className: "h-24 w-full overflow-visible", role: "img", "aria-label": "График" },
    e("line", { x1: 0, x2: 100, y1: 92, y2: 92, stroke: "hsl(var(--border))", strokeWidth: 1, vectorEffect: "non-scaling-stroke" }),
    e("polyline", { points, fill: "none", stroke: props.color, strokeWidth: 2.2, vectorEffect: "non-scaling-stroke", strokeLinejoin: "round", strokeLinecap: "round" }),
  );
}

function PlayerTable(props: { rows: Player[]; onSelect?: (uuid: string) => void }) {
  const { React } = window.Kubek!;
  const e = React.createElement;
  return e(
    "table",
    { className: "w-full text-sm" },
    e("thead", { className: "border-b text-left text-xs text-muted-foreground" }, e("tr", null,
      e("th", { className: "pb-2 pr-4 font-medium" }, "Игрок"),
      e("th", { className: "pb-2 pr-4 font-medium" }, "Последняя сессия"),
      e("th", { className: "pb-2 pr-4 font-medium" }, "Активное время"),
      e("th", { className: "pb-2 pr-4 font-medium" }, "Убийства"),
      e("th", { className: "pb-2 font-medium" }, "Смерти"),
    )),
    e("tbody", null, props.rows.map((player) => e("tr", { key: player.uuid, className: `${props.onSelect ? "cursor-pointer hover:bg-muted/40" : ""} border-b transition-colors last:border-0`, onClick: props.onSelect ? () => props.onSelect!(player.uuid) : undefined },
      e("td", { className: "py-2.5 pr-4 font-medium" }, player.name),
      e("td", { className: "py-2.5 pr-4 text-muted-foreground" }, formatRelativeTime(player.last_seen)),
      e("td", { className: "py-2.5 pr-4 tabular-nums" }, formatDuration(player.active_playtime)),
      e("td", { className: "py-2.5 pr-4 tabular-nums" }, String(player.mob_kills ?? 0)),
      e("td", { className: "py-2.5 tabular-nums" }, String(player.deaths ?? 0)),
    ))),
  );
}

function PlayerProfilePanel(props: { profile?: PlayerProfile; loading: boolean; onClose: () => void }) {
  const { React, ui, icons } = window.Kubek!;
  const e = React.createElement;
  if (props.loading) return e(LoadingBlock, { text: "Загрузка профиля игрока…" });
  if (!props.profile) return e(ErrorBlock, { text: "Не удалось загрузить профиль игрока." });
  const { player, chat, inventory, snapshots, agentReady } = props.profile;
  const extensions = props.profile.extensions ?? [];
  const extensionGroups = props.profile.extensionGroups ?? [];
  const newestSnapshot = snapshots[0];
  return e(
    ui.Card,
    { className: "border-primary/30" },
    e(ui.CardHeader, { className: "flex flex-row items-start justify-between gap-3" },
      e("div", null,
        e(ui.CardTitle, { className: "text-base" }, `Профиль: ${player.name}`),
        e("p", { className: "mt-1 text-xs text-muted-foreground" }, player.uuid),
        e("p", { className: "mt-1 text-xs text-muted-foreground" }, `В Plan с ${formatDate(player.registered)}`),
      ),
      e(ui.Button, { variant: "ghost", size: "sm", onClick: props.onClose }, "Закрыть"),
    ),
    e(ui.CardContent, { className: "flex flex-col gap-4" },
      e("div", { className: "grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6" },
        e(MetricCard, { icon: icons.Clock3, label: "Активное время", value: formatDuration(player.active_playtime), hint: "Все сессии" }),
        e(MetricCard, { icon: icons.Timer, label: "AFK", value: formatDuration(player.afk_time), hint: "Все сессии" }),
        e(MetricCard, { icon: icons.Swords, label: "Убийства", value: String(player.mob_kills ?? 0), hint: "Мобов" }),
        e(MetricCard, { icon: icons.Skull, label: "Смерти", value: String(player.deaths ?? 0), hint: "Все сессии" }),
        e(MetricCard, { icon: icons.MessageSquare, label: "Сообщения", value: String(chat?.message_count ?? 0), hint: "Текст не хранится" }),
        e(MetricCard, { icon: icons.LogOut, label: "Кики", value: String(player.times_kicked ?? 0), hint: "За всё время" }),
      ),
      e("div", { className: "grid gap-4 xl:grid-cols-2" },
        e(ui.Card, { className: "border" },
          e(ui.CardHeader, { className: "pb-2" }, e(ui.CardTitle, { className: "text-sm" }, "Последний снимок инвентаря")),
          e(ui.CardContent, { className: "text-sm" },
            !agentReady ? "Agent ещё не создал таблицы инвентаря и чата." :
              !newestSnapshot ? "Снимков пока нет." :
                e("div", { className: "flex flex-col gap-2" },
                  e("p", { className: "text-xs text-muted-foreground" }, `${newestSnapshot.reason} · ${formatDate(newestSnapshot.captured_at)} · ${inventory.length} предметов`),
                  inventory.length ? e("div", { className: "max-h-48 overflow-auto" }, e("table", { className: "w-full text-xs" }, e("tbody", null,
                    inventory.map((item) => e("tr", { key: `${item.slot}-${item.item_type}`, className: "border-b last:border-0" },
                      e("td", { className: "py-1.5 pr-2 text-muted-foreground" }, slotLabel(item.slot)),
                      e("td", { className: "py-1.5 pr-2" }, item.item_type),
                      e("td", { className: "py-1.5 text-right tabular-nums" }, `×${item.amount}`),
                    )),
                  ))) : "На момент снимка инвентарь был пуст.",
                ),
          ),
        ),
        e(ui.Card, { className: "border" },
          e(ui.CardHeader, { className: "pb-2" }, e(ui.CardTitle, { className: "text-sm" }, "Права и интеграции Plan")),
          e(ui.CardContent, { className: "text-sm" },
            extensionGroups.length || extensions.length ? e("div", { className: "max-h-48 overflow-auto" },
              extensionGroups.map((entry, index) => e("div", { key: `group-${entry.plugin_name}-${entry.provider_name}-${index}`, className: "border-b py-2 last:border-0" },
                e("p", { className: "font-medium" }, `${entry.plugin_name}: ${entry.provider_name}`),
                e("p", { className: "text-xs text-muted-foreground" }, entry.group_name ?? "Группа не определена"),
              )),
              extensions.map((entry, index) => e("div", { key: `value-${entry.plugin_name}-${entry.provider_name}-${index}`, className: "border-b py-2 last:border-0" },
                e("p", { className: "font-medium" }, `${entry.plugin_name}: ${entry.text ?? entry.provider_name}`),
                e("p", { className: "text-xs text-muted-foreground" }, extensionValue(entry)),
              )),
            ) : "LuckPerms и экономические плагины ещё не передали данные в Plan.",
          ),
        ),
      ),
      e("p", { className: "text-xs text-muted-foreground" }, `Последняя завершённая сессия: ${formatDate(player.last_seen)}${chat?.last_message_at ? ` · последнее сообщение: ${formatDate(chat.last_message_at)}` : ""}`),
    ),
  );
}

function PlanNetwork() {
  const { React, ui, http, query, icons } = window.Kubek!;
  const e = React.createElement;
  const [view, setView] = React.useState("overview" as PlanNetworkView);
  const [selectedPlayerUuid, setSelectedPlayerUuid] = React.useState("");
  const [activityDays, setActivityDays] = React.useState(7);
  const [playerbaseDays, setPlayerbaseDays] = React.useState(30);
  // No Plan data request is permitted before this access map resolves.
  const accessQuery = query.useQuery<AccessResponse>({
    queryKey: [EXT, "access"],
    queryFn: () => http.get<AccessResponse>(api("access")),
    refetchInterval: 30_000,
  });
  const access = accessQuery.data?.access;
  const canOverview = hasPlanAccess(access, "performance") && hasPlanAccess(access, "audience");
  const status = query.useQuery<StatusResponse>({
    queryKey: [EXT, "status"],
    enabled: hasPlanAccess(access, "view"),
    queryFn: () => http.get<StatusResponse>(api("status")),
    refetchInterval: 15_000,
  });
  const sourceServers = (status.data?.servers ?? []).filter((server) => isAvailable(server.status));
  const network = query.useQuery<NetworkOverview>({
    queryKey: [EXT, "network-overview-client", sourceServers.map((server) => server.id).join(","), status.data?.updatedAt ?? 0],
    enabled: view === "overview" && canOverview && Boolean(status.data),
    refetchInterval: 30_000,
    queryFn: async () => {
      const details = await Promise.all(sourceServers.map(async (server) => {
        const [metrics, players] = await Promise.all([
          http.get<{ rows: Metric[] }>(api(`servers/${server.id}/metrics`)),
          http.get<{ rows: Player[] }>(api(`servers/${server.id}/players`)),
        ]);
        return { server, metrics: metrics.rows, players: players.rows };
      }));
      return buildClientNetworkOverview(status.data!, details);
    },
  });
  const audiencePlayers = query.useQuery<{ rows: NetworkPlayer[] }>({
    queryKey: [EXT, "network-players"],
    enabled: view === "players" && hasPlanAccess(access, "audience"),
    refetchInterval: 60_000,
    queryFn: () => http.get<{ rows: NetworkPlayer[] }>(api("network/players")),
  });
  const performance = query.useQuery<NetworkPerformance>({
    queryKey: [EXT, "network-performance"],
    enabled: view === "performance" && hasPlanAccess(access, "performance"),
    refetchInterval: 30_000,
    queryFn: () => {
      const to = Date.now();
      // The backend now follows GraphJSONCreator and returns optimized full
      // history; Highstock owns the viewport for 12h/24h/7d/30d/All.
      return http.get<NetworkPerformance>(api(`network/performance?all=true&to=${to}`));
    },
  });
  const health = query.useQuery<DatabaseHealth>({
    queryKey: [EXT, "database-health"],
    enabled: view === "database" && hasPlanAccess(access, "manage"),
    refetchInterval: 30_000,
    queryFn: () => http.get<DatabaseHealth>(api("health")),
  });
  const activity = query.useQuery<NetworkActivity>({
    queryKey: [EXT, "network-activity", activityDays],
    enabled: view === "activity" && hasPlanAccess(access, "activity"),
    refetchInterval: 60_000,
    queryFn: () => {
      const to = Date.now();
      const from = to - activityDays * 24 * 60 * 60 * 1000;
      return http.get<NetworkActivity>(api(`network/activity?from=${from}&to=${to}`));
    },
  });
  const playerbase = query.useQuery<Playerbase>({
    queryKey: [EXT, "network-playerbase", playerbaseDays],
    enabled: view === "playerbase" && hasPlanAccess(access, "audience"),
    refetchInterval: 60_000,
    queryFn: () => {
      const to = Date.now();
      const from = to - playerbaseDays * 24 * 60 * 60 * 1000;
      return http.get<Playerbase>(api(`network/playerbase?from=${from}&to=${to}`));
    },
  });
  const plugins = query.useQuery<{ rows: NetworkPlugin[] }>({
    queryKey: [EXT, "network-plugins"],
    enabled: view === "plugins" && hasPlanAccess(access, "plugins"),
    refetchInterval: 5 * 60_000,
    queryFn: () => http.get<{ rows: NetworkPlugin[] }>(api("network/plugins")),
  });
  const worlds = query.useQuery<NetworkWorlds>({
    queryKey: [EXT, "network-worlds"],
    enabled: view === "worlds" && hasPlanAccess(access, "worlds"),
    refetchInterval: 5 * 60_000,
    queryFn: () => http.get<NetworkWorlds>(api("network/worlds")),
  });
  const moderation = query.useQuery<{ allowlistBounces: AllowlistBounce[] }>({
    queryKey: [EXT, "network-moderation"],
    enabled: view === "moderation" && hasPlanAccess(access, "moderation"),
    refetchInterval: 60_000,
    queryFn: () => http.get<{ allowlistBounces: AllowlistBounce[] }>(api("network/moderation")),
  });
  const extensions = query.useQuery<{ serverValues: ServerExtensionValue[] }>({
    queryKey: [EXT, "network-extensions"],
    enabled: view === "extensions" && hasPlanAccess(access, "extensions"),
    refetchInterval: 5 * 60_000,
    queryFn: () => http.get<{ serverValues: ServerExtensionValue[] }>(api("network/extensions")),
  });
  const pluginHistory = query.useQuery<{ rows: PluginHistoryRow[] }>({
    queryKey: [EXT, "network-plugin-history"],
    enabled: view === "plugins" && hasPlanAccess(access, "plugins"),
    refetchInterval: 5 * 60_000,
    queryFn: () => http.get<{ rows: PluginHistoryRow[] }>(api("network/plugin-history")),
  });
  const playerProfile = query.useQuery<NetworkPlayerProfile>({
    queryKey: [EXT, "network-player", selectedPlayerUuid],
    enabled: view === "player" && Boolean(selectedPlayerUuid) && hasPlanAccess(access, "playerDetails"),
    queryFn: () => http.get<NetworkPlayerProfile>(api(`network/players/${selectedPlayerUuid}`)),
  });
  if (accessQuery.isLoading) return e(LoadingBlock, { text: "Проверка разрешений Plan в Kubek…" });
  if (accessQuery.isError || !access || !hasPlanAccess(access, "view")) return e(AccessDeniedBlock);
  if (status.isLoading) return e(LoadingBlock, { text: "Загрузка состояния Plan…" });
  if (status.isError || !status.data) return e(ErrorBlock, { text: "Не удалось получить состояние Plan." });

  const data = network.data;
  const summary = data?.summary;
  const activeServers = status.data.servers.filter((server) => server.status === "active");
  return e(
    "div",
    { className: "flex flex-col gap-5 p-4 md:p-6" },
    e(
      "div",
      { className: "flex flex-wrap items-start justify-between gap-3" },
      e("div", { className: "flex items-center gap-3" },
        e("div", { className: "rounded-lg border bg-muted/40 p-2.5" }, e(icons.ChartNoAxesCombined, { className: "size-6 text-primary" })),
        e("div", null, e("h1", { className: "text-xl font-semibold" }, "Аналитика Plan"), e("p", { className: "text-sm text-muted-foreground" }, "Единый обзор всех серверов, подключённых к общей базе Plan.")),
      ),
      e(ui.Badge, { variant: activeServers.length ? "default" : "secondary" }, `${activeServers.length}/${status.data.servers.length} серверов с актуальными метриками`),
    ),
    e("div", { className: "grid gap-5 lg:grid-cols-[15rem_minmax(0,1fr)]" },
      e(PlanSubNavigation, { view, onChange: setView, access, serverCount: status.data.servers.length, playerCount: summary?.players ?? 0, onRefresh: () => { status.refetch(); if (canOverview) network.refetch(); if (hasPlanAccess(access, "performance")) performance.refetch(); if (hasPlanAccess(access, "manage")) health.refetch(); if (hasPlanAccess(access, "activity")) activity.refetch(); if (hasPlanAccess(access, "audience")) { playerbase.refetch(); audiencePlayers.refetch(); } if (hasPlanAccess(access, "plugins")) { plugins.refetch(); pluginHistory.refetch(); } if (hasPlanAccess(access, "worlds")) worlds.refetch(); if (hasPlanAccess(access, "moderation")) moderation.refetch(); if (hasPlanAccess(access, "extensions")) extensions.refetch(); if (hasPlanAccess(access, "playerDetails")) playerProfile.refetch(); } }),
      e("main", { className: "min-w-0" },
        view === "overview" ? (canOverview ? (network.isLoading ? e(LoadingBlock, { text: "Загрузка обзора Plan…" }) : network.data ? e(NetworkOverviewPanel, { data: network.data }) : e(ErrorBlock, { text: "Не удалось загрузить обзор Plan." })) : e(AccessDeniedBlock)) : null,
        view === "performance" ? (hasPlanAccess(access, "performance") ? e(NetworkPerformancePanel, { data: performance.data, loading: performance.isLoading, error: performance.isError }) : e(AccessDeniedBlock)) : null,
        view === "activity" ? (hasPlanAccess(access, "activity") ? e(NetworkActivityPanel, { data: activity.data, loading: activity.isLoading, error: activity.isError, days: activityDays, onDaysChange: setActivityDays }) : e(AccessDeniedBlock)) : null,
        view === "playerbase" ? (hasPlanAccess(access, "audience") ? e(PlayerbasePanel, { data: playerbase.data, loading: playerbase.isLoading, error: playerbase.isError, days: playerbaseDays, onDaysChange: setPlayerbaseDays }) : e(AccessDeniedBlock)) : null,
        view === "plugins" ? (hasPlanAccess(access, "plugins") ? e(PluginsPanel, { rows: plugins.data?.rows, history: pluginHistory.data?.rows, loading: plugins.isLoading || pluginHistory.isLoading, error: plugins.isError || pluginHistory.isError }) : e(AccessDeniedBlock)) : null,
        view === "worlds" ? (hasPlanAccess(access, "worlds") ? e(WorldsPanel, { data: worlds.data, loading: worlds.isLoading, error: worlds.isError }) : e(AccessDeniedBlock)) : null,
        view === "moderation" ? (hasPlanAccess(access, "moderation") ? e(ModerationPanel, { rows: moderation.data?.allowlistBounces, loading: moderation.isLoading, error: moderation.isError }) : e(AccessDeniedBlock)) : null,
        view === "extensions" ? (hasPlanAccess(access, "extensions") ? e(ServerExtensionsPanel, { rows: extensions.data?.serverValues, loading: extensions.isLoading, error: extensions.isError }) : e(AccessDeniedBlock)) : null,
        view === "servers" ? e(NetworkServersPanel, { servers: status.data.servers }) : null,
        view === "players" ? (hasPlanAccess(access, "audience") ? (audiencePlayers.isLoading ? e(LoadingBlock, { text: "Загрузка списка игроков…" }) : audiencePlayers.data ? e(NetworkPlayersPanel, { players: audiencePlayers.data.rows, servers: status.data.servers, onOpenPlayer: hasPlanAccess(access, "playerDetails") ? (uuid: string) => { setSelectedPlayerUuid(uuid); setView("player"); } : undefined }) : e(ErrorBlock, { text: "Не удалось загрузить список игроков." })) : e(AccessDeniedBlock)) : null,
        view === "player" ? (hasPlanAccess(access, "playerDetails") ? e(NetworkPlayerProfilePage, { data: playerProfile.data, loading: playerProfile.isLoading, error: playerProfile.isError, access, onBack: () => setView("players") }) : e(AccessDeniedBlock)) : null,
        view === "database" ? (hasPlanAccess(access, "manage") ? e(DatabaseHealthPanel, { data: health.data, loading: health.isLoading, error: health.isError }) : e(AccessDeniedBlock)) : null,
      ),
    ),
  );
}

function PlanSubNavigation(props: { view: PlanNetworkView; onChange: (view: PlanNetworkView) => void; access: PlanAccess; serverCount: number; playerCount: number; onRefresh: () => void }) {
  const { React, ui, icons } = window.Kubek!;
  const e = React.createElement;
  const canOverview = hasPlanAccess(props.access, "performance") && hasPlanAccess(props.access, "audience");
  const groups: Array<{ label: string; items: Array<{ id: PlanNetworkView; label: string; icon: unknown }> }> = [
    { label: "ОБЗОР", items: canOverview ? [{ id: "overview" as PlanNetworkView, label: "Сеть", icon: icons.LayoutDashboard }] : [] },
    { label: "СЕРВЕРЫ", items: [
      { id: "servers" as PlanNetworkView, label: `Серверы · ${props.serverCount}`, icon: icons.Server },
      ...(hasPlanAccess(props.access, "activity") ? [{ id: "activity" as PlanNetworkView, label: "Сессии и PvP", icon: icons.Activity }] : []),
      ...(hasPlanAccess(props.access, "performance") ? [{ id: "performance" as PlanNetworkView, label: "Производительность", icon: icons.Cpu }] : []),
    ] },
    { label: "АУДИТОРИЯ", items: hasPlanAccess(props.access, "audience") ? [
      { id: "playerbase" as PlanNetworkView, label: "Рост аудитории", icon: icons.UserRoundCheck },
      { id: "players" as PlanNetworkView, label: `Игроки · ${props.playerCount}`, icon: icons.Users },
    ] : [] },
    { label: "МИРЫ", items: hasPlanAccess(props.access, "worlds") ? [{ id: "worlds" as PlanNetworkView, label: "Миры и режимы", icon: icons.Map }] : [] },
    { label: "ПЛАГИНЫ", items: [
      ...(hasPlanAccess(props.access, "plugins") ? [{ id: "plugins" as PlanNetworkView, label: "Версии плагинов", icon: icons.Puzzle }] : []),
      ...(hasPlanAccess(props.access, "extensions") ? [{ id: "extensions" as PlanNetworkView, label: "Интеграции серверов", icon: icons.PlugZap }] : []),
    ] },
    { label: "МОДЕРАЦИЯ", items: hasPlanAccess(props.access, "moderation") ? [{ id: "moderation" as PlanNetworkView, label: "Whitelist и статусы", icon: icons.ShieldCheck }] : [] },
    { label: "СИСТЕМА", items: hasPlanAccess(props.access, "manage") ? [{ id: "database" as PlanNetworkView, label: "Общая SQLite", icon: icons.Database }] : [] },
  ].filter((group) => group.items.length > 0);
  return e("aside", { className: "h-fit rounded-xl border bg-card p-2 shadow-sm lg:sticky lg:top-4" },
    e("div", { className: "border-b px-2 pb-3 pt-1" }, e("p", { className: "text-sm font-semibold" }, "Plan Analytics"), e("p", { className: "mt-0.5 text-xs text-muted-foreground" }, "Сетевая аналитика")),
    e("nav", { className: "mt-2 flex gap-1 overflow-x-auto lg:flex-col" }, groups.map((group) => e("div", { key: group.label, className: "min-w-[11rem] px-1 py-2 lg:min-w-0" },
      e("p", { className: "px-2 pb-1 text-[10px] font-semibold tracking-wider text-muted-foreground" }, group.label),
      group.items.map((item) => e("button", { key: item.id, type: "button", onClick: () => props.onChange(item.id), className: `flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors ${props.view === item.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}` }, e(item.icon as any, { className: "size-4 shrink-0" }), e("span", { className: "truncate" }, item.label))),
    ))),
    e("div", { className: "mt-2 border-t px-1 pt-2" }, e(ui.Button, { size: "sm", variant: "ghost", className: "w-full justify-start", onClick: props.onRefresh }, e(icons.RefreshCw, { className: "size-3.5" }), "Обновить данные")),
  );
}

function buildClientNetworkOverview(status: StatusResponse, details: Array<{ server: ServerStatus; metrics: Metric[]; players: Player[] }>): NetworkOverview {
  const playerMap = new Map<string, NetworkPlayer>();
  const trend = new Map<number, { tpsTotal: number; tpsCount: number; players: number; cpu: number; ram: number; entities: number; chunks: number; freeDisk: number }>();
  let activePlaytime = 0;
  let deaths = 0;
  let mobKills = 0;

  for (const detail of details) {
    for (const player of detail.players) {
      const existing = playerMap.get(player.uuid);
      const planServerUuid = detail.server.binding?.plan_server_uuid ?? null;
      if (existing) {
        existing.active_playtime += Number(player.active_playtime ?? 0);
        existing.deaths += Number(player.deaths ?? 0);
        existing.mob_kills += Number(player.mob_kills ?? 0);
        existing.server_count += 1;
        if (Number(player.last_seen ?? 0) > Number(existing.last_seen ?? 0)) {
          existing.last_seen = player.last_seen;
          existing.latest_server_uuid = planServerUuid;
          existing.name = player.name;
        }
      } else {
        playerMap.set(player.uuid, { ...player, server_count: 1, latest_server_uuid: planServerUuid });
      }
      activePlaytime += Number(player.active_playtime ?? 0);
      deaths += Number(player.deaths ?? 0);
      mobKills += Number(player.mob_kills ?? 0);
    }
    for (const metric of detail.metrics) {
      const minute = Math.floor(Number(metric.date) / 60_000) * 60_000;
      const bucket = trend.get(minute) ?? { tpsTotal: 0, tpsCount: 0, players: 0, cpu: 0, ram: 0, entities: 0, chunks: 0, freeDisk: Number.POSITIVE_INFINITY };
      bucket.tpsTotal += Number(metric.tps ?? 0);
      bucket.tpsCount += 1;
      bucket.players += Number(metric.players_online ?? 0);
      bucket.cpu += Number(metric.cpu_usage ?? 0);
      bucket.ram += Number(metric.ram_usage ?? 0);
      bucket.entities += Number(metric.entities ?? 0);
      bucket.chunks += Number(metric.chunks_loaded ?? 0);
      bucket.freeDisk = Math.min(bucket.freeDisk, Number(metric.free_disk_space ?? 0));
      trend.set(minute, bucket);
    }
  }

  const fresh = status.servers.filter((server) => server.status === "active").map((server) => server.latest).filter((metric): metric is Metric => Boolean(metric));
  const trendRows = [...trend.entries()].sort(([left], [right]) => left - right).map(([date, bucket]) => ({
    date,
    tps: bucket.tpsCount ? bucket.tpsTotal / bucket.tpsCount : 0,
    players_online: bucket.players,
    cpu_usage: bucket.cpu,
    ram_usage: bucket.ram,
    entities: bucket.entities,
    chunks_loaded: bucket.chunks,
    free_disk_space: Number.isFinite(bucket.freeDisk) ? bucket.freeDisk : 0,
    mspt_average: null,
  }));
  return {
    schemaReady: status.schemaReady,
    generatedAt: Date.now(),
    servers: status.servers,
    summary: {
      players: playerMap.size,
      sessions: 0,
      active_playtime: activePlaytime,
      deaths,
      mob_kills: mobKills,
      online: fresh.reduce((sum, metric) => sum + Number(metric.players_online ?? 0), 0),
      average_tps: fresh.length ? fresh.reduce((sum, metric) => sum + Number(metric.tps ?? 0), 0) / fresh.length : null,
      cpu_usage: fresh.reduce((sum, metric) => sum + Number(metric.cpu_usage ?? 0), 0),
      ram_usage: fresh.reduce((sum, metric) => sum + Number(metric.ram_usage ?? 0), 0),
      entities: fresh.reduce((sum, metric) => sum + Number(metric.entities ?? 0), 0),
      chunks_loaded: fresh.reduce((sum, metric) => sum + Number(metric.chunks_loaded ?? 0), 0),
      free_disk_space: fresh.length ? Math.min(...fresh.map((metric) => Number(metric.free_disk_space ?? 0))) : null,
    },
    trend: trendRows,
    players: [...playerMap.values()].sort((left, right) => Number(right.last_seen ?? 0) - Number(left.last_seen ?? 0)),
  };
}

function NetworkOverviewPanel(props: { data: NetworkOverview }) {
  const { React, ui, icons } = window.Kubek!;
  const e = React.createElement;
  const { summary, trend, servers } = props.data;
  return e(
    "div",
    { className: "flex flex-col gap-4" },
    e("div", { className: "grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8" },
      e(MetricCard, { icon: icons.Users, label: "Уникальные игроки", value: String(summary.players), hint: "На всех серверах" }),
      e(MetricCard, { icon: icons.UserRoundCheck, label: "Онлайн", value: String(summary.online), hint: "Свежие сэмплы" }),
      e(MetricCard, { icon: icons.Gauge, label: "Средний TPS", value: summary.average_tps?.toFixed(2) ?? "—", hint: "Активные серверы" }),
      e(MetricCard, { icon: icons.Clock3, label: "Активное время", value: formatDuration(summary.active_playtime), hint: "Все сессии" }),
      e(MetricCard, { icon: icons.Swords, label: "Убийства мобов", value: String(summary.mob_kills), hint: "Все серверы" }),
      e(MetricCard, { icon: icons.Skull, label: "Смерти", value: String(summary.deaths), hint: "Все серверы" }),
      e(MetricCard, { icon: icons.Box, label: "Сущности", value: String(summary.entities), hint: "Свежие сэмплы" }),
      e(MetricCard, { icon: icons.HardDrive, label: "Диск", value: formatMegabytes(summary.free_disk_space), hint: "Минимум свободно" }),
    ),
    e("div", { className: "grid gap-4 xl:grid-cols-2" },
      e(TrendCard, { title: "TPS сети за 24 часа", subtitle: "Среднее по записям серверов", rows: trend, value: (point: Metric) => point.tps, color: "hsl(var(--primary))", formatter: (value: number) => value.toFixed(2) }),
      e(TrendCard, { title: "Онлайн сети за 24 часа", subtitle: "Сумма по серверам", rows: trend, value: (point: Metric) => point.players_online, color: "hsl(142 71% 45%)", formatter: (value: number) => String(Math.round(value)) }),
    ),
    e(ui.Card, null,
      e(ui.CardHeader, { className: "flex flex-row items-center justify-between gap-3 pb-2" }, e("div", null, e(ui.CardTitle, { className: "text-base" }, "Состояние серверов"), e("p", { className: "mt-1 text-xs text-muted-foreground" }, "Свежие метрики учитываются в общем онлайн и TPS.")), e(ui.Badge, { variant: "secondary" }, `${servers.filter((server) => server.status === "active").length} активных`)),
      e(ui.CardContent, { className: "overflow-x-auto" }, e(NetworkServerTable, { servers: servers.slice(0, 8) })),
    ),
  );
}

type PerformanceMetric = "players_online" | "tps" | "cpu_usage" | "ram_usage" | "entities" | "chunks_loaded" | "free_disk_space";

type PlanAxis = {
  opposite?: boolean;
  softMin: number;
  softMax?: number;
  labels: { formatter: () => string };
};

const PLAN_STOCK_BUTTONS = [
  { type: "hour", count: 12, text: "12h" },
  { type: "hour", count: 24, text: "24h" },
  { type: "day", count: 7, text: "7d" },
  { type: "month", count: 1, text: "30d" },
  { type: "all", text: "All" },
];

// Exact dark graph palette from Plan's src/util/graphColors.js.
const PLAN_STOCK_DARK_THEME = {
  chart: { backgroundColor: null, plotBorderColor: "#606063" },
  xAxis: {
    gridLineColor: "#707073",
    labels: { style: { color: "#eee8d5" } },
    lineColor: "#707073",
    minorGridLineColor: "#505053",
    tickColor: "#707073",
  },
  yAxis: {
    gridLineColor: "#707073",
    labels: { style: { color: "#eee8d5" } },
    lineColor: "#707073",
    minorGridLineColor: "#505053",
    tickColor: "#707073",
    tickWidth: 1,
  },
  tooltip: { backgroundColor: "#44475a", style: { color: "#eee8d5" } },
  plotOptions: { series: { dataLabels: { color: "#B0B0B3" }, marker: { lineColor: "#333" } } },
  legend: {
    itemStyle: { color: "#eee8d5" },
    itemHoverStyle: { color: "#eee8d5" },
    itemHiddenStyle: { color: "#606063" },
  },
  rangeSelector: {
    buttonTheme: {
      fill: "#505053", stroke: "#646e8c", style: { color: "#CCC" },
      states: {
        hover: { fill: "#646e9d", stroke: "#646e8c", style: { color: "white" } },
        select: { fill: "#646e9d", stroke: "#646e8c", style: { color: "white" } },
      },
    },
    inputBoxBorderColor: "#505053",
    inputStyle: { backgroundColor: "#333", color: "silver" },
    labelStyle: { color: "silver" },
  },
  navigator: {
    handles: { backgroundColor: "#666", borderColor: "#AAA" },
    outlineColor: "#CCC",
    maskFill: "rgba(255,255,255,0.1)",
    series: { lineColor: "#A6C7ED" },
    xAxis: { gridLineColor: "#505053" },
  },
  scrollbar: {
    barBackgroundColor: "#808083", barBorderColor: "#808083",
    buttonArrowColor: "#CCC", buttonBackgroundColor: "#606063", buttonBorderColor: "#606063",
    rifleColor: "#FFF", trackBackgroundColor: "#404043", trackBorderColor: "#404043",
  },
};

let planStockModulesReady = false;

function planStock(): any {
  const raw = (HighstockRuntime as any)?.default ?? HighstockRuntime;
  const instance = typeof raw === "function" && !raw.stockChart ? raw(window) : raw;
  if (!planStockModulesReady) {
    const noData = (NoDataRuntime as any)?.default ?? NoDataRuntime;
    const accessibility = (AccessibilityRuntime as any)?.default ?? AccessibilityRuntime;
    if (typeof noData === "function") noData(instance);
    if (typeof accessibility === "function") accessibility(instance);
    planStockModulesReady = true;
  }
  return instance;
}

function PlanHighstockGraph(props: { rows: NetworkPerformanceSeriesRow[]; metric: PerformanceMetric; yAxis: PlanAxis; color: string; zones?: Array<{ value: number; color: string }> }) {
  const { React } = window.Kubek!;
  const e = React.createElement;
  const container = React.useRef(null as HTMLDivElement | null);
  React.useEffect(() => {
    if (!container.current) return undefined;
    const Highcharts = planStock();
    if (!Highcharts?.stockChart) return undefined;
    const seriesByServer = new Map<string, { name: string; data: Array<[number, number]> }>();
    for (const row of props.rows) {
      const value = Number(row[props.metric]);
      if (!Number.isFinite(value) || !Number.isFinite(Number(row.date))) continue;
      const known = seriesByServer.get(row.server_uuid) ?? { name: row.server_name ?? row.server_uuid.slice(0, 8), data: [] };
      // This is the exact minuteResolution operation in PerformanceGraphsCard.
      const timestamp = Number(row.date) - (Number(row.date) % 60_000);
      known.data.push([timestamp, value]);
      seriesByServer.set(row.server_uuid, known);
    }
    Highcharts.setOptions({ lang: { noData: "Нет данных для отображения" } });
    Highcharts.setOptions(PLAN_STOCK_DARK_THEME);
    const chart = Highcharts.stockChart(container.current, {
      chart: { noData: "Нет данных для отображения" },
      rangeSelector: { selected: 2, buttons: PLAN_STOCK_BUTTONS },
      yAxis: props.yAxis,
      title: { text: "" },
      legend: { enabled: true },
      series: [...seriesByServer.values()].map((entry) => ({
        name: entry.name,
        type: "spline",
        tooltip: { valueDecimals: props.metric === "tps" || props.metric === "cpu_usage" ? 2 : 0 },
        data: entry.data,
        color: props.color,
        zones: props.zones,
        yAxis: 0,
      })),
    });
    return () => chart.destroy();
  }, [props.rows, props.metric, props.yAxis, props.color, props.zones]);
  return e("div", { ref: container, className: "chart-area", style: { height: "450px", width: "100%" } });
}

function NetworkPerformancePanel(props: { data?: NetworkPerformance; loading: boolean; error: boolean }) {
  const { React, ui, icons } = window.Kubek!;
  const e = React.createElement;
  const [metric, setMetric] = React.useState("players_online" as PerformanceMetric);
  if (props.loading) return e(LoadingBlock, { text: "Загрузка производительности сети…" });
  if (props.error || !props.data) return e(ErrorBlock, { text: "Не удалось загрузить производительность. Проверьте, что Plan записывает метрики в общую SQLite-базу." });
  const { current, series } = props.data;
  const tabs: Array<{ id: PerformanceMetric; label: string; icon: any; color: string; yAxis: PlanAxis; zones?: Array<{ value: number; color: string }> }> = [
    { id: "players_online", label: "Онлайн", icon: icons.Users, color: "#1E90FF", yAxis: { labels: { formatter: function(this: any) { return `${this.value} P`; } }, softMin: 0, softMax: 2 } },
    { id: "tps", label: "TPS", icon: icons.Gauge, color: "#267F00", yAxis: { opposite: true, labels: { formatter: function(this: any) { return `${this.value} TPS`; } }, softMin: 0, softMax: 20 }, zones: [{ value: 10, color: "#b74343" }, { value: 18, color: "#e5cc12" }, { value: 30, color: "#267F00" }] },
    { id: "cpu_usage", label: "CPU", icon: icons.Cpu, color: "#e0d264", yAxis: { opposite: true, labels: { formatter: function(this: any) { return `${this.value}%`; } }, softMin: 0, softMax: 100 } },
    { id: "ram_usage", label: "RAM", icon: icons.MemoryStick, color: "#7dcc24", yAxis: { labels: { formatter: function(this: any) { return `${this.value} MB`; } }, softMin: 0 } },
    { id: "entities", label: "Сущности", icon: icons.Box, color: "#ac69ef", yAxis: { opposite: true, labels: { formatter: function(this: any) { return `${this.value} E`; } }, softMin: 0, softMax: 2 } },
    { id: "chunks_loaded", label: "Чанки", icon: icons.Layers3, color: "#b58310", yAxis: { labels: { formatter: function(this: any) { return `${this.value} C`; } }, softMin: 0 } },
    { id: "free_disk_space", label: "Диск", icon: icons.HardDrive, color: "#267F00", yAxis: { labels: { formatter: function(this: any) { return `${this.value} MB`; } }, softMin: 0 }, zones: [{ value: 100, color: "#b74343" }, { value: 500, color: "#e5cc12" }, { value: Number.MAX_VALUE, color: "#267F00" }] },
  ];
  const active = tabs.find((tab) => tab.id === metric) ?? tabs[0];
  return e("div", { className: "flex flex-col gap-4" },
    e(ui.Card, { className: "overflow-hidden" },
      e(ui.CardHeader, { className: "border-b pb-0" },
        e(ui.CardTitle, { className: "px-1 pb-3 text-base" }, "Графики производительности"),
        e("div", { className: "-mx-6 flex max-w-full overflow-x-auto px-6" }, tabs.map((tab) => e("button", { key: tab.id, type: "button", onClick: () => setMetric(tab.id), className: `flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm transition-colors ${metric === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}` }, e(tab.icon, { className: "size-4" }), tab.label))),
      ),
      e(ui.CardContent, { className: "pt-2" }, e(PlanHighstockGraph, { rows: series, metric: active.id, yAxis: active.yAxis, color: active.color, zones: active.zones })),
    ),
    e("div", { className: "grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7" },
      e(MetricCard, { icon: icons.Gauge, label: "TPS", value: current.average_tps?.toFixed(2) ?? "—", hint: "Активные серверы" }),
      e(MetricCard, { icon: icons.Users, label: "Онлайн", value: String(current.online), hint: "Свежие сэмплы" }),
      e(MetricCard, { icon: icons.Cpu, label: "CPU", value: `${current.cpu_usage.toFixed(1)}%`, hint: "Сумма серверов" }),
      e(MetricCard, { icon: icons.MemoryStick, label: "RAM", value: `${Math.round(current.ram_usage)} MB`, hint: "Сумма серверов" }),
      e(MetricCard, { icon: icons.Box, label: "Сущности", value: String(current.entities), hint: "Сумма серверов" }),
      e(MetricCard, { icon: icons.Layers3, label: "Чанки", value: String(current.chunks_loaded), hint: "Загружено" }),
      e(MetricCard, { icon: icons.HardDrive, label: "Диск", value: formatMegabytes(current.free_disk_space), hint: "Минимум свободно" }),
    ),
  );
}

function DatabaseHealthPanel(props: { data?: DatabaseHealth; loading: boolean; error: boolean }) {
  const { React, ui, icons } = window.Kubek!;
  const e = React.createElement;
  if (props.loading) return e(LoadingBlock, { text: "Проверка общей SQLite-базы…" });
  if (props.error || !props.data) return e(ErrorBlock, { text: "Не удалось получить состояние общей SQLite-базы." });
  const data = props.data;
  const healthy = data.schemaReady && data.journalMode === "wal";
  return e("div", { className: "flex flex-col gap-4" },
    e("div", null, e("h2", { className: "text-base font-semibold" }, "Состояние общей базы"), e("p", { className: "text-sm text-muted-foreground" }, "Read-only диагностика файла, WAL и свежести данных. Проверка не делает checkpoint и не блокирует Paper-серверы.")),
    e("div", { className: "grid grid-cols-2 gap-3 md:grid-cols-4" },
      e(MetricCard, { icon: icons.Database, label: "Режим журнала", value: data.journalMode.toUpperCase(), hint: healthy ? "Подходит для общей SQLite" : "Проверьте WAL" }),
      e(MetricCard, { icon: icons.FileStack, label: "Основной файл", value: `${Math.round(data.fileSizeBytes / 1024)} KB`, hint: `${data.pageCount} стр. × ${data.pageSize} B` }),
      e(MetricCard, { icon: icons.ScrollText, label: "WAL", value: `${Math.round(data.walSizeBytes / 1024)} KB`, hint: "Файл журнала записи" }),
      e(MetricCard, { icon: icons.Timer, label: "Ожидание записи", value: `${data.busyTimeoutMs / 1000} с`, hint: "busy_timeout" }),
    ),
    e(ui.Card, null, e(ui.CardHeader, { className: "pb-2" }, e(ui.CardTitle, { className: "text-base" }, "Свежесть общей аналитики")), e(ui.CardContent, null,
      e("div", { className: "grid gap-3 md:grid-cols-2" },
        e("div", { className: "rounded-lg border p-3" }, e("p", { className: "text-xs text-muted-foreground" }, "Последний TPS-сэмпл Plan"), e("p", { className: "mt-1 font-medium" }, formatDate(data.latestMetricAt)), e("p", { className: "mt-1 text-xs text-muted-foreground" }, formatRelativeTime(data.latestMetricAt))),
        e("div", { className: "rounded-lg border p-3" }, e("p", { className: "text-xs text-muted-foreground" }, "Последний Agent heartbeat"), e("p", { className: "mt-1 font-medium" }, formatDate(data.latestAgentHeartbeatAt)), e("p", { className: "mt-1 text-xs text-muted-foreground" }, data.latestAgentHeartbeatAt ? formatRelativeTime(data.latestAgentHeartbeatAt) : "Появится после установки Agent 1.1.0")),
      ),
    )),
  );
}

function NetworkActivityPanel(props: { data?: NetworkActivity; loading: boolean; error: boolean; days: number; onDaysChange: (days: number) => void }) {
  const { React, ui, icons } = window.Kubek!;
  const e = React.createElement;
  if (props.loading) return e(LoadingBlock, { text: "Загрузка сессий и боевой активности…" });
  if (props.error || !props.data) return e(ErrorBlock, { text: "Не удалось загрузить сессии. После установки обновления перезапустите Kubek и включите расширение." });
  const { summary, sessions, kills } = props.data;
  return e(
    "div",
    { className: "flex flex-col gap-4" },
    e("div", { className: "flex flex-wrap items-center justify-between gap-3" },
      e("div", null, e("h2", { className: "text-base font-semibold" }, "Активность сети"), e("p", { className: "text-sm text-muted-foreground" }, "Сессии, AFK и PvP/PvE по всем привязанным серверам.")),
      e("select", { className: "h-9 rounded-md border border-input bg-background px-3 text-sm", value: String(props.days), onChange: (event: { target: { value: string } }) => props.onDaysChange(Number(event.target.value)) },
        e("option", { value: "1" }, "За 24 часа"),
        e("option", { value: "7" }, "За 7 дней"),
        e("option", { value: "30" }, "За 30 дней"),
      ),
    ),
    e("div", { className: "grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8" },
      e(MetricCard, { icon: icons.Users, label: "Игроки", value: String(summary.unique_players), hint: "За период" }),
      e(MetricCard, { icon: icons.UserPlus, label: "Новые", value: String(summary.new_players), hint: "Первый вход" }),
      e(MetricCard, { icon: icons.LogIn, label: "Сессии", value: String(summary.sessions), hint: "Завершённые" }),
      e(MetricCard, { icon: icons.Clock3, label: "Активно", value: formatDuration(summary.active_playtime), hint: "Без AFK" }),
      e(MetricCard, { icon: icons.Timer, label: "AFK", value: formatDuration(summary.afk_time), hint: "За период" }),
      e(MetricCard, { icon: icons.Swords, label: "PvP", value: String(summary.pvp_kills), hint: "Убийства игроков" }),
      e(MetricCard, { icon: icons.Skull, label: "Смерти", value: String(summary.deaths), hint: "Все причины" }),
      e(MetricCard, { icon: icons.Target, label: "PvE", value: String(summary.mob_kills), hint: "Убийства мобов" }),
    ),
    e("div", { className: "grid gap-4 xl:grid-cols-2" },
      e(ui.Card, null,
        e(ui.CardHeader, { className: "pb-2" }, e(ui.CardTitle, { className: "text-base" }, "Последние сессии"), e("p", { className: "mt-1 text-xs text-muted-foreground" }, "До 50 последних завершённых сессий в выбранном периоде.")),
        e(ui.CardContent, { className: "max-h-[30rem] overflow-auto" },
          sessions.length ? e("table", { className: "w-full text-sm" },
            e("thead", { className: "sticky top-0 border-b bg-card text-left text-xs text-muted-foreground" }, e("tr", null, e("th", { className: "pb-2 pr-3 font-medium" }, "Игрок"), e("th", { className: "pb-2 pr-3 font-medium" }, "Сервер"), e("th", { className: "pb-2 pr-3 font-medium" }, "Активно"), e("th", { className: "pb-2 pr-3 font-medium" }, "AFK"), e("th", { className: "pb-2 font-medium" }, "Завершение"))),
            e("tbody", null, sessions.map((session) => e("tr", { key: session.id, className: "border-b last:border-0" },
              e("td", { className: "py-2 pr-3 font-medium" }, session.player_name),
              e("td", { className: "py-2 pr-3 text-muted-foreground" }, session.server_name ?? "—"),
              e("td", { className: "py-2 pr-3 tabular-nums" }, formatDuration(session.active_playtime)),
              e("td", { className: "py-2 pr-3 tabular-nums" }, formatDuration(session.afk_time)),
              e("td", { className: "py-2 text-muted-foreground" }, formatRelativeTime(session.session_end)),
            ))),
          ) : e("p", { className: "py-6 text-sm text-muted-foreground" }, "В выбранном периоде завершённых сессий нет."),
        ),
      ),
      e(ui.Card, null,
        e(ui.CardHeader, { className: "pb-2" }, e(ui.CardTitle, { className: "text-base" }, "Последние PvP-события"), e("p", { className: "mt-1 text-xs text-muted-foreground" }, "Plan фиксирует убийства игроков; текст чата и лишние персональные данные не выводятся.")),
        e(ui.CardContent, { className: "max-h-[30rem] overflow-auto" },
          kills.length ? e("div", { className: "flex flex-col" }, kills.map((kill) => e("div", { key: kill.id, className: "flex items-start justify-between gap-3 border-b py-3 last:border-0" },
            e("div", null, e("p", { className: "text-sm" }, e("span", { className: "font-medium" }, kill.killer_name), " → ", e("span", { className: "font-medium" }, kill.victim_name)), e("p", { className: "mt-1 text-xs text-muted-foreground" }, `${kill.server_name ?? "—"}${kill.weapon ? ` · ${kill.weapon}` : ""}`)),
            e("span", { className: "shrink-0 text-xs text-muted-foreground" }, formatRelativeTime(kill.date)),
          ))) : e("p", { className: "py-6 text-sm text-muted-foreground" }, "PvP-убийств в выбранном периоде нет."),
        ),
      ),
    ),
  );
}

function PlayerbasePanel(props: { data?: Playerbase; loading: boolean; error: boolean; days: number; onDaysChange: (days: number) => void }) {
  const { React, ui, icons } = window.Kubek!;
  const e = React.createElement;
  if (props.loading) return e(LoadingBlock, { text: "Загрузка динамики аудитории…" });
  if (props.error || !props.data) return e(ErrorBlock, { text: "Не удалось загрузить аудиторию. После обновления расширения перезапустите Kubek и включите Plan Bridge." });
  const { summary, trend } = props.data;
  const activeValues = trend.map((point) => point.active_players);
  const newValues = trend.map((point) => point.new_players);
  return e("div", { className: "flex flex-col gap-4" },
    e("div", { className: "flex flex-wrap items-center justify-between gap-3" },
      e("div", null, e("h2", { className: "text-base font-semibold" }, "Аудитория сети"), e("p", { className: "text-sm text-muted-foreground" }, "Новые, вернувшиеся и активные игроки по данным сессий Plan.")),
      e("select", { className: "h-9 rounded-md border border-input bg-background px-3 text-sm", value: String(props.days), onChange: (event: { target: { value: string } }) => props.onDaysChange(Number(event.target.value)) },
        e("option", { value: "7" }, "За 7 дней"), e("option", { value: "14" }, "За 14 дней"), e("option", { value: "30" }, "За 30 дней"),
      ),
    ),
    e("div", { className: "grid grid-cols-1 gap-3 md:grid-cols-3" },
      e(MetricCard, { icon: icons.Users, label: "Активные игроки", value: String(summary.active_players), hint: "За выбранный период" }),
      e(MetricCard, { icon: icons.UserPlus, label: "Новые игроки", value: String(summary.new_players), hint: "Первый вход в Plan" }),
      e(MetricCard, { icon: icons.RotateCcw, label: "Вернувшиеся", value: String(summary.returning_players), hint: "Зарегистрированы ранее" }),
    ),
    e("div", { className: "grid gap-4 xl:grid-cols-2" },
      e(ui.Card, null, e(ui.CardContent, { className: "py-4" }, e("div", { className: "mb-3 flex justify-between gap-3" }, e("div", null, e("p", { className: "text-sm font-medium" }, "Активные игроки"), e("p", { className: "text-xs text-muted-foreground" }, "Уникальные игроки по дням")), e("span", { className: "text-lg font-semibold tabular-nums" }, activeValues.length ? String(activeValues[activeValues.length - 1]) : "—")), activeValues.length ? e(Sparkline, { values: activeValues, color: "hsl(var(--primary))" }) : e("p", { className: "py-8 text-center text-sm text-muted-foreground" }, "Пока нет данных"))),
      e(ui.Card, null, e(ui.CardContent, { className: "py-4" }, e("div", { className: "mb-3 flex justify-between gap-3" }, e("div", null, e("p", { className: "text-sm font-medium" }, "Новые игроки"), e("p", { className: "text-xs text-muted-foreground" }, "Первое появление в Plan по дням")), e("span", { className: "text-lg font-semibold tabular-nums" }, newValues.length ? String(newValues[newValues.length - 1]) : "—")), newValues.length ? e(Sparkline, { values: newValues, color: "hsl(142 71% 45%)" }) : e("p", { className: "py-8 text-center text-sm text-muted-foreground" }, "Пока нет данных"))),
    ),
  );
}

function PluginsPanel(props: { rows?: NetworkPlugin[]; history?: PluginHistoryRow[]; loading: boolean; error: boolean }) {
  const { React, ui, icons } = window.Kubek!;
  const e = React.createElement;
  if (props.loading) return e(LoadingBlock, { text: "Загрузка списка плагинов…" });
  if (props.error) return e(ErrorBlock, { text: "Не удалось загрузить историю плагинов Plan." });
  const rows = props.rows ?? [];
  const history = props.history ?? [];
  return e("div", { className: "grid gap-4" },
    e(ui.Card, null,
    e(ui.CardHeader, { className: "flex flex-row items-center justify-between gap-3" }, e("div", null, e(ui.CardTitle, { className: "text-base" }, "Плагины сети"), e("p", { className: "mt-1 text-sm text-muted-foreground" }, "Plan фиксирует версии установленных плагинов на привязанных серверах.")), e(ui.Badge, { variant: "secondary" }, `${rows.length} плагинов`)),
    e(ui.CardContent, { className: "overflow-x-auto" }, rows.length ? e("table", { className: "w-full text-sm" },
      e("thead", { className: "border-b text-left text-xs text-muted-foreground" }, e("tr", null, e("th", { className: "pb-2 pr-4 font-medium" }, "Плагин"), e("th", { className: "pb-2 pr-4 font-medium" }, "Версии"), e("th", { className: "pb-2 pr-4 font-medium" }, "Серверы"), e("th", { className: "pb-2 font-medium" }, "Последняя запись"))),
      e("tbody", null, rows.map((plugin) => e("tr", { key: plugin.plugin_name, className: "border-b last:border-0" },
        e("td", { className: "py-2.5 pr-4" }, e("div", { className: "flex items-center gap-2" }, e(icons.Puzzle, { className: "size-4 text-muted-foreground" }), e("span", { className: "font-medium" }, plugin.plugin_name))),
        e("td", { className: "py-2.5 pr-4 font-mono text-xs" }, plugin.versions),
        e("td", { className: "py-2.5 pr-4 text-muted-foreground" }, `${plugin.server_count}: ${plugin.servers}`),
        e("td", { className: "py-2.5 text-muted-foreground" }, formatRelativeTime(plugin.last_seen)),
      ))),
    ) : e("p", { className: "py-8 text-sm text-muted-foreground" }, "Plan ещё не записал историю версий плагинов.")),
    ),
    e(ui.Card, null,
      e(ui.CardHeader, null, e(ui.CardTitle, { className: "text-base" }, "История изменений версий"), e("p", { className: "mt-1 text-sm text-muted-foreground" }, "Последние 1000 зафиксированных изменений плагинов на привязанных серверах.")),
      e(ui.CardContent, { className: "max-h-[32rem] overflow-auto" }, history.length ? e("table", { className: "w-full text-sm" },
        e("thead", { className: "sticky top-0 border-b bg-card text-left text-xs text-muted-foreground" }, e("tr", null, e("th", { className: "p-2 pr-4 font-medium" }, "Время"), e("th", { className: "p-2 pr-4 font-medium" }, "Плагин"), e("th", { className: "p-2 pr-4 font-medium" }, "Версия"), e("th", { className: "p-2 font-medium" }, "Сервер"))),
        e("tbody", null, history.map((entry, index) => e("tr", { key: `${entry.server_uuid}-${entry.plugin_name}-${entry.modified}-${index}`, className: "border-b last:border-0" }, e("td", { className: "p-2 pr-4 text-muted-foreground" }, formatDate(entry.modified)), e("td", { className: "p-2 pr-4 font-medium" }, entry.plugin_name), e("td", { className: "p-2 pr-4 font-mono text-xs" }, entry.version ?? "—"), e("td", { className: "p-2" }, entry.server_name ?? entry.server_uuid.slice(0, 8))))),
      ) : e("p", { className: "py-6 text-sm text-muted-foreground" }, "Изменений версий пока нет.")),
    ),
  );
}

function WorldsPanel(props: { data?: NetworkWorlds; loading: boolean; error: boolean }) {
  const { React, ui, icons } = window.Kubek!;
  const e = React.createElement;
  if (props.loading) return e(LoadingBlock, { text: "Загрузка миров и режимов…" });
  if (props.error || !props.data) return e(ErrorBlock, { text: "Не удалось загрузить статистику миров Plan." });
  const modes = props.data.gameModes;
  const modeRows = modes ? [["Survival", modes.survival_time], ["Creative", modes.creative_time], ["Adventure", modes.adventure_time], ["Spectator", modes.spectator_time]] : [];
  return e("div", { className: "flex flex-col gap-4" },
    e("div", { className: "grid grid-cols-2 gap-3 md:grid-cols-4" }, modeRows.map(([name, value]) => e(MetricCard, { key: String(name), icon: icons.Map, label: String(name), value: formatDuration(Number(value)), hint: "Суммарное время" }))),
    e(ui.Card, null,
      e(ui.CardHeader, null, e(ui.CardTitle, { className: "text-base" }, "Миры сети"), e("p", { className: "mt-1 text-sm text-muted-foreground" }, "Время игроков в мире и распределение игровых режимов из Plan.")),
      e(ui.CardContent, { className: "overflow-x-auto" }, props.data.worlds.length ? e("table", { className: "w-full text-sm" },
        e("thead", { className: "border-b text-left text-xs text-muted-foreground" }, e("tr", null, e("th", { className: "pb-2 pr-4 font-medium" }, "Мир"), e("th", { className: "pb-2 pr-4 font-medium" }, "Сервер"), e("th", { className: "pb-2 pr-4 font-medium" }, "Игроков"), e("th", { className: "pb-2 pr-4 font-medium" }, "Всего"), e("th", { className: "pb-2 font-medium" }, "Режимы"))),
        e("tbody", null, props.data.worlds.map((world) => e("tr", { key: `${world.server_uuid}-${world.world_name}`, className: "border-b last:border-0" }, e("td", { className: "py-2.5 pr-4 font-medium" }, world.world_name), e("td", { className: "py-2.5 pr-4 text-muted-foreground" }, world.server_name ?? world.server_uuid.slice(0, 8)), e("td", { className: "py-2.5 pr-4 tabular-nums" }, String(world.player_count)), e("td", { className: "py-2.5 pr-4 tabular-nums" }, formatDuration(world.total_time)), e("td", { className: "py-2.5 text-xs text-muted-foreground" }, `S ${formatDuration(world.survival_time)} · C ${formatDuration(world.creative_time)} · A ${formatDuration(world.adventure_time)} · Sp ${formatDuration(world.spectator_time)}`)))),
      ) : e("p", { className: "py-8 text-sm text-muted-foreground" }, "Plan ещё не записал время по мирам.")),
    ),
  );
}

function ModerationPanel(props: { rows?: AllowlistBounce[]; loading: boolean; error: boolean }) {
  const { React, ui, icons } = window.Kubek!;
  const e = React.createElement;
  if (props.loading) return e(LoadingBlock, { text: "Загрузка событий whitelist…" });
  if (props.error) return e(ErrorBlock, { text: "Не удалось загрузить модерационные события Plan." });
  const rows = props.rows ?? [];
  const table = e("table", { className: "w-full text-sm" },
    e("thead", { className: "border-b text-left text-xs text-muted-foreground" },
      e("tr", null, e("th", { className: "pb-2 pr-4 font-medium" }, "Игрок"), e("th", { className: "pb-2 pr-4 font-medium" }, "Сервер"), e("th", { className: "pb-2 pr-4 font-medium" }, "Отклонений"), e("th", { className: "pb-2 font-medium" }, "Последнее"))),
    e("tbody", null, rows.map((entry) => e("tr", { key: `${entry.server_uuid}-${entry.uuid}`, className: "border-b last:border-0" },
      e("td", { className: "py-2.5 pr-4" }, e("div", { className: "flex items-center gap-2" }, e(icons.ShieldAlert, { className: "size-4 text-muted-foreground" }), e("span", { className: "font-medium" }, entry.name))),
      e("td", { className: "py-2.5 pr-4 text-muted-foreground" }, entry.server_name ?? entry.server_uuid.slice(0, 8)),
      e("td", { className: "py-2.5 pr-4 tabular-nums" }, String(entry.times)),
      e("td", { className: "py-2.5 text-muted-foreground" }, formatDate(entry.last_bounce)),
    ))),
  );
  return e(ui.Card, null,
    e(ui.CardHeader, null, e(ui.CardTitle, { className: "text-base" }, "Whitelist-bounce"), e("p", { className: "mt-1 text-sm text-muted-foreground" }, "Отклонённые подключения к whitelist, сохранённые Plan.")),
    e(ui.CardContent, { className: "overflow-x-auto" }, rows.length ? table : e("p", { className: "py-8 text-sm text-muted-foreground" }, "Событий whitelist-bounce пока нет.")),
  );
}

function serverExtensionValue(entry: ServerExtensionValue): string {
  const value = entry.group_value ?? entry.string_value ?? entry.component_value ?? entry.percentage_value ?? entry.double_value ?? entry.long_value ?? entry.boolean_value;
  return value === null || value === undefined ? "Не задано" : String(value);
}

function ServerExtensionsPanel(props: { rows?: ServerExtensionValue[]; loading: boolean; error: boolean }) {
  const { React, ui, icons } = window.Kubek!;
  const e = React.createElement;
  if (props.loading) return e(LoadingBlock, { text: "Загрузка интеграций серверов…" });
  if (props.error) return e(ErrorBlock, { text: "Не удалось загрузить серверные значения интеграций Plan." });
  const rows = props.rows ?? [];
  const table = e("table", { className: "w-full text-sm" },
    e("thead", { className: "border-b text-left text-xs text-muted-foreground" },
      e("tr", null, e("th", { className: "pb-2 pr-4 font-medium" }, "Плагин"), e("th", { className: "pb-2 pr-4 font-medium" }, "Поле"), e("th", { className: "pb-2 pr-4 font-medium" }, "Значение"), e("th", { className: "pb-2 font-medium" }, "Сервер"))),
    e("tbody", null, rows.map((entry, index) => e("tr", { key: `${entry.server_uuid}-${entry.plugin_name}-${entry.provider_name}-${index}`, className: "border-b last:border-0" },
      e("td", { className: "py-2.5 pr-4" }, e("div", { className: "flex items-center gap-2" }, e(icons.PlugZap, { className: "size-4 text-muted-foreground" }), e("span", { className: "font-medium" }, entry.plugin_name))),
      e("td", { className: "py-2.5 pr-4" }, e("p", null, entry.text ?? entry.provider_name), entry.description ? e("p", { className: "text-xs text-muted-foreground" }, entry.description) : null),
      e("td", { className: "py-2.5 pr-4 font-mono text-xs" }, serverExtensionValue(entry)),
      e("td", { className: "py-2.5 text-muted-foreground" }, entry.server_uuid.slice(0, 8)),
    ))),
  );
  return e(ui.Card, null,
    e(ui.CardHeader, null, e(ui.CardTitle, { className: "text-base" }, "Серверные интеграции Plan"), e("p", { className: "mt-1 text-sm text-muted-foreground" }, "Только provider-ы Plan, не помеченные hidden.")),
    e(ui.CardContent, { className: "overflow-x-auto" }, rows.length ? table : e("p", { className: "py-8 text-sm text-muted-foreground" }, "Серверные интеграции пока не передали значения.")),
  );
}

function NetworkServersPanel(props: { servers: ServerStatus[] }) {
  const { React, ui } = window.Kubek!;
  const e = React.createElement;
  return e(ui.Card, null,
    e(ui.CardHeader, null, e(ui.CardTitle, { className: "text-base" }, "Серверы Plan"), e("p", { className: "mt-1 text-sm text-muted-foreground" }, "Статус связи Kubek и Plan, а также последние данные производительности.")),
    e(ui.CardContent, { className: "overflow-x-auto" }, props.servers.length ? e(NetworkServerTable, { servers: props.servers }) : e("p", { className: "py-6 text-sm text-muted-foreground" }, "Серверы Kubek пока не найдены.")),
  );
}

function openKubekServer(serverId: string): void {
  // Kubek restores selected_server_id during app bootstrap; full navigation also refreshes the server socket room.
  window.localStorage.setItem("selected_server_id", serverId);
  window.location.assign("/console");
}

function NetworkServerTable(props: { servers: ServerStatus[] }) {
  const { React, ui } = window.Kubek!;
  const e = React.createElement;
  return e("table", { className: "w-full text-sm" },
    e("thead", { className: "border-b text-left text-xs text-muted-foreground" }, e("tr", null,
      e("th", { className: "pb-2 pr-4 font-medium" }, "Сервер"),
      e("th", { className: "pb-2 pr-4 font-medium" }, "Статус"),
      e("th", { className: "pb-2 pr-4 font-medium" }, "TPS"),
      e("th", { className: "pb-2 pr-4 font-medium" }, "Онлайн"),
      e("th", { className: "pb-2 pr-4 font-medium" }, "RAM"),
      e("th", { className: "pb-2 pr-4 font-medium" }, "Последний замер"),
      e("th", { className: "pb-2 font-medium" }, "Kubek"),
    )),
    e("tbody", null, props.servers.map((server) => e("tr", { key: server.id, className: "border-b last:border-0" },
      e("td", { className: "py-2.5 pr-4" },
        e("p", { className: "font-medium" }, server.name),
        e("p", { className: "text-xs text-muted-foreground" }, server.agentHeartbeat?.last_started_at ? `Agent: ${formatRelativeTime(server.agentHeartbeat.last_started_at)} · ${server.agentHeartbeat.last_event}` : server.planServer?.name ?? "Plan не привязан"),
      ),
      e("td", { className: "py-2.5 pr-4" }, e(StatusBadge, { status: server.status })),
      e("td", { className: "py-2.5 pr-4 tabular-nums" }, server.latest?.tps?.toFixed(2) ?? "—"),
      e("td", { className: "py-2.5 pr-4 tabular-nums" }, server.latest ? String(server.latest.players_online) : "—"),
      e("td", { className: "py-2.5 pr-4 tabular-nums" }, server.latest ? `${Math.round(server.latest.ram_usage)} MB` : "—"),
      e("td", { className: "py-2.5 pr-4 text-muted-foreground" }, formatRelativeTime(server.latest?.date)),
      e("td", { className: "py-2.5" }, e(ui.Button, { size: "sm", variant: "ghost", onClick: () => openKubekServer(server.id) }, "Открыть")),
    ))),
  );
}

function NetworkPlayersPanel(props: { players: NetworkPlayer[]; servers: ServerStatus[]; onOpenPlayer?: (uuid: string) => void }) {
  const { React, ui } = window.Kubek!;
  const e = React.createElement;
  const serverNames = new Map(props.servers.filter((server) => Boolean(server.binding)).map((server) => [server.binding!.plan_server_uuid, server.name]));
  return e(ui.Card, null,
    e(ui.CardHeader, null, e(ui.CardTitle, { className: "text-base" }, "Последняя активность по сети"), e("p", { className: "mt-1 text-sm text-muted-foreground" }, "Сводный список игроков по всем привязанным серверам. Нажмите на игрока, чтобы открыть отдельную статистику Plan.")),
    e(ui.CardContent, { className: "overflow-x-auto" },
      props.players.length ? e("table", { className: "w-full text-sm" },
        e("thead", { className: "border-b text-left text-xs text-muted-foreground" }, e("tr", null,
          e("th", { className: "pb-2 pr-4 font-medium" }, "Игрок"), e("th", { className: "pb-2 pr-4 font-medium" }, "Последний сервер"), e("th", { className: "pb-2 pr-4 font-medium" }, "Активность"), e("th", { className: "pb-2 pr-4 font-medium" }, "Время"), e("th", { className: "pb-2 pr-4 font-medium" }, "Серверов"), e("th", { className: "pb-2 font-medium" }, "Смерти"),
        )),
        e("tbody", null, props.players.map((player) => e("tr", { key: player.uuid, className: "border-b last:border-0" },
          e("td", { className: "py-2.5 pr-4" }, props.onOpenPlayer ? e("button", { type: "button", className: "font-medium text-primary hover:underline", onClick: () => props.onOpenPlayer!(player.uuid) }, player.name) : e("span", { className: "font-medium" }, player.name)),
          e("td", { className: "py-2.5 pr-4 text-muted-foreground" }, player.latest_server_uuid ? serverNames.get(player.latest_server_uuid) ?? "—" : "—"),
          e("td", { className: "py-2.5 pr-4 text-muted-foreground" }, formatRelativeTime(player.last_seen)),
          e("td", { className: "py-2.5 pr-4 tabular-nums" }, formatDuration(player.active_playtime)),
          e("td", { className: "py-2.5 pr-4 tabular-nums" }, String(player.server_count)),
          e("td", { className: "py-2.5 tabular-nums" }, String(player.deaths)),
        ))),
      ) : e("p", { className: "py-6 text-sm text-muted-foreground" }, "Завершённые сессии игроков пока отсутствуют."),
    ),
  );
}

type PlayerProfileTab = "overview" | "sessions" | "pvppve" | "servers" | "integrations" | "moderation" | "connections";

type PlayerModeration = { rows: Array<{ server_uuid: string; server_name: string | null; registered: number; opped: number; banned: number; times_kicked: number }> };
type PlayerConnections = { addresses: Array<{ join_address: string; server_uuid: string; server_name: string | null; registered: number }>; geolocations: Array<{ geolocation: string; last_used: number }> };
type PlayerExtensions = { extensions: ExtensionValue[]; extensionGroups: Array<{ plugin_name: string; provider_name: string; group_name: string | null }> };

function NetworkPlayerProfilePage(props: { data?: NetworkPlayerProfile; loading: boolean; error: boolean; access: PlanAccess; onBack: () => void }) {
  const { React, ui, icons, http, query } = window.Kubek!;
  const e = React.createElement;
  const [tab, setTab] = React.useState("overview" as PlayerProfileTab);
  const uuid = props.data?.player.uuid ?? "";
  const playerExtensions = query.useQuery<PlayerExtensions>({
    queryKey: [EXT, "player-extensions", uuid],
    enabled: tab === "integrations" && Boolean(uuid) && hasPlanAccess(props.access, "extensions"),
    queryFn: () => http.get<PlayerExtensions>(api(`network/players/${uuid}/extensions`)),
  });
  const moderation = query.useQuery<PlayerModeration>({
    queryKey: [EXT, "player-moderation", uuid],
    enabled: tab === "moderation" && Boolean(uuid) && hasPlanAccess(props.access, "moderation"),
    queryFn: () => http.get<PlayerModeration>(api(`network/players/${uuid}/moderation`)),
  });
  const connections = query.useQuery<PlayerConnections>({
    queryKey: [EXT, "player-connections", uuid],
    enabled: tab === "connections" && Boolean(uuid) && hasPlanAccess(props.access, "connection"),
    queryFn: () => http.get<PlayerConnections>(api(`network/players/${uuid}/connections`)),
  });
  if (props.loading) return e(LoadingBlock, { text: "Загрузка полной статистики игрока…" });
  if (props.error || !props.data) return e(ErrorBlock, { text: "Не удалось загрузить игрока на привязанных серверах Plan." });
  const data = props.data;
  const items: Array<{ id: PlayerProfileTab; label: string; icon: any }> = [
    { id: "overview", label: "Обзор", icon: icons.LayoutDashboard },
    { id: "sessions", label: "Сессии", icon: icons.CalendarDays },
    { id: "pvppve", label: "PvP / PvE", icon: icons.Swords },
    { id: "servers", label: "Серверы", icon: icons.Server },
    ...(hasPlanAccess(props.access, "extensions") || data.agentReady ? [{ id: "integrations" as PlayerProfileTab, label: "Интеграции и Agent", icon: icons.Puzzle }] : []),
    ...(hasPlanAccess(props.access, "moderation") ? [{ id: "moderation" as PlayerProfileTab, label: "Модерация", icon: icons.ShieldCheck }] : []),
    ...(hasPlanAccess(props.access, "connection") ? [{ id: "connections" as PlayerProfileTab, label: "Подключения", icon: icons.Network }] : []),
  ];
  let content: unknown;
  if (tab === "overview") content = e(PlayerProfileOverview, { data });
  else if (tab === "sessions") content = e(PlayerProfileSessions, { sessions: data.sessions });
  else if (tab === "pvppve") content = e(PlayerProfileCombat, { data });
  else if (tab === "servers") content = e(PlayerProfileServers, { data });
  else if (tab === "integrations") content = e(PlayerProfileIntegrations, { data, extensions: playerExtensions.data, loadingExtensions: playerExtensions.isLoading, extensionsError: playerExtensions.isError, canViewExtensions: hasPlanAccess(props.access, "extensions") });
  else if (tab === "moderation") content = e(PlayerProfileModeration, { data: moderation.data, loading: moderation.isLoading, error: moderation.isError });
  else content = e(PlayerProfileConnections, { data: connections.data, loading: connections.isLoading, error: connections.isError });
  return e("div", { className: "flex flex-col gap-4" },
    e("div", { className: "flex flex-wrap items-start justify-between gap-3" },
      e("div", { className: "flex items-center gap-3" },
        e(ui.Button, { size: "sm", variant: "ghost", onClick: props.onBack }, e(icons.ArrowLeft, { className: "size-4" }), "Игроки"),
        e("div", { className: "flex size-12 items-center justify-center rounded-full border bg-muted text-lg font-bold" }, data.player.name.slice(0, 1).toUpperCase()),
        e("div", null, e("h2", { className: "text-xl font-semibold" }, data.player.name), e("p", { className: "font-mono text-xs text-muted-foreground" }, data.player.uuid)),
      ),
      e(ui.Badge, { variant: "secondary" }, `${data.servers.length} серверов`),
    ),
    e("div", { className: "flex max-w-full overflow-x-auto border-b" }, items.map((item) => e("button", { key: item.id, type: "button", onClick: () => setTab(item.id), className: `flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm transition-colors ${tab === item.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}` }, e(item.icon, { className: "size-4" }), item.label))),
    content,
  );
}

function PlayerProfileOverview(props: { data: NetworkPlayerProfile }) {
  const { React, ui, icons } = window.Kubek!;
  const e = React.createElement;
  const player = props.data.player;
  const main = [
    ["Всего времени", formatDuration(player.playtime)], ["Активно", formatDuration(player.active_playtime)], ["AFK", formatDuration(player.afk_time)],
    ["Сессий", String(player.session_count)], ["Самая длинная", formatDuration(player.longest_session)], ["Медиана сессии", formatDuration(player.session_median)],
    ["Зарегистрирован", formatDate(player.registered)], ["Последняя активность", formatRelativeTime(player.last_seen)],
  ];
  const activityRows = [
    ["Время", formatDuration(props.data.activity.days7.playtime), formatDuration(props.data.activity.days30.playtime)],
    ["Активно", formatDuration(props.data.activity.days7.active_playtime), formatDuration(props.data.activity.days30.active_playtime)],
    ["AFK", formatDuration(props.data.activity.days7.afk_time), formatDuration(props.data.activity.days30.afk_time)],
    ["Сессии", String(props.data.activity.days7.sessions), String(props.data.activity.days30.sessions)],
    ["PvE", String(props.data.activity.days7.mob_kills), String(props.data.activity.days30.mob_kills)],
    ["Смерти", String(props.data.activity.days7.deaths), String(props.data.activity.days30.deaths)],
  ];
  return e("div", { className: "grid gap-4 xl:grid-cols-2" },
    e(ui.Card, null,
      e(ui.CardHeader, { className: "pb-2" }, e(ui.CardTitle, { className: "text-base" }, "Карточка игрока"), e("p", { className: "mt-1 text-xs text-muted-foreground" }, "Показатели за все привязанные серверы Plan.")),
      e(ui.CardContent, null,
        e("div", { className: "grid grid-cols-2 gap-x-6 gap-y-3 text-sm" }, main.map((row) => e("div", { key: row[0], className: "border-b pb-2" }, e("p", { className: "text-xs text-muted-foreground" }, row[0]), e("p", { className: "mt-1 font-medium tabular-nums" }, row[1])))),
        e("div", { className: "mt-4 grid grid-cols-2 gap-3 border-t pt-4 md:grid-cols-4" },
          e(MetricCard, { icon: icons.Swords, label: "PvP", value: String(player.pvp_kills), hint: "Убийства игроков" }),
          e(MetricCard, { icon: icons.Target, label: "PvE", value: String(player.mob_kills), hint: "Убийства мобов" }),
          e(MetricCard, { icon: icons.Skull, label: "Смерти", value: String(player.deaths), hint: "Все причины" }),
          e(MetricCard, { icon: icons.Gavel, label: "Кики", value: String(player.times_kicked), hint: "Plan" }),
        ),
      ),
    ),
    e(ui.Card, null,
      e(ui.CardHeader, { className: "pb-2" }, e(ui.CardTitle, { className: "text-base" }, "Активность"), e("p", { className: "mt-1 text-xs text-muted-foreground" }, "Сравнение 7 и 30 дней, как в оригинальном профиле Plan.")),
      e(ui.CardContent, { className: "overflow-x-auto" },
        e("table", { className: "w-full text-sm" },
          e("thead", { className: "border-b text-left text-xs text-muted-foreground" }, e("tr", null, e("th", { className: "pb-2 pr-3" }, "Показатель"), e("th", { className: "pb-2 pr-3" }, "7 дней"), e("th", { className: "pb-2" }, "30 дней"))),
          e("tbody", null, activityRows.map((row) => e("tr", { key: row[0], className: "border-b last:border-0" }, e("td", { className: "py-2 pr-3" }, row[0]), e("td", { className: "py-2 pr-3 tabular-nums" }, row[1]), e("td", { className: "py-2 tabular-nums" }, row[2])))),
        ),
        props.data.nicknames.length ? e("div", { className: "mt-4 border-t pt-3" }, e("p", { className: "text-xs text-muted-foreground" }, "История никнеймов"), e("div", { className: "mt-2 flex flex-wrap gap-2" }, props.data.nicknames.map((item) => e(ui.Badge, { key: item.nickname, variant: "secondary" }, item.nickname)))) : null,
      ),
    ),
  );
}

function PlayerProfileSessions(props: { sessions: NetworkPlayerProfile["sessions"] }) {
  const { React, ui } = window.Kubek!;
  const e = React.createElement;
  return e(ui.Card, null,
    e(ui.CardHeader, null, e(ui.CardTitle, { className: "text-base" }, "Сессии игрока"), e("p", { className: "mt-1 text-xs text-muted-foreground" }, "Последние 60 завершённых сессий на всех привязанных серверах.")),
    e(ui.CardContent, { className: "max-h-[42rem] overflow-auto" },
      props.sessions.length ? e("table", { className: "w-full text-sm" },
        e("thead", { className: "sticky top-0 border-b bg-card text-left text-xs text-muted-foreground" }, e("tr", null, e("th", { className: "pb-2 pr-3" }, "Сервер"), e("th", { className: "pb-2 pr-3" }, "Начало"), e("th", { className: "pb-2 pr-3" }, "Активно"), e("th", { className: "pb-2 pr-3" }, "AFK"), e("th", { className: "pb-2 pr-3" }, "PvE"), e("th", { className: "pb-2" }, "Смерти"))),
        e("tbody", null, props.sessions.map((session) => e("tr", { key: session.id, className: "border-b last:border-0" }, e("td", { className: "py-2 pr-3 font-medium" }, session.server_name ?? "—"), e("td", { className: "py-2 pr-3 text-muted-foreground" }, formatDate(session.session_start)), e("td", { className: "py-2 pr-3 tabular-nums" }, formatDuration(session.active_playtime)), e("td", { className: "py-2 pr-3 tabular-nums" }, formatDuration(session.afk_time)), e("td", { className: "py-2 pr-3 tabular-nums" }, String(session.mob_kills)), e("td", { className: "py-2 tabular-nums" }, String(session.deaths))))),
      ) : e("p", { className: "py-8 text-sm text-muted-foreground" }, "Завершённых сессий пока нет."),
    ),
  );
}

function PlayerCombatList(props: { rows: Array<{ id: number; opponent_name: string; server_name: string | null; weapon: string | null; date: number }>; label: string }) {
  const { React } = window.Kubek!;
  const e = React.createElement;
  return props.rows.length ? e("div", { className: "flex flex-col" }, props.rows.map((row) => e("div", { key: row.id, className: "flex items-start justify-between gap-3 border-b py-3 last:border-0" }, e("div", null, e("p", { className: "font-medium" }, row.opponent_name), e("p", { className: "mt-1 text-xs text-muted-foreground" }, `${row.server_name ?? "—"}${row.weapon ? ` · ${row.weapon}` : ""}`)), e("span", { className: "text-xs text-muted-foreground" }, formatRelativeTime(row.date))))) : e("p", { className: "py-6 text-sm text-muted-foreground" }, `Plan пока не зафиксировал ${props.label}.`);
}

function PlayerProfileCombat(props: { data: NetworkPlayerProfile }) {
  const { React, ui } = window.Kubek!;
  const e = React.createElement;
  return e("div", { className: "grid gap-4 xl:grid-cols-2" },
    e(ui.Card, null, e(ui.CardHeader, null, e(ui.CardTitle, { className: "text-base" }, "Последние PvP-убийства"), e("p", { className: "mt-1 text-xs text-muted-foreground" }, `${props.data.player.pvp_kills} всего`)), e(ui.CardContent, null, e(PlayerCombatList, { rows: props.data.pvp.kills, label: "побед" }))),
    e(ui.Card, null, e(ui.CardHeader, null, e(ui.CardTitle, { className: "text-base" }, "Последние PvP-смерти"), e("p", { className: "mt-1 text-xs text-muted-foreground" }, `${props.data.player.pvp_deaths} всего`)), e(ui.CardContent, null, e(PlayerCombatList, { rows: props.data.pvp.deaths, label: "смертей" }))),
  );
}

function PlayerProfileServers(props: { data: NetworkPlayerProfile }) {
  const { React, ui, icons } = window.Kubek!;
  const e = React.createElement;
  return e("div", { className: "grid gap-4 xl:grid-cols-[1.1fr,0.9fr]" },
    e(ui.Card, null,
      e(ui.CardHeader, null, e(ui.CardTitle, { className: "text-base" }, "Серверы игрока"), e("p", { className: "mt-1 text-xs text-muted-foreground" }, "Время и активность по каждому серверу.")),
      e(ui.CardContent, { className: "overflow-x-auto" }, e("table", { className: "w-full text-sm" },
        e("thead", { className: "border-b text-left text-xs text-muted-foreground" }, e("tr", null, e("th", { className: "pb-2 pr-3" }, "Сервер"), e("th", { className: "pb-2 pr-3" }, "Время"), e("th", { className: "pb-2 pr-3" }, "Активно"), e("th", { className: "pb-2 pr-3" }, "Сессии"), e("th", { className: "pb-2" }, "Последний вход"))),
        e("tbody", null, props.data.servers.map((server) => e("tr", { key: server.server_uuid, className: "border-b last:border-0" }, e("td", { className: "py-2 pr-3 font-medium" }, server.server_name ?? server.server_uuid.slice(0, 8)), e("td", { className: "py-2 pr-3 tabular-nums" }, formatDuration(server.playtime)), e("td", { className: "py-2 pr-3 tabular-nums" }, formatDuration(server.active_playtime)), e("td", { className: "py-2 pr-3 tabular-nums" }, String(server.session_count)), e("td", { className: "py-2 text-muted-foreground" }, formatRelativeTime(server.last_seen))))),
      )),
    ),
    e(ui.Card, null,
      e(ui.CardHeader, null, e(ui.CardTitle, { className: "text-base" }, "Качество соединения"), e("p", { className: "mt-1 text-xs text-muted-foreground" }, "Средний, лучший и худший ping из штатных сэмплов Plan.")),
      e(ui.CardContent, null, e("div", { className: "grid grid-cols-3 gap-3" }, e(MetricCard, { icon: icons.Signal, label: "Средний", value: props.data.ping?.average_ping == null ? "—" : `${Math.round(props.data.ping.average_ping)} ms`, hint: "Ping" }), e(MetricCard, { icon: icons.Signal, label: "Лучший", value: props.data.ping?.best_ping == null || props.data.ping.best_ping < 0 ? "—" : `${Math.round(props.data.ping.best_ping)} ms`, hint: "Ping" }), e(MetricCard, { icon: icons.Signal, label: "Худший", value: props.data.ping?.worst_ping == null || props.data.ping.worst_ping < 0 ? "—" : `${Math.round(props.data.ping.worst_ping)} ms`, hint: "Ping" })), e(PlayerPingGraph, { rows: props.data.pingSeries })),
    ),
  );
}

function PlayerPingGraph(props: { rows: NetworkPlayerProfile["pingSeries"] }) {
  const { React } = window.Kubek!;
  const e = React.createElement;
  if (!props.rows.length) return e("p", { className: "py-12 text-center text-sm text-muted-foreground" }, "Сэмплов ping пока нет.");
  const rows = props.rows.slice(-120);
  const values = rows.flatMap((row) => [row.min_ping, row.avg_ping, row.max_ping]).filter((value) => value >= 0);
  if (!values.length) return e("p", { className: "py-12 text-center text-sm text-muted-foreground" }, "Plan получил только недоступные значения ping.");
  const width = 720, height = 220, left = 42, top = 18, right = 14, bottom = 30;
  const min = Math.min(...values), max = Math.max(...values, min + 1);
  const x = (index: number) => left + (index / Math.max(1, rows.length - 1)) * (width - left - right);
  const y = (value: number) => top + (1 - ((value - min) / (max - min))) * (height - top - bottom);
  const line = (field: "min_ping" | "avg_ping" | "max_ping") => rows.map((row, index) => `${index ? "L" : "M"}${x(index)},${y(Math.max(min, row[field]))}`).join(" ");
  return e("div", { className: "mt-5" },
    e("div", { className: "mb-2 flex gap-3 text-xs text-muted-foreground" }, e("span", null, "● Средний"), e("span", null, "● Лучший"), e("span", null, "● Худший")),
    e("svg", { viewBox: `0 0 ${width} ${height}`, className: "h-56 w-full" }, e("line", { x1: left, x2: width - right, y1: height - bottom, y2: height - bottom, stroke: "currentColor", strokeOpacity: "0.15" }), e("path", { d: line("avg_ping"), fill: "none", stroke: "#3b82f6", strokeWidth: 2.5 }), e("path", { d: line("min_ping"), fill: "none", stroke: "#22c55e", strokeWidth: 1.8 }), e("path", { d: line("max_ping"), fill: "none", stroke: "#ef4444", strokeWidth: 1.8 })),
  );
}

function PlayerProfileIntegrations(props: { data: NetworkPlayerProfile; extensions?: PlayerExtensions; loadingExtensions: boolean; extensionsError: boolean; canViewExtensions: boolean }) {
  const { React, ui } = window.Kubek!;
  const e = React.createElement;
  return e("div", { className: "grid gap-4 xl:grid-cols-2" },
    props.canViewExtensions ? e(ui.Card, null, e(ui.CardHeader, null, e(ui.CardTitle, { className: "text-base" }, "Права и группы")), e(ui.CardContent, null, props.loadingExtensions ? e(LoadingBlock, { text: "Загрузка групп…" }) : props.extensionsError ? e(ErrorBlock, { text: "Не удалось загрузить группы интеграций." }) : props.extensions?.extensionGroups.length ? props.extensions.extensionGroups.map((group, index) => e("div", { key: `${group.plugin_name}-${group.provider_name}-${index}`, className: "border-b py-2 last:border-0" }, e("p", { className: "font-medium" }, `${group.plugin_name}: ${group.provider_name}`), e("p", { className: "text-sm text-muted-foreground" }, group.group_name))) : e("p", { className: "text-sm text-muted-foreground" }, "Plan ещё не передал группы."))) : null,
    props.canViewExtensions ? e(ui.Card, null, e(ui.CardHeader, null, e(ui.CardTitle, { className: "text-base" }, "Значения интеграций")), e(ui.CardContent, null, props.loadingExtensions ? e(LoadingBlock, { text: "Загрузка значений…" }) : props.extensions?.extensions.length ? props.extensions.extensions.map((entry, index) => e("div", { key: `${entry.plugin_name}-${entry.provider_name}-${index}`, className: "border-b py-2 last:border-0" }, e("p", { className: "font-medium" }, `${entry.plugin_name}: ${entry.text ?? entry.provider_name}`), e("p", { className: "text-sm text-muted-foreground" }, extensionValue(entry)))) : e("p", { className: "text-sm text-muted-foreground" }, "Интеграции Plan не передали значения."))) : null,
    props.data.agentReady ? e(ui.Card, { className: "xl:col-span-2" }, e(ui.CardHeader, null, e(ui.CardTitle, { className: "text-base" }, "Данные Agent")), e(ui.CardContent, { className: "grid gap-4 lg:grid-cols-2" }, e("div", null, e("p", { className: "text-sm font-medium" }, "Чат"), e("p", { className: "mt-1 text-sm text-muted-foreground" }, `${props.data.chat?.message_count ?? 0} сообщений без хранения текста`)), e("div", null, e("p", { className: "text-sm font-medium" }, "Последний инвентарь"), props.data.snapshots.length ? e("div", { className: "mt-2 max-h-40 overflow-auto text-sm" }, props.data.inventory.map((item) => e("p", { key: `${item.slot}-${item.item_type}` }, `${slotLabel(item.slot)} · ${item.item_type} ×${item.amount}`))) : e("p", { className: "mt-1 text-sm text-muted-foreground" }, "Снимков пока нет.")))) : null,
  );
}

function PlayerProfileModeration(props: { data?: PlayerModeration; loading: boolean; error: boolean }) {
  const { React, ui, icons } = window.Kubek!;
  const e = React.createElement;
  if (props.loading) return e(LoadingBlock, { text: "Загрузка статусов модерации…" });
  if (props.error) return e(ErrorBlock, { text: "Не удалось загрузить статусы модерации игрока." });
  const rows = props.data?.rows ?? [];
  return e(ui.Card, null,
    e(ui.CardHeader, null, e(ui.CardTitle, { className: "text-base" }, "Статусы на серверах"), e("p", { className: "mt-1 text-sm text-muted-foreground" }, "OP, ban и накопленный счётчик киков из Plan.")),
    e(ui.CardContent, { className: "overflow-x-auto" }, rows.length ? e("table", { className: "w-full text-sm" },
      e("thead", { className: "border-b text-left text-xs text-muted-foreground" }, e("tr", null, e("th", { className: "pb-2 pr-4 font-medium" }, "Сервер"), e("th", { className: "pb-2 pr-4 font-medium" }, "OP"), e("th", { className: "pb-2 pr-4 font-medium" }, "Бан"), e("th", { className: "pb-2 pr-4 font-medium" }, "Кики"), e("th", { className: "pb-2 font-medium" }, "Регистрация"))),
      e("tbody", null, rows.map((row) => e("tr", { key: row.server_uuid, className: "border-b last:border-0" }, e("td", { className: "py-2.5 pr-4 font-medium" }, row.server_name ?? row.server_uuid.slice(0, 8)), e("td", { className: "py-2.5 pr-4" }, row.opped ? "Да" : "Нет"), e("td", { className: "py-2.5 pr-4" }, row.banned ? "Да" : "Нет"), e("td", { className: "py-2.5 pr-4 tabular-nums" }, String(row.times_kicked)), e("td", { className: "py-2.5 text-muted-foreground" }, formatDate(row.registered))))),
    ) : e("p", { className: "py-6 text-sm text-muted-foreground" }, "Plan ещё не передал статусы модерации.")),
  );
}

function PlayerProfileConnections(props: { data?: PlayerConnections; loading: boolean; error: boolean }) {
  const { React, ui, icons } = window.Kubek!;
  const e = React.createElement;
  if (props.loading) return e(LoadingBlock, { text: "Загрузка адресов и геоданных…" });
  if (props.error) return e(ErrorBlock, { text: "Не удалось загрузить данные подключения игрока." });
  const addresses = props.data?.addresses ?? [];
  const geolocations = props.data?.geolocations ?? [];
  return e("div", { className: "grid gap-4 xl:grid-cols-2" },
    e(ui.Card, null, e(ui.CardHeader, null, e(ui.CardTitle, { className: "text-base" }, "Адреса входа")), e(ui.CardContent, null, addresses.length ? addresses.map((row, index) => e("div", { key: `${row.server_uuid}-${row.join_address}-${index}`, className: "border-b py-2 last:border-0" }, e("p", { className: "font-mono text-sm" }, row.join_address), e("p", { className: "text-xs text-muted-foreground" }, `${row.server_name ?? row.server_uuid.slice(0, 8)} · ${formatDate(row.registered)}`))) : e("p", { className: "text-sm text-muted-foreground" }, "Адреса не записаны."))),
    e(ui.Card, null, e(ui.CardHeader, null, e(ui.CardTitle, { className: "text-base" }, "Геолокация Plan")), e(ui.CardContent, null, geolocations.length ? geolocations.map((row, index) => e("div", { key: `${row.geolocation}-${index}`, className: "border-b py-2 last:border-0" }, e("div", { className: "flex items-center gap-2" }, e(icons.MapPin, { className: "size-4 text-muted-foreground" }), e("span", { className: "font-medium" }, row.geolocation)), e("p", { className: "mt-1 text-xs text-muted-foreground" }, formatDate(row.last_used)))) : e("p", { className: "text-sm text-muted-foreground" }, "Геоданные не записаны."))),
  );
}

function PlanDashboardWidget() {
  const { React, ui, http, query, icons } = window.Kubek!;
  const e = React.createElement;
  const accessQuery = query.useQuery<AccessResponse>({ queryKey: [EXT, "access"], queryFn: () => http.get<AccessResponse>(api("access")), refetchInterval: 30_000 });
  const access = accessQuery.data?.access;
  const status = query.useQuery<StatusResponse>({
    queryKey: [EXT, "status"],
    enabled: hasPlanAccess(access, "view"),
    queryFn: () => http.get<StatusResponse>(api("status")),
    refetchInterval: 15_000,
  });
  if (accessQuery.isLoading) return e(LoadingBlock, { text: "Проверка прав Plan…" });
  if (accessQuery.isError || !hasPlanAccess(access, "view")) return e(AccessDeniedBlock);
  return e(
    "div",
    { className: "flex h-full flex-col justify-center gap-3" },
    e("div", { className: "flex items-start justify-between gap-3" },
      e("div", null, e("p", { className: "text-2xl font-semibold tabular-nums" }, `${status.data?.connected ?? 0}/${status.data?.total ?? 0}`), e("p", { className: "text-xs text-muted-foreground" }, "серверов Plan подключено")),
      e(icons.ChartNoAxesCombined, { className: "size-5 text-primary" }),
    ),
    e(ui.Badge, { variant: status.data?.active ? "default" : "secondary" }, status.data?.schemaReady ? `${status.data?.active ?? 0} с актуальными метриками` : "Ожидание Plan"),
    e("p", { className: "text-xs text-muted-foreground" }, "Откройте вкладку сервера для подробной аналитики."),
  );
}

function PlanSettings() {
  const { React, ui, http, query, icons } = window.Kubek!;
  const e = React.createElement;
  const client = query.useQueryClient();
  const [serverId, setServerId] = React.useState("");
  const [planServerUuid, setPlanServerUuid] = React.useState("");
  const accessQuery = query.useQuery<AccessResponse>({ queryKey: [EXT, "access"], queryFn: () => http.get<AccessResponse>(api("access")), refetchInterval: 30_000 });
  const access = accessQuery.data?.access;
  const status = query.useQuery<PlanConfiguration>({
    queryKey: [EXT, "configuration"],
    enabled: hasPlanAccess(access, "manage"),
    queryFn: () => http.get<PlanConfiguration>(api("configuration")),
    refetchInterval: 15_000,
  });
  const planServers = query.useQuery<{ ready: boolean; servers: PlanServer[] }>({
    queryKey: [EXT, "plan-servers"],
    enabled: hasPlanAccess(access, "manage"),
    queryFn: () => http.get(api("plan-servers")),
  });
  const refresh = () => client.invalidateQueries({ queryKey: [EXT] });
  const bind = query.useMutation({
    mutationFn: () => http.post(api(`servers/${serverId}/bind`), { planServerUuid }),
    onSuccess: refresh,
  });
  const unbind = query.useMutation<string>({
    mutationFn: (targetServerId: string) => http.delete(api(`servers/${targetServerId}/bind`)),
    onSuccess: refresh,
  });
  const bindings = (status.data?.servers ?? []).filter((server) => Boolean(server.binding));
  if (accessQuery.isLoading) return e(LoadingBlock, { text: "Проверка разрешения управления Plan…" });
  if (accessQuery.isError || !hasPlanAccess(access, "manage")) return e(AccessDeniedBlock);

  return e(
    "div",
    { className: "flex flex-col gap-4" },
    e(ui.Card, null,
      e(ui.CardHeader, null, e(ui.CardTitle, null, "Plan Bridge")),
      e(ui.CardContent, { className: "flex flex-col gap-4" },
        e("div", { className: "grid grid-cols-2 gap-3 md:grid-cols-3" },
          e(SettingStat, { label: "Подключено", value: `${status.data?.connected ?? 0}/${status.data?.total ?? 0}` }),
          e(SettingStat, { label: "Актуальные", value: String(status.data?.active ?? 0) }),
          e(SettingStat, { label: "База Plan", value: status.data?.schemaReady ? "Готова" : "Ожидание" }),
        ),
        e("div", { className: "flex flex-col gap-2" },
          e(ui.Label, null, "Путь к общей базе Plan"),
          e("div", { className: "flex items-center gap-2" }, e(icons.Database, { className: "size-4 shrink-0 text-muted-foreground" }), e(ui.Input, { readOnly: true, value: status.data?.databasePath ?? "Загрузка…" })),
          e("p", { className: "text-xs text-muted-foreground" }, "Это точный путь для Database.SQLite.File в config.yml каждого Paper-сервера. IP и порт не требуются."),
        ),
      ),
    ),
    e(ui.Card, null,
      e(ui.CardHeader, null, e(ui.CardTitle, { className: "text-base" }, "Текущие привязки")),
      e(ui.CardContent, null,
        bindings.length ? e("div", { className: "flex flex-col gap-2" }, bindings.map((server) => e("div", { key: server.id, className: "flex flex-wrap items-center justify-between gap-3 rounded-md border p-3" },
          e("div", null, e("p", { className: "text-sm font-medium" }, server.name), e("p", { className: "text-xs text-muted-foreground" }, `Plan: ${server.planServer?.name ?? server.binding?.plan_server_uuid ?? "—"}`)),
          e("div", { className: "flex items-center gap-2" }, e(StatusBadge, { status: server.status }), e(ui.Button, { size: "sm", variant: "ghost", disabled: unbind.isPending, onClick: () => unbind.mutate(server.id) }, "Отвязать")),
        ))) : e("p", { className: "py-2 text-sm text-muted-foreground" }, "Привязок пока нет. Если имена серверов совпадают, они будут созданы автоматически."),
      ),
    ),
    e(ui.Card, null,
      e(ui.CardHeader, null, e(ui.CardTitle, { className: "text-base" }, "Ручная привязка")),
      e(ui.CardContent, { className: "flex flex-col gap-3" },
        e("p", { className: "text-sm text-muted-foreground" }, "Используйте только когда ServerName в Plan отличается от имени сервера Kubek."),
        e(ui.Label, null, "Сервер Kubek"),
        e("select", { className: "h-9 w-full rounded-md border border-input bg-background px-3 text-sm", value: serverId, onChange: (event: { target: { value: string } }) => setServerId(event.target.value) },
          e("option", { value: "" }, "Выберите сервер"),
          (status.data?.servers ?? []).map((server) => e("option", { key: server.id, value: server.id }, `${server.name} — ${statusLabel(server.status)}`)),
        ),
        e(ui.Label, null, "Сервер Plan"),
        e("select", { className: "h-9 w-full rounded-md border border-input bg-background px-3 text-sm", value: planServerUuid, onChange: (event: { target: { value: string } }) => setPlanServerUuid(event.target.value) },
          e("option", { value: "" }, "Выберите запись Plan"),
          (planServers.data?.servers ?? []).map((server) => e("option", { key: server.uuid, value: server.uuid }, `${server.name ?? "Без имени"} (${server.uuid})`)),
        ),
        e(ui.Button, { disabled: !serverId || !planServerUuid || bind.isPending, onClick: () => bind.mutate() }, bind.isPending ? "Привязка…" : "Привязать"),
        bind.isError ? e("p", { className: "text-sm text-destructive" }, "Не удалось сохранить привязку.") : null,
      ),
    ),
  );
}

function SettingStat(props: { label: string; value: string }) {
  const { React } = window.Kubek!;
  return React.createElement("div", { className: "rounded-md border bg-muted/20 p-3" }, React.createElement("p", { className: "text-lg font-semibold tabular-nums" }, props.value), React.createElement("p", { className: "text-xs text-muted-foreground" }, props.label));
}

function LoadingBlock(props: { text: string }) {
  const { React } = window.Kubek!;
  return React.createElement("div", { className: "py-4 text-sm text-muted-foreground" }, props.text);
}

function ErrorBlock(props: { text: string }) {
  const { React } = window.Kubek!;
  return React.createElement("div", { className: "rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" }, props.text);
}

function AccessDeniedBlock() {
  const { React, icons } = window.Kubek!;
  return React.createElement("div", { className: "rounded-md border bg-muted/20 p-4 text-sm" },
    React.createElement("div", { className: "flex items-center gap-2 font-medium" }, React.createElement(icons.ShieldAlert, { className: "size-4 text-muted-foreground" }), "Доступ к данным Plan не выдан"),
    React.createElement("p", { className: "mt-1 text-xs text-muted-foreground" }, "Kubek не отправил запрос к закрытым данным. Администратор может назначить нужное разрешение в разделе ролей и прав."),
  );
}

const frontendModule = {
  components: { PlanNetwork, PlanServerTab, PlanDashboardWidget, PlanSettings },
};

export default frontendModule;
