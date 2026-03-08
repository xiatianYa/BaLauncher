export const gitCommitTypes = [
  ['feat', '新功能'],
  ['feat-wip', '开发中的功能，比如某功能的部分代码'],
  ['fix', '修复Bug'],
  ['docs', '只涉及文档更新'],
  ['typo', '代码或文档勘误，比如错误拼写'],
  ['style', '修改代码风格，不影响代码含义的变更'],
  ['refactor', '代码重构，既不修复 bug 也不添加功能的代码变更'],
  ['perf', '可提高性能的代码更改'],
  ['optimize', '优化代码质量的代码更改'],
  ['test', '添加缺失的测试或更正现有测试'],
  ['build', '影响构建系统或外部依赖项的更改'],
  ['ci', '对 CI 配置文件和脚本的更改'],
  ['chore', '没有修改src或测试文件的其他变更'],
  ['revert', '还原先前的提交']
]

export const gitCommitScopes = [
  ['projects', '项目'],
  ['packages', '包'],
  ['components', '组件'],
  ['hooks', '钩子函数'],
  ['utils', '工具函数'],
  ['types', 'TS类型声明'],
  ['styles', '代码风格'],
  ['deps', '项目依赖'],
  ['release', '发布项目新版本'],
  ['other', '其他的变更']
]
