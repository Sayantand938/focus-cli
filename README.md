# focus-cli

A command-line tool to manage focus sessions.

## Description

This CLI tool helps you manage your focus sessions by allowing you to:

- Add a new focus session with a specified duration and description.
- List all your focus sessions.
- Edit the details of an existing focus session.
- Delete a focus session.
- Start a focus session timer.
- Stop a running focus session.
- Get a summary of your focus sessions.

## Installation

```bash
npm install -g focus-cli
```

## Usage

```bash
focus <command> [options]
```

## Commands

- `add`: Add a new focus session.

  ```bash
  focus add -d <duration> -s <session_name>
  ```

  - `-d, --duration`: Duration of the focus session in minutes (e.g., 25).
  - `-s, --session`: Name of the focus session (e.g., "Work on project").

- `list`: List all focus sessions.

  ```bash
  focus list
  ```

- `edit`: Edit an existing focus session.

  ```bash
  focus edit <id> -d <duration> -s <session_name>
  ```

  - `<id>`: The ID of the focus session to edit.
  - `-d, --duration`: New duration of the focus session in minutes.
  - `-s, --session`: New name of the focus session.

- `delete`: Delete a focus session.

  ```bash
  focus delete <id>
  ```

  - `<id>`: The ID of the focus session to delete.

- `start`: Start a focus session timer.

  ```bash
  focus start <id>
  ```

  - `<id>`: The ID of the focus session to start.

- `stop`: Stop a running focus session.

  ```bash
  focus stop
  ```

- `summary`: Get a summary of your focus sessions.
  ```bash
  focus summary
  ```

## Contributing

Contributions are welcome! Please feel free to submit a pull request.

## License

[MIT](LICENSE)
