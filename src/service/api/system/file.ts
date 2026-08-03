import { request } from '@/service/request';

/** 上传文件返回结果 */
type SysFile = {
  /** 文件名 */
  name: string;
  /** 访问地址 */
  url: string;
};

/** 上传文件 */
export function fetchUploadFile(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return request<SysFile>({
    url: '/file/upload',
    method: 'post',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  });
}
