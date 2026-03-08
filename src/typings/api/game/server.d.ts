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
            serverInfoData: InfoResponse[];
        }

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

        type InfoResponseListResult = {
            success: boolean;
            data: InfoResponse;
        }

        type InfoResponse = {
            protocol: number;
            name: string;
            map: string;
            folder: string;
            game: string;
            appId: number;
            players: number;
            maxPlayers: number;
            bots: number;
            serverType: string;
            environment: string;
            visibility: number;
            vac: number;
            version: string;
            port?: number;
            serverId?: BigInt;
            spectatorPort?: number;
            spectatorName?: string;
            keywords?: string;
            gameId?: BigInt;
            addr: string;
            isOnline: boolean;
        }

        type Server = {
            //服务器名称
            serverName?: string;
            // 社区ID
            communityId?: number; 
            // 服务器IP
            ip?: string;
            // 服务器端口
            port?: string; 
            // 排序值
            sort?: number;
            // 是否统计 
            isStatistics?: string;
            // 是否查询 
            isQuery?: string;
            // 连接指令
            connectStr?: string;
        }

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
        }
    }
}
