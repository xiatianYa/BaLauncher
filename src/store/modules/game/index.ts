import { reactive, ref } from 'vue';
import { defineStore } from 'pinia';
import { SetupStoreId } from '@/enum';
import ServerWebsocket from '@/utils/ws/server';
import { fetchGetCommunityList } from '@/service/api/game/community';
import { fetchGetServerList } from '@/service/api/game/server';
import { fetchGetMapList } from '@/service/api/game/map';
import { fetchGetPieChart } from '@/service/api';
import { localStg } from '@/utils/storage';
import { GameStartType } from '@/constants/app';
import { GamePlatform } from '@/constants/app';
import GisWebsocket from '@/utils/ws/gis';

export const useGameStore = defineStore(SetupStoreId.Game, () => {

  // 社区列表
  const communityList: Api.Game.Community[] = reactive([]);

  // 服务器列表存储
  const serverDataList: Api.Game.Server[] = reactive([]);

  // 地图列表
  const mapList: Api.Game.Map[] = reactive([]);

  // 当前服务器原始数据列表(本地缓存)
  const currentServerList: Api.Game.InfoResponse[] = reactive([]);

  // 当前服务器数据列表(Ws推送)
  const currentServerWsList: Api.Game.InfoResponse[] = reactive([]);

  // 所有服务器的GIS信息
  const currentGisServerList: Api.Game.ServerInfoData[] = reactive([])

  // 所有玩家的GIS信息
  const currentGisPlayerList: Api.Game.CsgoPlayer[] = reactive([])

  // 当前选择的社区
  const selectedCommunityId = ref<number | null>(null);

  // 正在刷新的服务器地址列表
  const refreshingServerAddrs = ref<string[]>([]);

  // 需要加入的服务器信息
  const joinServerInfo = ref<Api.Game.InfoResponse>();

  // 是否自动挤服
  const isAutomatic = ref<boolean>(false);

  // 自动挤服配置
  const automaticJoinConfig = ref<Api.Game.AutomaticJoinConfig>({
    joinServerPersonValue: 63,
    joinServerCountValue: 2,
    joinServerAutoRetryValue: true,
  });

  // 自动重试标识(用户是否切换到目标地图)
  const isAutomaticRetry = ref<boolean>(false);

  // 挤服信息
  const automaticInfo = ref<Api.Game.ServerVo>({
    connectStr: '',
    mapLabel: '',
    mapName: '',
    mapUrl: '',
    maxPlayers: 0,
    numPlayers: 0,
    serverName: '',
    type: '',
    tag: [],
    minPlayers: 0,
  });

  // 用户所在服务器信息
  const gameServerInfo = ref<Api.Game.ServerInfoData>({
    addr: '',
    round: '',
    CTScore: '',
    TScore: '',
    mapStage: '',
    mapPhase: '',
  });

  // 用户游戏信息
  const gamePlayerInfo = ref<Api.Game.CsgoPlayer>({
    //服务器地址
    addr: '',
    team: '',
    health: 0,
    armor: 0,
    money: 0,
    equipValue: 0,
    weapon: '',
    clipAmmo: 0,
    reserveAmmo: 0,
    helmet: false,
    kills: 0,
    score: 0
  });

  // 检测次数
  const automaticCount = ref<number>(0);

  // 游戏是否启动
  const isGameRunning = ref<boolean>(false);

  // 游戏是否在启动中
  const isGameLaunching = ref<boolean>(false);

  // GSI 服务是否在运行
  const isGsiRunning = ref<boolean>(false);

  // 检测游戏是否启动的定时器
  let gameCheckTimer: ReturnType<typeof setInterval> | null = null;

  // 检测用户是否连接成功的定时器
  let connectionCheckTimer: ReturnType<typeof setTimeout> | null = null;

  // 游戏平台：international 国际服，perfect 完美平台
  const GamePlatform = ref<GamePlatform>('international');

  // Csgo2 安装目录
  const csgo2Path = ref<string>('');

  // Steam 安装目录
  const steamPath = ref<string>('');

  // 从存储读取设置
  function loadSettingsFromStorage() {
    const savedPlatform = localStg.get('GamePlatform');
    const savedCsgo2Path = localStg.get('csgo2Path');
    const savedSteamPath = localStg.get('steamPath');
    const savedAutomaticJoinConfig = localStg.get('automaticJoinConfig');

    if (savedPlatform) {
      GamePlatform.value = savedPlatform as 'international' | 'perfect';
    }
    if (savedCsgo2Path) {
      csgo2Path.value = savedCsgo2Path;
    }
    if (savedSteamPath) {
      steamPath.value = savedSteamPath;
    }
    if (savedAutomaticJoinConfig) {
      Object.assign(automaticJoinConfig.value, savedAutomaticJoinConfig);
    }
  }

  // 保存设置到存储
  function saveSettingsToStorage() {
    localStg.set('GamePlatform', GamePlatform.value);
    localStg.set('csgo2Path', csgo2Path.value);
    localStg.set('steamPath', steamPath.value);
    localStg.set('automaticJoinConfig', automaticJoinConfig.value);
  }

  // 设置游戏平台
  function setGamePlatform(platform: 'international' | 'perfect') {
    GamePlatform.value = platform;
    saveSettingsToStorage();
  }

  // 设置 CSGO2 路径
  function setCsgo2Path(path: string) {
    csgo2Path.value = path;
    saveSettingsToStorage();
  }

  // 设置 Steam 路径
  function setSteamPath(path: string) {
    steamPath.value = path;
    saveSettingsToStorage();
  }

  // 设置自动挤服人数阈值
  function setJoinServerPersonValue(value: number) {
    automaticJoinConfig.value.joinServerPersonValue = value;
    saveSettingsToStorage();
  }

  // 设置自动挤服线程数量
  function setJoinServerCountValue(value: number) {
    automaticJoinConfig.value.joinServerCountValue = value;
    saveSettingsToStorage();
  }

  // 设置是否自动重试
  function setJoinServerAutoRetryValue(value: boolean) {
    automaticJoinConfig.value.joinServerAutoRetryValue = value;
    saveSettingsToStorage();
  }

  // 检查游戏是否启动
  async function checkGameRunning() {
    try {
      const { isRunning } = await window.ipcRenderer.checkCsgo2Running();
      isGameRunning.value = isRunning;
      if (isGameRunning.value) {
        // 检查 GSI 服务是否已启动
        const { isConnected } = await window.ipcRenderer.checkGsiConnected();
        if (!isConnected) {
          console.log('GSI 服务未启动，正在启动...');
          await window.ipcRenderer.startGsiService();
          console.log('GSI 服务已启动');
          // 开始监听数据
          listenToGsiData();
        }
      } else {
        console.log("游戏已关闭");
        //关闭自动挤服
        stopAutomaticJoinServer();
        const gsiConnected = await window.ipcRenderer.stopGsiService();
        //关闭监听数据事件
        if (!gsiConnected && isGsiRunning.value) {
          console.log("GSI 服务已停止，已移除 GSI数据监听");
          isGsiRunning.value = false;
          removeGsiDataListener();
        }
      }
    } catch (error) {
      console.error('检查游戏状态失败:', error);
    }
  }

  // 开始监听游戏状态
  function startGameRunningCheck(intervalMs: number = 3000) {
    if (gameCheckTimer) return;
    console.log("开始监听游戏状态");
    checkGameRunning();
    gameCheckTimer = setInterval(checkGameRunning, intervalMs);
  }

  // 停止监听游戏状态
  function stopGameRunningCheck() {
    if (!gameCheckTimer) return;
    console.log("停止监听游戏状态");
    clearInterval(gameCheckTimer);
    gameCheckTimer = null;
  }

  // 初始化服务器列表
  async function initServerList() {
    // 加载设置
    loadSettingsFromStorage();
    const { data: communityData } = await fetchGetCommunityList();
    if (communityData) communityList.push(...communityData);
    //默认第一个社区
    if (communityData) selectedCommunityId.value = communityData[0].id;
    const { data: mapData } = await fetchGetMapList();
    if (mapData) mapList.push(...mapData);
    // 统计所有社区下的服务器数量
    await countServerServerNumber();
    // 统计所有社区下的玩家人数
    await countServerPlayerNumber();
  }

  // 统计所有社区下的服务器数量
  async function countServerServerNumber() {
    const { data: serverData } = await fetchGetServerList();
    //取消push 增加替换
    if (serverData) serverDataList.splice(0, serverDataList.length, ...serverData);
    for (const community of communityList) {
      community.serverNumber = serverDataList.filter(server => server.communityId === community.id).length;
    }
  }

  // 统计所有社区下的玩家人数
  async function countServerPlayerNumber() {
    const { data: pieChartData } = await fetchGetPieChart();
    // 根据社区名称 设置玩家人数
    for (const community of communityList) {
      community.playerNumber = 0;
      if (!pieChartData) continue;
      community.playerNumber = pieChartData.find(item => item.name === community.communityName)?.value || 0;
    }
  }

  /**
   *  查询服务器列表信息(源服务器)
   */
  async function queryServerInfosResponse() {
    // 使用 IPC 查询服务器信息
    if (serverDataList.length > 0) {
      // 筛选当前社区要查询的服务器
      const serverAddresses = serverDataList.filter(server => server.connectStr && server.communityId === selectedCommunityId.value).map(server => server.connectStr);
      try {
        const { success, data: infoResponseList } = await window.ipcRenderer.invoke('query-game-servers', serverAddresses);
        if (success) {
          infoResponseList.forEach((item: any) => {
            //查询服务器是否在线
            if (item.success === false) {
              item.isOnline = false;
            } else {
              item.isOnline = true;
            }
            //查询服务器是否有状态
            const matchingServer = currentGisServerList.find(gisServer => gisServer.addr === item.addr);

            if (matchingServer) {
              item.round = matchingServer.round || '';
              item.CTScore = matchingServer.CTScore || '';
              item.TScore = matchingServer.TScore || '';
              item.mapStage = matchingServer.mapStage || '';
              item.mapPhase = matchingServer.mapPhase || '';
            }
          });
          currentServerList.splice(0, currentServerList.length, ...infoResponseList);

          // 更新 joinServerInfo
          if (joinServerInfo.value) {
            const matchingServer = infoResponseList.find(
              (server: Api.Game.InfoResponse) => server.addr === joinServerInfo.value?.addr
            );
            if (matchingServer) {
              joinServerInfo.value = matchingServer;
            }
          }
        }
      } finally {
        countServerServerNumber();
        countServerPlayerNumber();
      }
    } else {
      countServerServerNumber();
      countServerPlayerNumber();
    }
  }

  /**
   *  查询服务器列表信息(WS服务器)
   */
  async function queryWsServerInfosResponse() {
    // 使用 IPC 查询服务器信息
    if (serverDataList.length > 0) {
      // 先查询源服务器信息 不等待 获取ping
      queryServerInfosResponse();
      // 筛选当前社区要查询的服务器
      const targetServers = serverDataList.filter(server => server.connectStr && server.communityId === selectedCommunityId.value);
      const serverAddresses = targetServers.map(server => server.connectStr);
      // 过滤出currentServerWsList中addr在serverAddresses中的数据
      const filteredWsServers = currentServerWsList.filter(item => serverAddresses.includes(item.addr));
      filteredWsServers.forEach(item => {
        item.isOnline = true;
        //查询服务器是否有状态
        const matchingServer = currentGisServerList.find(gisServer => gisServer.addr === item.addr);
        console.log("服务器比分数:", matchingServer);

        if (matchingServer) {
          item.round = matchingServer.round || '';
          item.CTScore = matchingServer.CTScore || '';
          item.TScore = matchingServer.TScore || '';
          item.mapStage = matchingServer.mapStage || '';
          item.mapPhase = matchingServer.mapPhase || '';
        }
      })
      // 找出不在filteredWsServers中的服务器，创建离线服务器数据
      const offlineServers: Api.Game.InfoResponse[] = targetServers
        .filter(server => !filteredWsServers.some(item => item.addr === server.connectStr))
        .map(server => ({
          protocol: 0,
          name: server.serverName || '',
          map: '',
          folder: '',
          game: '',
          appId: 0,
          players: 0,
          maxPlayers: 0,
          bots: 0,
          serverType: '',
          environment: '',
          visibility: 0,
          vac: 0,
          version: '',
          addr: server.connectStr || '',
          isOnline: false,
          round: '',
          CTScore: '',
          TScore: '',
          mapStage: '',
          mapPhase: '',
          csgoPlayer: [],
        }));
      // 合并在线和离线服务器
      const allServers = [...filteredWsServers, ...offlineServers];
      // 将结果赋值给currentServerList
      currentServerList.splice(0, currentServerList.length, ...allServers);
      await countServerServerNumber();
      await countServerPlayerNumber();
    } else {
      await countServerServerNumber();
      await countServerPlayerNumber();
    }
  }

  //查询单个服务器信息
  async function queryServerInfoResponse(server: Api.Game.InfoResponse) {
    const { success, data: infoResponse } = await window.ipcRenderer.invoke('query-game-server', server.addr);
    if (success) {
      currentServerList.forEach((item: Api.Game.InfoResponse) => {
        if (item.addr === server.addr) {
          item.isOnline = true;
          Object.assign(item, infoResponse.data);
        }
      });

      // 更新 joinServerInfo
      if (joinServerInfo.value && joinServerInfo.value.addr === server.addr && server.name) {
        const updatedServer = { ...infoResponse.data };
        updatedServer.addr = server.addr;
        updatedServer.isOnline = true;
        joinServerInfo.value = updatedServer;
      }
    } else {
      server.isOnline = false;
      // 更新 joinServerInfo 的在线状态
      if (joinServerInfo.value && joinServerInfo.value.addr === server.addr) {
        joinServerInfo.value.isOnline = false;
      }
    }
    return success;
  }

  // 启动游戏
  async function startGame(startType: GameStartType) {
    console.log("启动游戏");
    // 使用 gameStore 中的配置
    if (!csgo2Path.value) {
      console.error('未配置 CS2 路径，请在设置中配置');
      window.$message?.error('未配置 CS2 路径，请在设置中配置');
      return false;
    }

    if (startType === 'steamexe' && !steamPath.value) {
      console.error('未配置 Steam 路径，请在设置中配置');
      window.$message?.error('未配置 Steam 路径，请在设置中配置');
      return false;
    }

    // 检查 GSI 配置文件是否存在
    const { exists } = await window.ipcRenderer.checkGsiConfig(csgo2Path.value);
    if (!exists) {
      console.log('GSI 配置文件不存在，正在创建...');
      const { success } = await window.ipcRenderer.createGsiConfig(csgo2Path.value);
      if (success) {
        console.log('GSI 配置文件创建成功');
      } else {
        console.error('GSI 配置文件创建失败');
        window.$message?.error('GSI 配置文件创建失败，部分功能可能无法使用');
      }
    } else {
      console.log('GSI 配置文件已存在');
    }

    isGameLaunching.value = true;
    // 根据 GamePlatform 动态计算 serverMode
    const serverMode = GamePlatform.value === 'perfect' ? 'perfectworld' : 'worldwide';
    // 启动游戏
    const launchResult = await window.ipcRenderer.launchCs2(
      csgo2Path.value,
      serverMode,
      isGameRunning.value,
      steamPath.value
    );
    if (!launchResult.success) {
      console.error('启动游戏失败:', launchResult.error);
      window.$message?.error('启动游戏失败: ' + launchResult.error);
      return false;
    }

    console.log('游戏启动中，等待游戏完全启动...');

    // 等待游戏启动完成
    const waitResult = await window.ipcRenderer.waitForCs2Launch(csgo2Path.value);
    if (!waitResult.success) {
      console.error('等待游戏启动超时:', waitResult.error);
      window.$message?.error('等待游戏启动超时');
      isGameLaunching.value = false;
      return false;
    }
    isGameLaunching.value = false;

    // 加入服务器确认事件
    console.log("游戏启动完成");
    // 打开游戏成功，触发事件
    return true;
  }

  // 连接服务器 使用steamUrl
  async function connectServerUsingSteamUrl() {
    if (!joinServerInfo.value) return;
    currentGisPlayerList.splice(0, currentGisPlayerList.length);
    if (GisWebsocket.GisWebsocket) {
      const setAddrMessage: Api.Game.WsServerMsgType = {
        type: '101',
        data: joinServerInfo.value.addr
      };
      GisWebsocket.GisWebsocket?.send(JSON.stringify(setAddrMessage));
    }
    const aLink = document.createElement('a');
    aLink.href = `steam://rungame/730/76561198977557298/+connect ${joinServerInfo.value.addr}`;
    aLink.click();
  }

  // 开启自动挤服
  async function startAutomaticJoinServer() {
    console.log("开始自动挤服");
    if (!joinServerInfo.value) {
      window.$message?.error('请先选择要加入的服务器');
      return;
    }
    isAutomatic.value = true;
    automaticCount.value = 0;

    // 清除之前的检测定时器
    if (connectionCheckTimer) {
      clearTimeout(connectionCheckTimer);
      connectionCheckTimer = null;
    }

    try {
      console.log("开始发送IPC请求");
      const result = await window.ipcRenderer.invoke('start-automatic-join', {
        serverAddr: joinServerInfo.value.addr,
        maxPlayers: automaticJoinConfig.value.joinServerPersonValue,
        threadCount: automaticJoinConfig.value.joinServerCountValue
      });

      if (result.success && result.found) {
        // 自动重试标识(用户是否切换到目标地图)
        isAutomaticRetry.value = true;
        // 检测用户是否成功连接到服务器
        if (automaticJoinConfig.value.joinServerAutoRetryValue) {
          connectServerUsingSteamUrl();
          connectionCheckTimer = setTimeout(() => {
            if (isAutomaticRetry.value) {
              // 用户没有成功连接，继续自动挤服
              console.log('用户未成功连接，继续自动挤服');
              startAutomaticJoinServer();
            }
          }, 60000); // 60秒超时检测
        } else {
          isAutomatic.value = false;
          isAutomaticRetry.value = false;
          connectServerUsingSteamUrl();
          window.$message?.success("连接成功")
        }
      } else if (result.stopped) {
        window.$message?.info('停止自动挤服');
      } else if (!result.success) {
        window.$message?.error(result.error || '自动挤服失败');
      }
    } catch (error) {
      console.error('自动挤服失败:', error);
      window.$message?.error('自动挤服失败');
    }
  }

  // 停止自动挤服
  async function stopAutomaticJoinServer() {
    // 清除连接检测定时器
    if (connectionCheckTimer) {
      clearTimeout(connectionCheckTimer);
      connectionCheckTimer = null;
    }

    // 重置自动重试标志
    isAutomaticRetry.value = false;

    if (!isAutomatic.value) {
      return;
    } else {
      isAutomatic.value = false;
    }

    try {
      await window.ipcRenderer.invoke('stop-automatic-join');
    } catch (error) {
      console.error('停止自动挤服失败:', error);
    }
  }

  // 安全打印日志的函数
  function safeLog(message: string, ...args: any[]) {
    try {
      console.log(message, ...args);
    } catch (error) {
      console.log(message, '[日志打印失败，原始数据:]', args);
    }
  }

  // 监听 GSI 数据的函数
  function listenToGsiData() {
    safeLog("开始监听 GSI 数据");
    isGsiRunning.value = true;
    window.ipcRenderer.on('cs2-gsi-data', (_event, res) => {
      const { eventName, data } = res;

      // 根据事件类型打印详细信息
      switch (eventName) {
        // ========== Map 事件 ==========
        case 'map:nameChanged':
          safeLog('🗺️ [Map:地图名称变更] - 当前游戏地图已切换', {
            '原地图': data.previous || '无',
            '当前地图': data.current,
            '目标服务器地图': joinServerInfo.value?.map || '未设置'
          });
          // 记录客户端地图切换事件
          if (joinServerInfo.value?.map === data.current) {
            isAutomaticRetry.value = false;
            isAutomatic.value = false;
            // 用户成功连接，清除定时器
            if (connectionCheckTimer) {
              clearTimeout(connectionCheckTimer);
              connectionCheckTimer = null;
              safeLog('✅ 用户已成功连接到目标服务器');
              window.$message?.success("连接成功")
            }
          }
          break;
        case 'map:phaseChanged':
          safeLog('🎯 [Map:阶段变更] - 游戏阶段已更新', data.current, data.previous);
          gameServerInfo.value.mapPhase = data.current;
          // 发送数据给服务器
          sendServerGisData(gameServerInfo.value);
          break;
        case 'map:roundChanged':
          safeLog('🔄 [Map:回合变更] - 回合数已更新', data.current, data.previous);
          gameServerInfo.value.round = data.current;
          // 发送数据给服务器
          sendServerGisData(gameServerInfo.value);
          break;
        case 'map:teamCTScoreChanged':
          safeLog('🔵 [Map:CT分数变更] - CT阵营分数已更新', data.current, data.previous);
          gameServerInfo.value.CTScore = data.current;
          // 发送数据给服务器
          sendServerGisData(gameServerInfo.value);
          break;
        case 'map:teamTScoreChanged':
          safeLog('🟠 [Map:T分数变更] - T阵营分数已更新', data.current, data.previous);
          gameServerInfo.value.TScore = data.current;
          // 发送数据给服务器
          sendServerGisData(gameServerInfo.value);
          break;
        // ========== Round 事件 ==========
        case 'round:phaseChanged':
          safeLog('⏱️ [Round:阶段变更] - 回合阶段已更新', data.current, data.previous);
          gameServerInfo.value.mapPhase = data.current;
          // 发送数据给服务器
          sendServerGisData(gameServerInfo.value);
          break;
        case 'round:started':
          safeLog('▶️ [Round:开始] - 新回合开始', data.current, data.previous);
          gameServerInfo.value.mapPhase = data.current;
          // 发送数据给服务器
          sendServerGisData(gameServerInfo.value);
          break;
        case 'round:ended':
          safeLog('⏹️ [Round:结束] - 回合结束', data.current, data.previous);
          gameServerInfo.value.mapPhase = data.current;
          // 发送数据给服务器
          sendServerGisData(gameServerInfo.value);
          break;
        case 'player:teamChanged':
          safeLog('👥 [Player:阵营变更] - 玩家所属阵营已切换', data.current, data.previous);
          gamePlayerInfo.value.team = data.current;
          // 发送数据给服务器
          sendUserGisData(gamePlayerInfo.value);
          break;
        case 'player:hpChanged':
          safeLog('❤️ [Player:生命值变更] - 玩家生命值已更新', data.current, data.previous);
          gamePlayerInfo.value.health = data.current;
          // 发送数据给服务器
          sendUserGisData(gamePlayerInfo.value);
          break;
        case 'player:armorChanged':
          safeLog('🛡️ [Player:护甲值变更] - 玩家护甲值已更新', data.current, data.previous);
          gamePlayerInfo.value.armor = data.current;
          // 发送数据给服务器
          sendUserGisData(gamePlayerInfo.value);
          break;
        case 'player:helmetChanged':
          safeLog('⛑️ [Player:头盔变更] - 玩家头盔状态已更新', data.current, data.previous);
          gamePlayerInfo.value.helmet = data.current;
          // 发送数据给服务器
          sendUserGisData(gamePlayerInfo.value);
          break;
        case 'player:moneyChanged':
          safeLog('💰 [Player:金钱变更] - 玩家金钱已更新', data.current, data.previous);
          gamePlayerInfo.value.money = data.current;
          // 发送数据给服务器
          sendUserGisData(gamePlayerInfo.value);
          break;
        case 'player:equipmentValueChanged':
          safeLog('💎 [Player:装备价值变更] - 玩家装备价值已更新', data.current, data.previous);
          gamePlayerInfo.value.equipValue = data.current;
          // 发送数据给服务器
          sendUserGisData(gamePlayerInfo.value);
          break;
        case 'player:weaponChanged':
          safeLog('🔫 [Player:武器变更] - 玩家武器已更新', data.current, data.previous);
          gamePlayerInfo.value.weapon = data.current;
          // 发送数据给服务器
          sendUserGisData(gamePlayerInfo.value);
          break;
        case 'player:ammoClipChanged':
          safeLog('📦 [Player:弹夹弹药变更] - 玩家弹夹弹药已更新', data.current, data.previous);
          gamePlayerInfo.value.clipAmmo = data.current;
          // 发送数据给服务器
          sendUserGisData(gamePlayerInfo.value);
          break;
        case 'player:ammoReserveChanged':
          safeLog('🎒 [Player:备用弹药变更] - 玩家备用弹药已更新', data.current, data.previous);
          gamePlayerInfo.value.reserveAmmo = data.current;
          // 发送数据给服务器
          sendUserGisData(gamePlayerInfo.value);
          break;
        case 'player:killsChanged':
          safeLog('💀 [Player:击杀数变更] - 玩家击杀数已更新', data.current, data.previous);
          gamePlayerInfo.value.kills = data.current;
          // 发送数据给服务器
          sendUserGisData(gamePlayerInfo.value);
          break;
        case 'player:scoreChanged':
          safeLog('📊 [Player:分数变更] - 玩家分数已更新', data.current, data.previous);
          gamePlayerInfo.value.score = data.current;
          // 发送数据给服务器
          sendUserGisData(gamePlayerInfo.value);
          break;
        default:
          safeLog('❓ [未知事件]', { eventName, data });
      }
    });
  }

  // 移除 GSI 数据监听的函数
  function removeGsiDataListener() {
    console.log("取消监听 GSI 数据");
    window.ipcRenderer.off('cs2-gsi-data', () => {
      console.log('✅ GSI 数据监听已移除');
    });
  }

  /**
   * WS发送用户GIS数据(快速推送)
   */
  function sendUserGisData(data: Api.Game.CsgoPlayer) {
    //设置服务器地址
    if (!joinServerInfo.value?.addr) return;
    data.addr = joinServerInfo.value.addr;
    const setAddrMessage: Api.Game.WsServerMsgType = {
      type: '101',
      data: joinServerInfo.value.addr
    };
    const sendMessage: Api.Game.WsServerMsgType = {
      type: '100',
      data
    };
    if (GisWebsocket.GisWebsocket) {
      GisWebsocket.GisWebsocket.send(JSON.stringify(setAddrMessage));
      GisWebsocket.GisWebsocket.send(JSON.stringify(sendMessage));
    }
  }

  /**
   * WS发送服务器GIS数据(快速推送)
   */
  function sendServerGisData(data: Api.Game.ServerInfoData) {
    if (!joinServerInfo.value?.addr) return;
    //设置服务器地址
    data.addr = joinServerInfo.value.addr;
    const sendMessage: Api.Game.WsServerMsgType = {
      type: '103',
      data
    };
    if (ServerWebsocket.ServerWebsocket) {
      ServerWebsocket.ServerWebsocket.send(JSON.stringify(sendMessage));
    }
  }

  /** WS发送挤服数据 */
  function sendJoinServer(data: Api.Game.ServerVo) {
    const sendMessage: Api.Game.WsServerMsgType = {
      type: '100',
      data
    };
    if (ServerWebsocket.ServerWebsocket) {
      ServerWebsocket.ServerWebsocket.send(JSON.stringify(sendMessage));
    }
  }

  // 初始化服务器 WebSocket 连接
  async function initServerWebsocket() {
    ServerWebsocket.init();
  }

  /** Close GisWebsocket connection */
  function closeGisWebsocket() {
    if (GisWebsocket.GisWebsocket) {
      GisWebsocket.close();
    }
  }

  // 初始化GIS WebSocket 连接
  async function initGisWebsocket() {
    GisWebsocket.init();
  }

  /** Close ServerWebsocket connection */
  function closeServerWebsocket() {
    if (ServerWebsocket.ServerWebsocket) {
      ServerWebsocket.close();
    }
  }


  return {
    automaticInfo,
    automaticCount,
    isAutomatic,
    communityList,
    serverDataList,
    mapList,
    currentServerList,
    selectedCommunityId,
    isGameRunning,
    GamePlatform,
    csgo2Path,
    steamPath,
    refreshingServerAddrs,
    joinServerInfo,
    isGameLaunching,
    automaticJoinConfig,
    currentServerWsList,
    gameServerInfo,
    gamePlayerInfo,
    currentGisServerList,
    currentGisPlayerList,
    initServerWebsocket,
    initGisWebsocket,
    initServerList,
    closeServerWebsocket,
    closeGisWebsocket,
    sendJoinServer,
    queryServerInfosResponse,
    queryServerInfoResponse,
    countServerServerNumber,
    countServerPlayerNumber,
    listenToGsiData,
    removeGsiDataListener,
    checkGameRunning,
    startGameRunningCheck,
    stopGameRunningCheck,
    setGamePlatform,
    setCsgo2Path,
    setSteamPath,
    setJoinServerPersonValue,
    setJoinServerCountValue,
    setJoinServerAutoRetryValue,
    startGame,
    startAutomaticJoinServer,
    stopAutomaticJoinServer,
    connectServerUsingSteamUrl,
    queryWsServerInfosResponse,
  };
});
