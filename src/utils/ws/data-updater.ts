import { useGameStore } from '@/store/modules/game';

/**
 * 更新服务器游戏实时数据（服务器信息映射 + 玩家数据映射 + 玩家操作动态映射）
 * @param data ServerGameDataVo { serverInfoMap, userGameDataMap, playerActionMap }
 * @param incremental 是否增量更新（true=合并，false=全量替换）
 */
export function updateServerGameData(
  data: Api.Game.ServerGameDataVo,
  incremental: boolean,
): void {
  const gameStore = useGameStore();
  const {
    serverInfoMap,
    userGameDataMap,
    playerActionMap,
  } = data || { serverInfoMap: {}, userGameDataMap: {}, playerActionMap: {} };

  updateServerInfoMap(gameStore, serverInfoMap, incremental);
  updateUserGameDataMap(gameStore, userGameDataMap, incremental);
  updatePlayerActionMap(gameStore, playerActionMap, incremental);
}

/**
 * 更新服务器信息映射，并同步到 currentServerWsList 和 currentServerList
 */
function updateServerInfoMap(
  gameStore: ReturnType<typeof useGameStore>,
  serverInfoMap: Api.Game.ServerGameDataVo['serverInfoMap'],
  incremental: boolean,
): void {
  // 全量替换：先清空旧数据
  if (!incremental) {
    for (const key of Object.keys(gameStore.serverGameDataMap.serverInfoMap)) {
      delete gameStore.serverGameDataMap.serverInfoMap[key];
    }
  }

  if (serverInfoMap) {
    for (const [serverId, info] of Object.entries(serverInfoMap)) {
      // 增量推送中，null / undefined 表示删除
      if (info == null) {
        if (incremental) {
          delete gameStore.serverGameDataMap.serverInfoMap[serverId];
        }
        continue;
      }

      gameStore.serverGameDataMap.serverInfoMap[serverId] = info;

      // 同步更新 currentServerWsList 和 currentServerList 的回合/比分
      syncServerInfoToList(gameStore.currentServerWsList, serverId, info);
      syncServerInfoToList(gameStore.currentServerList, serverId, info);
    }
  }

  // 若服务器不在最终的 serverInfoMap 中，则清空列表中对应项的比分
  const presentIds = new Set(
    Object.keys(gameStore.serverGameDataMap.serverInfoMap).map(k => String(k)),
  );
  clearServerScoresIfMissing(gameStore.currentServerWsList, presentIds);
  clearServerScoresIfMissing(gameStore.currentServerList, presentIds);
}

/**
 * 将单条服务器信息同步更新到指定列表（回合/比分等字段）
 * 当 info 中对应字段未设置（null / undefined / 空字符串）时，主动将 target 字段清空为 null，避免残留上一次的脏比分
 */
function syncServerInfoToList(
  list: Api.Game.SeverVo[],
  serverId: string | number,
  info: Api.Game.ServerInfoData,
): void {
  const target = list.find(item => String(item.serverId) === String(serverId));
  if (!target) return;

  const clean = (v: unknown): string | null => {
    if (v == null) return null;
    const str = String(v);
    return str.length === 0 ? null : str;
  };

  target.round = clean(info.round);
  target.CTScore = clean(info.CTScore);
  target.TScore = clean(info.TScore);
  target.mapStage = clean(info.mapStage);
  target.mapPhase = clean(info.mapPhase);
}

/**
 * 若列表中的服务器 serverId 不在 presentIds 集合里，则将其比分字段统一清空为 null
 * （通常用于 WebSocket 推送结束后，清理 serverInfoMap 中不存在的服务器残留脏比分）
 */
function clearServerScoresIfMissing(
  list: Api.Game.SeverVo[],
  presentIds: Set<string>,
): void {
  for (const item of list) {
    if (presentIds.has(String(item.serverId))) continue;
    item.round = null;
    item.CTScore = null;
    item.TScore = null;
    item.mapStage = null;
    item.mapPhase = null;
  }
}

/**
 * 更新玩家数据映射
 * 存储约定：userGameDataMap[serverId] 最终统一为 UserGameData[] 数组；合并去重 key 为 loginUser.id
 */
