import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'
// 此处不用class的原因是因为之后方便给Vue实例混入实例成员
function Vue (options) {
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
    // 判断是否使用new 方法来创建实例 instanceof 运算符用来检测 constructor.prototype 是否存在于参数 object 的原型链上。
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  // 调用 _init()方法
  this._init(options)
}
// 注册 vm 实例的init方法初始化； 为实例注册方法
initMixin(Vue)
// 注册 vm 实例的状态方法，$data/$props/$set/$delete/$watch
stateMixin(Vue)
// 注册 vm 实例的事件方法，观察者模式，$on/$once/$off/$emit
eventsMixin(Vue)
// 注册 vm 实例的部分生命周期方法, _update/$forceUpdate/$destroy
lifecycleMixin(Vue)
// 注册 vm 实例的render函数和$nextTick函数
renderMixin(Vue)

export default Vue
