import { $t } from '@/locales';

/**
 * Transform record to option
 *
 * @example
 *   ```ts
 *   const record = {
 *     key1: 'label1',
 *     key2: 'label2'
 *   };
 *   const options = transformRecordToOption(record);
 *   // [
 *   //   { value: 'key1', label: 'label1' },
 *   //   { value: 'key2', label: 'label2' }
 *   // ]
 *   ```;
 *
 * @param record
 */
export function transformRecordToOption<T extends Record<string, string>>(record: T) {
  return Object.entries(record).map(([value, label]) => ({
    value,
    label
  })) as CommonType.Option<keyof T, T[keyof T]>[];
}

/**
 * Translate deleted id to DeleteParams
 *
 * @param record id Array
 * @returns Api.Common.DeleteParams
 */
export function transDeleteParams(record: number[]): {
  ids: number[];
} {
  return { ids: record };
}

/**
 * Translate options
 *
 * @param options
 */
export function translateOptions(options: CommonType.Option<string, App.I18n.I18nKey>[]) {
  return options.map(option => ({
    ...option,
    label: $t(option.label)
  }));
}

/**
 * Toggle html class
 *
 * @param className
 */
export function toggleHtmlClass(className: string) {
  function add() {
    document.documentElement.classList.add(className);
  }

  function remove() {
    document.documentElement.classList.remove(className);
  }

  return {
    add,
    remove
  };
}

/**
 * 转换switch
 *
 * @param status
 * @returns
 */
export function transformStatus(status: any): '0' | '1' {
  return status ? '1' : '0';
}

/**
 * 转换switch
 *
 * @param status
 * @returns
 */
export function transformStatusBoolean(status: any): boolean {
  return status === '1';
}

/**
 * 根据文件名称返回标签
 *
 * @param filename
 * @returns
 */
export function getFileTypeByExtension(filename: string): 'file' | 'image' | 'video' {
  const fileExtension = filename.split('.').pop()?.toLowerCase() ?? '';

  // 定义图片和视频的文件扩展名数组
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp'];
  const videoExtensions = ['mp4', 'avi', 'mov', 'mkv', 'flv', 'wmv', 'mpeg'];

  // 判断文件类型
  if (imageExtensions.includes(fileExtension)) {
    return 'image';
  } else if (videoExtensions.includes(fileExtension)) {
    return 'video';
  }
  return 'file'; // 默认情况下，将其视为普通文件
}

