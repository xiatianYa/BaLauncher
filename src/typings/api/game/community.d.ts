declare namespace Api {
  namespace Game {
    /** community search params */
    type CommunitySearchParams = CommonType.RecordNullable<
      Pick<Api.Game.Community, 'communityName' | 'logo' | 'website'> & Api.Common.CommonSearchParams
    >;

    /** Community list */
    type CommunityList = Community[];

    /** Community */
    type Community = Common.CommonRecord<{
      /** community name */
      communityName: string;
      /** community logo */
      logo: string;
      /** community website */
      website: string;
      /** server number */
      serverNumber: number;
      /** player number */
      playerNumber: number;
    }>;

    type CommunityParams = {
      /** community name */
      communityName: string;
      /** community logo */
      logo: string;
      /** community website */
      website: string;
    };

    type CommunityBindOptionsVo = {
      communityId: string;
      communityName: string;
      options: Array<{ code: string; desc: string }>;
    };
  }
}
