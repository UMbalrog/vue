/* @flow */

import { parse } from './parser/index'
import { optimize } from './optimizer'
import { generate } from './codegen/index'
import { createCompilerCreator } from './create-compiler'

// `createCompilerCreator` allows creating compilers that use alternative
// parser/optimizer/codegen, e.g the SSR optimizing compiler.
// Here we just export a default compiler using the default parts.
export const createCompiler = createCompilerCreator(function baseCompile (
  template: string,
  options: CompilerOptions
): CompiledResult {
  // 模板编译的核心函数

  // 1.把模板转换为 ast 抽象语法树
  // 抽象语法树，用来以树形的方式描述代码结构
  // 过程就是遍历html字符串，匹配查找到对应的标签属性、指令、等等，将其转换为 AST 对象，将内容存入 AST 对象属性上。
  const ast = parse(template.trim(), options)

  if (options.optimize !== false) {
    // 2.优化抽象语法树，作用就是标记静态节点和静态根节点
    optimize(ast, options)
  }
  // 3.把抽象语法树生成字符串形式的 js 代码
  const code = generate(ast, options)
  return {
    ast,
    // 渲染函数，这个render函数是字符串形式的
    render: code.render,
    // 静态渲染函数，生成的静态 VNode 树
    staticRenderFns: code.staticRenderFns
  }
})
