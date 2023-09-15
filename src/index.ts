import * as core from '@actions/core';
import {spawn} from 'child_process';

class StringBuilder {
    private _parts: string[] = [];

    append(value: string): void {
        this._parts.push(value);
    }

    toString(): string {
        return this._parts.join("");
    }
}
async function run() {
    try {
        let projects = core.getInput('projects');
        let tasks = core.getInput('tasks');
        let executeOnRootAnyway = core.getInput('execute_on_root_anyway', {
            trimWhitespace: true,
        })?.toLowerCase() === 'true' ?? false;
        let rootProjectTask = core.getInput('root_project_task', {
            required: false
        });

        core.debug(`Projects: '${projects}'`);
        core.debug(`Tasks: '${tasks}'`);
        core.debug(`Root project Task: '${rootProjectTask}'`);

        const taskArr: string[] = tasks.split(',').filter((p) => p.trim() !== '');
        core.debug("Task array: " + taskArr);
        let gradleProjectsTasks: string;
        if (projects === 'buildSrc') {
            core.debug(`only buildSrc has changed, setting gradleProjectsTasks to ${tasks}`);
            gradleProjectsTasks = `${tasks} `;
        } else {
            const projArr: string[] = projects.split(',').filter((p) => p.trim() !== '');
            core.debug(`building gradleProjectsTasks with projects: ${projArr} and tasks: ${taskArr}`);
            if (taskArr.length === 0 && !rootProjectTask) {
                core.info("No tasks provided, skipping");
                return;
            }
            if (projArr.length === 0 && !executeOnRootAnyway) {
                core.info("No projects to build, skipping");
                return;
            }
            if (projArr.length > 0) {
                gradleProjectsTasks = projArr.reduce((acc1, proj) => {
                    return acc1 + taskArr.reduce((acc2, task) => {
                        return acc2 + `:${proj}:${task} `;
                    }, '');
                }, '');
            } else {
                gradleProjectsTasks = taskArr.reduce((acc1, task) => {
                    return acc1 + `${task} `;
                }, '');
            }
        }
        if (rootProjectTask) {
            core.debug(`Adding root project task: ${rootProjectTask} to command`);
            gradleProjectsTasks += rootProjectTask;
        }
        const gradleCommand = `./gradlew --stacktrace ${gradleProjectsTasks.trim()}`;
        core.info(`Executing: ${gradleCommand}`);
        const gradleArgs = gradleCommand.split(' ');
        const gradleChild = spawn(gradleArgs[0], gradleArgs.slice(1));

        const processPromise = new Promise<String>((resolve, reject) => {
            let gradleOutputBuilder = new StringBuilder();
            gradleChild.stdout.on('data', (data) => {
                gradleOutputBuilder.append(data.toString());
                core.info(data.toString());
            });

            gradleChild.stderr.on('data', (data) => {
                core.error(data.toString());
            });

            gradleChild.on('exit', (code, signal) => {
                if (code !== 0) {
                    reject(new Error(`Gradle exited with code ${code} due to signal ${signal}`));
                } else {
                    resolve(gradleOutputBuilder.toString());
                }
            });
        });

        core.setOutput('gradle_output', await processPromise);

    } catch (error: any) {
        core.setFailed(error.message);
    }
}

run();

