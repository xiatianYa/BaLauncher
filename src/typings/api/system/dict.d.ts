/**
 * namespace System
 *
 * backend api module: "System"
 */
declare namespace Api {
  namespace System {
    /** dict list */
    type DictPageList = Common.PaginatingQueryRecord<Dict>;
    /**
     * dict type
     *
     * - "1": system dict
     * - "2": business dict
     */
    type DictType = '1' | '2';

    /** dict item edit model (backend SysDictItemAddDTO / SysDictItemUpdateDTO) */
    type DictItemEdit = Pick<
      Api.System.DictItem,
      'dictId' | 'dictCode' | 'value' | 'zhCn' | 'enUs' | 'type' | 'sort' | 'description' | 'status'
    > & {
      /** dict item id (update required) */
      id?: number;
    };

    /** dict search params (backend SysDictSearchDTO) */
    type DictSearchParams = CommonType.RecordNullable<
      Pick<Api.System.Dict, 'name' | 'code' | 'type' | 'description' | 'status'> &
        Api.Common.CommonSearchParams
    >;

    /** dict edit model */
    type DictEdit = Pick<Api.System.Dict, 'name' | 'code' | 'type' | 'sort' | 'description' | 'status'> & {
      /** dict id (update required) */
      id?: number;
    };

    /** dict tree * */
    type DictTree = Pick<Api.System.Dict, 'id' | 'name' | 'code' | 'type' | 'description' | 'status'>;

    /** dict item search params */
    type DictItemSearchParams = CommonType.RecordNullable<
      Pick<Api.System.DictItem, 'dictId' | 'value' | 'zhCn' | 'enUs' | 'description'> &
        Api.Common.CommonSearchParams
    >;

    /** dict item page list */
    type DictItemPageList = Common.PaginatingQueryRecord<DictItem>;

    /** dict options */
    type DictOptions = {
      label: string;
      value: string;
      type: NaiveUI.ThemeColor;
    };

    /** dict store search params */
    type DictStoreSearchParams = CommonType.RecordNullable<{ language: string; code?: string }>;

    /** dict item */
    type DictItem = Common.CommonRecord<{
      /** dict id */
      dictId: number;
      /** dict code */
      dictCode: string;
      /** dict item value */
      value: string;
      /** dict item label: zh_cn */
      zhCn: string;
      /** dict item label: en_us */
      enUs: string;
      /** dict item type */
      type: string;
      /** dict item sort */
      sort: number;
      /** dict item description */
      description: string;
      /** dict item status */
      status: Common.EnableStatus;
    }>;

    /** dict */
    type Dict = Common.CommonRecord<{
      /** dict name */
      name: string;
      /** dict code */
      code: string;
      /** dict type */
      type: DictType;
      /** dict sort */
      sort: number;
      /** dict description */
      description: string;
      /** dict status */
      status: Common.EnableStatus;
    }>;
  }
}
