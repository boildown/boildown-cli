#!/usr/bin/env node

'use strict'

const fs = require('fs')
const path = require('path')

const boildown = require('boildown')
const min = require('minimist')

const argv = min(process.argv.slice(2))
const generatorName = argv._[0]

const inquirer = require('inquirer')
const packageQuestions = require('../lib/packageQuestions')

if (!argv._.length) usage()
doesGeneratorExist()

const generatorPath = path.dirname(require.resolve('boildown-' + generatorName))
const generator = require('boildown-' + generatorName)
const questions = generator.questions
const actions = generator.actions

if (argv._.length !== 1) {
  // existing project, pass commands to generator
  argv._.shift()

  if (!generator.commands) process.exit(1)
  generator.commands(
    argv,
    JSON.parse(fs.readFileSync(path.join(process.cwd(), 'boildown.json'), 'utf8'))
  )
  process.exit(0)
}

function runActions (answers) {
  actions(answers, (err) => {
    if (err) console.error(err)
    process.exit(err ? 1 : 0)
  })
}

inquirer.prompt(packageQuestions.concat(questions), (answers) => {
  // only run the actions
  if (argv.actions) return runActions(answers)

  // full scaffold
  const dest = `${process.cwd()}/${answers.packageName}`
  console.log(`auto scaffold -\n${dest}`)
  boildown.autoScaffold({
    answers,
    templateDir: path.resolve(generatorPath, generator.scaffold),
    package: generator.package,
    dest
  }, (err) => {
    if (err) throw err
    const file = path.join(dest, 'boildown.json')
    fs.writeFileSync(file, JSON.stringify(answers, null, 2))
    runActions(answers)
  })
})

function usage () {
  console.log(`
    USAGE:
    # question user and just run actions
    $ gen <generator>
    # question user, run actions & auto-scaffold project with boba
    $ gen <generator> scaffold`)
  process.exit(0)
}

function doesGeneratorExist () {
  try {
    require.resolve(`boildown-${generatorName}`)
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      console.log(`
      Generator ${generatorName} not installed, try:
      $ npm install -g boildown-${generatorName}`)
      process.exit(1)
    }
    throw err
  }
}
