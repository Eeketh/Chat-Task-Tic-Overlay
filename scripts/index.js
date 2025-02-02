const commands = configs.commands;
const responseTemplates = configs.responses;
const settings = configs.settings;

function respond(template, user = "", message = "") {
	ComfyJS.Say(template.replace("{user}", user).replace("{task}", message));
}

function isMod(flags) {
	return flags.broadcaster || flags.mod;
}

ComfyJS.onCommand = (user, command, message, flags, extra) => {
	// check if command is in the list of commands
	command = `!${command.toLowerCase()}`;

	if (
		(command === "clear" && message === "done") ||
		commands.adminClearDoneCommands.includes(command)
	) {
		if (!isMod(flags)) {
			// user is not a mod or broadcaster
			return respond(responseTemplates.notMod, user);
		}
		cleardone();
		respond(responseTemplates.clearedDone, user);
	} else if (commands.addTaskCommands.includes(command)) {
		// ADD TASK

		if (message === "") {
			// check if message is empty
			return respond(responseTemplates.noTaskContent, user);
		}

		if (userHasTask(user)) {
			// check if user has a task pending
			return respond(responseTemplates.noTaskAdded, user);
		}

		addTask(user, extra.userColor, message);

		respond(responseTemplates.taskAdded, user, message);
	} else if (commands.finishTaskCommands.includes(command)) {
		// FINISH TASK

		if (!userHasTask(user)) {
			// check whether user has task, if not, return
			return respond(responseTemplates.noTask, user);
		}

		let finishedTask = "";

		if (settings.showDoneTasks) {
			finishedTask = doneTask(user);
		} else {
			finishedTask = removeTask(user);
		}

		respond(responseTemplates.taskFinished, user, finishedTask);
	} else if (commands.deleteTaskCommands.includes(command)) {
		// DELETE TASK

		let removedTask = removeTask(user);

		respond(responseTemplates.taskDeleted, user, removedTask);
	} else if (commands.progressTaskCommands.includes(command)) {
		// PROGRESS TASK
		if (!userHasTask(user)) {
			// check if user has a task pending
			return respond(responseTemplates.noTaskToEdit, user);
		}
		
		var regEx = /(\d+)\/(\d+)/;
		let progress = 0;
		
		if (regEx.test(message))
		{			
			let progParts = regEx.exec(message);
			if (progParts[1]==progParts[2])
			{
				progress = 100;
			}
			else
			{
				progress = (progParts[1]/progParts[2]) * 100;
				progress = Math.round(progress);
				if (progress == Infinity) progress = NaN;
				if (progress>99) progress = 99;
			}
		}
		else
		{
			progress = parseInt(message);
		}
		
		if (isNaN(progress)) {
			return respond(responseTemplates.invalidProgress);
		}
		
		let progressedTask = null;
		
		if (message.includes('+') || progress < 0) {
			progressedTask = progressTask(user, progress, false);
		} else {
			progressedTask = progressTask(user, progress, true);
		}
		if (progressedTask.progress==100) {
			let finishedTask = "";
			if (settings.showDoneTasks) {
				finishedTask = doneTask(user);
			} else {
				finishedTask = removeTask(user);
			}

			return respond(responseTemplates.taskFinished, user, finishedTask);
		} else {
			return respond(responseTemplates.taskProgress, user, progressedTask.progress);
		}
	} else if (commands.editTaskCommands.includes(command)) {
		// EDIT TASK

		if (!userHasTask(user)) {
			// check if user has a task pending
			return respond(responseTemplates.noTaskToEdit, user);
		}
		editTask(user, message);

		respond(responseTemplates.taskEdited, user, message);
	} else if (commands.checkCommands.includes(command)) {
		// CHECK YOUR OWN TASK OR OTHER PEOPLE'S TASK

		if (message === "") {
			if (checkTask(user) === "") {
				// check if user has a task pending
				return respond(responseTemplates.noTask, user);
			}

			let currentTask = checkTask(user);
			respond(responseTemplates.taskCheck, user, currentTask);
		} else {
			let mentioned = message.split(" ")[0];

			// remove @ if there is
			if (mentioned[0] === "@") {
				mentioned = mentioned.slice(1);
			}

			if (checkTask(mentioned) === "") {
				// check if user has a task pending
				return respond(responseTemplates.noTaskA, user);
			}

			let currentTask = checkTask(mentioned);

			let response = responseTemplates.taskCheckUser;

			// replace {user2} with mentioned user
			response = response.replace("{user2}", `@${mentioned}`);

			respond(response, user, currentTask);
		}
	} else if (commands.adminClearAllCommands.includes(command)) {
		if (!isMod(flags)) {
			// user is not a mod or broadcaster
			return respond(responseTemplates.notMod, user);
		}
		resetDB();
		renderTaskList();

		respond(responseTemplates.clearedAll, user);
	} else if (commands.adminDeleteCommands.includes(command)) {
		if (!isMod(flags)) {
			// user is not a mod or broadcaster
			return respond(responseTemplates.notMod, user);
		}
		adminDeleteTask(message);
		respond(responseTemplates.adminDeleteTasks, user, message);
	} else if (commands.helpCommands.includes(command)) {
		respond(responseTemplates.help, user);
	} else if (commands.additionalCommands[command]) {
		respond(commands.additionalCommands[command], user);
	} else {
		// command not found
	}
};

ComfyJS.Init(auth.username, `oauth:${auth.oauth}`, [auth.channel]);
