import axios, {
  AxiosRequestConfig,
  AxiosInstance,
  AxiosError,
  AxiosResponse
} from 'axios';
import { useAuthStore } from '@/store/modules/auth';
import { getToken } from '@/store/modules/auth/shared';
import { handleRefreshToken } from './shared';

// 定义响应数据类型
export type Response<T = unknown> = {
  code: number;
  msg: string;
  data: T;
};

// 定义请求结果类型
export type SuccessResult<T> = {
  data: T;
  error: null;
  response: Response<T>;
};

export type ErrorResult<T> = {
  data: null;
  error: Error;
  response?: Response<T>;
};

export type RequestResult<T = unknown> = SuccessResult<T> | ErrorResult<T>;

// 类型谓词
export function isSuccessResult<T>(result: RequestResult<T>): result is SuccessResult<T> {
  return result.error === null;
}

// 创建 axios 实例 - 根据环境设置不同baseURL
const getBaseURL = () => {
  // 开发环境
  if (process.env.NODE_ENV === 'development') {
    return '/api'; // 本地开发通常使用代理
  }
  // 生产环境
  else if (process.env.NODE_ENV === 'production') {
    return 'https://www.bluearchive.top/api';
  }
  // 测试环境
  return 'https://www.bluearchive.top/api';
};

// 创建 axios 实例 - 关键修改：确保Cookie正确携带
const instance: AxiosInstance = axios.create({
  baseURL: getBaseURL(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  // 核心配置：允许携带跨域Cookie
  withCredentials: true,
});

// 请求拦截器
instance.interceptors.request.use(
  (config) => {
    // 使用SaToken的getToken()方法获取token
    const token = getToken();
    // 如果有token，添加到请求头
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// 响应拦截器：处理SaToken相关错误
instance.interceptors.response.use(
  (response: AxiosResponse<Response>) => {
    // 打印响应中的Cookie（服务器返回的Set-Cookie）
    return response;
  },
  async (error: AxiosError<Response>) => {
    const authStore = useAuthStore();

    // 处理跨域错误
    if (!error.response) {
      window.$message?.error('跨域请求失败，请检查网络或CORS配置');
      return Promise.reject(error);
    }

    const { status } = error.response;
    // 401: 未登录或token无效
    if (status === 401) {
      window.$message?.error('登录已过期，请重新登录');
      authStore.resetStore();
    }
    // 402: token已过期
    else if (status === 402) {
      //尝试刷新Token
      if (await handleRefreshToken()) {
        authStore.getUserInfo();
        return;
      } else {
        window.$message?.error('会话已过期，请重新登录');
        authStore.resetStore();
      }
    }
    // 403: 无权限访问
    else if (status === 403) {
      window.$message?.error('您没有权限访问该资源');
    }

    return Promise.reject(error);
  }
);

// 请求函数实现
export function request<T>(config: AxiosRequestConfig): Promise<RequestResult<T>> {
  return new Promise((resolve) => {
    const authStore = useAuthStore();
    instance(config)
      .then((response: AxiosResponse<Response<T>>) => {
        if (response.data.code !== 200) {
          resolve({
            data: null,
            error: new Error(response.data.msg || 'Request failed'),
            response: response.data
          });
        } else {
          resolve({
            data: response.data.data,
            error: null,
            response: response.data
          });
        }
      })
      .catch((error: AxiosError<Response<T>>) => {
        const errorMsg = error.message || '网络请求失败';
        // 只有在明确是认证错误时才重置store，避免所有错误都登出用户
        if (error.response?.status === 401 || error.response?.status === 402) {
          authStore.resetStore();
        }
        resolve({
          data: null,
          error: new Error(errorMsg),
          response: error.response?.data
        });
      });
  });
}

export default request;



