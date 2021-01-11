/* @flow */

import type Watcher from './watcher'
import { remove } from '../util/index'
import config from '../config'

let uid = 0

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 */
export default class Dep {
  // dep的静态属性target是一个watcher
  static target: ?Watcher;
  // dep的id，递增的
  id: number;
  subs: Array<Watcher>;

  constructor () {
    this.id = uid++
    this.subs = []
  }

  addSub (sub: Watcher) {
    this.subs.push(sub)
  }

  removeSub (sub: Watcher) {
    remove(this.subs, sub)
  }

  depend () {
    if (Dep.target) {
      // 调用了watcher的addDep方法，传入了dep实例
      Dep.target.addDep(this)
    }
  }

  notify () {
    // stabilize the subscriber list first
    // 克隆 一个新的数组不影响以前的数组
    const subs = this.subs.slice()
    if (process.env.NODE_ENV !== 'production' && !config.async) {
      // subs aren't sorted in scheduler if not running async
      // we need to sort them now to make sure they fire in correct
      // order
      // 对 watcher 进行排序
      subs.sort((a, b) => a.id - b.id)
    }
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update()
    }
  }
}

// The current target watcher being evaluated.
// This is globally unique because only one watcher
// can be evaluated at a time.
// Dep.target 用来存放目前正在使用的 watcher，
// 这个Dep.target是全局唯一的，并且一次也只能有一个 watcher 类被使用，因为js是单线程可以这样做；

Dep.target = null
const targetStack = []
// 入栈并且将当前 watcher 赋值给Dep.target
export function pushTarget (target: ?Watcher) {
  // 当有父子组件嵌套渲染时，先将父组件的 watcher 入栈；
  // 再去处理子组件的 watcher 子组件处理完成后，再把父组件的 watcher 出栈，继续操作
  targetStack.push(target)
  // 添加target属性，
  Dep.target = target
}

export function popTarget () {
  // 出栈
  targetStack.pop()
  // 这里给了他们的前一个，栈为空就 undefined 不为空就是前一个target也就是父级的观察者
  Dep.target = targetStack[targetStack.length - 1]
}
