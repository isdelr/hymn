import { execa } from 'execa'

const MAX_BUILD_OUTPUT = 50_000

export interface CommandResult {
  exitCode: number | null
  output: string
  durationMs: number
  truncated: boolean
}

/**
 * Run a command with arguments in a specified working directory.
 * Captures stdout and stderr, truncating if output exceeds the maximum.
 */
export async function runCommand(
  command: string,
  args: string[],
  cwd: string
): Promise<CommandResult> {
  const startedAt = Date.now()

  const result = await execa(command, args, {
    cwd,
    reject: false, // Don't throw on non-zero exit code
    all: true, // Combine stdout and stderr
  })

  let output = result.all ?? ''
  let truncated = false

  if (output.length > MAX_BUILD_OUTPUT) {
    output = output.slice(output.length - MAX_BUILD_OUTPUT)
    truncated = true
  }

  return {
    exitCode: result.exitCode ?? null,
    output,
    durationMs: Date.now() - startedAt,
    truncated,
  }
}
