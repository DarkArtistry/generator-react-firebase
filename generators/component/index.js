'use strict'
const Generator = require('yeoman-generator')
const chalk = require('chalk')
const camelCase = require('lodash/camelCase')

const prompts = [
  {
    type: 'confirm',
    name: 'addStyle',
    message: 'Do you want to include an SCSS file for styles?',
    default: true
  },
  {
    type: 'confirm',
    name: 'includeEnhancer',
    message: 'Do you want to include an enhancer (if you are not sure answer false)?',
    default: false
  },
  {
    type: 'confirm',
    name: 'usingFirestore',
    when: ({ includeEnhancer }) => includeEnhancer,
    message: 'Are you using Firestore (if you are not sure answer false)?',
    default: false
  }
]

module.exports = class extends Generator {
  constructor (args, opts) {
    super(args, opts)

    // Get first cli argument, and set it as this.options.name
    this.argument('name', {
      required: true,
      type: String,
      desc: 'The component name'
    })
    this.argument('basePath', {
      type: String,
      required: false,
      desc: 'The base path of the components folder (starts at "src")'
    })
  }

  prompting () {
    this.log(
      `${chalk.blue('Generating')} -> React Component: ${chalk.green(this.options.name)}`
    )

    return this.prompt(prompts).then((props) => {
      this.answers = props
    })
  }

  writing () {
    const basePathOption = this.options.basePath ? `${this.options.basePath}/` : ''
    const basePath = `src/${basePathOption}components/${this.options.name}`
    const filesArray = [
      { src: '_index.js', dest: `${basePath}/index.js` },
      { src: '_main.js', dest: `${basePath}/${this.options.name}.js` }
    ]

    if (this.answers.addStyle) {
      filesArray.push({
        src: '_main.scss',
        dest: `${basePath}/${this.options.name}.scss`
      })
    }

    if (this.answers.includeEnhancer) {
      filesArray.push({
        src: '_main.enhancer.js',
        dest: `${basePath}/${this.options.name}.enhancer.js`
      })
    }

    filesArray.forEach(file => {
      this.fs.copyTpl(
        this.templatePath(file.src),
        this.destinationPath(file.dest),
        Object.assign({}, this.answers, {
          name: this.options.name,
          lowerName: this.options.name.toLowerCase(),
          camelName: camelCase(this.options.name)
        })
      )
    })
  }
}
