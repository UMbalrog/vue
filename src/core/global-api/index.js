/* @flow */

import config from '../config'
import { initUse } from './use'
import { initMixin } from './mixin'
import { initExtend } from './extend'
import { initAssetRegisters } from './assets'
import { set, del } from '../observer/index'
import { ASSET_TYPES } from 'shared/constants'
import builtInComponents from '../components/index'
import { observe } from 'core/observer/index'

import {
  warn,
  extend,
  nextTick,
  mergeOptions,
  defineReactive
} from '../util/index'

export function initGlobalAPI (Vue: GlobalAPI) {
  // config
  const configDef = {}
  configDef.get = () => config
  if (process.env.NODE_ENV !== 'production') {
    configDef.set = () => {
      warn(
        'Do not replace the Vue.config object, set individual fields instead.'
      )
    }
  }
  Object.defineProperty(Vue, 'config', configDef)

  // exposed util methods.
  // NOTE: these are not considered part of the public API - avoid relying on
  // them unless you are aware of the risk.
  Vue.util = {
    warn,
    extend,
    mergeOptions,
    defineReactive
  }

  Vue.set = set
  Vue.delete = del
  Vue.nextTick = nextTick

  // 2.6 explicit observable API
  // 让一个对象可响应，T为泛型，及数据类型在使用是才定义
  Vue.observable = <T>(obj: T): T => {
    observe(obj)
    return obj
  }
  // 初始化 Vue.option 对象，并扩展
  // option里，再储蓄全局的组件、指令、过滤器 component/directive/filter
  Vue.options = Object.create(null) //Object.create(null)可以提高性能，创建一个纯净的对象，没有原型的对象，没有原型链
  ASSET_TYPES.forEach(type => {
    Vue.options[type + 's'] = Object.create(null)
  })

  // this is used to identify the "base" constructor to extend all plain-object
  // components with in Weex's multi-instance scenarios.
  Vue.options._base = Vue

  // 将一个对象的属性拷贝到另一个对象中
  // 注册全局组件 keep-live
  extend(Vue.options.components, builtInComponents)
  // Use 用来注册插件
  initUse(Vue)
  // Mixin 实现混入
  initMixin(Vue)
  // extend 基于传入的option返回一个组件的构造函数，自动继承了Vue钩子函数
  initExtend(Vue)
  // 注册 Vue.component()、Vue.directive()、Vue.filter()方法
  initAssetRegisters(Vue)
}
