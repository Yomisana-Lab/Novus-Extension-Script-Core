import fs from "fs-extra";
import extract from "extract-zip";
// ES6 module
import path from "path";
import { fileURLToPath } from "url";
import os from "os";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import downloadResource from "../Novus-Extension-CLI-Downloader/index.js";
import Terminal from "../Novus-Extension-Sandbox-Terminal/index.js";

export default async function run(filename) {
  // Read JSON file
  const script_path = path.join(
    __dirname,
    "..",
    "scripts",
    ensureJsonExtension(filename)
  );
  const script_data = fs.readFileSync(script_path, "utf8");
  // console.log('read JSON file:', script_path);
  // Parse JSON
  const jsonData = JSON.parse(script_data);
  // console.log('LGTM JSON file:', jsonData);
  // script main()
  console.log(`${jsonData.name}@${jsonData.version}`);
  for (const step of jsonData.steps) {
    console.log(`   ${step.name}`);
    // check solo step platform is support to do?
    if (!step.platform[os.platform()]) {
      console.log(
        `       The settings for the corresponding platform cannot be found, skip: ${step.name}`
      );
      continue;
    }
    // check option of exist can skip?
    if (step.exist_can_skip) {
      console.log(`       ${step.name} can skip?`);
      // check folder path
      const folderPath = after_commandExtension(
        step,
        step.platform[os.platform()].destination
      );
      // console.log(`folderPath: ${folderPath}`)
      if (fs.existsSync(folderPath)) {
        console.log(`   ${step.name} already exist at ${folderPath}`);
        console.log(`   Skip ${step.name}`);
        continue;
      }
    }
    if (
      step.platform[os.platform()].type === "download" &&
      step.platform[os.platform()].url
    ) {
      await downloadResource({
        url: step.platform[os.platform()].url,
        destinationDir: step.platform[os.platform()].path,
      });
    }
    // type check
    switch (step.platform[os.platform()].type) {
      case "download":
        // after command
        if (step.platform[os.platform()].after_command) {
          const command = after_commandExtension(
            step,
            step.platform[os.platform()].after_command
          );
          // console.log(command);
          // extract command
          // 如果 command 有 {extract_zip} 就,分割字串，並且順序改成, extract(split[0], {dir: split[1]})
          if (command.includes("{extract_zip}")) {
            const split = command.split(",");
            console.log(`extract file ${split[1]} to ${split[2]}`);
            await extract(split[1], { dir: split[2] });
          } else {
            // options - 如果沒有則就不添加預設或是不給這個key
            const options = {
              cwd:
                step.platform[os.platform()].path &&
                path.join(__dirname, "..", step.platform[os.platform()].path),
              show_command:
                step.platform[os.platform()].show_command &&
                step.platform[os.platform()].show_command,
              env: step.platform[os.platform()].env && {
                ...after_commandExtension(
                  step,
                  step.platform[os.platform()].env
                ),
              },
            };
            Terminal(command, options);
          }
        }
        break;
      case "command":
        if (step.platform[os.platform()].command) {
          const command = after_commandExtension(
            step,
            step.platform[os.platform()].command
          );
          // console.log(command);
          // extract command
          // 如果 command 有 {extract_zip} 就,分割字串，並且順序改成, extract(split[0], {dir: split[1]})
          if (command.includes("{extract_zip}")) {
            const split = command.split(",");
            console.log(`extract file ${split[1]} to ${split[2]}`);
            await extract(split[1], { dir: split[2] });
          } else {
            // options - 如果沒有則就不添加預設或是不給這個key
            const options = {
              cwd:
                step.platform[os.platform()].path &&
                path.join(__dirname, "..", step.platform[os.platform()].path),
              show_command:
                step.platform[os.platform()].show_command &&
                step.platform[os.platform()].show_command,
              env: step.platform[os.platform()].env && {
                ...after_commandExtension(
                  step,
                  step.platform[os.platform()].env
                ),
              },
            };
            // console.log(`command: ${command}\noptions: ${JSON.stringify(options)}`);
            Terminal(command, options);
          }
        }
        break;
      default:
        console.log(
          `Unknown type of step, skip: ", ${step.name} of ${
            step.platform[os.platform()].type
          }`
        );
        break;
    }
  }
}

function ensureJsonExtension(filename) {
  if (!filename.endsWith(".json")) {
    filename += ".json";
  }
  return filename;
}

function after_commandExtension(step, command) {
  // split after_command {} str v4.0
  const matchRegex = /\{(.*?)\}/g;
  let match;
  const matches = [];
  const default_args = {
    app: path.join(__dirname, ".."),
    script: path.join(__dirname, "..\\scripts"),
    temp: path.join(__dirname, "..\\temp"),
    extensions: path.join(__dirname, "..\\extensions"),
    ...step.platform[os.platform()],
  };
  while ((match = matchRegex.exec(command)) !== null) {
    matches.push(match[1]);
  }
  // detect command are obj
  if (typeof command === "object") {
    // console.log("ohh it is object")
    for (const key in command) {
      if (command.hasOwnProperty(key)) {
        const value = command[key];
        const replacedValue = replaceCommandValue(value, default_args);
        command[key] = replacedValue;
      }
    }
  } else {
    // console.log(`matches: ${JSON.stringify(matches)}`);
    let replacedCommand = command;
    let previousCommand = "";
    while (
      matchRegex.test(replacedCommand) &&
      replacedCommand !== previousCommand
    ) {
      previousCommand = replacedCommand;
      replacedCommand = replacedCommand.replace(
        matchRegex,
        (match, variable) => {
          const trimmedVariable = variable.trim();
          return default_args[trimmedVariable] || match;
        }
      );
    }
    // console.log(`replacedCommand: ${JSON.stringify(replacedCommand)}`);
    command = replacedCommand;
  }
  return command;
}

function replaceCommandValue(value, default_args) {
  const matchRegex = /\{(.*?)\}/g;
  let match;
  const matches = [];
  while ((match = matchRegex.exec(value)) !== null) {
    matches.push(match[1]);
  }
  // console.log(`matches: ${JSON.stringify(matches)}`);
  let replacedValue = value;
  let previousValue = "";
  while (matchRegex.test(replacedValue) && replacedValue !== previousValue) {
    previousValue = replacedValue;
    replacedValue = replacedValue.replace(matchRegex, (match, variable) => {
      const trimmedVariable = variable.trim();
      return default_args[trimmedVariable] || match;
    });
  }
  // console.log(`replacedValue: ${JSON.stringify(replacedValue)}`);
  return replacedValue;
}

// run("default.json");
// run("default");
// run("\\install\\default-yomisana");
// run("\\install\\default-yomisana.json");
