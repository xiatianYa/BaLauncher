declare namespace Api {
  namespace Monitor {
    /** 调度任务 VO（status 为启用状态字符串；triggerState 为 Quartz 运行状态） */
    type MonSchedulerVo = Common.CommonRecord<{
      jobName?: string;
      jobGroup?: string;
      triggerName?: string;
      triggerGroup?: string;
      jobData?: string;
      triggerData?: string;
      cron?: string;
      jobClassName?: string;
      status?: string;
      triggerState?: string;
      nextFireTime?: string;
    }>;

    /** 调度任务分页列表 */
    type MonSchedulerPageList = Common.PaginatingQueryRecord<MonSchedulerVo>;

    /** 调度任务查询参数 */
    type MonSchedulerSearchParams = CommonType.RecordNullable<{
      jobName?: string;
      jobGroup?: string;
      triggerName?: string;
      triggerGroup?: string;
    } & Api.Common.CommonSearchParams>;

    /** 调度任务新增/修改参数（新增时不传 id） */
    type MonSchedulerEditParams = CommonType.RecordNullable<{
      id?: number;
      jobName?: string;
      jobGroup?: string;
      triggerName?: string;
      triggerGroup?: string;
      jobData?: string;
      triggerData?: string;
      cron?: string;
      jobClassName?: string;
      status?: number;
    }>;

    /** 调度任务名称选项（allJobNames 接口返回） */
    type MonSchedulerNameOptions = {
      label: string;
      value: string;
    };
  }
}
