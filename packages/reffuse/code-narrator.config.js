
const ConfigurationBuilder = require("code-narrator/dist/src/documentation/plugins/builders/Configuration/ConfigurationBuilder");
const FilesBuilder = require("code-narrator/dist/src/documentation/plugins/builders/Files/FilesBuilder");
const FoldersBuilder = require("code-narrator/dist/src/documentation/plugins/builders/Folders/FoldersBuilder");
const UserDefinedBuilder = require("code-narrator/dist/src/documentation/plugins/builders/UserDefined/UserDefinedBuilder");

/**
 * You can find the documentation about code-narrator.config.js at
 * https://github.com/ingig/code-narrator/blob/master/docs/Configuration/code-narrator.config.js.md
 *
 * @type {ICodeNarratorConfig}
 */
const config = {
      // App specific configuration files. This could be something like project_name.json
  config_files: [

  ],
  project_file: "package.json",
  entry_file: "./dist/index.js",
  cli_file: "",
  project_path: "./",
  source_path: "src",
  documentation_path: "./docs",
  test_path: "test",
  exclude: [
    "/node_modules",
    ".env",
    "/.idea",
    "/.git",
    ".gitignore",
    "/.code-narrator",
    "/dist",
    "/build",
    "package-lock.json",
  ],
  // Indicates if the documentation should create a README file in root of project
  readmeRoot: true,
  // Url to the repository, code-narrator tries to extract this from project file
  repository_url: "git+https://github.com/Thiladev/reffuse.git",
  // These are the plugins used when building documentation. You can create your own plugin. Checkout the code-narrator docs HowTo create a builder plugin
  builderPlugins: [
   ConfigurationBuilder,
   FilesBuilder,
   FoldersBuilder,
   UserDefinedBuilder,
  ],
  // These are system commends send to GPT with every query
  gptSystemCommands: [
    "Act as a documentation expert for software",
    "If there is :::note, :::info, :::caution, :::tip, :::danger in the text, extract that from its location and format it correctly",
    "Return your answer in {DocumentationType} format",
    "If you notice any secret information, replace it with ***** in your response",
  ],
  documentation_type: "md",
  document_file_extension: ".md",
  folderRootFileName: "README",
  cache_file: ".code-narrator/cache.json",
  gptModel: "gpt-4",
  aiService: undefined,
  project_name: "reffuse",
  include: [
    "src/**/*",
  ],
  // Array of user defined documentations. See code-narrator How to create a user defined builder
  builders: [
    {
      name: "README",
      type: "README",
      template: "README",
      sidebarPosition: 1,
      args: {
        entryFileContent: "content(package.json)",
        aiService: undefined,
      },
      aiService: undefined,
    },
    {
      name: "HowTo Overview",
      type: "README",
      template: "overview_readme",
      path: "howto",
      files: [
        {
          path: "howto/*.md",
          aiService: undefined,
        },
      ],
      pages: [
        {
          name: "HowTo Example",
          type: "howto",
          template: "howto_create_howto",
          aiService: undefined,
        },
      ],
      aiService: undefined,
    },
  ],

}
module.exports = config;
