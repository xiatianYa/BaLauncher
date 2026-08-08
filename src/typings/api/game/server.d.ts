declare namespace Api {
    namespace Game {

        /** server search params */
        type ServerSearchParams = CommonType.RecordNullable<
            Pick<
                {
                    /** 服务器名称 */
                    serverName: string;
                    /** 社区ID */
                    communityIds: Array<string> | null;
                },
                'serverName' | 'communityIds'
            > &
            Api.Common.CommonSearchParams
        >;

        /** server list */
        type ServerList = Server[];

        /** server params */
        type ServerParams = {
            /** 服务器ID（修改时必填） */
            id?: number;
            /** 服务器名称 */
            serverName: string;
            /** 社区ID */
            communityId: string;
            /** 服务器IP */
            ip: string;
            /** 服务器端口 */
            port: string;
            /** 排序值 */
            sort: number;
            /** 是否统计 */
            isStatistics: string;
            /** 是否查询 */
            isQuery: string;
            /** 连接指令 */
            connectStr: string;
        };

        type GameCommunityServerData = {
            /** 游戏社区基础信息 */
            gameCommunity: GameCommunity;
            /** 该社区下的所有服务器列表 */
            serverVos: ServerVo[];
        }

        type GameCommunityServerInfoData = {
            // 源服务器信息
            serverInfoData: SeverVo[];
        }

        // 游戏社区基础信息
        type GameCommunity = {
            /** 社区名称（如 "ZED"） */
            communityName: string;
            /** 创建时间（格式：yyyy-MM-dd HH:mm:ss） */
            createTime: string;
            /** 创建者用户 ID */
            createUserId: number;
            /** 社区唯一 ID */
            id: number;
            /** 是否删除（逻辑删除标识） */
            isDeleted: boolean;
            /** 社区 Logo 图片地址 */
            logo: string;
            /** 最后更新时间（格式：yyyy-MM-dd HH:mm:ss） */
            updateTime: string;
            /** 更新者用户 ID */
            updateUserId: number;
            /** 社区官网地址（可为空字符串） */
            website: string;
        }

        // 服务器VO
        type ServerVo = {
            /** 服务器连接地址*/
            connectStr: string;
            /** 地图标签 */
            mapLabel: string;
            /** 地图名称*/
            mapName: string;
            /** 地图预览图地址 */
            mapUrl: string;
            /** 服务器最大玩家数 */
            maxPlayers: number;
            /** 服务器当前在线玩家数 */
            numPlayers: number;
            /** 服务器名称*/
            serverName: string;
            /** 类型 */
            type: string;
            /** 标签 */
            tag: string[];
            /** 地图特殊标记*/
            artifact?: string | null;
            /** 最小连接人数 */
            minPlayers: number;
        }

        type SeverVoListResult = {
            success: boolean;
            data: SeverVo;
        }

        // 源服务器数据
        type SeverVo = {
            /** 服务器ID */
            serverId: number;
            /** 社区名称 */
            communityName: string;
            /** 社区ID */
            communityId: number;
            /** 地图ID */
            mapId: number;
            /** 地图名称 */
            mapName: string;
            /** 译名 */
            mapLabel: string;
            /** 地图预览图地址 */
            mapUrl: string;
            /** 地图难度 */
            type: string;
            /** 地图标签 */
            tag: string[];
            /** 地图神器 */
            artifact: string;
            /** 服务器名称 */
            serverName: string;
            /** 游玩人数 */
            numPlayers: number;
            /** 最大在线人数 */
            maxPlayers: number;
            /** 连接地址 */
            connectStr: string;
            /** 最小连接人数 */
            minPlayers: number;
            /** 换图记录时间 */
            dateTimeOriginal: LocalDateTime;
            /** 服务器Ping值 */
            ping: number;
            /** 服务器在线状态 */
            isOnline: boolean;
            /** 服务器回合 */
            round: string | null;
            /** CT胜利回合 */
            CTScore: string | null;
            /** T胜利回合 */
            TScore: string | null;
            /** 游戏对局阶段 */
            mapStage: string | null;
            /** 游戏回合阶段 */
            mapPhase: string | null;
        }

        type ServerInfoData = {
            /** 服务器ID */
            id: number;
            /** 回合 */
            round: string;
            /** CT分数 */
            CTScore: string;
            /** T分数 */
            TScore: string;
            /** 地图阶段 */
            mapStage: string;
            /** 游戏阶段 */
            mapPhase: string;
        }

        /** CSGO 武器信息 */
        type CsgoWeapon = {
            /** 武器类型 */
            type?: string | null;
            /** 显示名称 */
            displayName?: string | null;
            /** 内部名称 */
            name?: string | null;
            /** 状态 */
            state?: string | null;
            /** 当前弹夹弹药 */
            ammoClip?: number | null;
            /** 弹夹容量 */
            ammoClipMax?: number | null;
            /** 后备弹药 */
            ammoReserve?: number | null;
        }

        /** 玩家游戏内实时数据 */
        type UserGameData = {
            /** 玩家登录信息 */
            loginUser: Api.Auth.LoginUser;
            /** 阵营：CT / T / SPECTATOR */
            team?: string;
            /** 生命值 */
            health?: number;
            /** 护甲值 */
            armor?: number;
            /** 金钱 */
            money?: number;
            /** 装备价值 */
            equipValue?: number;
            /** 当前武器 */
            weapon?: CsgoWeapon;
            /** 弹夹内弹药 */
            clipAmmo?: number;
            /** 备用弹药 */
            reserveAmmo?: number;
            /** 是否有头盔 */
            helmet?: boolean;
            /** 击杀数 */
            kills?: number;
            /** 积分 */
            score?: number;
        }

        /**
         * 玩家操作动态记录（对应 Java PlayerActionLog）
         * 记录挤服 / 暂停挤服 / 加入服务器等动作
         */
        type PlayerActionLog = {
            /** 执行操作的玩家 */
            loginUser: Api.Auth.LoginUser;
            /** 操作时间（Java LocalDateTime → 前端字符串，如 yyyy-MM-dd HH:mm:ss） */
            actionTime: string;
            /** 操作动态内容（如：开始挤服、暂停挤服、加入服务器） */
            actionContent: string;
        }

        /**
         * 服务器游戏实时数据（Code 204 / 205 推送）
         * key：服务器ID（字符串，保证 JSON key 合法）
         */
        type ServerGameDataVo = {
            /** 服务器信息映射表（key：服务器ID字符串） */
            serverInfoMap: Record<string, ServerInfoData>;
            /** 玩家信息映射表（key：服务器ID字符串，value：该服务器单个玩家或列表；本地合并后统一为列表） */
            userGameDataMap: Record<string, Api.Game.UserGameData[]>;
            /** 玩家操作动态列表映射表（key：服务器ID字符串，value：单条或多条操作日志；本地合并后统一为列表） */
            playerActionMap: Record<string, Api.Game.PlayerActionLog[]>;
        }

        /**
         * WebSocket 通用消息包装（对应 Java MessageVo）
         */
        type WsMessage<T = unknown> = {
            /** 发送者（服务端推送时可能为空） */
            sendUser?: Api.Auth.LoginUser | null;
            /** 接收者ID（广播时为空） */
            receiveId?: number | null;
            /** 消息码，如 "200" "204" "205" */
            code: string;
            /** 业务数据 */
            data: T;
            /** 提示语 */
            msg: string | null;
        }

        type CsgoPlayer = {
            // 玩家阵营（ct/t/spectator）
            team: string;
            // 玩家状态（alive/dead/spectator）
            playStatus: string;
            // 生命值
            health: number;
            // 护甲值
            armor: number;
            // 金钱数
            money: number;
            // 装备价值
            equipValue: number;
            // 当前武器
            weapon: any;
            // 弹夹内弹药数
            clipAmmo: number;
            // 备用弹药数
            reserveAmmo: number;
            // 是否有头盔
            helmet: boolean;
            // 击杀数
            kills: number;
            // 分数（CSGO内的玩家积分）
            score: number;
        }

        type AutomationPlayer = {
            /** 服务器地址 */
            addr: string;
            /** 用户ID */
            userId: number;
            /** 用户名称 */
            userName: string;
            /** 用户头像 */
            avatar: string;
            /** 挤服描述 */
            description: string;
        }

        // 服务器数据
        type Server = {
            /** 服务器ID */
            id: number;
            /** 服务器名称 */
            serverName?: string;
            /** 社区ID */
            communityId?: number;
            /** 服务器IP */
            ip?: string;
            /** 服务器端口 */
            port?: string;
            /** 排序值 */
            sort?: number;
            /** 是否统计 */
            isStatistics?: string;
            /** 是否查询 */
            isQuery?: string;
            /** 连接指令 */
            connectStr?: string;
            /** Ping */
            ping: number;
        }

        // 服务器消息类型
        type WsServerMsgType = {
            type: string;
            data: any;
        }

        /** 自动挤服配置 */
        type AutomaticJoinConfig = {
            /** 最小连接人数 */
            joinServerPersonValue: number;
            /** 最大连接人数 */
            joinServerCountValue: number;
            /** 自动重试 */
            joinServerAutoRetryValue: boolean;
            /** GIS数据推送 */
            pushGisValue: boolean;
            /** 挤服延迟(毫秒) */
            joinServerDelayValue: number;
        }

        /** 地图订阅数据 */
        type ServerDetail = {
            communityId: number;
            connectStr: string;
            createTime: string;
            gameMap: Api.Game.Map;
            id: number;
            ip: string;
            isQuery: string;
            isStatistics: string;
            port: string;
            serverName: string;
            sort: number;
            sourceServer: SourceServer;
            updateTime: string;
        }
    }
}
