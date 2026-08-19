/**
 * namespace Workshop
 *
 * backend api module: "workshop"（Steam 创意工坊）
 */
declare namespace Api {
  namespace Workshop {
    /** 工坊物品信息 + 作者信息 + 本地地图信息（对应 Java SteamWorkshopInfoVo） */
    type SteamWorkshopInfoVo = {
      /** 工坊物品信息（标题/描述/预览图/横幅/标签/统计等） */
      workshopInfo?: PublishedFileDetail;
      /** 作者信息（昵称/头像/主页链接等），查询失败时为 null */
      author?: Player | null;
      /** 本地地图信息（按标题查询 game_map 表，对应 Java GameMapVo），未匹配到本地地图时为 null */
      map?: Api.Game.MapVo | null;
    };

    /** Steam 创意工坊物品详情（对应 Java PublishedFileDetail） */
    type PublishedFileDetail = {
      result: number;
      publishedfileid: string;
      creator: string;
      creator_appid: number;
      consumer_appid: number;
      consumer_shortcutid: number;
      filename: string;
      file_size: string;
      preview_file_size: string;
      preview_url: string;
      url: string;
      hcontent_file: string;
      hcontent_preview: string;
      title: string;
      file_description: string;
      time_created: number;
      time_updated: number;
      visibility: number;
      flags: number;
      workshop_file: boolean;
      workshop_accepted: boolean;
      show_subscribe_all: boolean;
      num_comments_public: number;
      banned: boolean;
      ban_reason: string;
      banner: string;
      can_be_deleted: boolean;
      app_name: string;
      file_type: number;
      can_subscribe: boolean;
      subscriptions: number;
      favorited: number;
      followers: number;
      lifetime_subscriptions: number;
      lifetime_favorited: number;
      lifetime_followers: number;
      lifetime_playtime: string;
      lifetime_playtime_sessions: string;
      views: number;
      num_children: number;
      num_reports: number;
      language: number;
      maybe_inappropriate_sex: boolean;
      maybe_inappropriate_violence: boolean;
      revision_change_number: string;
      revision: number;
      ban_text_check_result: number;
      tags?: Tag[];
    };

    /** Steam 创意工坊标签 */
    type Tag = {
      tag?: string;
    };

    /** Steam 玩家信息（作者，对应 Java Player） */
    type Player = {
      steamid: string;
      communityvisibilitystate: number;
      profilestate: number;
      personaname: string;
      commentpermission: number;
      profileurl: string;
      avatar: string;
      avatarmedium: string;
      avatarfull: string;
      avatarhash: string;
      personastate: number;
      primaryclanid: string;
      timecreated: number;
      personastateflags: number;
    };
  }
}
