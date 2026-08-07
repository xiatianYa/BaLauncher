/**
 * namespace Weather
 *
 * 和风天气自定义域名版 API 返回类型（Electron 主进程 fetchCurrentWeather 返回）
 */
declare namespace Api {
  namespace Weather {
    /** 数值 + 单位 */
    interface Measurement {
      /** 数值 */
      value: number;
      /** 单位（如 °C / m/s / hPa / mm） */
      unit: string;
    }

    /** 元数据 */
    interface Metadata {
      /** 数据标签 */
      tag: string;
      /** 归属声明链接 */
      attributions: string[];
    }

    /** 天气状况 */
    interface Condition {
      /** 文字描述（如 晴 / 少云 / 阴） */
      text: string;
      /** 天气代码（如 100=晴 101=多云） */
      code: string;
      /** 图标编号 */
      icon: string;
    }

    /** 风 */
    interface Wind {
      /** 风向 */
      direction: {
        /** 风向角度 */
        degree: number;
        /** 方位缩写（n/ne/e/se/s/sw/w/nw） */
        compass: string;
      };
      /** 风速 */
      speed: Measurement;
      /** 风力等级 */
      scale: number;
    }

    /** 降水 */
    interface Precipitation {
      /** 累计降水量 */
      amount: Measurement;
      /** 降水强度 */
      intensity: Measurement;
      /** 降水类型（none=无降水） */
      type: string;
    }

    /** 当前天气完整返回 */
    interface Current {
      metadata: Metadata;
      condition: Condition;
      /** 温度 */
      temperature: Measurement;
      /** 体感温度 */
      feelsLike: Measurement;
      /** 相对湿度（0-1，如 0.6 = 60%） */
      humidity: number;
      wind: Wind;
      /** 阵风 */
      windGust: Measurement;
      precipitation: Precipitation;
      /** 气压 */
      pressure: Measurement;
      /** 能见度 */
      visibility: Measurement;
      /** 露点温度 */
      dewPoint: Measurement;
      /** 云量占比（0-1，如 0.02 = 2%） */
      cloudCover: number;
      /** 紫外线指数 */
      uvIndex: number;
    }
  }
}
