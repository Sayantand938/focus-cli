# Focus CLI - Implementation Plan for Start and Stop Commands

## 1. Create `start` command:

- Create a new file `src/commands/start/index.ts`.
- Define a class `Start` extending the `Command` class from `@oclif/core`.
- Implement the `run` method to:
  - Use `better-sqlite3` to connect to the database.
  - Generate a unique session ID using the `uuid` package (version 4).
  - Log the start time to the database in ISO 8601 format (using `date-fns`).
  - Implement logic to prevent duplicate sessions by checking for existing sessions with a `null` stop time.
  - Handle potential database errors using a try-catch block and the centralized error handling mechanism.
  - Display the session ID to the user after starting a session, using `this.log()` from `@oclif/core`.
- Add a description to the command using the `static description` property from `@oclif/core`, as specified in `project-requirements.toml`.

## 2. Create `stop` command:

- Create a new file `src/commands/stop/index.ts`.
- Define a class `Stop` extending the `Command` class from `@oclif/core`.
- Implement the `run` method to:
  - Prompt the user for the first 8 characters of the session ID to stop, using `inquirer` for interactive prompts.
  - Use `better-sqlite3` to connect to the database.
  - Record the stop time in the database in ISO 8601 format (using `date-fns`).
  - Calculate the session duration in seconds using `date-fns`.
  - Update the session record in the database with the stop time and duration.
  - Handle potential errors, such as the session not being found or database errors, using a try-catch block and the centralized error handling mechanism.
  - Display a success message with the session duration, using `this.log()` from `@oclif/core`.

## 3. Database interaction:

- Use `better-sqlite3` to interact with the database.
- Create a `sessions` table if it doesn't exist, based on the schema defined in `project-requirements.toml`.
- Use parameterized queries to prevent SQL injection vulnerabilities.
- Implement functions to:
  - Insert a new session with the ID, start time, `null` stop time, and `null` duration.
  - Update an existing session with the stop time and duration.
  - Retrieve session data for the `list` and `summary` commands.

## 4. Error handling:

- Implement a centralized error handling mechanism as described in `project-requirements.toml`.
- Create a custom error class that extends the built-in `Error` class.
- Use a try-catch block to catch potential errors.
- Log errors using the `debug` package.
- Display user-friendly error messages based on the error type, as defined in `project-requirements.toml`.

## 5. Configuration:

- Use `cosmiconfig` to load configuration settings from a configuration file.
- Allow users to configure the storage location and other preferences, such as the date and time format.
- Use `zod` to validate the configuration settings.

## 6. Command Registration:

- Ensure that the `start` and `stop` commands are placed in the `dist/commands` directory after the build process, so that `oclif` can automatically discover and register them.
- Update the `oclif.manifest.json` file to include the new commands.

## 7. Testing:

- Write unit tests for the `start` and `stop` commands using `@oclif/test` and `chai`.
- Mock database interactions to isolate the command logic.
- Test various scenarios, including:
  - Starting and stopping sessions successfully.
  - Handling database errors.
  - Preventing duplicate sessions.
  - Handling invalid session IDs.

## 8. Edge Cases:

- Handle the case where the user tries to stop a session that doesn't exist.
- Handle the case where the user tries to start a session when another session is already running.
- Handle potential time zone issues when calculating session durations.
