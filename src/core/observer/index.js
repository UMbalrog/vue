/* @flow */

import Dep from './dep'
import VNode from '../vdom/vnode'
import { arrayMethods } from './array'
import {
  def,
  warn,
  hasOwn,
  hasProto,
  isObject,
  isPlainObject,
  isPrimitive,
  isUndef,
  isValidArrayIndex,
  isServerRendering
} from '../util/index'

const arrayKeys = Object.getOwnPropertyNames(arrayMethods)

/**
 * In some cases we may want to disable observation inside a component's
 * update computation.
 */
export let shouldObserve: boolean = true

export function toggleObserving (value: boolean) {
  shouldObserve = value
}

/**
 * Observer class that is attached to each observed
 * object. Once attached, the observer converts the target
 * object's property keys into getter/setters that
 * collect dependencies and dispatch updates.

附加到每个观察对象的观察者类，创建后，观察者将目标对象的属性键转换为getter/setter，用于收集依赖项并发送更新。

 */
export class Observer {
  // 观察对象
  value: any;
  // 发布者
  dep: Dep;
  // 实例计数器
  vmCount: number; // number of vms that have this object as root $data

  constructor (value: any) {
    this.value = value
    this.dep = new Dep() //每个对象都有一个dep发布者
    this.vmCount = 0
    // 将实例挂载到对象的__ob__ 属性上，缓存起来，且设置不可枚举
    def(value, '__ob__', this)
    // 处理数组的响应式变
    if (Array.isArray(value)) {
      // 判断环境兼容
      // 对数组本身做响应式
      if (hasProto) {
        //将value的原型属性指向arrayMethods，arrayMethods中做了对改变数组方法的修补使得其可以监听改变
        protoAugment(value, arrayMethods)
      } else {
        copyAugment(value, arrayMethods, arrayKeys)
      }
      // 对数组中的每一个对象，创建一个observer实例，响应式
      this.observeArray(value)
    } else {
      // walk方法遍历每个属性，为每一个属性添加setter/getter
      this.walk(value)
    }
  }

  /**
   * Walk through all properties and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   */
  walk (obj: Object) {
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
      // 设置为响应式数据
      defineReactive(obj, keys[i])
    }
  }

  /**
   * Observe a list of Array items.
   */
  observeArray (items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}

// helpers

/**
 * Augment a target Object or Array by intercepting
 * the prototype chain using __proto__
 */
function protoAugment (target, src: Object) {
  /* eslint-disable no-proto */
  target.__proto__ = src
  /* eslint-enable no-proto */
}

/**
 * Augment a target Object or Array by defining
 * hidden properties.
 */
/* istanbul ignore next */
function copyAugment (target: Object, src: Object, keys: Array<string>) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    def(target, key, src[key])
  }
}

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 */
// 尝试创建一个新的observer实例，如果成功的创建了一个observed就返回，或者这个值已经有一个observer了，就直接返回这个observer；
export function observe (value: any, asRootData: ?boolean): Observer | void {
  // 判断 value是否是对象
  if (!isObject(value) || value instanceof VNode) {
    return
  }
  let ob: Observer | void
  // 如果value 有__ob__(observer对象) 属性就结束
  // __ob__相当于一个缓存
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    ob = value.__ob__
  } else if (
    shouldObserve &&
    !isServerRendering() &&
    (Array.isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value) &&
    !value._isVue
  ) {
    // 创建一个Observer 对象
    ob = new Observer(value)
  }
  if (asRootData && ob) { //根数据就计数
    ob.vmCount++
  }
  return ob
}

/**
 * Define a reactive property on an Object.
 * 为一个对象定义一个响应式的属性
 */
export function defineReactive (
  obj: Object,
  key: string,
  val: any,
  customSetter?: ?Function,
  shallow?: boolean // 浅是否浅度，就是遍历对象内部的对象
) {
  // 创建依赖对象，发布者用于收集观察者
  const dep = new Dep()
  // Object.getOwnPropertyDescriptor获取属性表述符，看看是否可配置
  const property = Object.getOwnPropertyDescriptor(obj, key)
  // 不可配置及不能delete也不可通过defineProperty配置，直接返回
  if (property && property.configurable === false) {
    return
  }
  // 有可能用户也设置了对象的get和set，这里就是缓存用户设置的get和set
  // cater for pre-defined getter/setters
  const getter = property && property.get
  const setter = property && property.set
  // 如果参数是两个，获取属性的值，并且，没有getter或者有setter
  if ((!getter || setter) && arguments.length === 2) {
    val = obj[key]
  }
  // 如果是深度添加响应式，递归了观察者子对象，给子对象属性添加getter/setter
  let childOb = !shallow && observe(val)
  // 添加响应式
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter () {
      // 是否有预定义就是用户设的getter，有就直接调用取值
      const value = getter ? getter.call(obj) : val；
      // 如果存在当前属性的依赖目标，即 watcher 对象，则添加建立依赖
      if (Dep.target) {
        // 这里会把dep对象添加到watcher的列表中，也会把watcher对象添加到dep的事件数组中，为了以后的触发
        dep.depend()
        // 如果子观察者目标存在，建立子对象的依赖关系
        if (childOb) {
          childOb.dep.depend()
          // 如果是属性是数组，则特殊处理数组
          if (Array.isArray(value)) {
            dependArray(value)
          }
        }
      }
      return value //最后返回
    },
    set: function reactiveSetter (newVal) {
      // 是否有预定义就是用户设的getter，有就直接调用取值存在value里
      const value = getter ? getter.call(obj) : val
      /* eslint-disable no-self-compare */
      // 判断新旧是否相等，特殊处理NaN的情况(newVal !== newVal && value !== value)，判断新旧是否都是NaN。相等直接返回
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      /* eslint-enable no-self-compare */
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        customSetter()
      }
      // #7981: for accessor properties without setter
      // 有getter没有setter，只读属性直接返回
      if (getter && !setter) return
      // 如果有预定义setter，直接调用改值，没有直接改值
      if (setter) {
        setter.call(obj, newVal)
      } else {
        val = newVal
      }
      // 如果新值是对象，则判断是否深度添加响应式，返回子对象的observe(newVal)
      childOb = !shallow && observe(newVal)
      // 发布者触发，依赖触发，发布通知
      dep.notify()
    }
  })
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 */
export function set (target: Array<any> | Object, key: any, val: any): any {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot set reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key)
    target.splice(key, 1, val)
    return val
  }
  if (key in target && !(key in Object.prototype)) {
    target[key] = val
    return val
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )
    return val
  }
  if (!ob) {
    target[key] = val
    return val
  }
  defineReactive(ob.value, key, val)
  ob.dep.notify()
  return val
}

/**
 * Delete a property and trigger change if necessary.
 */
export function del (target: Array<any> | Object, key: any) {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot delete reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1)
    return
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid deleting properties on a Vue instance or its root $data ' +
      '- just set it to null.'
    )
    return
  }
  if (!hasOwn(target, key)) {
    return
  }
  delete target[key]
  if (!ob) {
    return
  }
  ob.dep.notify()
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 */
function dependArray (value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i]
    e && e.__ob__ && e.__ob__.dep.depend()
    if (Array.isArray(e)) {
      dependArray(e)
    }
  }
}
