# Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a Hardhat Ignition module that deploys that contract.

Try running some of the following tasks:


token1 质押代码
token2 奖励代币
stakingSward 质押收益合约

```shell
npx hardhat compile  #编译合约
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat ignition deploy ./ignition/modules/Lock.js
```
问题：
vue3 项目拿不到 hardhat depoly 之后合约的abi

tsconfig.app.json 配置文件作用：

{
  "extends": "@vue/tsconfig/tsconfig.dom.json",
  // 继承 Vue 官方提供的 DOM 环境基础配置
  // 包含了浏览器环境下 TypeScript 编译的基础设置（如支持 DOM API 类型等）

  "include": ["env.d.ts", "src/**/*", "src/**/*.vue"],
  // 指定需要 TypeScript 编译处理的文件
  // - "env.d.ts": 项目环境声明文件（通常包含全局类型定义）
  // - "src/**/*": src 目录下所有文件（递归匹配）
  // - "src/**/*.vue": src 目录下所有 .vue 单文件组件

  "exclude": ["src/**/__tests__/*"],
  // 指定需要排除的文件（不进行编译处理）
  // 这里排除了 src 目录下所有 __tests__ 文件夹中的测试文件
  // （测试文件通常有单独的配置文件如 tsconfig.spec.json）

  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    // 指定 TypeScript 增量编译信息的存储路径
    // 用于优化二次编译速度（记录已编译文件的状态）

    "paths": {
      "@/*": ["./src/*"]
    }
    // 配置模块路径别名（与 vite.config.ts 中的别名对应）
    // 告诉 TypeScript 编译器：导入路径中以 @/ 开头的路径，实际指向 ./src/ 目录
    // 例如 import xxx from '@/utils' 会被解析为 import xxx from './src/utils'
  }
}

tsconfig.node.json 配置文件作用： 

{
  "extends": "@tsconfig/node22/tsconfig.json",
  // 继承官方提供的 Node.js v22 环境标准配置
  // 包含了 Node.js v22 版本下的基础编译选项（如支持的 ES 特性、模块系统等）
  // 避免手动配置 Node 环境的基础规则，保持配置标准化

  "include": [
    "vite.config.*",
    "vitest.config.*",
    "cypress.config.*",
    "nightwatch.conf.*",
    "playwright.config.*",
    "eslint.config.*"
  ],
  // 指定需要应用此配置的文件
  // 都是项目中的工具配置文件：
  // - vite.config.*：Vite 构建工具配置
  // - vitest.config.*：Vitest 测试框架配置
  // - cypress.config.* / nightwatch.conf.* / playwright.config.*：各类端到端测试工具配置
  // - eslint.config.*：ESLint 代码检查工具配置

  "compilerOptions": {
    "noEmit": true,
    // 关闭代码输出（不生成编译后的 .js 文件）
    // 因为这些配置文件通常由 Node.js 直接运行（通过 ts-node 等工具实时解析），不需要预编译

    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    // 增量编译信息存储路径，优化重复编译的速度

    "module": "ESNext",
    // 指定模块系统为最新的 ES 模块规范（支持 import/export 语法）

    "moduleResolution": "Bundler",
    // 模块解析策略采用打包工具（如 Vite）的解析逻辑
    // 更符合现代构建工具的模块查找规则，避免 Node.js 传统解析方式的兼容问题

    "types": ["node"]
    // 引入 Node.js 内置类型声明
    // 让 TypeScript 识别 Node.js 环境的全局变量（如 process、__dirname 等）和内置模块（如 fs、path 等）
  }
}