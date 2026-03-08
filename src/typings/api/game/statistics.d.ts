declare namespace Api {
  namespace Game {
    /** Statistics line vo */
    type StatisticsLineVo = {
      /** 社区名称列表 */
      communityNames: Array<string>;
      /** 社区数据列表 */
      communityStatistics: Array<Array<number>>;
      /** 统计时间列表 */
      timeMinutes: Array<string>;
    };
    /** Statistics line vo */
    type StatisticsPieVo = {
      /** 社区名称 */
      name: string;
      /** 社区数据 */
      value: number;
    };
  }
}
