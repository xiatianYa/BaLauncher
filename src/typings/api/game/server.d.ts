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
            /** 服务器名称 */
            serverName: string;
            /** 社区ID */
            communityId: string;
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
            round: string;
            /** CT胜利回合 */
            CTScore: string;
            /** T胜利回合 */
            TScore: string;
            /** 游戏对局阶段 */
            mapStage: string;
            /** 游戏回合阶段 */
            mapPhase: string;
        }

        type ServerInfoData = {
            /** 地址 */
            addr: string;
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

        type CsgoPlayer = {
            //系统用户信息
            loginUser?: Api.Auth.LoginUser;
            //服务器地址
            addr: string;
            // 玩家阵营（ct/t/spectator）
            team: string;
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