function updateUserGameDataMap(
  gameStore: ReturnType<typeof useGameStore>,
  userGameDataMap: Api.Game.ServerGameDataVo['userGameDataMap'],
  incremental: boolean,
): void {
  const target = gameStore.serverGameDataMap.userGameDataMap;

  // 全量替换：先清空旧数据
  if (!incremental) {
    for (const key of Object.keys(target)) {
      delete target[key];
    }
  }

  if (!userGameDataMap) return;

  for (const [serverId, rawPayload] of Object.entries(userGameDataMap)) {
    // 增量推送中，null / undefined 表示删除整个服务器玩家数据
    if (rawPayload == null) {
      if (incremental) {
        delete target[serverId];
      }
      continue;
    }

    const incoming: Api.Game.UserGameData[] = Array.isArray(rawPayload)
      ? rawPayload
      : [rawPayload];

    const old = target[serverId];
    const oldList: Api.Game.UserGameData[] = Array.isArray(old)
      ? old
      : (old == null ? [] : [old]);

    const next: Api.Game.UserGameData[] = incremental
      ? mergePlayerLists(oldList, incoming)
      : [...incoming];

    // 显式写回：1) 新数组引用 2) 即使 key 已存在也强制触发 Vue reactive 响应
    target[serverId] = next;
  }
}

/**
 * 两个玩家列表按 loginUser.id 合并：incoming 覆盖 old，保留顺序（old 在前、incoming 新增项追加在后）
 */
function mergePlayerLists(
  oldList: Api.Game.UserGameData[],
  incoming: Api.Game.UserGameData[],
): Api.Game.UserGameData[] {
  const byId = new Map<string, Api.Game.UserGameData>();
  const order: string[] = [];

  const push = (u: Api.Game.UserGameData) => {
    const uid = u?.loginUser?.id;
    const key = uid != null ? String(uid) : '';
    if (key.length > 0) {
      if (!byId.has(key)) order.push(key);
      byId.set(key, u);
    } else {
      // 无稳定 id 的异常玩家直接放末尾，不参与去重
      order.push(`anon_${Math.random().toString(36).slice(2, 8)}`);
      byId.set(order[order.length - 1], u);
    }
  };

  oldList.forEach(push);
  incoming.forEach(push);

  return order.map(k => byId.get(k)!).filter(Boolean);
}

/** 单台服务器玩家操作动态最大保留条数（防止无限增长占内存） */
const MAX_ACTION_LOGS_PER_SERVER = 200;

/**
 * 更新玩家操作动态映射（对应 Java playerActionMap）
 * 存储约定：playerActionMap[serverId] 最终统一为 PlayerActionLog[] 数组；最多保留 MAX_ACTION_LOGS_PER_SERVER 条
 */
function updatePlayerActionMap(
  gameStore: ReturnType<typeof useGameStore>,
  playerActionMap: Api.Game.ServerGameDataVo['playerActionMap'],
  incremental: boolean,
): void {
  const target = gameStore.serverGameDataMap.playerActionMap;

  // 全量替换：先清空旧数据
  if (!incremental) {
    for (const key of Object.keys(target)) {
      delete target[key];
    }
  }

  if (!playerActionMap) return;

  for (const [serverId, rawPayload] of Object.entries(playerActionMap)) {
    // 增量推送中，null / undefined 表示删除整个服务器的动态列表
    if (rawPayload == null) {
      if (incremental) {
        delete target[serverId];
      }
      continue;
    }

    const incoming: Api.Game.PlayerActionLog[] = Array.isArray(rawPayload)
      ? rawPayload
      : [rawPayload];

    const old = target[serverId];
    const oldList: Api.Game.PlayerActionLog[] = Array.isArray(old)
      ? old
      : (old == null ? [] : [old]);

    const merged: Api.Game.PlayerActionLog[] = incremental
      ? mergeActionLogs(oldList, incoming)
      : [...incoming];

    // 最多保留最新的 N 条（尾部）
    const next = merged.length > MAX_ACTION_LOGS_PER_SERVER
      ? merged.slice(merged.length - MAX_ACTION_LOGS_PER_SERVER)
      : merged;

    target[serverId] = next;
  }
}

/**
 * 合并两组操作日志：按（loginUser.id + actionTime + actionContent）三元组去重；保留原有顺序（old 在前、incoming 追加在后）
 */
function mergeActionLogs(
  oldList: Api.Game.PlayerActionLog[],
  incoming: Api.Game.PlayerActionLog[],
): Api.Game.PlayerActionLog[] {
  const seen = new Set<string>();
  const out: Api.Game.PlayerActionLog[] = [];

  const fingerprint = (log: Api.Game.PlayerActionLog): string => {
    const uid = log?.loginUser?.id;
    const t = log?.actionTime ?? '';
    const c = log?.actionContent ?? '';
    return `${uid ?? ''}|${t}|${c}`;
  };

  for (const log of oldList) {
    const fp = fingerprint(log);
    if (seen.has(fp)) continue;
    seen.add(fp);
    out.push(log);
  }

  for (const log of incoming) {
    const fp = fingerprint(log);
    if (seen.has(fp)) continue;
    seen.add(fp);
    out.push(log);
  }

  return out;
}
