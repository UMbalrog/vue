/*
 * not type checking this file because flow doesn't play well with
 * dynamically accessing methods on Array prototype
 */

import { def } from '../util/index'

const arrayProto = Array.prototype
// 使用数组的原型创建一个新的对象
export const arrayMethods = Object.create(arrayProto)
// 都是修改原数组的方法；
const methodsToPatch = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
]

/**
 * Intercept mutating methods and emit events
 * 截获数组变异方法并发出事件
 */
methodsToPatch.forEach(function (method) {
  // cache original method
  // 保存数组原有的方法
  const original = arrayProto[method]
  // 调用 defineProperty 重新定义修改数组的方法
  def(arrayMethods, method, function mutator (...args) {
    // args 就是调用数组时传入的参数
    // 调用数组原发法，获取到执行后的值
    const result = original.apply(this, args)
    // 获取对象的 ob 对象响应式后的实例对象
    const ob = this.__ob__
    let inserted //插入的新元素
    switch (method) {
      case 'push':
      case 'unshift':
        inserted = args
        break
      case 'splice':
        inserted = args.slice(2)
        break
    }
    // 插入的新元素，重新遍历元素设置为响应式
    if (inserted) ob.observeArray(inserted)
    // notify change
    // 因为调用了修改数组的方法，所以触发dep
    ob.dep.notify()
    // 返回修改后的数组
    return result
  })
})
