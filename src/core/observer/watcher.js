/* @flow */

import {
  warn,
  remove,
  isObject,
  parsePath,
  _Set as Set,
  handleError,
  noop
} from '../util/index'

import { traverse } from './traverse'
import { queueWatcher } from './scheduler'
import Dep, { pushTarget, popTarget } from './dep'

import type { SimpleSet } from '../util/index'

let uid = 0

/**
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * This is used for both the $watch() api and directives.
 */
export default class Watcher {
  vm: Component;
  expression: string;
  cb: Function;
  id: number;
  deep: boolean;
  user: boolean;
  lazy: boolean;
  sync: boolean;
  dirty: boolean;
  active: boolean;
  deps: Array<Dep>;
  newDeps: Array<Dep>;
  depIds: SimpleSet;
  newDepIds: SimpleSet;
  before: ?Function;
  getter: Function;
  value: any;

  constructor (
    vm: Component,
    expOrFn: string | Function,
    cb: Function,
    options?: ?Object,
    isRenderWatcher?: boolean // 是否是渲染函数
  ) {
    this.vm = vm
    if (isRenderWatcher) { // 记录渲染watcher
      vm._watcher = this
    }
    vm._watchers.push(this) // 记录所有watcher
    // options
    if (options) {
      this.deep = !!options.deep
      this.user = !!options.user
      this.lazy = !!options.lazy //是否延迟渲染，计算属性需要延迟渲染
      this.sync = !!options.sync
      this.before = options.before
    } else {
      this.deep = this.user = this.lazy = this.sync = false
    }
    this.cb = cb
    this.id = ++uid // uid for batching
    this.active = true
    this.dirty = this.lazy // for lazy watchers
    this.deps = []  // watcher中也会记录发布者列表，
    this.newDeps = []
    this.depIds = new Set()
    this.newDepIds = new Set()
    this.expression = process.env.NODE_ENV !== 'production'
      ? expOrFn.toString()
      : ''
    this.x_propname = expOrFn.toString()
    // parse expression for getter
    // 如果是函数直接放入getter
    if (typeof expOrFn === 'function') {
      this.getter = expOrFn
    } else {
      // 创建监听器时expOrFn可能会传字符串，这里处理这个，watch:{'person.name': function...}
      // parsePath 生成一个函数获取’expOrFn‘的值,这个函数调用时，就会触发这个值的get
      this.getter = parsePath(expOrFn)
      if (!this.getter) {
        this.getter = noop
        process.env.NODE_ENV !== 'production' && warn(
          `Failed watching path: "${expOrFn}" ` +
          'Watcher only accepts simple dot-delimited paths. ' +
          'For full control, use a function instead.',
          vm
        )
      }
    }
    // lazy参数，只有在计算属性的 计算 watcher 中是true，不在watcher去执行get
    // 计算属性都是在render函数中区调用它的watcher的
    this.value = this.lazy
      ? undefined
      : this.get()
  }

  /**
   * Evaluate the getter, and re-collect dependencies.
   */
  get () {
    // 这里的watcher是要渲染视图的，渲染视图时，要先渲染内部组件的，这里就是讲外部的watcher缓存起来，内部组件渲染完成后再渲染这里；// 并且在这里触发Dep
    // 当数据被调用，或者被改变时都会调用 watcher 的 get 方法，在get方法中就会触发Dep的target属性去将watcher添加到dep的观察者列表中，使得dep可以在数据改变时触发watcher变化。如何添加观察者的核心

    pushTarget(this)

    let value
    const vm = this.vm
    try {
      value = this.getter.call(vm, vm)
    } catch (e) {
      if (this.user) {
        handleError(e, vm, `getter for watcher "${this.expression}"`)
      } else {
        throw e
      }
    } finally {
      // "touch" every property so they are all tracked as
      // dependencies for deep watching
      if (this.deep) {
        traverse(value)
      }
      popTarget()
      this.cleanupDeps()
    }
    return value
  }

  /**
   * Add a dependency to this directive.
   * 添加依赖
   */
  addDep (dep: Dep) {
    const id = dep.id
    // 利用id，添加过 就不添加了
    if (!this.newDepIds.has(id)) {
      this.newDepIds.add(id)
      this.newDeps.push(dep)
      // 没有添加此dep就调用dep的方法，添加此watcher到dep的列表中
      if (!this.depIds.has(id)) {
        dep.addSub(this)
      }
    }
  }

  /**
   * Clean up for dependency collection.
   */
  cleanupDeps () {
    let i = this.deps.length
    while (i--) {
      const dep = this.deps[i]
      if (!this.newDepIds.has(dep.id)) {
        dep.removeSub(this)
      }
    }
    let tmp = this.depIds
    this.depIds = this.newDepIds
    this.newDepIds = tmp
    this.newDepIds.clear()
    tmp = this.deps
    this.deps = this.newDeps
    this.newDeps = tmp
    this.newDeps.length = 0
  }

  /**
   * Subscriber interface.
   * Will be called when a dependency changes.
   */
  update () {
    /* istanbul ignore else */
    if (this.lazy) {
      this.dirty = true
    } else if (this.sync) {
      this.run()
    } else {
      // 对 watcher 队列的处理
      queueWatcher(this)
    }
  }

  /**
   * Scheduler job interface.
   * Will be called by the scheduler.
   */
  run () {
    if (this.active) {
      // 核心调用get
      const value = this.get() // 渲染watcher时没有返回值，就是undefined


      if (
        value !== this.value ||
        // Deep watchers and watchers on Object/Arrays should fire even
        // when the value is the same, because the value may
        // have mutated.
        isObject(value) ||
        this.deep
      ) {
        // set new value
        // 用户watcher时，有返回值，与旧值不同的话，就执行用户传入的callback
        const oldValue = this.value
        this.value = value
        if (this.user) { //用户watcher时，调用要加try catch
          try {
            // 执行用户传入的callback
            this.cb.call(this.vm, value, oldValue)
          } catch (e) {
            handleError(e, this.vm, `callback for watcher "${this.expression}"`)
          }
        } else {
          // 执行callback
          this.cb.call(this.vm, value, oldValue)
        }
      }
    }
  }

  /**
   * Evaluate the value of the watcher.
   * This only gets called for lazy watchers.
   */
  evaluate () {
    this.value = this.get()
    this.dirty = false
  }

  /**
   * Depend on all deps collected by this watcher.
   */
  depend () {
    let i = this.deps.length
    while (i--) {
      this.deps[i].depend()
    }
  }

  /**
   * Remove self from all dependencies' subscriber list.
   */
  teardown () {
    if (this.active) {
      // remove self from vm's watcher list
      // this is a somewhat expensive operation so we skip it
      // if the vm is being destroyed.
      // 从vm的观察者列表中删除self这是一个有点昂贵的操作，所以如果vm正在被销毁，我们将跳过它。
      if (!this.vm._isBeingDestroyed) { //vm实例正在销毁则跳过，不是正在销毁就执行销毁
        // 从实例的 _watchers 观察者列表中，删除当前watcher，利用数组方法
        remove(this.vm._watchers, this)
      }
      // 销毁watchers，销毁dep中注册的watcher
      let i = this.deps.length
      while (i--) {
        this.deps[i].removeSub(this)
      }
      this.active = false
    }
  }
}
