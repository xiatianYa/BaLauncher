import { request } from '@/service/request';

// 获取首页Line图
export function fetchGetLineChart() {
  return request<Api.Game.StatisticsLineVo>({
    url: '/gameOnlineStatistics/lineChart',
    method: 'get'
  });
}

// 获取首页Pie图
export function fetchGetPieChart() {
  return request<Array<Api.Game.StatisticsPieVo>>({
    url: '/gameOnlineStatistics/pieChart',
    method: 'get'
  });
}
