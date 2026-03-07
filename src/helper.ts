import type { AppRoute, ExtendedRoute, RouteExtraPropsWithPreprocess, RouteExtraPropsWithoutPreprocess } from './type';

/** 用来打标，若不通过 defineExtraProps 添加额外属性，会报错 */
export const PROCESS_BRAND = Symbol('PROCESS_BRAND');

function defineExtraProps<T extends AppRoute>(
  route: T,
  extra: RouteExtraPropsWithoutPreprocess,
): ExtendedRoute<T, never>;
function defineExtraProps<T extends AppRoute, P>(
  route: T,
  extra: RouteExtraPropsWithPreprocess<T, P>,
): ExtendedRoute<T, P>;
function defineExtraProps(
  route: AppRoute,
  extra: RouteExtraPropsWithoutPreprocess | RouteExtraPropsWithPreprocess<AppRoute, any>,
) {
  return {
    ...route,
    ...extra,
    [PROCESS_BRAND]: undefined as any,
  };
}

export const ApiHelper = {
  /**
   * 辅助定义类型，用于同时提供静态类型和动态类型标识，需要保证传入的字符串是泛型类型名
   *
   * 所有传递给 t 函数的类型都要使用 export 导出，供 Node.js 运行时解析使用
   *
   * @sample `t<IDemoGetQuery>('IDemoGetQuery')`
   */
  t: <T>(typeName: string): T => {
    return typeName as any;
  },
  defineExtraProps,
};
