import { request } from '@/service/request';

// =============== Feedback Begin ===============

/** 分页查询反馈（管理员） */
export function fetchGetFeedbackPage(params?: Api.System.SysFeedbackSearchDTO) {
  return request<Api.System.SysFeedbackPageList>({
    url: '/sysFeedback/page',
    method: 'get',
    params
  });
}

/** 获取当前用户的反馈列表 */
export function fetchGetMyFeedbackList() {
  return request<Api.System.SysFeedbackVo[]>({
    url: '/sysFeedback/listMy',
    method: 'get'
  });
}

/** 根据主键获取反馈详情 */
export function fetchGetFeedbackInfo(id: number) {
  return request<Api.System.SysFeedbackVo>({
    url: `/sysFeedback/getInfo/${id}`,
    method: 'get'
  });
}

/** 新增反馈（用户端） */
export function fetchAddFeedback(data: Api.System.SysFeedbackAddDTO) {
  return request<boolean>({
    url: '/sysFeedback/save',
    method: 'post',
    data
  });
}

/** 更新反馈（管理员处理/修改状态） */
export function fetchUpdateFeedback(data: Api.System.SysFeedbackUpdateDTO) {
  return request<boolean>({
    url: '/sysFeedback/update',
    method: 'put',
    data
  });
}

/** 删除反馈 */
export function fetchDeleteFeedback(id: number) {
  return request<boolean>({
    url: `/sysFeedback/remove/${id}`,
    method: 'delete'
  });
}

// =============== Comment Begin ===============

/** 根据目标获取评论树（用户端，顶级评论 + 嵌套子评论） */
export function fetchGetCommentTree(targetType: number, targetId: number) {
  return request<Api.System.SysCommentVo[]>({
    url: '/sysComment/listByTarget',
    method: 'get',
    params: { targetType, targetId }
  });
}

/** 发表评论 */
export function fetchAddComment(data: Api.System.SysCommentAddDTO) {
  return request<boolean>({
    url: '/sysComment/save',
    method: 'post',
    data
  });
}

/** 删除评论 */
export function fetchDeleteComment(id: number) {
  return request<boolean>({
    url: `/sysComment/remove/${id}`,
    method: 'delete'
  });
}

/** 修改评论状态（管理员屏蔽/审核） */
export function fetchUpdateCommentStatus(data: Api.System.SysCommentUpdateDTO) {
  return request<boolean>({
    url: '/sysComment/update',
    method: 'put',
    data
  });
}

/** 点赞评论 */
export function fetchLikeComment(id: number) {
  return request<boolean>({
    url: `/sysComment/like/${id}`,
    method: 'post'
  });
}

/** 点踩评论 */
export function fetchDislikeComment(id: number) {
  return request<boolean>({
    url: `/sysComment/dislike/${id}`,
    method: 'post'
  });
}
